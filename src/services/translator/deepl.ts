import { TranslatorService, TranslateOptions, LanguageMap } from './types';
import { TranslateResponse, TranslateError, LanguageCode } from '../../types';

/**
 * DeepL 翻译服务
 * 需要 API 密钥
 */
export class DeepLTranslator implements TranslatorService {
  readonly name = 'deepl' as const;

  // DeepL API 端点
  private readonly FREE_API_URL = 'https://api-free.deepl.com/v2/translate';
  private readonly PRO_API_URL = 'https://api.deepl.com/v2/translate';

  /**
   * 语言代码映射
   */
  private languageMap: LanguageMap = {
    auto: 'auto', // DeepL 会自动检测
    zh: 'ZH',
    en: 'EN',
    ja: 'JA',
    ko: 'KO',
    fr: 'FR',
    de: 'DE',
    es: 'ES',
    ru: 'RU',
    it: 'IT',
    pt: 'PT',
    ar: 'AR',
  };

  /**
   * 将通用语言代码转换为 DeepL 特定的语言代码
   */
  private mapLanguage(lang: LanguageCode): string {
    return this.languageMap[lang] || lang.toUpperCase();
  }

  /**
   * 判断是否为免费版 API Key
   */
  private isFreeApiKey(apiKey: string): boolean {
    return apiKey.endsWith(':fx');
  }

  /**
   * 获取正确的 API URL
   */
  private getApiUrl(apiKey: string): string {
    return this.isFreeApiKey(apiKey) ? this.FREE_API_URL : this.PRO_API_URL;
  }

  /**
   * 执行翻译
   */
  async translate(options: TranslateOptions): Promise<TranslateResponse> {
    const { text, from, to, apiKey } = options;

    if (!text || !text.trim()) {
      throw new TranslateError('Text cannot be empty', 'API_ERROR');
    }

    if (!apiKey) {
      throw new TranslateError('DeepL API key is required', 'INVALID_KEY');
    }

    try {
      const targetLang = this.mapLanguage(to);
      const apiUrl = this.getApiUrl(apiKey);

      // 构建请求体
      const body: any = {
        text: [text],
        target_lang: targetLang,
      };

      // 如果指定了源语言（不是 auto），则添加到请求中
      if (from !== 'auto') {
        body.source_lang = this.mapLanguage(from);
      }

      // 发送请求
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `DeepL-Auth-Key ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      // 处理错误响应
      if (!response.ok) {
        if (response.status === 403 || response.status === 401) {
          throw new TranslateError('Invalid DeepL API key', 'INVALID_KEY');
        }
        if (response.status === 456) {
          throw new TranslateError('DeepL quota exceeded', 'RATE_LIMIT');
        }
        throw new TranslateError(
          `DeepL API error: ${response.status}`,
          'API_ERROR'
        );
      }

      const data = await response.json();

      // 解析响应
      if (!data.translations || !Array.isArray(data.translations) || data.translations.length === 0) {
        throw new TranslateError('Invalid response from DeepL', 'API_ERROR');
      }

      const translation = data.translations[0];

      return {
        translatedText: translation.text,
        detectedLanguage: this.reverseMapLanguage(translation.detected_source_language),
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
   * 反向映射语言代码
   */
  private reverseMapLanguage(deeplLang: string | undefined): LanguageCode | undefined {
    if (!deeplLang) return undefined;

    const upperLang = deeplLang.toUpperCase();
    for (const [key, value] of Object.entries(this.languageMap)) {
      if (value === upperLang) {
        return key as LanguageCode;
      }
    }

    return deeplLang.toLowerCase() as LanguageCode;
  }

  /**
   * 验证 API 密钥
   */
  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.getApiUrl(apiKey)}/usage`, {
        method: 'GET',
        headers: {
          'Authorization': `DeepL-Auth-Key ${apiKey}`,
        },
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * 获取支持的语言列表
   */
  getSupportedLanguages(): LanguageCode[] {
    return Object.keys(this.languageMap) as LanguageCode[];
  }
}

// 导出单例
export const deeplTranslator = new DeepLTranslator();
export default deeplTranslator;
