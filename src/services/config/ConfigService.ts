// 配置管理服务
import type { UserConfig } from '@/types';

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
 * 配置管理服务
 * 使用 Chrome Storage API 持久化用户配置
 */
export class ConfigService {
  private static readonly STORAGE_KEY = 'user_config';
  private static cachedConfig: UserConfig | null = null;

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
      const result = await chrome.storage.sync.get(this.STORAGE_KEY);
      const config = result[this.STORAGE_KEY] as UserConfig | undefined;

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
   * @param config 用户配置
   */
  static async saveConfig(config: Partial<UserConfig>): Promise<void> {
    try {
      // 获取当前配置
      const currentConfig = await this.getConfig();

      // 合并新配置
      const newConfig = {
        ...currentConfig,
        ...config,
      };

      // 保存到 Chrome Storage
      await chrome.storage.sync.set({
        [this.STORAGE_KEY]: newConfig,
      });

      // 更新缓存
      this.cachedConfig = newConfig;

      console.info('Config saved successfully:', newConfig);
    } catch (error) {
      console.error('Failed to save config:', error);
      throw new Error('保存配置失败');
    }
  }

  /**
   * 重置配置为默认值
   */
  static async resetConfig(): Promise<void> {
    try {
      await chrome.storage.sync.set({
        [this.STORAGE_KEY]: DEFAULT_CONFIG,
      });

      this.cachedConfig = { ...DEFAULT_CONFIG };

      console.info('Config reset to default');
    } catch (error) {
      console.error('Failed to reset config:', error);
      throw new Error('重置配置失败');
    }
  }

  /**
   * 清除配置缓存
   */
  static clearCache(): void {
    this.cachedConfig = null;
  }

  /**
   * 监听配置变化
   * @param callback 配置变化回调
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
}
