import { LanguageCode, ApiProvider, TranslateResponse } from '../../types';

/**
 * 翻译选项
 */
export interface TranslateOptions {
  text: string;
  from: LanguageCode;
  to: LanguageCode;
  apiKey?: string;
  provider?: ApiProvider;
}

/**
 * 翻译服务接口
 * 所有翻译服务都必须实现此接口
 */
export interface TranslatorService {
  /**
   * 服务名称
   */
  readonly name: ApiProvider;

  /**
   * 执行翻译
   */
  translate(options: TranslateOptions): Promise<TranslateResponse>;

  /**
   * 检查API密钥是否有效（可选）
   */
  validateApiKey?(apiKey: string): Promise<boolean>;

  /**
   * 获取支持的语言列表（可选）
   */
  getSupportedLanguages?(): LanguageCode[];
}

/**
 * 语言映射 - 用于将通用语言代码转换为特定API的语言代码
 */
export type LanguageMap = {
  [key in LanguageCode]?: string;
};

/**
 * 翻译结果缓存项
 */
export interface TranslateCacheItem {
  translatedText: string;
  timestamp: number;
  provider: ApiProvider;
}

/**
 * 翻译服务配置
 */
export interface TranslatorServiceConfig {
  apiKey?: string;
  timeout?: number;
  maxRetries?: number;
  [key: string]: any;
}
