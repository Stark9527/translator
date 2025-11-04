# Shadow DOM 样式隔离优化

## 概述

本文档描述了翻译扩展中 Shadow DOM 样式隔离的实现和优化策略。通过 Shadow DOM，我们确保翻译悬浮窗的样式完全独立于网页样式，避免样式冲突。

## 优化内容

### 1. 移除 Manifest 中的 CSS 声明

**问题**：在 `manifest.json` 的 `content_scripts.css` 中声明样式会将 CSS 注入到页面主文档，破坏 Shadow DOM 的隔离效果。

**解决方案**：
```json
// ❌ 之前（错误）
"content_scripts": [{
  "js": ["src/content/index.tsx"],
  "css": ["src/content/index.css"]  // 会注入到主文档
}]

// ✅ 现在（正确）
"content_scripts": [{
  "js": ["src/content/index.tsx"]
  // 不声明 CSS，在 Shadow DOM 中手动注入
}]
```

### 2. 优化 CSS 加载方式

**问题**：使用 `<link>` 标签加载 CSS 会有延迟，可能导致样式闪烁（FOUC - Flash of Unstyled Content）。

**解决方案**：使用 Vite 的 `?inline` 导入将 CSS 作为字符串内联，通过 `<style>` 标签注入到 Shadow DOM。

```typescript
// src/content/index.tsx

// ❌ 之前（有延迟）
const style = document.createElement('link');
style.rel = 'stylesheet';
style.href = chrome.runtime.getURL('src/content/index.css');
shadowRoot.appendChild(style);

// ✅ 现在（无延迟）
import contentStyles from './index.css?inline';

const styleElement = document.createElement('style');
styleElement.textContent = contentStyles;
shadowRoot.appendChild(styleElement);
```

### 3. 增强样式隔离保护

**问题**：Shadow DOM 虽然提供天然的样式隔离，但某些 CSS 属性（如 `color`、`font-family`）会继承自父元素。

**解决方案**：在 CSS 中使用 `:host` 选择器重置所有可能继承的属性。

```css
/* src/content/index.css */

/* :host 选择器用于 Shadow DOM 根元素 */
:host {
  /* 重置可能继承的属性 */
  color: initial;
  font-family: initial;
  font-size: initial;
  line-height: initial;
  font-weight: initial;
  text-align: initial;
  text-transform: initial;
  letter-spacing: initial;
  word-spacing: initial;

  /* 确保容器不影响布局 */
  display: contents;
}

/* CSS 重置 - 防止继承和默认样式干扰 */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  border: 0;
  font: inherit;
  vertical-align: baseline;
}

/* 重置可能受页面影响的属性 */
* {
  background: none;
  color: inherit;
  text-decoration: none;
  list-style: none;
}
```

### 4. TypeScript 类型声明

为了支持 `?inline` 导入，添加了 TypeScript 类型声明：

```typescript
// src/vite-env.d.ts

declare module '*.css?inline' {
  const content: string;
  export default content;
}
```

## Shadow DOM 工作原理

### 样式隔离机制

Shadow DOM 提供了三层样式隔离：

1. **外部样式无法穿透**：页面的 CSS 选择器无法选中 Shadow DOM 内的元素
2. **内部样式不会泄露**：Shadow DOM 内的样式不会影响外部页面
3. **需要处理继承属性**：某些 CSS 属性（如 `color`、`font-family`）会从外部继承

### 继承属性列表

以下属性会从外部继承到 Shadow DOM：

- `color`
- `font-family`, `font-size`, `font-weight`, `font-style`
- `line-height`
- `text-align`, `text-transform`
- `letter-spacing`, `word-spacing`
- `visibility`
- `cursor`

我们在 `:host` 中将这些属性全部重置为 `initial`。

## 测试方法

### 使用测试页面

我们提供了一个测试页面 `test-shadow-dom.html`，其中包含极端的样式来验证隔离效果：

```html
<!-- 页面使用了夸张的样式 -->
<style>
  * {
    color: red !important;
    background: yellow !important;
    font-size: 24px !important;
  }
</style>
```

### 测试步骤

1. 在 Chrome 中加载扩展（`chrome://extensions/`）
2. 打开 `test-shadow-dom.html` 文件
3. 选中页面中的测试文本
4. 观察翻译悬浮窗的样式

### 预期结果

如果 Shadow DOM 样式隔离工作正常：

- ✅ 翻译图标是紫色渐变圆形按钮（不是红色）
- ✅ 弹出面板是白色背景（不是黄色）
- ✅ 文字是深灰色 `#111827`（不是红色）
- ✅ 字体大小是 14-15px（不是 24px）
- ✅ 使用系统字体（不是 Comic Sans MS）
- ✅ 没有蓝色边框和旋转效果

## 架构图

```
┌─────────────────────────────────────────┐
│           页面 DOM                       │
│  (页面样式: 黄色背景、红色文字...)        │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │  #translator-extension-root        │ │
│  │  (普通 DOM 容器)                    │ │
│  │                                     │ │
│  │  ┌──────────────────────────────┐  │ │
│  │  │ Shadow Root (mode: open)      │  │ │
│  │  │                               │  │ │
│  │  │ <style>                       │  │ │
│  │  │   :host { ... }               │  │ │
│  │  │   * { ... }                   │  │ │
│  │  │   .translator-icon { ... }    │  │ │
│  │  │ </style>                      │  │ │
│  │  │                               │  │ │
│  │  │ <div>                         │  │ │
│  │  │   <SelectionPopup />          │  │ │
│  │  │   (React 组件)                 │  │ │
│  │  │ </div>                        │  │ │
│  │  │                               │  │ │
│  │  │ ⬆️ 样式完全隔离               │  │ │
│  │  │ ⬆️ 页面样式无法穿透           │  │ │
│  │  └──────────────────────────────┘  │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## 性能影响

### 优化效果

1. **消除 FOUC**：内联样式避免了加载延迟，样式即时生效
2. **减少网络请求**：不需要额外的 CSS 文件请求
3. **更小的包体积**：CSS 被内联到 JS 中，由 Vite 自动压缩

### 权衡

- **JS 文件稍大**：CSS 内容被包含在 JS bundle 中
- **不可缓存**：CSS 无法单独缓存（但总体来说，减少请求数的收益更大）

## 浏览器兼容性

Shadow DOM 是 Web Components 标准的一部分，现代浏览器均支持：

- ✅ Chrome 53+
- ✅ Edge 79+
- ✅ Firefox 63+
- ✅ Safari 10.1+

由于我们的扩展只针对 Chrome，无需担心兼容性问题。

## 调试技巧

### 查看 Shadow DOM

在 Chrome DevTools 中：

1. 右键点击翻译悬浮窗
2. 选择 "检查元素"
3. 在 Elements 面板中会看到 `#shadow-root (open)`
4. 展开即可查看 Shadow DOM 内部结构和样式

### 验证样式隔离

在 Console 中运行：

```javascript
// 获取 Shadow Root
const container = document.getElementById('translator-extension-root');
const shadowRoot = container.shadowRoot;

// 查看内部样式
console.log(shadowRoot.querySelector('style').textContent);

// 尝试从外部选择 Shadow DOM 内的元素（应该返回 null）
console.log(document.querySelector('.translator-popup-panel')); // null

// 从 Shadow Root 内选择（应该成功）
console.log(shadowRoot.querySelector('.translator-popup-panel')); // <div>
```

## 最佳实践

1. **始终使用 Shadow DOM**：Content Script UI 组件应该始终使用 Shadow DOM 隔离
2. **重置继承属性**：使用 `:host` 选择器明确重置所有可能继承的 CSS 属性
3. **内联关键样式**：使用 `?inline` 导入避免加载延迟
4. **不在 manifest 中声明 CSS**：避免样式被注入到主文档
5. **充分测试**：使用极端样式的测试页面验证隔离效果

## 相关文件

- `src/content/index.tsx` - Shadow DOM 创建和挂载逻辑
- `src/content/index.css` - Shadow DOM 内部样式
- `src/content/SelectionPopup.tsx` - React 组件
- `src/vite-env.d.ts` - TypeScript 类型声明
- `test-shadow-dom.html` - 样式隔离测试页面
- `public/manifest.json` - Chrome Extension 配置

## 参考资料

- [Shadow DOM v1: Self-Contained Web Components](https://developers.google.com/web/fundamentals/web-components/shadowdom)
- [Using shadow DOM - MDN](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_shadow_DOM)
- [CSS Scoping Module Level 1](https://drafts.csswg.org/css-scoping/)
