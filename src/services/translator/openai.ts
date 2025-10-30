import { TranslatorService, TranslateOptions } from './types';
import { TranslateResponse, TranslateError, LanguageCode } from '../../types';

/**
 * OpenAI 翻译服务
 * 使用 GPT 模型进行翻译
 */
export class OpenAITranslator implements TranslatorService {
  readonly name = 'openai' as const;
  private readonly API_URL = 'https://api.openai.com/v1/chat/completions';
  private model: string = 'gpt-3.5-turbo';

  /**
   * 语言名称映射（用于构建 prompt）
   */
  private languageNames: Record<LanguageCode, string> = {
    auto: 'auto-detect',
    zh: 'Chinese',
    en: 'English',
    ja: 'Japanese',
    ko: 'Korean',
    fr: 'French',
    de: 'German',
    es: 'Spanish',
    ru: 'Russian',
    it: 'Italian',
    pt: 'Portuguese',
    ar: 'Arabic',
    th: 'Thai',
    vi: 'Vietnamese',
  };

  /**
   * 设置使用的模型
   */
  setModel(model: string) {
    this.model = model;
  }

  /**
   * 获取语言名称
   */
  private getLanguageName(lang: LanguageCode): string {
    return this.languageNames[lang] || lang;
  }

  /**
   * 构建翻译 prompt
   */
  private buildPrompt(text: string, from: LanguageCode, to: LanguageCode): string {
    const targetLang = this.getLanguageName(to);

    if (from === 'auto') {
      return `Translate the following text to ${targetLang}. Only provide the translation, without any explanation:\n\n${text}`;
    }

    const sourceLang = this.getLanguageName(from);
    return `Translate the following text from ${sourceLang} to ${targetLang}. Only provide the translation, without any explanation:\n\n${text}`;
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
      throw new TranslateError('OpenAI API key is required', 'INVALID_KEY');
    }

    try {
      const prompt = this.buildPrompt(text, from, to);

      // 构建请求体
      const requestBody = {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a professional translator. Translate the text accurately and naturally.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      };

      // 发送请求
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      // 处理错误响应
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 401) {
          throw new TranslateError('Invalid OpenAI API key', 'INVALID_KEY');
        }
        if (response.status === 429) {
          throw new TranslateError('OpenAI rate limit exceeded', 'RATE_LIMIT');
        }

        const errorMessage = errorData.error?.message || `OpenAI API error: ${response.status}`;
        throw new TranslateError(errorMessage, 'API_ERROR');
      }

      const data = await response.json();

      // 解析响应
      if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
        throw new TranslateError('Invalid response from OpenAI', 'API_ERROR');
      }

      const translatedText = data.choices[0].message.content.trim();

      return {
        translatedText,
        detectedLanguage: from !== 'auto' ? from : undefined,
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
   * 验证 API 密钥
   */
  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
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
    return Object.keys(this.languageNames) as LanguageCode[];
  }
}

// 导出单例
export const openaiTranslator = new OpenAITranslator();
export default openaiTranslator;
