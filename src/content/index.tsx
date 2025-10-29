import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

console.log('Translator content script loaded');

// 监听文本选择事件
document.addEventListener('mouseup', handleTextSelection);

function handleTextSelection() {
  const selection = window.getSelection();
  const selectedText = selection?.toString().trim();

  if (selectedText && selectedText.length > 0) {
    console.log('Selected text:', selectedText);

    // TODO: 显示翻译弹窗
    showTranslationPopup(selectedText, selection!);
  }
}

function showTranslationPopup(text: string, selection: Selection) {
  // 移除之前的弹窗
  const existingPopup = document.getElementById('translator-popup');
  if (existingPopup) {
    existingPopup.remove();
  }

  // 创建弹窗容器
  const popup = document.createElement('div');
  popup.id = 'translator-popup';
  popup.className = 'translator-popup';

  // 获取选中文本的位置
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  // 定位弹窗
  popup.style.position = 'fixed';
  popup.style.top = `${rect.bottom + window.scrollY + 10}px`;
  popup.style.left = `${rect.left + window.scrollX}px`;

  document.body.appendChild(popup);

  // 使用React渲染弹窗内容
  const root = ReactDOM.createRoot(popup);
  root.render(
    <React.StrictMode>
      <TranslationPopup text={text} onClose={() => popup.remove()} />
    </React.StrictMode>
  );
}

// 翻译弹窗组件
function TranslationPopup({ text, onClose }: { text: string; onClose: () => void }) {
  const [translatedText, setTranslatedText] = React.useState<string>('翻译中...');
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // 向background发送翻译请求
    chrome.runtime.sendMessage(
      { action: 'translate', text, from: 'auto', to: 'zh' },
      (response) => {
        if (response?.success) {
          setTranslatedText(response.result);
        } else {
          setTranslatedText('翻译失败');
        }
        setLoading(false);
      }
    );
  }, [text]);

  return (
    <div className="translation-content">
      <div className="translation-header">
        <span className="translation-title">翻译</span>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>
      <div className="translation-body">
        <div className="original-text">{text}</div>
        <div className="divider"></div>
        <div className="translated-text">
          {loading ? '翻译中...' : translatedText}
        </div>
      </div>
    </div>
  );
}

// 点击其他地方关闭弹窗
document.addEventListener('mousedown', (e) => {
  const popup = document.getElementById('translator-popup');
  if (popup && !popup.contains(e.target as Node)) {
    popup.remove();
  }
});

export {};
