// 配置管理服务
import type { UserConfig, TranslationEngine, LanguageCode } from '@/types';

/**
 * 配置版本（用于未来的配置迁移）
 */
const CONFIG_VERSION = 1;

/**
 * 默认配置
 */
const DEFAULT_CONFIG: UserConfig = {
  engine: 'google',
  defaultSourceLang: 'auto',
  defaultTargetLang: 'zh-CN',
  googleApiKey: undefined,
  theme: 'auto',
  enableShortcut: true,
  enableHistory: true,
};

/**
 * 配置存储结构（包含版本信息）
 */
interface ConfigStorage {
  version: number;
  config: UserConfig;
  lastModified: number;
}

/**
 * 配置验证错误
 */
export class ConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

/**
 * 存储配额错误
 */
export class StorageQuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageQuotaError';
  }
}

/**
 * 配置变更监听器类型
 */
type ConfigChangeListener = (config: UserConfig, changes: Partial<UserConfig>) => void;

/**
 * 配置管理服务
 * 使用 Chrome Storage API 持久化用户配置
 *
 * 功能特性：
 * - 配置验证
 * - 导入/导出
 * - Quota 监控
 * - 版本管理
 * - 变更通知
 */
export class ConfigService {
  private static readonly STORAGE_KEY = 'user_config';
  private static readonly VERSION_KEY = 'config_version';
  private static cachedConfig: UserConfig | null = null;
  private static changeListeners: Set<ConfigChangeListener> = new Set();

  /**
   * 验证配置对象是否有效
   * @param config 配置对象
   * @throws {ConfigValidationError} 配置无效时抛出
   */
  private static validateConfig(config: Partial<UserConfig>): void {
    const errors: string[] = [];

    // 验证翻译引擎
    if (config.engine !== undefined) {
      const validEngines: TranslationEngine[] = ['google', 'deepl', 'openai'];
      if (!validEngines.includes(config.engine)) {
        errors.push(`无效的翻译引擎: ${config.engine}`);
      }
    }

    // 验证语言代码
    const validLangCodes: LanguageCode[] = ['auto', 'zh-CN', 'zh-TW', 'en', 'ja', 'ko', 'fr', 'de', 'es', 'ru', 'it'];

    if (config.defaultSourceLang !== undefined && !validLangCodes.includes(config.defaultSourceLang)) {
      errors.push(`无效的源语言代码: ${config.defaultSourceLang}`);
    }

    if (config.defaultTargetLang !== undefined && !validLangCodes.includes(config.defaultTargetLang)) {
      errors.push(`无效的目标语言代码: ${config.defaultTargetLang}`);
    }

    // 验证 API Key 格式（基础验证）
    if (config.googleApiKey !== undefined && config.googleApiKey !== '') {
      if (typeof config.googleApiKey !== 'string' || config.googleApiKey.length < 10) {
        errors.push('Google API Key 格式无效');
      }
    }

    if (config.deeplApiKey !== undefined && config.deeplApiKey !== '') {
      if (typeof config.deeplApiKey !== 'string' || config.deeplApiKey.length < 10) {
        errors.push('DeepL API Key 格式无效');
      }
    }

    // 验证主题
    if (config.theme !== undefined) {
      const validThemes = ['light', 'dark', 'auto'];
      if (!validThemes.includes(config.theme)) {
        errors.push(`无效的主题: ${config.theme}`);
      }
    }

    // 验证布尔值
    if (config.enableShortcut !== undefined && typeof config.enableShortcut !== 'boolean') {
      errors.push('enableShortcut 必须是布尔值');
    }

    if (config.enableHistory !== undefined && typeof config.enableHistory !== 'boolean') {
      errors.push('enableHistory 必须是布尔值');
    }

    if (config.deeplPro !== undefined && typeof config.deeplPro !== 'boolean') {
      errors.push('deeplPro 必须是布尔值');
    }

    if (errors.length > 0) {
      throw new ConfigValidationError(`配置验证失败:\n${errors.join('\n')}`);
    }
  }

  /**
   * 检查存储配额使用情况
   * @returns 配额信息
   */
  static async getStorageQuota(): Promise<{
    used: number;
    total: number;
    percentage: number;
  }> {
    try {
      const bytesInUse = await chrome.storage.sync.getBytesInUse();
      const QUOTA_BYTES = chrome.storage.sync.QUOTA_BYTES || 102400; // 100KB

      return {
        used: bytesInUse,
        total: QUOTA_BYTES,
        percentage: Math.round((bytesInUse / QUOTA_BYTES) * 100),
      };
    } catch (error) {
      console.error('Failed to get storage quota:', error);
      return {
        used: 0,
        total: 102400,
        percentage: 0,
      };
    }
  }

  /**
   * 检查配置大小是否超过限制
   * @param config 配置对象
   * @throws {StorageQuotaError} 超过配额时抛出
   */
  private static async checkQuota(config: UserConfig): Promise<void> {
    const configStr = JSON.stringify({ [this.STORAGE_KEY]: config });
    const configSize = new Blob([configStr]).size;
    const QUOTA_BYTES_PER_ITEM = chrome.storage.sync.QUOTA_BYTES_PER_ITEM || 8192; // 8KB

    if (configSize > QUOTA_BYTES_PER_ITEM) {
      throw new StorageQuotaError(
        `配置大小 (${configSize} bytes) 超过单项限制 (${QUOTA_BYTES_PER_ITEM} bytes)`
      );
    }

    const quota = await this.getStorageQuota();
    if (quota.percentage > 90) {
      console.warn(`Storage quota usage high: ${quota.percentage}%`);
    }
  }

  /**
   * 迁移旧版本配置到新版本
   * @param config 旧配置
   * @param fromVersion 源版本
   * @returns 迁移后的配置
   */
  private static migrateConfig(config: any, fromVersion: number): UserConfig {
    let migratedConfig = { ...config };

    // 版本 0 -> 1: 添加新字段
    if (fromVersion < 1) {
      migratedConfig = {
        ...DEFAULT_CONFIG,
        ...migratedConfig,
      };
    }

    // 未来的版本迁移逻辑在这里添加
    // if (fromVersion < 2) { ... }

    return migratedConfig;
  }

  /**
   * 获取用户配置
   * @returns 用户配置
   */
  static async getConfig(): Promise<UserConfig> {
    // 如果有缓存，直接返回
    if (this.cachedConfig) {
      return { ...this.cachedConfig };
    }

    try {
      const result = await chrome.storage.sync.get([this.STORAGE_KEY, this.VERSION_KEY]);
      const storedVersion = result[this.VERSION_KEY] as number | undefined;
      let config = result[this.STORAGE_KEY] as UserConfig | undefined;

      // 配置迁移
      if (config && storedVersion !== undefined && storedVersion < CONFIG_VERSION) {
        console.info(`Migrating config from version ${storedVersion} to ${CONFIG_VERSION}`);
        config = this.migrateConfig(config, storedVersion);

        // 保存迁移后的配置
        await chrome.storage.sync.set({
          [this.STORAGE_KEY]: config,
          [this.VERSION_KEY]: CONFIG_VERSION,
        });
      }

      // 合并默认配置和用户配置
      this.cachedConfig = {
        ...DEFAULT_CONFIG,
        ...config,
      };

      return { ...this.cachedConfig };
    } catch (error) {
      console.error('Failed to load config:', error);
      return { ...DEFAULT_CONFIG };
    }
  }

  /**
   * 保存用户配置
   * @param config 用户配置（可以是部分配置）
   * @throws {ConfigValidationError} 配置验证失败
   * @throws {StorageQuotaError} 超过存储配额
   */
  static async saveConfig(config: Partial<UserConfig>): Promise<void> {
    try {
      // 验证配置
      this.validateConfig(config);

      // 获取当前配置
      const currentConfig = await this.getConfig();

      // 合并新配置
      const newConfig: UserConfig = {
        ...currentConfig,
        ...config,
      };

      // 检查配额
      await this.checkQuota(newConfig);

      // 保存到 Chrome Storage
      await chrome.storage.sync.set({
        [this.STORAGE_KEY]: newConfig,
        [this.VERSION_KEY]: CONFIG_VERSION,
      });

      // 计算变更的字段
      const changes: Partial<UserConfig> = {};
      for (const key in config) {
        if (config[key as keyof UserConfig] !== currentConfig[key as keyof UserConfig]) {
          changes[key as keyof UserConfig] = config[key as keyof UserConfig] as any;
        }
      }

      // 更新缓存
      this.cachedConfig = newConfig;

      // 通知监听器
      this.notifyListeners(newConfig, changes);

      console.info('Config saved successfully:', newConfig);
    } catch (error) {
      if (error instanceof ConfigValidationError || error instanceof StorageQuotaError) {
        throw error;
      }
      console.error('Failed to save config:', error);
      throw new Error('保存配置失败: ' + (error as Error).message);
    }
  }

  /**
   * 重置配置为默认值
   */
  static async resetConfig(): Promise<void> {
    try {
      await chrome.storage.sync.set({
        [this.STORAGE_KEY]: DEFAULT_CONFIG,
        [this.VERSION_KEY]: CONFIG_VERSION,
      });

      const oldConfig = this.cachedConfig;
      this.cachedConfig = { ...DEFAULT_CONFIG };

      // 通知监听器
      if (oldConfig) {
        this.notifyListeners(this.cachedConfig, this.cachedConfig);
      }

      console.info('Config reset to default');
    } catch (error) {
      console.error('Failed to reset config:', error);
      throw new Error('重置配置失败');
    }
  }

  /**
   * 导出配置为 JSON 字符串
   * @returns 配置 JSON 字符串
   */
  static async exportConfig(): Promise<string> {
    const config = await this.getConfig();
    const exportData: ConfigStorage = {
      version: CONFIG_VERSION,
      config,
      lastModified: Date.now(),
    };
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * 从 JSON 字符串导入配置
   * @param jsonStr 配置 JSON 字符串
   * @throws {ConfigValidationError} 配置格式无效
   */
  static async importConfig(jsonStr: string): Promise<void> {
    try {
      const importData = JSON.parse(jsonStr) as ConfigStorage;

      // 验证导入数据格式
      if (!importData.config || typeof importData.config !== 'object') {
        throw new ConfigValidationError('导入数据格式无效');
      }

      // 处理版本差异
      let config = importData.config;
      if (importData.version < CONFIG_VERSION) {
        config = this.migrateConfig(config, importData.version);
      }

      // 验证配置
      this.validateConfig(config);

      // 保存配置
      await this.saveConfig(config);

      console.info('Config imported successfully');
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new ConfigValidationError('配置 JSON 格式错误');
      }
      throw error;
    }
  }

  /**
   * 清除配置缓存
   */
  static clearCache(): void {
    this.cachedConfig = null;
  }

  /**
   * 添加配置变更监听器
   * @param callback 配置变化回调
   * @returns 取消监听函数
   */
  static addConfigChangeListener(callback: ConfigChangeListener): () => void {
    this.changeListeners.add(callback);

    // 返回取消监听函数
    return () => {
      this.changeListeners.delete(callback);
    };
  }

  /**
   * 通知所有监听器配置已变更
   * @param config 新配置
   * @param changes 变更的字段
   */
  private static notifyListeners(config: UserConfig, changes: Partial<UserConfig>): void {
    this.changeListeners.forEach(listener => {
      try {
        listener(config, changes);
      } catch (error) {
        console.error('Error in config change listener:', error);
      }
    });
  }

  /**
   * 监听配置变化（Chrome Storage 同步）
   * @param callback 配置变化回调
   * @deprecated 请使用 addConfigChangeListener 代替
   */
  static onConfigChange(callback: (config: UserConfig) => void): void {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync' && changes[this.STORAGE_KEY]) {
        const newConfig = changes[this.STORAGE_KEY].newValue as UserConfig;
        this.cachedConfig = newConfig;
        callback(newConfig);
      }
    });
  }

  /**
   * 获取默认配置
   */
  static getDefaultConfig(): UserConfig {
    return { ...DEFAULT_CONFIG };
  }

  /**
   * 检查配置是否已初始化
   * @returns 是否已配置
   */
  static async isConfigured(): Promise<boolean> {
    const config = await this.getConfig();

    // 检查关键配置项
    if (config.engine === 'google') {
      return !!config.googleApiKey;
    }
    if (config.engine === 'deepl') {
      return !!config.deeplApiKey;
    }

    return false;
  }

  /**
   * 获取配置状态信息
   * @returns 配置状态
   */
  static async getConfigStatus(): Promise<{
    configured: boolean;
    engine: TranslationEngine;
    hasApiKey: boolean;
    quotaUsage: number;
  }> {
    const config = await this.getConfig();
    const quota = await this.getStorageQuota();

    let hasApiKey = false;
    if (config.engine === 'google') {
      hasApiKey = !!config.googleApiKey;
    } else if (config.engine === 'deepl') {
      hasApiKey = !!config.deeplApiKey;
    }

    return {
      configured: await this.isConfigured(),
      engine: config.engine,
      hasApiKey,
      quotaUsage: quota.percentage,
    };
  }
}
