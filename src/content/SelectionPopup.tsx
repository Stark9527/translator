import { useState, useEffect } from 'react';
import { TranslateResponse } from '../types';
import './SelectionPopup.css';

interface SelectionPopupProps {
  text: string;
  position: { x: number; y: number };
  onClose: () => void;
}

export function SelectionPopup({ text, position, onClose }: SelectionPopupProps) {
  const [result, setResult] = useState<TranslateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // 发送翻译请求
    const translateText = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await chrome.runtime.sendMessage({
          action: 'translate',
          text,
          from: 'auto',
          to: 'zh',
        });

        if (response.success && response.data) {
          setResult(response.data);
        } else {
          setError(response.error || '翻译失败');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '翻译失败');
      } finally {
        setLoading(false);
      }
    };

    translateText();
  }, [text]);

  const handleCopy = async () => {
    if (!result?.translatedText) return;

    try {
      await navigator.clipboard.writeText(result.translatedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  return (
    <div
      className="translator-selection-popup"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      <div className="popup-header">
        <span className="popup-title">🌐 翻译</span>
        <button className="popup-close" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="popup-content">
        {/* 原文 */}
        <div className="popup-source">
          <div className="popup-label">原文</div>
          <div className="popup-text">{text}</div>
        </div>

        {/* 翻译结果 */}
        <div className="popup-result">
          <div className="popup-label">译文</div>
          {loading && (
            <div className="popup-loading">
              <div className="popup-spinner"></div>
              <span>翻译中...</span>
            </div>
          )}

          {error && (
            <div className="popup-error">
              <span>⚠️ {error}</span>
            </div>
          )}

          {result && !loading && (
            <>
              <div className="popup-text">{result.translatedText}</div>
              <div className="popup-footer">
                <span className="popup-provider">{result.provider}</span>
                <button
                  className={`popup-copy-btn ${copied ? 'copied' : ''}`}
                  onClick={handleCopy}
                >
                  {copied ? '✓ 已复制' : '📋 复制'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
