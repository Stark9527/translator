import { useState } from 'react';
import { TranslateResponse } from '../types';
import './TranslateResult.css';

interface TranslateResultProps {
  result: TranslateResponse | null;
  loading?: boolean;
  error?: string | null;
}

export function TranslateResult({ result, loading, error }: TranslateResultProps) {
  const [copied, setCopied] = useState(false);

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

  if (loading) {
    return (
      <div className="translate-result loading">
        <div className="loading-spinner"></div>
        <p>翻译中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="translate-result error">
        <div className="error-icon">⚠️</div>
        <p>{error}</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="translate-result empty">
        <p>翻译结果将显示在这里</p>
      </div>
    );
  }

  return (
    <div className="translate-result">
      <div className="result-header">
        <span className="result-provider">{result.provider}</span>
        {result.detectedLanguage && result.detectedLanguage !== 'auto' && (
          <span className="result-detected">检测到: {result.detectedLanguage}</span>
        )}
      </div>

      <div className="result-content">{result.translatedText}</div>

      <div className="result-actions">
        <button
          className={`copy-button ${copied ? 'copied' : ''}`}
          onClick={handleCopy}
          title="复制翻译结果"
        >
          {copied ? '✓ 已复制' : '📋 复制'}
        </button>
      </div>
    </div>
  );
}
