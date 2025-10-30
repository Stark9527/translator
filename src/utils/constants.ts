/**
 * 常量定义
 */

// 支持的语言列表
export const SUPPORTED_LANGUAGES = [
  { code: 'auto', name: '自动检测' },
  { code: 'zh', name: '中文' },
  { code: 'en', name: '英语' },
  { code: 'ja', name: '日语' },
  { code: 'ko', name: '韩语' },
  { code: 'fr', name: '法语' },
  { code: 'de', name: '德语' },
  { code: 'es', name: '西班牙语' },
  { code: 'ru', name: '俄语' },
  { code: 'it', name: '意大利语' },
  { code: 'pt', name: '葡萄牙语' },
  { code: 'ar', name: '阿拉伯语' },
  { code: 'th', name: '泰语' },
  { code: 'vi', name: '越南语' },
] as const;

// API 提供商列表
export const API_PROVIDERS = [
  { code: 'google', name: 'Google 翻译', requiresKey: false },
  { code: 'deepl', name: 'DeepL', requiresKey: true },
  { code: 'openai', name: 'OpenAI', requiresKey: true },
] as const;

// 消息动作类型
export const MESSAGE_ACTIONS = {
  TRANSLATE: 'translate',
  GET_CONFIG: 'getConfig',
  UPDATE_CONFIG: 'updateConfig',
  VALIDATE_API_KEY: 'validateApiKey',
} as const;

// 默认超时时间（毫秒）
export const DEFAULT_TIMEOUT = 30000;

// 最小翻译文本长度
export const MIN_TEXT_LENGTH = 1;

// 最大翻译文本长度
export const MAX_TEXT_LENGTH = 5000;
