import { useState, useEffect } from 'react';
import type { TranslateResult, UserConfig } from '@/types';
import { Icon } from '@/components/ui/icon';
import { Volume2, Copy } from 'lucide-react';

export default function App() {
  const [inputText, setInputText] = useState('');
  const [translationResult, setTranslationResult] = useState<TranslateResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<UserConfig | null>(null);

  useEffect(() => {
    // 加载配置
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

  const handleTranslate = async () => {
    if (!inputText.trim()) return;

    setIsLoading(true);
    setError(null);
    setTranslationResult(null);

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'TRANSLATE',
        payload: {
          text: inputText,
          from: config?.defaultSourceLang || 'auto',
          to: config?.defaultTargetLang || 'zh-CN',
        },
      });

      if (response.success && response.data) {
        setTranslationResult(response.data);
      } else {
        setError(response.error || '翻译失败，请重试');
      }
    } catch (error) {
      console.error('Translation error:', error);
      setError(error instanceof Error ? error.message : '翻译失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleTranslate();
    }
  };

  const isApiKeyConfigured = () => {
    if (!config) return false;
    if (config.engine === 'google') return !!config.googleApiKey;
    if (config.engine === 'deepl') return !!config.deeplApiKey;
    return false;
  };

  const handleSpeak = (text: string, lang?: string) => {
    if (!text.trim()) return;

    try {
      // 停止之前的朗读
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);

      // 设置语言
      if (lang) {
        utterance.lang = lang;
      }

      // 设置语速和音调
      utterance.rate = 0.9;
      utterance.pitch = 1;

      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('Speech error:', error);
    }
  };

  const handleCopy = async (text: string) => {
    if (!text.trim()) return;

    try {
      await navigator.clipboard.writeText(text);
      // 可以添加一个提示，告诉用户复制成功
      console.log('复制成功');
    } catch (error) {
      console.error('Copy error:', error);
    }
  };

  return (
    <div className="w-[400px] h-[500px] p-4 bg-background flex flex-col">
      {/* 标题 */}
      <div className="mb-4">
        <h1 className="text-xl font-bold text-foreground">智能翻译助手</h1>
        <p className="text-sm text-muted-foreground">
          {config ? `当前引擎: ${config.engine === 'google' ? 'Google 翻译' : config.engine}` : '加载中...'}
        </p>
      </div>

      {/* API Key 未配置提示 */}
      {config && !isApiKeyConfigured() && (
        <div className="mb-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ 请先在设置中配置 API Key
          </p>
          <button
            onClick={() => chrome.runtime.openOptionsPage()}
            className="mt-2 text-xs text-primary hover:underline"
          >
            前往设置 →
          </button>
        </div>
      )}

      {/* 输入区域 */}
      <div className="flex-1 flex flex-col gap-3 min-h-0">
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-foreground">
              输入文本
            </label>
            {inputText.trim() && (
              <button
                onClick={() => handleSpeak(inputText, config?.defaultSourceLang)}
                className="p-1 hover:bg-accent rounded-md transition-colors"
                title="朗读原文"
              >
                <Icon icon={Volume2} size="sm" className="text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
          <textarea
            className="flex-1 p-3 border border-input rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring text-sm"
            placeholder="请输入要翻译的文本... (Ctrl/Cmd + Enter 翻译)"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <button
          onClick={handleTranslate}
          disabled={isLoading || !inputText.trim() || !isApiKeyConfigured()}
          className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity text-sm font-medium"
        >
          {isLoading ? '翻译中...' : '翻译'}
        </button>

        {/* 翻译结果区域 */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-foreground">
              翻译结果
            </label>
            {translationResult && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleSpeak(translationResult.translation, translationResult.to)}
                  className="p-1 hover:bg-accent rounded-md transition-colors"
                  title="朗读译文"
                >
                  <Icon icon={Volume2} size="sm" className="text-muted-foreground hover:text-foreground" />
                </button>
                <button
                  onClick={() => handleCopy(translationResult.translation)}
                  className="p-1 hover:bg-accent rounded-md transition-colors"
                  title="复制译文"
                >
                  <Icon icon={Copy} size="sm" className="text-muted-foreground hover:text-foreground" />
                </button>
              </div>
            )}
          </div>
          <div className="flex-1 p-3 border border-input rounded-md bg-muted overflow-auto">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">翻译中...</p>
            ) : error ? (
              <div className="text-sm text-red-600 dark:text-red-400">
                <p className="font-medium mb-1">翻译失败：</p>
                <p>{error}</p>
              </div>
            ) : translationResult ? (
              <div className="space-y-2">
                <p className="text-sm text-foreground">{translationResult.translation}</p>
                <div className="pt-2 border-t border-border text-xs text-muted-foreground">
                  <span>
                    {translationResult.from} → {translationResult.to}
                  </span>
                  <span className="mx-2">•</span>
                  <span>{translationResult.engine}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">翻译结果将在这里显示</p>
            )}
          </div>
        </div>
      </div>

      {/* 底部链接 */}
      <div className="mt-4 pt-3 border-t border-border flex justify-between items-center text-xs">
        <a
          href="#"
          onClick={e => {
            e.preventDefault();
            chrome.runtime.openOptionsPage();
          }}
          className="text-primary hover:underline"
        >
          设置
        </a>
        <span className="text-muted-foreground">
          v0.1.0
        </span>
      </div>
    </div>
  );
}
