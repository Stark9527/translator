import { useState, useEffect } from 'react';
import type { UserConfig, TranslationEngine } from '@/types';

export default function App() {
  const [config, setConfig] = useState<UserConfig>({
    engine: 'google',
    defaultSourceLang: 'auto',
    defaultTargetLang: 'zh-CN',
    googleApiKey: '',
    deeplApiKey: '',
    theme: 'auto',
    enableShortcut: true,
    enableHistory: true,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [saveMessage, setSaveMessage] = useState('');

  // 检查是否是欢迎页面
  const isWelcome = new URLSearchParams(window.location.search).get('welcome') === 'true';

  useEffect(() => {
    // 加载保存的配置
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_CONFIG' });
      if (response.success && response.data) {
        setConfig(response.data);
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SAVE_CONFIG',
        payload: { config },
      });

      if (response.success) {
        setSaveMessage('设置已保存！');
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        setSaveMessage('保存失败，请重试');
      }
    } catch (error) {
      console.error('Failed to save config:', error);
      setSaveMessage('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestApiKey = async () => {
    const currentEngine = config.engine;
    const apiKey = currentEngine === 'google' ? config.googleApiKey : config.deeplApiKey;

    if (!apiKey || !apiKey.trim()) {
      setTestResult({
        type: 'error',
        message: '请先输入 API Key',
      });
      return;
    }

    setIsTesting(true);
    setTestResult({ type: 'info', message: '正在测试...' });

    try {
      // 先保存配置
      await chrome.runtime.sendMessage({
        type: 'SAVE_CONFIG',
        payload: { config },
      });

      // 测试翻译
      const response = await chrome.runtime.sendMessage({
        type: 'TRANSLATE',
        payload: {
          text: 'Hello',
          from: 'en',
          to: 'zh-CN',
        },
      });

      if (response.success && response.data) {
        setTestResult({
          type: 'success',
          message: `✓ API Key 有效！测试翻译：Hello → ${response.data.translation}`,
        });
      } else {
        setTestResult({
          type: 'error',
          message: `✗ API Key 测试失败：${response.error || '未知错误'}`,
        });
      }
    } catch (error) {
      console.error('Test API key error:', error);
      setTestResult({
        type: 'error',
        message: `✗ 测试失败：${error instanceof Error ? error.message : '未知错误'}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleEngineChange = (engine: TranslationEngine) => {
    setConfig({ ...config, engine });
    setTestResult(null); // 清除之前的测试结果
  };

  const handleApiKeyChange = (key: 'googleApiKey' | 'deeplApiKey', value: string) => {
    setConfig({ ...config, [key]: value });
    setTestResult(null); // 清除测试结果
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-3xl mx-auto">
        {/* 欢迎信息 */}
        {isWelcome && (
          <div className="mb-8 p-6 bg-primary/10 border border-primary/20 rounded-lg">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              🎉 欢迎使用智能翻译助手！
            </h2>
            <p className="text-muted-foreground mb-3">
              感谢安装！请先配置您的翻译设置，然后就可以开始使用了。
            </p>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3 text-sm">
              <p className="text-yellow-800 dark:text-yellow-200">
                <strong>重要提示：</strong> 使用 Google 翻译需要配置 Google Cloud Translation API Key。
                <a
                  href="https://cloud.google.com/translate/docs/setup"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline ml-1"
                >
                  点击查看如何获取
                </a>
              </p>
            </div>
          </div>
        )}

        {/* 标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">设置</h1>
          <p className="text-muted-foreground">配置您的翻译偏好和 API 密钥</p>
        </div>

        {/* 翻译引擎选择 */}
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">翻译引擎</h2>

          <div className="space-y-3">
            <label className="flex items-center space-x-3 p-3 border border-border rounded-md hover:bg-accent cursor-pointer transition-colors">
              <input
                type="radio"
                name="engine"
                value="google"
                checked={config.engine === 'google'}
                onChange={e => handleEngineChange(e.target.value as TranslationEngine)}
                className="w-4 h-4"
              />
              <div className="flex-1">
                <div className="font-medium">Google Cloud Translation</div>
                <div className="text-sm text-muted-foreground">
                  官方 API、支持语言多、需要 API Key
                </div>
              </div>
            </label>

            <label className="flex items-center space-x-3 p-3 border border-border rounded-md hover:bg-accent cursor-pointer opacity-50 transition-colors">
              <input
                type="radio"
                name="engine"
                value="deepl"
                checked={config.engine === 'deepl'}
                onChange={e => handleEngineChange(e.target.value as TranslationEngine)}
                className="w-4 h-4"
                disabled
              />
              <div className="flex-1">
                <div className="font-medium">DeepL</div>
                <div className="text-sm text-muted-foreground">
                  翻译质量高、需要 API Key（即将支持）
                </div>
              </div>
            </label>

            <label className="flex items-center space-x-3 p-3 border border-border rounded-md hover:bg-accent cursor-pointer opacity-50 transition-colors">
              <input
                type="radio"
                name="engine"
                value="openai"
                checked={config.engine === 'openai'}
                onChange={e => handleEngineChange(e.target.value as TranslationEngine)}
                className="w-4 h-4"
                disabled
              />
              <div className="flex-1">
                <div className="font-medium">OpenAI</div>
                <div className="text-sm text-muted-foreground">
                  AI 驱动、上下文理解强（即将支持）
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Google API Key */}
        {config.engine === 'google' && (
          <div className="bg-card border border-border rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground">Google Cloud Translation API Key</h2>
              <button
                onClick={handleTestApiKey}
                disabled={isTesting || !config.googleApiKey?.trim()}
                className="px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                {isTesting ? '测试中...' : '测试 API Key'}
              </button>
            </div>

            <input
              type="password"
              value={config.googleApiKey || ''}
              onChange={e => handleApiKeyChange('googleApiKey', e.target.value)}
              placeholder="请输入您的 Google Cloud Translation API Key"
              className="w-full p-3 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring font-mono text-sm"
            />

            {/* 测试结果 */}
            {testResult && (
              <div
                className={`mt-3 p-3 rounded-md text-sm ${
                  testResult.type === 'success'
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
                    : testResult.type === 'error'
                    ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
                    : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
                }`}
              >
                {testResult.message}
              </div>
            )}

            {/* 帮助信息 */}
            <div className="mt-4 p-4 bg-muted rounded-md space-y-2 text-sm">
              <p className="font-medium text-foreground">如何获取 Google Cloud Translation API Key：</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-2">
                <li>
                  访问{' '}
                  <a
                    href="https://console.cloud.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Google Cloud Console
                  </a>
                </li>
                <li>创建或选择一个项目</li>
                <li>启用 "Cloud Translation API"</li>
                <li>在"凭据"页面创建 API 密钥</li>
                <li>（推荐）限制 API 密钥仅用于 Translation API</li>
              </ol>
              <p className="text-muted-foreground mt-2">
                <strong>注意：</strong> Google Cloud Translation API 是付费服务，但提供每月免费额度。
                <a
                  href="https://cloud.google.com/translate/pricing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline ml-1"
                >
                  查看价格
                </a>
              </p>
            </div>
          </div>
        )}

        {/* DeepL API Key */}
        {config.engine === 'deepl' && (
          <div className="bg-card border border-border rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">DeepL API Key</h2>
            <input
              type="password"
              value={config.deeplApiKey || ''}
              onChange={e => handleApiKeyChange('deeplApiKey', e.target.value)}
              placeholder="请输入您的 DeepL API Key"
              className="w-full p-3 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring font-mono text-sm"
              disabled
            />
            <p className="mt-2 text-sm text-muted-foreground">
              获取 API Key：
              <a
                href="https://www.deepl.com/pro-api"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline ml-1"
              >
                DeepL API
              </a>
            </p>
            <p className="mt-2 text-sm text-yellow-600 dark:text-yellow-400">
              DeepL 翻译器即将支持，敬请期待...
            </p>
          </div>
        )}

        {/* 语言设置 */}
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">默认语言设置</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                源语言
              </label>
              <select
                value={config.defaultSourceLang}
                onChange={e => setConfig({ ...config, defaultSourceLang: e.target.value as any })}
                className="w-full p-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="auto">自动检测</option>
                <option value="zh-CN">简体中文</option>
                <option value="zh-TW">繁体中文</option>
                <option value="en">英语</option>
                <option value="ja">日语</option>
                <option value="ko">韩语</option>
                <option value="fr">法语</option>
                <option value="de">德语</option>
                <option value="es">西班牙语</option>
                <option value="ru">俄语</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                目标语言
              </label>
              <select
                value={config.defaultTargetLang}
                onChange={e => setConfig({ ...config, defaultTargetLang: e.target.value as any })}
                className="w-full p-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="zh-CN">简体中文</option>
                <option value="zh-TW">繁体中文</option>
                <option value="en">英语</option>
                <option value="ja">日语</option>
                <option value="ko">韩语</option>
                <option value="fr">法语</option>
                <option value="de">德语</option>
                <option value="es">西班牙语</option>
                <option value="ru">俄语</option>
              </select>
            </div>
          </div>
        </div>

        {/* 关于 */}
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">关于</h2>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p><strong>版本：</strong> 0.1.0</p>
            <p><strong>描述：</strong> 一个支持多翻译引擎的智能 Chrome 翻译扩展</p>
            <p><strong>功能：</strong> 划词翻译、输入翻译、历史记录等</p>
            <p><strong>当前支持：</strong> Google Cloud Translation API v2</p>
          </div>
        </div>

        {/* 保存按钮和消息 */}
        <div className="flex items-center justify-between">
          {saveMessage && (
            <span className="text-sm text-green-600 dark:text-green-400">
              {saveMessage}
            </span>
          )}
          <div className="flex-1"></div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {isSaving ? '保存中...' : '保存设置'}
          </button>
        </div>
      </div>
    </div>
  );
}
