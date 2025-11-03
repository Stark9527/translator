# Content Script 详解

本文档记录 Chrome 翻译扩展中 Content Script 与悬浮窗的详细实现方案。与主文档的高层规划配合使用，用于指导具体开发。

## 划词翻译交互流程

1. 监听鼠标抬起与快捷键事件，检测用户是否选择了可翻译文本。
2. 根据选区范围计算悬浮窗展示位置，包含视口边界检测与页面滚动偏移。
3. 显示加载态悬浮窗，发送翻译请求至 `background`。
4. 接收翻译结果后更新 UI，支持复制、朗读、历史记录。
5. 用户点击外部区域或按 `Esc` 时卸载悬浮窗。

## 关键代码片段

### 文本选择监听

```typescript
// src/content/index.tsx
import { mountSelectionPopup, unmountSelectionPopup } from './SelectionPopup';
import { calculatePopupPosition } from './utils/position';

const handleSelection = async (event: MouseEvent | KeyboardEvent) => {
  const selection = window.getSelection();
  const text = selection?.toString().trim();
  if (!text || text.length === 0 || text.length > 500) {
    unmountSelectionPopup();
    return;
  }

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  const position = calculatePopupPosition(rect, {
    popupWidth: 380,
    popupHeight: 220,
    offset: 12
  });

  const popup = await mountSelectionPopup(position, text);
  popup.showLoading();

  chrome.runtime.sendMessage({ type: 'TRANSLATE', payload: { text } }, result => {
    if (!popup.isMounted()) return;
    if (chrome.runtime.lastError || !result) {
      popup.showError(chrome.runtime.lastError?.message ?? '翻译失败，请稍后重试');
      return;
    }
    popup.showResult(result);
  });
};

document.addEventListener('mouseup', handleSelection);
document.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'q') {
    handleSelection(event);
  }
});
```

### 悬浮窗定位算法

```typescript
// src/content/utils/position.ts
export interface PopupPositionOptions {
  popupWidth: number;
  popupHeight: number;
  offset: number;
}

export interface PopupPosition {
  top: number;
  left: number;
}

export function calculatePopupPosition(
  selectionRect: DOMRect,
  options: PopupPositionOptions
): PopupPosition {
  const { popupWidth, popupHeight, offset } = options;
  const scrollX = window.scrollX || document.documentElement.scrollLeft;
  const scrollY = window.scrollY || document.documentElement.scrollTop;
  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = document.documentElement.clientHeight;

  let top = selectionRect.bottom + scrollY + offset;
  let left = selectionRect.left + scrollX + (selectionRect.width - popupWidth) / 2;

  if (left + popupWidth > viewportWidth + scrollX) {
    left = viewportWidth + scrollX - popupWidth - 10;
  }
  if (left < scrollX + 10) {
    left = scrollX + 10;
  }
  if (top + popupHeight > viewportHeight + scrollY) {
    top = selectionRect.top + scrollY - popupHeight - offset;
  }
  if (top < scrollY + 10) {
    top = scrollY + 10;
  }

  return { top, left };
}
```

### Shadow DOM 悬浮窗挂载

```typescript
// src/content/SelectionPopup.tsx
import { createRoot, Root } from 'react-dom/client';

interface PopupInstance {
  isMounted: () => boolean;
  showLoading: () => void;
  showResult: (result: TranslateResult) => void;
  showError: (message: string) => void;
}

let root: Root | null = null;
let container: HTMLElement | null = null;
let shadowRoot: ShadowRoot | null = null;

export async function mountSelectionPopup(position: { top: number; left: number }, text: string): Promise<PopupInstance> {
  if (container) unmountSelectionPopup();

  container = document.createElement('div');
  container.id = 'translator-selection-popup';
  container.style.position = 'absolute';
  container.style.top = `${position.top}px`;
  container.style.left = `${position.left}px`;
  container.style.zIndex = '2147483647';
  document.body.appendChild(container);

  shadowRoot = container.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `@import url('chrome-extension://${chrome.runtime.id}/content.css');`;
  shadowRoot.appendChild(style);

  const shadowContainer = document.createElement('div');
  shadowRoot.appendChild(shadowContainer);

  root = createRoot(shadowContainer);
  root.render(<SelectionPopup initialText={text} />);

  return {
    isMounted: () => Boolean(root),
    showLoading: () => root?.render(<SelectionPopup initialText={text} status="loading" />),
    showResult: result => root?.render(<SelectionPopup initialText={text} status="success" result={result} />),
    showError: message => root?.render(<SelectionPopup initialText={text} status="error" errorMessage={message} />)
  };
}

export function unmountSelectionPopup() {
  if (!container) return;
  root?.unmount();
  shadowRoot = null;
  container.remove();
  root = null;
  container = null;
}
```

### 可访问性与交互细节

- 悬浮窗使用焦点陷阱与 `aria-live` 属性，确保读屏器可正确播报翻译结果。
- 提供 `Esc` 键关闭、`Enter` 复制等快捷键，增强操作效率。
- 监听页面路由变化（例如 SPA），在 `history` 事件触发时清理悬浮窗，避免残留。

## 调试与测试建议

- 在开发模式下，可通过 `chrome.scripting.insertCSS` 注入辅助样式标记选区与悬浮窗边界。
- 编写 Vitest + JSDOM 单元测试，验证 `calculatePopupPosition` 在不同视口场景下的边界条件。
- 提供 e2e 测试脚本，模拟用户划词流程并检查消息通信及翻译结果展示。
