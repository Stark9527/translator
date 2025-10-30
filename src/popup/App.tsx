import { useState, useEffect } from 'react';
import { LanguageCode } from '../types';
import { useTranslate, useStorage } from '../hooks';
import { LanguageSelector, TranslateResult } from '../components';
import { API_PROVIDERS } from '../utils/constants';
import './App.css';

function App() {
  const { config, loading: configLoading } = useStorage();
  const { result, loading: translating, error, translate } = useTranslate();

  const [sourceText, setSourceText] = useState('');
  const [sourceLang, setSourceLang] = useState<LanguageCode>('auto');
  const [targetLang, setTargetLang] = useState<LanguageCode>('zh');

  // 从配置中加载默认语言
  useEffect(() => {
    if (config) {
      setSourceLang(config.sourceLang);
      setTargetLang(config.targetLang);
    }
  }, [config]);

  const handleTranslate = () => {
    if (!sourceText.trim()) {
      return;
    }
    translate(sourceText, sourceLang, targetLang);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleTranslate();
    }
  };

  const handleClear = () => {
    setSourceText('');
  };

  const handleSwapLanguages = () => {
    if (sourceLang !== 'auto') {
      setSourceLang(targetLang);
      setTargetLang(sourceLang);
    }
  };

  const currentProvider = config?.apiProvider || 'google';
  const providerName =
    API_PROVIDERS.find((p) => p.code === currentProvider)?.name || currentProvider;

  return (
    <div className="app">
      <header className="app-header">
        <h1>🌐 Translator</h1>
        <div className="provider-badge">{providerName}</div>
      </header>

      <div className="translator-container">
        {/* 语言选择区域 */}
        <div className="language-controls">
          <LanguageSelector
            value={sourceLang}
            onChange={setSourceLang}
            showAuto={true}
            label="源语言"
          />

          <button
            className="swap-button"
            onClick={handleSwapLanguages}
            disabled={sourceLang === 'auto'}
            title="交换语言"
          >
            ⇄
          </button>

          <LanguageSelector
            value={targetLang}
            onChange={setTargetLang}
            showAuto={false}
            label="目标语言"
          />
        </div>

        {/* 输入区域 */}
        <div className="input-section">
          <div className="input-header">
            <span className="char-count">
              {sourceText.length} / 5000
            </span>
            {sourceText && (
              <button className="clear-button" onClick={handleClear}>
                清空
              </button>
            )}
          </div>
          <textarea
            className="source-text"
            placeholder="输入要翻译的文本...&#10;&#10;按 Ctrl+Enter 快速翻译"
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            onKeyDown={handleKeyPress}
            maxLength={5000}
            disabled={configLoading}
          />
        </div>

        {/* 翻译按钮 */}
        <button
          className="translate-btn"
          onClick={handleTranslate}
          disabled={!sourceText.trim() || translating || configLoading}
        >
          {translating ? '翻译中...' : '翻译'}
        </button>

        {/* 结果区域 */}
        <TranslateResult result={result} loading={translating} error={error} />

        {/* 底部提示 */}
        <div className="footer">
          <a href="/src/options/index.html" target="_blank" className="settings-link">
            ⚙️ 设置
          </a>
        </div>
      </div>
    </div>
  );
}

export default App;
