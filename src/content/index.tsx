// Content Script - 注入到所有网页
import React from 'react';
import { createRoot } from 'react-dom/client';
import SelectionPopup from './SelectionPopup';

console.info('Translator content script loaded');

// 挂载 React 组件
function mountTranslatorUI() {
  // 创建容器
  const container = document.createElement('div');
  container.id = 'translator-extension-root';
  document.body.appendChild(container);

  // 创建 Shadow DOM 实现样式隔离
  const shadowRoot = container.attachShadow({ mode: 'open' });

  // 创建 Shadow 内部容器
  const shadowContainer = document.createElement('div');
  shadowRoot.appendChild(shadowContainer);

  // 注入样式
  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = chrome.runtime.getURL('src/content/index.css');
  shadowRoot.appendChild(style);

  // 渲染 React 组件
  const root = createRoot(shadowContainer);
  root.render(
    <React.StrictMode>
      <SelectionPopup />
    </React.StrictMode>
  );

  console.info('Translator UI mounted');
}

// 监听来自 Background 的消息
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'TRIGGER_TRANSLATE') {
    // 处理快捷键触发的翻译
    console.info('Translate triggered by shortcut');
    // TODO: 触发翻译逻辑
  }

  sendResponse({ received: true });
  return true;
});

// 初始化函数 - 供 @crxjs/vite-plugin 调用
export function onExecute() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountTranslatorUI);
  } else {
    mountTranslatorUI();
  }
}

// 立即执行（兼容直接加载）
onExecute();
