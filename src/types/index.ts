// 全局类型定义

// 翻译引擎类型
export type TranslationEngine = 'google' | 'deepl' | 'openai';

// 语言代码类型
export type LanguageCode = 'auto' | 'zh-CN' | 'zh-TW' | 'en' | 'ja' | 'ko' | 'fr' | 'de' | 'es' | 'ru' | 'it';

// 翻译请求参数
export interface TranslateParams {
  text: string;
  from: LanguageCode;
  to: LanguageCode;
}

// 翻译结果
export interface TranslateResult {
  text: string;           // 原文
  translation: string;    // 译文
  from: LanguageCode;     // 源语言
  to: LanguageCode;       // 目标语言
  engine: TranslationEngine; // 使用的引擎
  pronunciation?: string; // 发音
  examples?: string[];    // 例句
  alternatives?: string[]; // 备选翻译
}

// 用户配置
export interface UserConfig {
  engine: TranslationEngine;
  defaultSourceLang: LanguageCode;
  defaultTargetLang: LanguageCode;
  googleApiKey?: string;
  deeplApiKey?: string;
  deeplPro?: boolean;
  theme?: 'light' | 'dark' | 'auto';
  enableShortcut?: boolean;
  enableHistory?: boolean;
  defaultFlashcardGroupId?: string;  // 默认的 Flashcard 分组 ID
}

// 翻译历史记录
export interface TranslationHistory {
  id: string;
  text: string;
  translation: string;
  from: LanguageCode;
  to: LanguageCode;
  engine: TranslationEngine;
  timestamp: number;
  favorite?: boolean;
}

// 导出 Flashcard 相关类型
export * from './flashcard';
