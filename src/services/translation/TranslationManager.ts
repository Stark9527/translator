// 翻译管理器 - 整合翻译器、配置和缓存
import type { TranslateParams, TranslateResult, TranslationEngine } from '@/types';
import { TranslatorFactory } from '../translator/TranslatorFactory';
import { ConfigService } from '../config/ConfigService';
import { translationCache } from '../cache/TranslationCache';
import { formatErrorMessage } from '../translator/utils';

/**
 * 翻译管理器
 * 负责协调翻译器、配置管理和缓存
 */
export class TranslationManager {
  /**
   * 执行翻译
   * @param params 翻译参数
   * @returns 翻译结果
   */
  static async translate(params: TranslateParams): Promise<TranslateResult> {
    const { text, from, to } = params;

    try {
      // 获取当前配置
      const config = await ConfigService.getConfig();
      const engine = config.engine;

      console.info(`Translation request: [${engine}] ${from} -> ${to}`, text.substring(0, 50));

      // 1. 检查缓存
      const cachedResult = translationCache.get(text, from, to, engine);
      if (cachedResult) {
        console.info('Translation cache hit');
        return cachedResult;
      }

      // 2. 执行翻译
      const translator = TranslatorFactory.getTranslator(engine);
      const result = await translator.translate({ text, from, to });

      // 3. 缓存结果
      translationCache.set(text, from, to, engine, result);

      console.info('Translation success:', result.translation.substring(0, 50));

      return result;
    } catch (error) {
      console.error('Translation error:', error);

      // 格式化错误消息
      const errorMessage = formatErrorMessage(error);

      throw new Error(errorMessage);
    }
  }

  /**
   * 检测语言
   * @param text 待检测文本
   * @returns 语言代码
   */
  static async detectLanguage(text: string): Promise<string> {
    try {
      const config = await ConfigService.getConfig();
      const translator = TranslatorFactory.getTranslator(config.engine);

      return await translator.detectLanguage(text);
    } catch (error) {
      console.error('Language detection error:', error);
      return 'auto';
    }
  }

  /**
   * 获取支持的语言列表
   * @param engine 翻译引擎，默认使用配置中的引擎
   * @returns 语言代码数组
   */
  static async getSupportedLanguages(engine?: TranslationEngine): Promise<string[]> {
    try {
      const targetEngine = engine || (await ConfigService.getConfig()).engine;
      const translator = TranslatorFactory.getTranslator(targetEngine);

      return translator.getSupportedLanguages();
    } catch (error) {
      console.error('Failed to get supported languages:', error);
      return ['auto', 'zh-CN', 'en']; // 返回最基本的语言列表
    }
  }

  /**
   * 检查翻译引擎是否可用
   * @param engine 翻译引擎，默认使用配置中的引擎
   * @returns 是否可用
   */
  static async checkAvailability(engine?: TranslationEngine): Promise<boolean> {
    try {
      const targetEngine = engine || (await ConfigService.getConfig()).engine;

      return await TranslatorFactory.checkAvailability(targetEngine);
    } catch (error) {
      console.error('Availability check error:', error);
      return false;
    }
  }

  /**
   * 切换翻译引擎
   * @param engine 新的翻译引擎
   */
  static async switchEngine(engine: TranslationEngine): Promise<void> {
    try {
      // 保存新配置
      await ConfigService.saveConfig({ engine });

      console.info(`Switched translation engine to: ${engine}`);
    } catch (error) {
      console.error('Failed to switch engine:', error);
      throw new Error('切换翻译引擎失败');
    }
  }

  /**
   * 清除翻译缓存
   */
  static clearCache(): void {
    translationCache.clear();
    console.info('Translation cache cleared');
  }

  /**
   * 获取缓存统计信息
   */
  static getCacheStats() {
    return translationCache.getStats();
  }
}
