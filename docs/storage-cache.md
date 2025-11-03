# Storage & Cache 实施细节

本文描述翻译扩展中的多级缓存、存储结构与安全策略，帮助在实现阶段落地。

## 多级缓存策略

| 层级 | 用途 | 生命周期 | 典型容量 |
|------|------|----------|----------|
| 内存 LRU | 当前浏览会话内的热数据 | 页面刷新 | 50-200 条 |
| IndexedDB | 24 小时内翻译结果与历史 | 长期（可清空） | 5-10 MB |
| Chrome Storage | 配置、偏好、API Key | 长期 | <512 KB |

### 内存 LRU 实现

```typescript
// src/services/cache/lru.ts
interface Node<T> {
  key: string;
  value: T;
  prev: Node<T> | null;
  next: Node<T> | null;
  createdAt: number;
}

export class LRUCache<T> {
  private map = new Map<string, Node<T>>();
  private head: Node<T> | null = null;
  private tail: Node<T> | null = null;

  constructor(private readonly capacity = 100, private readonly ttl = 60_000) {}

  get(key: string): T | null {
    const node = this.map.get(key);
    if (!node) return null;
    if (Date.now() - node.createdAt > this.ttl) {
      this.deleteNode(node);
      return null;
    }
    this.moveToHead(node);
    return node.value;
  }

  set(key: string, value: T) {
    let node = this.map.get(key);
    if (node) {
      node.value = value;
      node.createdAt = Date.now();
      this.moveToHead(node);
      return;
    }

    node = { key, value, prev: null, next: null, createdAt: Date.now() };
    this.map.set(key, node);
    this.addToHead(node);

    if (this.map.size > this.capacity) {
      this.tail && this.deleteNode(this.tail);
    }
  }

  private addToHead(node: Node<T>) {
    node.next = this.head;
    node.prev = null;
    if (this.head) this.head.prev = node;
    this.head = node;
    if (!this.tail) this.tail = node;
  }

  private moveToHead(node: Node<T>) {
    if (node === this.head) return;
    this.unlink(node);
    this.addToHead(node);
  }

  private deleteNode(node: Node<T>) {
    this.unlink(node);
    this.map.delete(node.key);
  }

  private unlink(node: Node<T>) {
    if (node.prev) node.prev.next = node.next;
    if (node.next) node.next.prev = node.prev;
    if (this.head === node) this.head = node.next;
    if (this.tail === node) this.tail = node.prev;
  }
}
```

### IndexedDB 缓存结构

```typescript
// src/services/storage/indexeddb.ts
import { openDB, DBSchema } from 'idb';

interface TranslatorDB extends DBSchema {
  translations: {
    key: string; // `${engine}:${from}:${to}:${hash(text)}`
    value: {
      result: TranslateResult;
      createdAt: number;
      expiresAt: number;
    };
    indexes: { 'by-engine': string };
  };
  history: {
    key: string;
    value: TranslationHistoryItem;
    indexes: { 'by-createdAt': number };
  };
}

export const dbPromise = openDB<TranslatorDB>('translator-db', 1, {
  upgrade(db) {
    const translations = db.createObjectStore('translations');
    translations.createIndex('by-engine', 'result.engine');

    const history = db.createObjectStore('history', { keyPath: 'id' });
    history.createIndex('by-createdAt', 'createdAt');
  }
});

export async function getCachedTranslation(key: string): Promise<TranslateResult | null> {
  const record = await (await dbPromise).get('translations', key);
  if (!record) return null;
  if (Date.now() > record.expiresAt) {
    await (await dbPromise).delete('translations', key);
    return null;
  }
  return record.result;
}

export async function cacheTranslation(key: string, result: TranslateResult, ttl = 86_400_000) {
  await (await dbPromise).put('translations', {
    result,
    createdAt: Date.now(),
    expiresAt: Date.now() + ttl
  }, key);
}
```

### Chrome Storage 封装

```typescript
// src/services/storage/chrome-storage.ts
import { z } from 'zod';

const SettingsSchema = z.object({
  defaultFrom: z.string().default('auto'),
  defaultTo: z.string().default('zh-CN'),
  engine: z.enum(['google', 'deepl', 'llm']).default('google'),
  theme: z.enum(['light', 'dark', 'system']).default('system')
});

export type Settings = z.infer<typeof SettingsSchema>;

export async function getSettings(): Promise<Settings> {
  const items = await chrome.storage.sync.get(null);
  return SettingsSchema.parse(items);
}

export async function updateSettings(patch: Partial<Settings>) {
  const current = await getSettings();
  const next = { ...current, ...patch };
  await chrome.storage.sync.set(next);
}
```

## API Key 安全存储

1. 用户在选项页输入 DeepL 或 LLM API Key。
2. 使用 Web Crypto API `subtle.encrypt` 对密钥加密后写入 `chrome.storage.sync`。
3. 解密操作仅在 Background Service Worker 内进行，防止 Content Script 获取明文。

```typescript
// src/services/security/api-key.ts
const KEY_STORAGE_KEY = 'secure_api_keys';

export async function saveApiKey(engine: string, value: string) {
  const key = await getCryptoKey();
  const encoded = new TextEncoder().encode(value);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  const payload = { iv: Array.from(iv), data: Array.from(new Uint8Array(cipher)) };

  const existing = await chrome.storage.sync.get(KEY_STORAGE_KEY);
  await chrome.storage.sync.set({
    [KEY_STORAGE_KEY]: { ...(existing[KEY_STORAGE_KEY] ?? {}), [engine]: payload }
  });
}

export async function loadApiKey(engine: string): Promise<string | null> {
  const key = await getCryptoKey();
  const stored = await chrome.storage.sync.get(KEY_STORAGE_KEY);
  const payload = stored[KEY_STORAGE_KEY]?.[engine];
  if (!payload) return null;

  const iv = new Uint8Array(payload.iv);
  const data = new Uint8Array(payload.data);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return new TextDecoder().decode(decrypted);
}
```

## 清理与同步策略

- 周期性任务：Background 每 12 小时清理过期缓存，防止 IndexedDB 膨胀。
- 设备同步：Chrome Storage `sync` 自动同步基础配置，翻译历史默认仅存在本地，可在高级版中扩展云同步。
- 导入导出：提供 JSON 导出工具，支持用户迁移生词本与历史记录。

## 测试建议

- 使用 `fake-indexeddb` 在 Vitest 中模拟 IndexedDB，编写缓存读写测试。
- 引入 `@webext-core/mv3-storage` 等库测试 Chrome Storage API 的封装行为。
- 对 API Key 加密逻辑编写单元测试，验证正确加密、解密与错误处理流程。
