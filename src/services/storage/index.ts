import { ExtensionConfig, DEFAULT_CONFIG } from '../../types';

/**
 * 存储服务类 - 封装 Chrome Storage API
 */
class StorageService {
  /**
   * 获取完整配置
   */
  async getConfig(): Promise<ExtensionConfig> {
    return new Promise((resolve) => {
      chrome.storage.sync.get(DEFAULT_CONFIG, (items) => {
        resolve(items as ExtensionConfig);
      });
    });
  }

  /**
   * 更新配置（部分更新）
   */
  async updateConfig(config: Partial<ExtensionConfig>): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.set(config, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * 重置为默认配置
   */
  async resetConfig(): Promise<void> {
    return this.updateConfig(DEFAULT_CONFIG);
  }

  /**
   * 获取特定配置项
   */
  async get<K extends keyof ExtensionConfig>(key: K): Promise<ExtensionConfig[K]> {
    const config = await this.getConfig();
    return config[key];
  }

  /**
   * 设置特定配置项
   */
  async set<K extends keyof ExtensionConfig>(
    key: K,
    value: ExtensionConfig[K]
  ): Promise<void> {
    return this.updateConfig({ [key]: value } as Partial<ExtensionConfig>);
  }

  /**
   * 获取当前使用的API提供商
   */
  async getApiProvider() {
    return this.get('apiProvider');
  }

  /**
   * 设置API提供商
   */
  async setApiProvider(provider: ExtensionConfig['apiProvider']) {
    return this.set('apiProvider', provider);
  }

  /**
   * 获取API密钥
   */
  async getApiKey(provider: 'deepl' | 'openai'): Promise<string | undefined> {
    const config = await this.getConfig();
    return config.apiKeys[provider];
  }

  /**
   * 设置API密钥
   */
  async setApiKey(provider: 'deepl' | 'openai', key: string): Promise<void> {
    const config = await this.getConfig();
    config.apiKeys[provider] = key;
    return this.updateConfig({ apiKeys: config.apiKeys });
  }

  /**
   * 获取语言设置
   */
  async getLanguages() {
    const config = await this.getConfig();
    return {
      source: config.sourceLang,
      target: config.targetLang,
    };
  }

  /**
   * 设置语言
   */
  async setLanguages(
    source: ExtensionConfig['sourceLang'],
    target: ExtensionConfig['targetLang']
  ) {
    return this.updateConfig({
      sourceLang: source,
      targetLang: target,
    });
  }

  /**
   * 监听配置变化
   */
  onConfigChange(
    callback: (changes: { [key: string]: chrome.storage.StorageChange }) => void
  ) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync') {
        callback(changes);
      }
    });
  }
}

// 导出单例
export const storageService = new StorageService();
export default storageService;
