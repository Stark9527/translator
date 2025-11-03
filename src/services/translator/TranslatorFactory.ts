// 翻译引擎工厂
import type { TranslationEngine } from '@/types';
import type { ITranslator } from './ITranslator';
import { GoogleTranslator } from './GoogleTranslator';

/**
 * 翻译引擎工厂
 * 根据引擎类型创建相应的翻译实例
 */
export class TranslatorFactory {
  private static instances: Map<TranslationEngine, ITranslator> = new Map();

  /**
   * 获取翻译引擎实例(单例模式)
   * @param engine 引擎类型
   * @returns 翻译器实例
   */
  static getTranslator(engine: TranslationEngine): ITranslator {
    // 如果已存在实例,直接返回
    if (this.instances.has(engine)) {
      return this.instances.get(engine)!;
    }

    // 创建新实例
    let translator: ITranslator;

    switch (engine) {
      case 'google':
        translator = new GoogleTranslator();
        break;

      case 'deepl':
        // TODO: 实现 DeepL 翻译器
        throw new Error('DeepL 翻译引擎尚未实现');

      case 'openai':
        // TODO: 实现 OpenAI 翻译器
        throw new Error('OpenAI 翻译引擎尚未实现');

      default:
        throw new Error(`不支持的翻译引擎: ${engine}`);
    }

    // 缓存实例
    this.instances.set(engine, translator);

    return translator;
  }

  /**
   * 清除缓存的翻译器实例
   * @param engine 引擎类型,不指定则清除所有
   */
  static clearCache(engine?: TranslationEngine): void {
    if (engine) {
      this.instances.delete(engine);
    } else {
      this.instances.clear();
    }
  }

  /**
   * 获取所有已初始化的翻译引擎
   */
  static getInitializedEngines(): TranslationEngine[] {
    return Array.from(this.instances.keys());
  }

  /**
   * 检查引擎是否可用
   * @param engine 引擎类型
   */
  static async checkAvailability(engine: TranslationEngine): Promise<boolean> {
    try {
      const translator = this.getTranslator(engine);
      return await translator.isAvailable();
    } catch {
      return false;
    }
  }
}
