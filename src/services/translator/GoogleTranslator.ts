// Google 翻译服务实现
import type { TranslateParams, TranslateResult, LanguageCode } from '@/types';
import type { ITranslator } from './ITranslator';
import { NetworkError, ApiError, EmptyResultError, TimeoutError } from './errors';
import { validateTranslateParams, normalizeText, retry } from './utils';

/**
 * Google 翻译响应数据结构
 */
interface GoogleTranslateResponse {
  sentences?: Array<{
    trans?: string;
    orig?: string;
    backend?: number;
  }>;
  src?: string; // 检测到的源语言
  confidence?: number;
  spell?: Record<string, unknown>;
  ld_result?: {
    srclangs?: string[];
    srclangs_confidences?: number[];
    extended_srclangs?: string[];
  };
}

/**
 * Google 翻译服务
 * 使用 Google Translate 网页版的公开 API
 */
export class GoogleTranslator implements ITranslator {
  private readonly baseUrl = 'https://translate.googleapis.com/translate_a/single';
  private readonly timeout = 10000; // 10秒超时

  /**
   * Google 支持的语言代码映射
   */
  private readonly supportedLanguages = [
    'auto', 'zh-CN', 'zh-TW', 'en', 'ja', 'ko',
    'fr', 'de', 'es', 'ru', 'it', 'pt', 'ar',
    'nl', 'pl', 'th', 'vi', 'id', 'tr', 'hi'
  ];

  /**
   * 翻译文本
   */
  async translate(params: TranslateParams): Promise<TranslateResult> {
    const { text, from, to } = params;

    // 参数验证
    validateTranslateParams(text, from, to, this.supportedLanguages);

    // 文本标准化
    const normalizedText = normalizeText(text);

    // 使用重试机制执行翻译
    return retry(
      async () => {
        // 构建请求 URL
        const url = this.buildTranslateUrl(normalizedText, from, to);

        try {
          // 发送请求
          const response = await this.fetchWithTimeout(url, this.timeout);

          if (!response.ok) {
            throw new ApiError(
              `翻译请求失败: ${response.statusText}`,
              response.status
            );
          }

          const data: GoogleTranslateResponse = await response.json();

          // 解析翻译结果
          return this.parseTranslateResponse(data, normalizedText, from, to);
        } catch (error) {
          // 转换错误类型
          if (error instanceof ApiError || error instanceof EmptyResultError) {
            throw error;
          }

          if (error instanceof Error) {
            if (error.name === 'AbortError') {
              throw new TimeoutError();
            }

            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
              throw new NetworkError('网络连接失败', error);
            }
          }

          throw new NetworkError('翻译服务请求失败', error);
        }
      },
      {
        maxRetries: 2,
        delay: 1000,
        // 只重试网络错误和 5xx 错误
        shouldRetry: (error) => {
          if (error instanceof NetworkError) return true;
          if (error instanceof ApiError && error.statusCode && error.statusCode >= 500) return true;
          return false;
        }
      }
    );
  }

  /**
   * 检测文本语言
   */
  async detectLanguage(text: string): Promise<string> {
    if (!text || text.trim().length === 0) {
      return 'auto';
    }

    const url = this.buildTranslateUrl(text, 'auto', 'en');

    try {
      const response = await this.fetchWithTimeout(url, this.timeout);

      if (!response.ok) {
        throw new Error('语言检测失败');
      }

      const data: GoogleTranslateResponse = await response.json();

      return data.src || 'auto';
    } catch (error) {
      console.error('Language detection error:', error);
      return 'auto';
    }
  }

  /**
   * 获取支持的语言列表
   */
  getSupportedLanguages(): string[] {
    return [...this.supportedLanguages];
  }

  /**
   * 检查服务是否可用
   */
  async isAvailable(): Promise<boolean> {
    try {
      const result = await this.translate({
        text: 'Hello',
        from: 'en',
        to: 'zh-CN'
      });
      return result.translation.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * 构建翻译请求 URL
   */
  private buildTranslateUrl(text: string, from: LanguageCode, to: LanguageCode): string {
    const params = new URLSearchParams({
      client: 'gtx',
      sl: from === 'auto' ? 'auto' : this.normalizeLanguageCode(from),
      tl: this.normalizeLanguageCode(to),
      dt: 't', // 翻译文本
      ie: 'UTF-8',
      oe: 'UTF-8',
      q: text
    });

    return `${this.baseUrl}?${params.toString()}`;
  }

  /**
   * 解析翻译响应
   */
  private parseTranslateResponse(
    data: GoogleTranslateResponse,
    originalText: string,
    from: LanguageCode,
    to: LanguageCode
  ): TranslateResult {
    // 提取翻译文本
    const translation = data.sentences
      ?.map(sentence => sentence.trans || '')
      .join('')
      .trim() || '';

    if (!translation) {
      throw new EmptyResultError('翻译结果为空');
    }

    // 检测到的源语言
    const detectedLang = data.src || from;

    return {
      text: originalText,
      translation,
      from: detectedLang as LanguageCode,
      to,
      engine: 'google'
    };
  }

  /**
   * 标准化语言代码
   * 将我们的语言代码转换为 Google 支持的格式
   */
  private normalizeLanguageCode(code: LanguageCode): string {
    const mapping: Record<string, string> = {
      'zh-CN': 'zh-CN',
      'zh-TW': 'zh-TW',
      'en': 'en',
      'ja': 'ja',
      'ko': 'ko',
      'fr': 'fr',
      'de': 'de',
      'es': 'es',
      'ru': 'ru',
      'it': 'it',
      'auto': 'auto'
    };

    return mapping[code] || code;
  }

  /**
   * 带超时的 fetch 请求
   */
  private async fetchWithTimeout(url: string, timeout: number): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error; // 让上层处理错误转换
    }
  }
}
