import { TranslatorService, TranslateOptions } from './types';
import { ApiProvider, TranslateResponse } from '../../types';
import { googleTranslator } from './google';
import { deeplTranslator } from './deepl';
import { openaiTranslator } from './openai';
import storageService from '../storage';

/**
 * 翻译服务工厂
 */
class TranslatorFactory {
  private services: Map<ApiProvider, TranslatorService>;

  constructor() {
    this.services = new Map<ApiProvider, TranslatorService>([
      ['google', googleTranslator],
      ['deepl', deeplTranslator],
      ['openai', openaiTranslator],
    ]);
  }

  /**
   * 获取指定的翻译服务
   */
  getService(provider: ApiProvider): TranslatorService {
    const service = this.services.get(provider);
    if (!service) {
      throw new Error(`Unknown translation provider: ${provider}`);
    }
    return service;
  }

  /**
   * 注册新的翻译服务
   */
  registerService(provider: ApiProvider, service: TranslatorService) {
    this.services.set(provider, service);
  }

  /**
   * 获取所有可用的服务
   */
  getAllServices(): TranslatorService[] {
    return Array.from(this.services.values());
  }

  /**
   * 使用配置的服务进行翻译
   */
  async translate(options: TranslateOptions): Promise<TranslateResponse> {
    const config = await storageService.getConfig();
    const provider = options.provider || config.apiProvider;

    const service = this.getService(provider);

    // 如果需要 API 密钥，从配置中获取
    let apiKey = options.apiKey;
    if (!apiKey && (provider === 'deepl' || provider === 'openai')) {
      apiKey = await storageService.getApiKey(provider);
    }

    return service.translate({
      ...options,
      apiKey,
    });
  }
}

// 导出单例
export const translatorFactory = new TranslatorFactory();

// 导出各个服务
export { googleTranslator, deeplTranslator, openaiTranslator };

// 导出类型
export * from './types';

export default translatorFactory;
