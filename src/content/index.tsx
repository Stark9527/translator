import React from 'react';
import ReactDOM from 'react-dom/client';
import { SelectionPopup } from './SelectionPopup';
import './index.css';

console.log('Translator content script loaded');

// 弹窗容器和 React Root
let popupContainer: HTMLDivElement | null = null;
let popupRoot: ReactDOM.Root | null = null;

// 最小选择文本长度
const MIN_TEXT_LENGTH = 2;
const MAX_TEXT_LENGTH = 5000;

// 延迟显示弹窗（避免误触）
let selectionTimer: number | null = null;

/**
 * 监听文本选择事件
 */
document.addEventListener('mouseup', (e) => {
  // 清除之前的定时器
  if (selectionTimer) {
    clearTimeout(selectionTimer);
  }

  // 延迟处理选择，避免拖动时就显示
  selectionTimer = setTimeout(() => {
    handleTextSelection(e);
  }, 200);
});

/**
 * 处理文本选择
 */
function handleTextSelection(e: MouseEvent) {
  const selection = window.getSelection();
  const selectedText = selection?.toString().trim();

  // 验证选择的文本
  if (!selectedText || selectedText.length < MIN_TEXT_LENGTH) {
    hidePopup();
    return;
  }

  if (selectedText.length > MAX_TEXT_LENGTH) {
    console.warn('Selected text is too long');
    hidePopup();
    return;
  }

  // 检查是否点击在弹窗内
  if (popupContainer && popupContainer.contains(e.target as Node)) {
    return;
  }

  // 检查扩展是否启用了划词翻译
  chrome.storage.sync.get('enableSelection', (config) => {
    if (config.enableSelection !== false) {
      showTranslationPopup(selectedText, selection!);
    }
  });
}

/**
 * 显示翻译弹窗
 */
function showTranslationPopup(text: string, selection: Selection) {
  // 获取选中文本的位置
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  // 计算弹窗位置（避免超出视窗）
  const position = calculatePopupPosition(rect);

  // 移除旧弹窗
  hidePopup();

  // 创建新弹窗容器
  popupContainer = document.createElement('div');
  popupContainer.id = 'translator-popup-container';
  popupContainer.style.cssText = `
    position: fixed;
    z-index: 2147483647;
    all: initial;
  `;

  document.body.appendChild(popupContainer);

  // 渲染 React 组件
  popupRoot = ReactDOM.createRoot(popupContainer);
  popupRoot.render(
    <React.StrictMode>
      <SelectionPopup text={text} position={position} onClose={hidePopup} />
    </React.StrictMode>
  );
}

/**
 * 计算弹窗位置
 */
function calculatePopupPosition(rect: DOMRect): { x: number; y: number } {
  const POPUP_WIDTH = 360;
  const POPUP_MAX_HEIGHT = 400;
  const MARGIN = 10;

  let x = rect.left + window.scrollX;
  let y = rect.bottom + window.scrollY + MARGIN;

  // 防止超出右边界
  if (x + POPUP_WIDTH > window.innerWidth) {
    x = window.innerWidth - POPUP_WIDTH - MARGIN;
  }

  // 防止超出左边界
  if (x < MARGIN) {
    x = MARGIN;
  }

  // 防止超出底部边界
  if (y + POPUP_MAX_HEIGHT > window.innerHeight + window.scrollY) {
    // 显示在选中文本上方
    y = rect.top + window.scrollY - POPUP_MAX_HEIGHT - MARGIN;
  }

  // 防止超出顶部边界
  if (y < window.scrollY + MARGIN) {
    y = window.scrollY + MARGIN;
  }

  return { x, y };
}

/**
 * 隐藏弹窗
 */
function hidePopup() {
  if (popupRoot) {
    popupRoot.unmount();
    popupRoot = null;
  }

  if (popupContainer) {
    popupContainer.remove();
    popupContainer = null;
  }
}

/**
 * 点击页面其他地方关闭弹窗
 */
document.addEventListener('mousedown', (e) => {
  if (popupContainer && !popupContainer.contains(e.target as Node)) {
    // 检查是否点击在选中的文本上（避免重新选择时关闭）
    const selection = window.getSelection();
    if (!selection?.toString().trim()) {
      hidePopup();
    }
  }
});

/**
 * 页面滚动时关闭弹窗
 */
document.addEventListener('scroll', () => {
  if (popupContainer) {
    hidePopup();
  }
}, { passive: true });

/**
 * 窗口大小变化时关闭弹窗
 */
window.addEventListener('resize', () => {
  if (popupContainer) {
    hidePopup();
  }
});

/**
 * ESC 键关闭弹窗
 */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && popupContainer) {
    hidePopup();
  }
});

export {};
