import { TranslatorService, TranslateOptions, LanguageMap } from './types';
import { TranslateResponse, TranslateError, LanguageCode } from '../../types';

/**
 * Google 翻译服务
 * 使用 Google Translate API (免费版本)
 */
export class GoogleTranslator implements TranslatorService {
  readonly name = 'google' as const;
  private readonly API_URL = 'https://translate.googleapis.com/translate_a/single';

  /**
   * 语言代码映射
   */
  private languageMap: LanguageMap = {
    auto: 'auto',
    zh: 'zh-CN',
    en: 'en',
    ja: 'ja',
    ko: 'ko',
    fr: 'fr',
    de: 'de',
    es: 'es',
    ru: 'ru',
    it: 'it',
    pt: 'pt',
    ar: 'ar',
    th: 'th',
    vi: 'vi',
  };

  /**
   * 将通用语言代码转换为 Google 特定的语言代码
   */
  private mapLanguage(lang: LanguageCode): string {
    return this.languageMap[lang] || lang;
  }

  /**
   * 执行翻译
   */
  async translate(options: TranslateOptions): Promise<TranslateResponse> {
    const { text, from, to } = options;

    if (!text || !text.trim()) {
      throw new TranslateError('Text cannot be empty', 'API_ERROR');
    }

    try {
      const sourceLang = this.mapLanguage(from);
      const targetLang = this.mapLanguage(to);

      // 构建请求URL
      const params = new URLSearchParams({
        client: 'gtx',
        sl: sourceLang,
        tl: targetLang,
        dt: 't',
        q: text,
      });

      const url = `${this.API_URL}?${params.toString()}`;

      // 发送请求
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new TranslateError(
          `Google Translate API error: ${response.status}`,
          'API_ERROR'
        );
      }

      const data = await response.json();

      // 解析响应
      // Google API 返回的数据结构: [[[翻译文本, 原文本, null, null, 序号]], null, 检测到的语言, ...]
      if (!data || !Array.isArray(data) || !data[0]) {
        throw new TranslateError('Invalid response from Google Translate', 'API_ERROR');
      }

      // 提取翻译结果
      const translations = data[0];
      const translatedText = translations
        .map((item: any[]) => item[0])
        .filter((text: string) => text)
        .join('');

      // 提取检测到的源语言
      const detectedLanguage = data[2] as string | undefined;

      return {
        translatedText,
        detectedLanguage: this.reverseMapLanguage(detectedLanguage),
        provider: this.name,
      };
    } catch (error) {
      if (error instanceof TranslateError) {
        throw error;
      }

      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new TranslateError('Network error. Please check your connection.', 'NETWORK_ERROR');
      }

      throw new TranslateError(
        `Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'UNKNOWN'
      );
    }
  }

  /**
   * 反向映射语言代码（从 Google 代码转回通用代码）
   */
  private reverseMapLanguage(googleLang: string | undefined): LanguageCode | undefined {
    if (!googleLang) return undefined;

    // 查找映射表中的匹配项
    for (const [key, value] of Object.entries(this.languageMap)) {
      if (value === googleLang) {
        return key as LanguageCode;
      }
    }

    // 如果没有找到，尝试直接使用（处理 zh-CN -> zh 这种情况）
    if (googleLang.startsWith('zh')) return 'zh';

    return googleLang as LanguageCode;
  }

  /**
   * 获取支持的语言列表
   */
  getSupportedLanguages(): LanguageCode[] {
    return Object.keys(this.languageMap) as LanguageCode[];
  }
}

// 导出单例
export const googleTranslator = new GoogleTranslator();
export default googleTranslator;
