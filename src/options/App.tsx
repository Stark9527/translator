import { useState, useEffect } from 'react';
import { useStorage } from '../hooks';
import { LanguageSelector } from '../components';
import { ApiProvider, LanguageCode, DEFAULT_CONFIG } from '../types';
import { API_PROVIDERS } from '../utils/constants';
import { sendMessage } from '../utils/message';
import { MESSAGE_ACTIONS } from '../utils/constants';
import './App.css';

function App() {
  const { config, loading, updateConfig } = useStorage();

  // 表单状态
  const [apiProvider, setApiProvider] = useState<ApiProvider>('google');
  const [sourceLang, setSourceLang] = useState<LanguageCode>('auto');
  const [targetLang, setTargetLang] = useState<LanguageCode>('zh');
  const [enableSelection, setEnableSelection] = useState(true);
  const [deeplApiKey, setDeeplApiKey] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [openaiModel, setOpenaiModel] = useState('gpt-3.5-turbo');

  // UI 状态
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ [key: string]: boolean }>({});

  // 从配置中加载数据
  useEffect(() => {
    if (config) {
      setApiProvider(config.apiProvider);
      setSourceLang(config.sourceLang);
      setTargetLang(config.targetLang);
      setEnableSelection(config.enableSelection);
      setDeeplApiKey(config.apiKeys.deepl || '');
      setOpenaiApiKey(config.apiKeys.openai || '');
      setOpenaiModel(config.openaiModel || 'gpt-3.5-turbo');
    }
  }, [config]);

  // 验证 API 密钥
  const validateApiKey = async (provider: 'deepl' | 'openai', key: string) => {
    if (!key || !key.trim()) {
      setValidationResult({ ...validationResult, [provider]: false });
      return;
    }

    setValidating(true);
    try {
      const response = await sendMessage({
        action: MESSAGE_ACTIONS.VALIDATE_API_KEY,
        provider,
        apiKey: key,
      });

      const isValid = response.success && response.data?.valid;
      setValidationResult({ ...validationResult, [provider]: isValid });
    } catch (error) {
      setValidationResult({ ...validationResult, [provider]: false });
    } finally {
      setValidating(false);
    }
  };

  // 保存设置
  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);

    try {
      await updateConfig({
        apiProvider,
        sourceLang,
        targetLang,
        enableSelection,
        apiKeys: {
          deepl: deeplApiKey || undefined,
          openai: openaiApiKey || undefined,
        },
        openaiModel,
      });

      setSaveMessage({ type: 'success', text: '设置已保存！' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      setSaveMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '保存失败',
      });
    } finally {
      setSaving(false);
    }
  };

  // 重置设置
  const handleReset = async () => {
    if (!confirm('确定要重置所有设置为默认值吗？')) {
      return;
    }

    setSaving(true);
    try {
      await updateConfig(DEFAULT_CONFIG);
      setSaveMessage({ type: 'success', text: '设置已重置为默认值！' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      setSaveMessage({
        type: 'error',
        text: '重置失败',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="options-container">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  return (
    <div className="options-container">
      <header className="options-header">
        <h1>🌐 Translator 设置</h1>
        <p className="subtitle">配置您的翻译偏好和 API 密钥</p>
      </header>

      {/* 翻译服务配置 */}
      <section className="settings-section">
        <h2>翻译服务</h2>
        <div className="setting-item">
          <label className="setting-label">选择翻译服务</label>
          <select
            className="setting-select"
            value={apiProvider}
            onChange={(e) => setApiProvider(e.target.value as ApiProvider)}
          >
            {API_PROVIDERS.map((provider) => (
              <option key={provider.code} value={provider.code}>
                {provider.name}
                {provider.requiresKey ? ' (需要 API 密钥)' : ' (免费)'}
              </option>
            ))}
          </select>
          <p className="setting-description">
            选择用于翻译的服务提供商
          </p>
        </div>

        {/* DeepL API 密钥 */}
        {apiProvider === 'deepl' && (
          <div className="setting-item api-key-item">
            <label className="setting-label">DeepL API 密钥</label>
            <div className="api-key-input-group">
              <input
                type="password"
                className="setting-input"
                placeholder="输入您的 DeepL API Key"
                value={deeplApiKey}
                onChange={(e) => setDeeplApiKey(e.target.value)}
              />
              <button
                className="validate-btn"
                onClick={() => validateApiKey('deepl', deeplApiKey)}
                disabled={!deeplApiKey || validating}
              >
                {validating ? '验证中...' : '验证'}
              </button>
            </div>
            {validationResult.deepl !== undefined && (
              <p className={`validation-result ${validationResult.deepl ? 'success' : 'error'}`}>
                {validationResult.deepl ? '✓ API 密钥有效' : '✗ API 密钥无效'}
              </p>
            )}
            <p className="setting-description">
              注册地址: <a href="https://www.deepl.com/pro-api" target="_blank" rel="noopener noreferrer">
                https://www.deepl.com/pro-api
              </a>
            </p>
          </div>
        )}

        {/* OpenAI API 密钥 */}
        {apiProvider === 'openai' && (
          <>
            <div className="setting-item api-key-item">
              <label className="setting-label">OpenAI API 密钥</label>
              <div className="api-key-input-group">
                <input
                  type="password"
                  className="setting-input"
                  placeholder="输入您的 OpenAI API Key"
                  value={openaiApiKey}
                  onChange={(e) => setOpenaiApiKey(e.target.value)}
                />
                <button
                  className="validate-btn"
                  onClick={() => validateApiKey('openai', openaiApiKey)}
                  disabled={!openaiApiKey || validating}
                >
                  {validating ? '验证中...' : '验证'}
                </button>
              </div>
              {validationResult.openai !== undefined && (
                <p className={`validation-result ${validationResult.openai ? 'success' : 'error'}`}>
                  {validationResult.openai ? '✓ API 密钥有效' : '✗ API 密钥无效'}
                </p>
              )}
              <p className="setting-description">
                注册地址: <a href="https://platform.openai.com" target="_blank" rel="noopener noreferrer">
                  https://platform.openai.com
                </a>
              </p>
            </div>

            <div className="setting-item">
              <label className="setting-label">OpenAI 模型</label>
              <select
                className="setting-select"
                value={openaiModel}
                onChange={(e) => setOpenaiModel(e.target.value)}
              >
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo (推荐)</option>
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
              </select>
              <p className="setting-description">
                选择用于翻译的 GPT 模型
              </p>
            </div>
          </>
        )}
      </section>

      {/* 语言设置 */}
      <section className="settings-section">
        <h2>默认语言</h2>
        <div className="language-settings">
          <div className="setting-item">
            <LanguageSelector
              label="源语言"
              value={sourceLang}
              onChange={setSourceLang}
              showAuto={true}
            />
            <p className="setting-description">
              翻译时默认的源语言
            </p>
          </div>

          <div className="setting-item">
            <LanguageSelector
              label="目标语言"
              value={targetLang}
              onChange={setTargetLang}
              showAuto={false}
            />
            <p className="setting-description">
              翻译时默认的目标语言
            </p>
          </div>
        </div>
      </section>

      {/* 功能设置 */}
      <section className="settings-section">
        <h2>功能选项</h2>
        <div className="setting-item">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={enableSelection}
              onChange={(e) => setEnableSelection(e.target.checked)}
            />
            <span>启用划词翻译</span>
          </label>
          <p className="setting-description">
            选中网页文本时自动显示翻译弹窗
          </p>
        </div>
      </section>

      {/* 保存消息 */}
      {saveMessage && (
        <div className={`save-message ${saveMessage.type}`}>
          {saveMessage.text}
        </div>
      )}

      {/* 操作按钮 */}
      <div className="actions">
        <button
          className="save-btn"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? '保存中...' : '💾 保存设置'}
        </button>
        <button
          className="reset-btn"
          onClick={handleReset}
          disabled={saving}
        >
          🔄 重置为默认
        </button>
      </div>

      {/* 页脚 */}
      <footer className="options-footer">
        <p>Translator v0.1.0</p>
        <p>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          {' · '}
          <a href="https://github.com" target="_blank" rel="noopener noreferrer">
            文档
          </a>
          {' · '}
          <a href="https://github.com" target="_blank" rel="noopener noreferrer">
            反馈
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;
