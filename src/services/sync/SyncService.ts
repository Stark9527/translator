// 云同步服务 - 完全匹配 Supabase 实际数据库架构
import type {
  Flashcard,
  FlashcardGroup,
} from '@/types/flashcard';
import type {
  FlashcardRow,
  GroupRow,
  SyncResult,
} from '@/types/supabase';
import { SyncStatus } from '@/types/supabase';
import type { LanguageCode, TranslationEngine } from '@/types';
import { ProficiencyLevel } from '@/types/flashcard';
import { supabaseService } from './SupabaseService';
import { flashcardDB } from '../flashcard/FlashcardDB';

/**
 * FSRS State 映射（本地 <-> 云端）
 * 本地使用数字 (0-3)，云端使用字符串
 */
const FSRS_STATE_TO_STRING = {
  0: 'new' as const,
  1: 'learning' as const,
  2: 'review' as const,
  3: 'relearning' as const,
};

const FSRS_STRING_TO_STATE = {
  'new': 0,
  'learning': 1,
  'review': 2,
  'relearning': 3,
};

/**
 * 同步服务
 * 负责本地 IndexedDB 和 Supabase 云端之间的数据同步
 */
export class SyncService {
  private isSyncing = false;
  private lastSyncTime: number = 0;
  private autoSyncEnabled = true;
  private syncDebounceTimer: number | null = null;
  private periodicSyncTimer: number | null = null;
  private readonly DEBOUNCE_DELAY = 3000; // 3 秒防抖
  private readonly PERIODIC_SYNC_INTERVAL = 30000; // 30 秒定期同步

  /**
   * 执行完整同步
   */
  async sync(): Promise<SyncResult> {
    if (this.isSyncing) {
      throw new Error('同步正在进行中');
    }

    if (!supabaseService.isAuthenticated()) {
      throw new Error('用户未登录，无法同步');
    }

    this.isSyncing = true;

    try {
      const result: SyncResult = {
        status: SyncStatus.Syncing,
        uploadedCount: 0,
        downloadedCount: 0,
        conflictCount: 0,
        timestamp: Date.now(),
      };

      // 1. 同步分组
      const groupResult = await this.syncGroups();
      result.uploadedCount += groupResult.uploaded;
      result.downloadedCount += groupResult.downloaded;

      // 2. 同步卡片
      const cardResult = await this.syncFlashcards();
      result.uploadedCount += cardResult.uploaded;
      result.downloadedCount += cardResult.downloaded;

      result.status = SyncStatus.Success;
      this.lastSyncTime = Date.now();

      console.info('✅ 同步完成:', result);
      return result;
    } catch (error) {
      console.error('❌ 同步失败:', error);
      return {
        status: SyncStatus.Error,
        uploadedCount: 0,
        downloadedCount: 0,
        conflictCount: 0,
        error: (error as Error).message,
        timestamp: Date.now(),
      };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * 同步分组
   */
  private async syncGroups(): Promise<{
    uploaded: number;
    downloaded: number;
    conflicts: number;
  }> {
    const client = supabaseService.getClient();
    const userId = supabaseService.getUserId();

    // 1. 获取本地所有分组
    const localGroups = await flashcardDB.getAllGroups();

    // 2. 获取云端所有分组（包括已删除的，以便正确处理删除同步）
    const { data: remoteGroups, error } = await client
      .from('groups')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      throw new Error(`获取云端分组失败: ${error.message}`);
    }

    const remoteGroupsMap = new Map(
      (remoteGroups || []).map(g => [g.id, g])
    );

    let uploaded = 0;
    let downloaded = 0;
    let localDeleted = 0;
    const conflicts = 0;

    // 3. 同步本地分组
    for (const localGroup of localGroups) {
      // 跳过默认分组（不需要同步到云端）
      if (localGroup.id === 'default') {
        continue;
      }

      const remoteGroup = remoteGroupsMap.get(localGroup.id);

      if (!remoteGroup) {
        // 本地新增，上传到云端
        await this.uploadGroup(localGroup, userId);
        uploaded++;
      } else if (remoteGroup.deleted) {
        // 云端已删除，删除本地分组
        await flashcardDB.deleteGroup(localGroup.id);
        localDeleted++;
        console.log(`🗑️ 删除本地分组（云端已删除）: ${localGroup.name} (${localGroup.id})`);
      } else if (localGroup.updatedAt > new Date(remoteGroup.updated_at).getTime()) {
        // 本地更新较新，上传到云端
        await this.uploadGroup(localGroup, userId);
        uploaded++;
      } else if (localGroup.updatedAt < new Date(remoteGroup.updated_at).getTime()) {
        // 云端更新较新，下载到本地
        await this.downloadGroup(remoteGroup);
        downloaded++;
      }

      remoteGroupsMap.delete(localGroup.id);
    }

    // 4. 处理云端存在但本地不存在的分组
    const localGroupIds = new Set(localGroups.map(g => g.id));
    let remoteDeleted = 0;

    for (const remoteGroup of remoteGroupsMap.values()) {
      if (remoteGroup.deleted) {
        // 云端已删除且本地也不存在，跳过
        continue;
      }

      // 云端存在且未删除，但本地不存在
      if (!localGroupIds.has(remoteGroup.id)) {
        // 说明是本地删除了，应该软删除云端
        await this.deleteRemoteGroup(remoteGroup.id);
        remoteDeleted++;
        console.log(`🗑️ 软删除云端分组（本地已删除）: ${remoteGroup.name} (${remoteGroup.id})`);
      }
    }

    console.log(`✅ 分组同步完成 - 上传: ${uploaded}, 下载: ${downloaded}, 本地删除: ${localDeleted}, 云端软删除: ${remoteDeleted}`);
    return { uploaded, downloaded, conflicts };
  }

  /**
   * 同步 Flashcards
   */
  private async syncFlashcards(): Promise<{
    uploaded: number;
    downloaded: number;
    conflicts: number;
  }> {
    const client = supabaseService.getClient();
    const userId = supabaseService.getUserId();

    // 1. 获取本地所有卡片
    const localCards = await flashcardDB.getAllFlashcards();

    // 2. 获取云端所有卡片（包括已删除的，以便正确处理删除同步）
    const { data: remoteCards, error } = await client
      .from('flashcards')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      throw new Error(`获取云端卡片失败: ${error.message}`);
    }

    const remoteCardsMap = new Map(
      (remoteCards || []).map(c => [c.id, c])
    );

    let uploaded = 0;
    let downloaded = 0;
    let localDeleted = 0;
    const conflicts = 0;

    // 3. 同步本地卡片
    for (const localCard of localCards) {
      const remoteCard = remoteCardsMap.get(localCard.id);

      if (!remoteCard) {
        // 本地新增，上传到云端
        await this.uploadFlashcard(localCard, userId);
        uploaded++;
      } else if (remoteCard.deleted) {
        // 云端已删除，删除本地卡片
        await flashcardDB.deleteFlashcard(localCard.id);
        localDeleted++;
        console.log(`🗑️ 删除本地卡片（云端已删除）: ${localCard.word} (${localCard.id})`);
      } else if (localCard.updatedAt > new Date(remoteCard.updated_at).getTime()) {
        // 本地更新较新，上传到云端
        await this.uploadFlashcard(localCard, userId);
        uploaded++;
      } else if (localCard.updatedAt < new Date(remoteCard.updated_at).getTime()) {
        // 云端更新较新，下载到本地
        await this.downloadFlashcard(remoteCard);
        downloaded++;
      }

      remoteCardsMap.delete(localCard.id);
    }

    // 4. 处理云端存在但本地不存在的卡片
    const localCardIds = new Set(localCards.map(c => c.id));
    let remoteDeleted = 0;

    for (const remoteCard of remoteCardsMap.values()) {
      if (remoteCard.deleted) {
        // 云端已删除且本地也不存在，跳过
        continue;
      }

      // 云端存在且未删除，但本地不存在
      if (!localCardIds.has(remoteCard.id)) {
        // 说明是本地删除了，应该软删除云端
        await this.deleteRemoteFlashcard(remoteCard.id);
        remoteDeleted++;
        console.log(`🗑️ 软删除云端卡片（本地已删除）: ${remoteCard.word} (${remoteCard.id})`);
      }
    }

    console.log(`✅ 卡片同步完成 - 上传: ${uploaded}, 下载: ${downloaded}, 本地删除: ${localDeleted}, 云端软删除: ${remoteDeleted}`);
    return { uploaded, downloaded, conflicts };
  }

  /**
   * 上传分组到云端
   */
  private async uploadGroup(group: FlashcardGroup, userId: string): Promise<void> {
    const client = supabaseService.getClient();

    const groupRow: Partial<GroupRow> = {
      id: group.id,
      user_id: userId,
      name: group.name,
      description: group.description || null,
      color: group.color || '#3b82f6',
      deleted: false, // 上传时标记为未删除
      deleted_at: null,
    };

    const { error } = await client
      .from('groups')
      .upsert(groupRow, { onConflict: 'id' });

    if (error) {
      throw new Error(`上传分组失败: ${error.message}`);
    }
  }

  /**
   * 下载分组到本地
   */
  private async downloadGroup(groupRow: GroupRow): Promise<void> {
    const group: FlashcardGroup = {
      id: groupRow.id,
      name: groupRow.name,
      description: groupRow.description || undefined,
      color: groupRow.color,
      cardCount: 0, // 将在本地重新计算
      createdAt: new Date(groupRow.created_at).getTime(),
      updatedAt: new Date(groupRow.updated_at).getTime(),
    };

    const existingGroup = await flashcardDB.getGroup(group.id);

    if (existingGroup) {
      // 保持本地的 cardCount
      group.cardCount = existingGroup.cardCount;
      await flashcardDB.updateGroup(group);
    } else {
      await flashcardDB.addGroup(group);
    }
  }

  /**
   * 删除云端分组（软删除）
   */
  private async deleteRemoteGroup(groupId: string): Promise<void> {
    const client = supabaseService.getClient();

    // 使用软删除：标记 deleted = true，记录删除时间
    const { error } = await client
      .from('groups')
      .update({
        deleted: true,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', groupId);

    if (error) {
      throw new Error(`删除云端分组失败: ${error.message}`);
    }
  }

  /**
   * 删除云端卡片（软删除）
   */
  private async deleteRemoteFlashcard(cardId: string): Promise<void> {
    const client = supabaseService.getClient();

    // 使用软删除：标记 deleted = true，记录删除时间
    const { error } = await client
      .from('flashcards')
      .update({
        deleted: true,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', cardId);

    if (error) {
      throw new Error(`删除云端卡片失败: ${error.message}`);
    }
  }

  /**
   * 上传 Flashcard 到云端
   * 将本地的 Flashcard 对象转换为云端的展开格式
   */
  private async uploadFlashcard(card: Flashcard, userId: string): Promise<void> {
    const client = supabaseService.getClient();

    // 转换本地 Flashcard 到云端格式
    const cardRow: Partial<FlashcardRow> = {
      id: card.id,
      user_id: userId,
      group_id: card.groupId === 'default' ? null : card.groupId,

      // 基础字段
      word: card.word,
      translation: card.translation,
      phonetic: card.phonetic || null,
      definitions: card.meanings || [],
      examples: card.examples || [],

      // FSRS 字段（展开存储）
      state: FSRS_STATE_TO_STRING[card.fsrsCard.state as keyof typeof FSRS_STATE_TO_STRING] || 'new',
      due: new Date(card.fsrsCard.due).toISOString(),
      stability: card.fsrsCard.stability,
      difficulty: card.fsrsCard.difficulty,
      elapsed_days: card.fsrsCard.elapsed_days,
      scheduled_days: card.fsrsCard.scheduled_days,
      reps: card.fsrsCard.reps,
      lapses: card.fsrsCard.lapses,
      last_review: card.fsrsCard.last_review ? new Date(card.fsrsCard.last_review).toISOString() : null,

      // 软删除字段
      deleted: false, // 上传时标记为未删除
      deleted_at: null,

      // 收藏字段
      favorite: card.favorite || false,
    };

    const { error } = await client
      .from('flashcards')
      .upsert(cardRow, { onConflict: 'id' });

    if (error) {
      throw new Error(`上传卡片失败: ${error.message}`);
    }
  }

  /**
   * 下载 Flashcard 到本地
   * 将云端的展开格式转换为本地的 Flashcard 对象
   */
  private async downloadFlashcard(cardRow: FlashcardRow): Promise<void> {
    // 转换云端格式到本地 Flashcard
    const card: Flashcard = {
      id: cardRow.id,
      word: cardRow.word,
      translation: cardRow.translation,
      pronunciation: undefined,
      examples: cardRow.examples || [],
      notes: undefined,
      phonetic: cardRow.phonetic || undefined,
      meanings: cardRow.definitions || [],

      // 这些字段在云端没有存储，使用默认值
      sourceLanguage: 'en' as LanguageCode,
      targetLanguage: 'zh' as LanguageCode,
      engine: 'google' as TranslationEngine,

      groupId: cardRow.group_id || 'default',
      tags: [],
      favorite: cardRow.favorite || false, // 从云端读取收藏状态

      // 重新组装 FSRS 数据
      fsrsCard: {
        state: FSRS_STRING_TO_STATE[cardRow.state] || 0,
        due: new Date(cardRow.due),
        stability: cardRow.stability,
        difficulty: cardRow.difficulty,
        elapsed_days: cardRow.elapsed_days,
        scheduled_days: cardRow.scheduled_days,
        reps: cardRow.reps,
        lapses: cardRow.lapses,
        last_review: cardRow.last_review ? new Date(cardRow.last_review) : undefined,
        learning_steps: 0, // FSRS 5.0+ 不再使用此字段
      },

      totalReviews: cardRow.reps,
      correctCount: cardRow.reps - cardRow.lapses,
      wrongCount: cardRow.lapses,
      averageResponseTime: 0,
      nextReview: new Date(cardRow.due),
      proficiency: this.calculateProficiency(cardRow),
      createdAt: new Date(cardRow.created_at).getTime(),
      updatedAt: new Date(cardRow.updated_at).getTime(),
    };

    const existingCard = await flashcardDB.getFlashcard(card.id);

    if (existingCard) {
      await flashcardDB.updateFlashcard(card);
    } else {
      await flashcardDB.addFlashcard(card);
    }
  }

  /**
   * 根据 FSRS 状态计算熟练度
   */
  private calculateProficiency(cardRow: FlashcardRow): ProficiencyLevel {
    const state = cardRow.state;
    const scheduledDays = cardRow.scheduled_days;

    if (state === 'new') {
      return ProficiencyLevel.New;
    } else if (state === 'learning' || state === 'relearning') {
      return ProficiencyLevel.Learning;
    } else if (state === 'review') {
      // 根据复习间隔判断是否已精通
      if (scheduledDays > 30) {
        return ProficiencyLevel.Mastered;
      } else {
        return ProficiencyLevel.Review;
      }
    }

    return ProficiencyLevel.New;
  }

  /**
   * 获取上次同步时间
   */
  getLastSyncTime(): number {
    return this.lastSyncTime;
  }

  /**
   * 检查是否正在同步
   */
  getIsSyncing(): boolean {
    return this.isSyncing;
  }

  /**
   * 触发防抖同步
   * 在数据变化时调用此方法，会在一定延迟后自动同步
   */
  triggerAutoSync(): void {
    if (!this.autoSyncEnabled) {
      console.log('自动同步已禁用');
      return;
    }

    if (!supabaseService.isAuthenticated()) {
      console.log('用户未登录，跳过自动同步');
      return;
    }

    // 清除现有的防抖计时器
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
    }

    // 设置新的防抖计时器
    this.syncDebounceTimer = setTimeout(() => {
      console.log('🔄 触发自动同步...');
      this.sync().catch(error => {
        console.error('自动同步失败:', error);
      });
    }, this.DEBOUNCE_DELAY);
  }

  /**
   * 启用自动同步
   */
  enableAutoSync(): void {
    const wasEnabled = this.autoSyncEnabled;
    this.autoSyncEnabled = true;

    if (!wasEnabled) {
      console.log('✅ 自动同步已启用');
    }

    // 启动定期同步（如果尚未启动）
    if (!this.periodicSyncTimer) {
      this.startPeriodicSync();
    }
  }

  /**
   * 启动定期同步
   */
  private startPeriodicSync(): void {
    // 清除现有的定时器
    if (this.periodicSyncTimer) {
      clearInterval(this.periodicSyncTimer);
    }

    // 设置新的定期同步定时器
    this.periodicSyncTimer = setInterval(() => {
      if (!supabaseService.isAuthenticated()) {
        console.log('⏭️ 用户未登录，跳过定期同步');
        return;
      }

      if (this.isSyncing) {
        console.log('⏭️ 同步正在进行中，跳过本次定期同步');
        return;
      }

      console.log('🔄 执行定期同步...');
      this.sync().catch(error => {
        console.error('定期同步失败:', error);
      });
    }, this.PERIODIC_SYNC_INTERVAL);

    console.log(`⏰ 定期同步已启动 (间隔: ${this.PERIODIC_SYNC_INTERVAL / 1000}秒)`);
  }

  /**
   * 停止定期同步
   */
  private stopPeriodicSync(): void {
    if (this.periodicSyncTimer) {
      clearInterval(this.periodicSyncTimer);
      this.periodicSyncTimer = null;
      console.log('⏰ 定期同步已停止');
    }
  }

  /**
   * 禁用自动同步
   */
  disableAutoSync(): void {
    if (!this.autoSyncEnabled) {
      return;
    }

    this.autoSyncEnabled = false;
    console.log('❌ 自动同步已禁用');

    // 清除防抖计时器
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
      this.syncDebounceTimer = null;
    }

    // 停止定期同步
    this.stopPeriodicSync();
  }

  /**
   * 检查自动同步是否启用
   */
  isAutoSyncEnabled(): boolean {
    return this.autoSyncEnabled;
  }
}

/**
 * 单例实例
 */
export const syncService = new SyncService();
