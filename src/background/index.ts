// Background Service Worker for Chrome Extension
import type { Message } from '@/types/message';
import type { UserConfig } from '@/types';
import { TranslationManager } from '@/services/translation/TranslationManager';
import { ConfigService, ConfigValidationError, StorageQuotaError } from '@/services/config/ConfigService';
import { flashcardService } from '@/services/flashcard';
import { supabaseService, syncService } from '@/services/sync';
import { flashcardDB } from '@/services/flashcard/FlashcardDB';

console.info('Background service worker started');

// 初始化 Supabase
supabaseService.initialize();

// 连接 FlashcardDB 数据变化事件到自动同步
flashcardDB.setOnDataChange(() => {
  console.log('📝 数据变化检测，准备触发自动同步...');
  syncService.triggerAutoSync();
});

// 启用自动同步（包括定期同步）
syncService.enableAutoSync();

console.info('✅ 自动同步已启用');

// 监听扩展安装事件
chrome.runtime.onInstalled.addListener(async details => {
  console.info('Extension installed:', details.reason);

  if (details.reason === 'install') {
    // 首次安装，初始化默认配置
    const defaultConfig = ConfigService.getDefaultConfig();
    await ConfigService.saveConfig(defaultConfig);

    // 初始化默认分组
    await flashcardService.ensureDefaultGroup();

    // 打开欢迎页面
    chrome.tabs.create({
      url: chrome.runtime.getURL('src/options/index.html?welcome=true'),
    });
  } else if (details.reason === 'update') {
    console.info('Extension updated');
    // 更新时也确保默认分组存在（兼容旧版本）
    await flashcardService.ensureDefaultGroup();
  }
});

// 监听来自 Content Script 和 Popup 的消息
chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  // 异步处理消息
  handleMessage(message, sender)
    .then(response => {
      sendResponse({ success: true, data: response });
    })
    .catch(error => {
      console.error('Message handler error:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      });
    });

  // 返回 true 表示异步响应
  return true;
});

// 消息处理函数
async function handleMessage(message: Message, _sender: chrome.runtime.MessageSender) {
  const { type, payload } = message;

  switch (type) {
    case 'PING':
      return { message: 'PONG' };

    case 'GET_CONFIG': {
      // 获取用户配置
      const config = await ConfigService.getConfig();
      return config;
    }

    case 'SAVE_CONFIG': {
      // 保存用户配置
      const { config } = payload as { config: UserConfig };
      try {
        await ConfigService.saveConfig(config);
        return { success: true };
      } catch (error) {
        if (error instanceof ConfigValidationError) {
          throw new Error(`配置验证失败: ${error.message}`);
        }
        if (error instanceof StorageQuotaError) {
          throw new Error(`存储空间不足: ${error.message}`);
        }
        throw error;
      }
    }

    case 'RESET_CONFIG': {
      // 重置配置为默认值
      await ConfigService.resetConfig();
      return { success: true };
    }

    case 'EXPORT_CONFIG': {
      // 导出配置
      const configJson = await ConfigService.exportConfig();
      return configJson;
    }

    case 'IMPORT_CONFIG': {
      // 导入配置
      const { configJson } = payload as { configJson: string };
      try {
        await ConfigService.importConfig(configJson);
        return { success: true };
      } catch (error) {
        if (error instanceof ConfigValidationError) {
          throw new Error(`配置导入失败: ${error.message}`);
        }
        throw error;
      }
    }

    case 'GET_STORAGE_QUOTA': {
      // 获取存储配额信息
      const quota = await ConfigService.getStorageQuota();
      return quota;
    }

    case 'TRANSLATE': {
      // 执行翻译
      const result = await TranslationManager.translate(payload);
      return result;
    }

    case 'CREATE_FLASHCARD': {
      // 创建 Flashcard
      const { translation, groupId } = payload as { translation: any; groupId: string };

      // 确保默认分组存在
      await flashcardService.ensureDefaultGroup();

      // 创建flashcard
      const flashcard = await flashcardService.createFromTranslation(translation, {
        groupId: groupId || 'default'
      });

      return flashcard;
    }

    case 'GET_FLASHCARDS': {
      // 获取所有 Flashcards
      const flashcards = await flashcardService.getAll();
      return flashcards;
    }

    case 'GET_FLASHCARD_GROUPS': {
      // 获取所有分组
      const groups = await flashcardService.getAllGroups();
      return groups;
    }

    case 'CHECK_FLASHCARD_EXISTS': {
      // 检查卡片是否存在
      const { word, sourceLanguage, targetLanguage } = payload as {
        word: string;
        sourceLanguage: string;
        targetLanguage: string;
      };
      const exists = await flashcardService.exists(word, sourceLanguage, targetLanguage);
      return exists;
    }

    case 'SAVE_SELECTION': {
      // 保存划词内容到 session storage（由 content script 触发）
      const { text, timestamp } = payload as { text: string; timestamp: number };
      await chrome.storage.session.set({
        recentSelectionText: text,
        recentSelectionTimestamp: timestamp
      });
      return { success: true };
    }

    // ==================== Supabase 同步 ====================

    case 'SUPABASE_SIGN_IN': {
      // 登录
      const { email, password } = payload as { email: string; password: string };
      const user = await supabaseService.signInWithPassword(email, password);
      return { user };
    }

    case 'SUPABASE_SIGN_UP': {
      // 注册
      const { email, password } = payload as { email: string; password: string };
      const user = await supabaseService.signUp(email, password);
      return { user };
    }

    case 'SUPABASE_SIGN_OUT': {
      // 登出
      await supabaseService.signOut();
      return { success: true };
    }

    case 'SUPABASE_GET_USER': {
      // 获取当前用户
      const user = supabaseService.getCurrentUser();
      return { user };
    }

    case 'SYNC_NOW': {
      // 立即同步
      const result = await syncService.sync();
      return result;
    }

    case 'GET_SYNC_STATUS': {
      // 获取同步状态
      return {
        isSyncing: syncService.getIsSyncing(),
        lastSyncTime: syncService.getLastSyncTime(),
        isAuthenticated: supabaseService.isAuthenticated(),
        autoSyncEnabled: syncService.isAutoSyncEnabled(),
      };
    }

    case 'ENABLE_AUTO_SYNC': {
      // 启用自动同步
      syncService.enableAutoSync();
      return { success: true };
    }

    case 'DISABLE_AUTO_SYNC': {
      // 禁用自动同步
      syncService.disableAutoSync();
      return { success: true };
    }

    default:
      throw new Error(`Unknown message type: ${type}`);
  }
}

// 监听快捷键命令
chrome.commands.onCommand.addListener(command => {
  if (command === 'translate-selection') {
    // 触发划词翻译
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'TRIGGER_TRANSLATE',
          payload: null,
        });
      }
    });
  }
});

// 监听配置变化
ConfigService.onConfigChange(async (_config) => {
  // 清除翻译缓存（当引擎切换时）
  await TranslationManager.clearCache();
});

console.info('Background service worker initialized');
