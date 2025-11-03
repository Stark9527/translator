import { useState, useEffect } from 'react';

export default function App() {
  const [engine, setEngine] = useState('google');
  const [deeplApiKey, setDeeplApiKey] = useState('');

  // 检查是否是欢迎页面
  const isWelcome = new URLSearchParams(window.location.search).get('welcome') === 'true';

  useEffect(() => {
    // 加载保存的配置
    chrome.storage.local.get(['engine', 'deeplApiKey'], result => {
      if (result.engine) setEngine(result.engine);
      if (result.deeplApiKey) setDeeplApiKey(result.deeplApiKey);
    });
  }, []);

  const handleSave = () => {
    chrome.storage.local.set({ engine, deeplApiKey }, () => {
      alert('设置已保存');
    });
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
            <p className="text-muted-foreground">
              感谢安装！请先配置您的翻译设置，然后就可以开始使用了。
            </p>
          </div>
        )}

        {/* 标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">设置</h1>
          <p className="text-muted-foreground">配置您的翻译偏好和API密钥</p>
        </div>

        {/* 翻译引擎选择 */}
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">翻译引擎</h2>

          <div className="space-y-3">
            <label className="flex items-center space-x-3 p-3 border border-border rounded-md hover:bg-accent cursor-pointer">
              <input
                type="radio"
                name="engine"
                value="google"
                checked={engine === 'google'}
                onChange={e => setEngine(e.target.value)}
                className="w-4 h-4"
              />
              <div>
                <div className="font-medium">Google 翻译</div>
                <div className="text-sm text-muted-foreground">
                  免费、支持语言多、无需API Key
                </div>
              </div>
            </label>

            <label className="flex items-center space-x-3 p-3 border border-border rounded-md hover:bg-accent cursor-pointer">
              <input
                type="radio"
                name="engine"
                value="deepl"
                checked={engine === 'deepl'}
                onChange={e => setEngine(e.target.value)}
                className="w-4 h-4"
              />
              <div>
                <div className="font-medium">DeepL</div>
                <div className="text-sm text-muted-foreground">
                  翻译质量高、需要API Key（即将支持）
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* DeepL API Key */}
        {engine === 'deepl' && (
          <div className="bg-card border border-border rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">DeepL API Key</h2>
            <input
              type="text"
              value={deeplApiKey}
              onChange={e => setDeeplApiKey(e.target.value)}
              placeholder="请输入您的 DeepL API Key"
              className="w-full p-3 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
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
          </div>
        )}

        {/* 关于 */}
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">关于</h2>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>版本：0.1.0</p>
            <p>一个支持多翻译引擎的智能Chrome翻译扩展</p>
            <p>功能：划词翻译、输入翻译、历史记录等</p>
          </div>
        </div>

        {/* 保存按钮 */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
          >
            保存设置
          </button>
        </div>
      </div>
    </div>
  );
}
