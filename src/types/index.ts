// 翻译API提供商
export type ApiProvider = 'google' | 'deepl' | 'openai';

// 语言代码
export type LanguageCode = 'auto' | 'zh' | 'en' | 'ja' | 'ko' | 'fr' | 'de' | 'es' | 'ru' | 'it' | 'pt' | 'ar' | 'th' | 'vi';

// 扩展配置
export interface ExtensionConfig {
  // 当前使用的API提供商
  apiProvider: ApiProvider;

  // 源语言
  sourceLang: LanguageCode;

  // 目标语言
  targetLang: LanguageCode;

  // 是否启用划词翻译
  enableSelection: boolean;

  // API密钥配置
  apiKeys: {
    deepl?: string;
    openai?: string;
  };

  // OpenAI模型配置
  openaiModel?: string;
}

// 默认配置
export const DEFAULT_CONFIG: ExtensionConfig = {
  apiProvider: 'google',
  sourceLang: 'auto',
  targetLang: 'zh',
  enableSelection: true,
  apiKeys: {},
  openaiModel: 'gpt-3.5-turbo',
};

// 翻译请求
export interface TranslateRequest {
  text: string;
  from: LanguageCode;
  to: LanguageCode;
  provider?: ApiProvider;
}

// 翻译响应
export interface TranslateResponse {
  translatedText: string;
  detectedLanguage?: LanguageCode;
  provider: ApiProvider;
}

// 翻译错误
export class TranslateError extends Error {
  constructor(
    message: string,
    public code: 'API_ERROR' | 'NETWORK_ERROR' | 'INVALID_KEY' | 'RATE_LIMIT' | 'UNKNOWN'
  ) {
    super(message);
    this.name = 'TranslateError';
  }
}

// 消息类型
export interface Message {
  action: string;
  [key: string]: any;
}

// 翻译消息
export interface TranslateMessage extends Message {
  action: 'translate';
  text: string;
  from: LanguageCode;
  to: LanguageCode;
}

// 获取配置消息
export interface GetConfigMessage extends Message {
  action: 'getConfig';
}

// 更新配置消息
export interface UpdateConfigMessage extends Message {
  action: 'updateConfig';
  config: Partial<ExtensionConfig>;
}

// 消息响应
export interface MessageResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
