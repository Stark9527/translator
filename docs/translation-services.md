# Translation Service 详细设计

该文档描述翻译服务抽象、各引擎实现以及错误处理策略，配合主开发规划的“多引擎融合”目标使用。

## 统一接口设计

```typescript
// src/services/translator/types.ts
export interface TranslateParams {
  text: string;
  from: string; // 源语言，可选 'auto'
  to: string;   // 目标语言
  context?: string; // 可选上下文，用于大模型增强
}

export interface TranslateResult {
  text: string;
  translation: string;
  from: string;
  to: string;
  engine: string;
  pronunciation?: string;
  examples?: string[];
  alternatives?: string[];
  detectedAt: number;
  cached?: boolean;
}

export interface Translator {
  name: string;
  translate(params: TranslateParams): Promise<TranslateResult>;
  detectLanguage(text: string): Promise<string>;
  getSupportedLanguages(): Promise<LanguagePair[]>;
}
```

`TranslatorFactory` 负责根据用户配置或自动策略返回对应实例，并处理熔断与回退。

```typescript
// src/services/translator/index.ts
import { GoogleTranslator } from './google';
import { LlmTranslator } from './llm';

export type Engine = 'google' | 'deepl' | 'llm';

export class TranslatorFactory {
  private cache = new Map<Engine, Translator>();

  constructor(private readonly options: TranslatorFactoryOptions) {}

  get(engine: Engine): Translator {
    if (!this.cache.has(engine)) {
      const translator = this.create(engine);
      this.cache.set(engine, translator);
    }
    return this.cache.get(engine)!;
  }

  private create(engine: Engine): Translator {
    switch (engine) {
      case 'google':
        return new GoogleTranslator();
      case 'deepl':
        throw new Error('DeepL engine not implemented in this module');
      case 'llm':
        return new LlmTranslator(this.options.llmClient);
      default:
        throw new Error(`Unsupported engine: ${engine}`);
    }
  }
}
```

> DeepL 集成目前仅在架构层预留占位，具体实现可在独立文档或模块中补充。

## Google Translate 实现

```typescript
// src/services/translator/google.ts
import type { Translator, TranslateParams, TranslateResult } from './types';

export class GoogleTranslator implements Translator {
  name = 'Google Translate';
  private readonly endpoint = 'https://translate.googleapis.com/translate_a/single';

  async translate(params: TranslateParams): Promise<TranslateResult> {
    const { text, from, to } = params;
    const url = new URL(this.endpoint);
    url.searchParams.append('client', 'gtx');
    url.searchParams.append('sl', from);
    url.searchParams.append('tl', to);
    url.searchParams.append('dt', 't');
    url.searchParams.append('dt', 'bd');
    url.searchParams.append('dt', 'rm');
    url.searchParams.append('q', text);

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Google Translate API error: ${response.status}`);
    }

    const data = await response.json();
    const translation =
      data[0]?.map((item: [string]) => item[0]).join('') ?? '';
    const detectedLang = data[2] || from;
    const pronunciation = data[0]?.[0]?.[3];
    const examples = data[12]?.[0]?.[1]?.map((item: any) => item[0]) ?? [];

    return {
      text,
      translation,
      from: detectedLang,
      to,
      engine: this.name,
      pronunciation,
      examples,
      detectedAt: Date.now()
    };
  }

  async detectLanguage(text: string): Promise<string> {
    const result = await this.translate({ text, from: 'auto', to: 'en' });
    return result.from;
  }

  async getSupportedLanguages(): Promise<LanguagePair[]> {
    return [
      { code: 'en', name: 'English' },
      { code: 'zh-CN', name: 'Chinese (Simplified)' },
      { code: 'ja', name: 'Japanese' },
      // ...
    ];
  }
}
```

## LLM 增强通道

大模型翻译需考虑上下文传递、费用控制与延迟。推荐做法：

- 通过 `LLMTaskManager` 控制并发与重试，防止速率限制。
- 传递用户场景（邮件、技术文档等）以获得更贴合语气的结果。
- 允许用户回退至传统引擎，确保稳定性。

示例骨架：

```typescript
export class LlmTranslator implements Translator {
  name = 'LLM';

  constructor(private readonly client: LlmClient) {}

  async translate(params: TranslateParams): Promise<TranslateResult> {
    const prompt = buildPrompt(params);
    const response = await this.client.generate({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a professional translator.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2
    });

    return {
      text: params.text,
      translation: response.content.translation,
      from: response.content.detectedLanguage ?? params.from,
      to: params.to,
      engine: this.name,
      pronunciation: response.content.pronunciation,
      examples: response.content.examples,
      detectedAt: Date.now()
    };
  }

  async detectLanguage(text: string): Promise<string> {
    return this.client.detectLanguage(text);
  }

  async getSupportedLanguages(): Promise<LanguagePair[]> {
    return this.client.getSupportedLanguages();
  }
}
```

## 错误处理与回退策略

- 使用 `TranslationCoordinator` 在请求前查询缓存，失败时回退至下一个引擎，并记录统计。
- 对网络错误与配额错误分别处理：网络错误可立即重试，配额错误需提示用户。
- 在 `background` 中对同一文本请求进行去重合并，避免多个页面同时翻译引发风暴。

```typescript
// src/background/translationService.ts
export async function translateWithFallback(params: ExtendedTranslateParams): Promise<TranslateResult> {
  const engines = chooseEngines(params);
  let lastError: unknown = null;

  for (const engine of engines) {
    try {
      const translator = factory.get(engine);
      const cached = await cache.get(engine, params.text, params.to);
      if (cached) return { ...cached, cached: true };

      const result = await translator.translate(params);
      await cache.set(engine, params.text, params.to, result);
      return result;
    } catch (error) {
      lastError = error;
      logger.warn(`Engine ${engine} failed`, error);
      continue;
    }
  }

  throw lastError ?? new Error('Translation failed');
}
```

## 安全与配置

- API Key 使用 Chrome Storage `sync` 存储，结合 Web Crypto API 进行加密。
- 在选项页提供密钥有效性检测，调用失败时提示具体原因。
- 对外暴露的 `chrome.runtime.onMessage` 必须验证消息类型和来源，防止恶意脚本调用翻译接口。
