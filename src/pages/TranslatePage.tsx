import { useState, useEffect, useRef } from 'react';
import type { TranslateResult, UserConfig, LanguageCode } from '@/types';
import { Icon } from '@/components/ui/icon';
import { Volume2, Copy, ArrowLeftRight, BookmarkPlus } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '@/utils/constants';
import { flashcardService } from '@/services/flashcard';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function TranslatePage() {
  const [inputText, setInputText] = useState('');
  const [translationResult, setTranslationResult] = useState<TranslateResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<UserConfig | null>(null);
  const [sourceLang, setSourceLang] = useState<LanguageCode>('auto');
  const [targetLang, setTargetLang] = useState<LanguageCode>('zh-CN');
  const [isSavingFlashcard, setIsSavingFlashcard] = useState(false);
  const [saveFlashcardMessage, setSaveFlashcardMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    // 加载配置
    loadConfig();
  }, []);

  // 当语言切换时，如果译文存在则将译文移到输入框并重新翻译
  useEffect(() => {
    // 第一次加载时不触发
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (!isApiKeyConfigured()) return;

    // 如果有译文，将译文移到输入框作为新的原文
    if (translationResult) {
      const newText = translationResult.translation;
      setInputText(newText);
      setTranslationResult(null);
      // 立即使用新文本进行翻译
      handleTranslate(newText);
    } else if (inputText.trim()) {
      // 如果没有译文但有输入内容，直接翻译
      handleTranslate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceLang, targetLang]);

  const loadConfig = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_CONFIG' });
      if (response.success && response.data) {
        setConfig(response.data);
        setSourceLang(response.data.defaultSourceLang || 'auto');
        setTargetLang(response.data.defaultTargetLang || 'zh-CN');
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  };

  const handleTranslate = async (textToTranslate?: string) => {
    const text = textToTranslate ?? inputText;
    if (!text.trim()) return;

    setIsLoading(true);
    setError(null);
    setTranslationResult(null);

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'TRANSLATE',
        payload: {
          text,
          from: sourceLang,
          to: targetLang,
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

  // 输入框失焦时自动翻译
  const handleBlur = () => {
    if (inputText.trim() && isApiKeyConfigured()) {
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

  const handleSaveToFlashcard = async () => {
    if (!translationResult) return;

    setIsSavingFlashcard(true);
    setSaveFlashcardMessage(null);

    try {
      await flashcardService.createFromTranslation(translationResult, {
        groupId: 'default'
      });
      setSaveFlashcardMessage({ type: 'success', text: '已保存到FlashCard' });
      // 3秒后自动清除提示
      setTimeout(() => setSaveFlashcardMessage(null), 3000);
    } catch (error) {
      console.error('Save flashcard error:', error);
      setSaveFlashcardMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '保存失败，请重试'
      });
      // 5秒后自动清除错误提示
      setTimeout(() => setSaveFlashcardMessage(null), 5000);
    } finally {
      setIsSavingFlashcard(false);
    }
  };

  // 交换源语言和目标语言
  const handleSwapLanguages = () => {
    // 如果源语言是自动检测，不允许交换
    if (sourceLang === 'auto') return;

    // 交换语言
    const temp = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(temp);

    // 如果有译文，也交换输入框和译文的内容
    if (translationResult) {
      const newText = translationResult.translation;
      setInputText(newText);
      setTranslationResult(null);
    }
  };

  // 获取语言名称
  const getLanguageName = (code: LanguageCode) => {
    const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
    return lang?.name || code;
  };

  return (
    <TooltipProvider>
      <div className="flex-1 p-4 flex flex-col overflow-auto">
        {/* 标题 */}
        <div className="mb-4">
          <h1 className="text-xl font-bold text-foreground">智能翻译助手</h1>
          <p className="text-sm text-muted-foreground">
            {config ? `当前引擎: ${config.engine === 'google' ? 'Google 翻译' : config.engine}` : '加载中...'}
          </p>
        </div>

      {/* 语言选择器 */}
      <div className="mb-3 flex items-center gap-2 p-2 bg-muted rounded-md">
        <select
          value={sourceLang}
          onChange={e => setSourceLang(e.target.value as LanguageCode)}
          className="flex-1 px-2 py-1.5 text-sm bg-background border border-input rounded focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {SUPPORTED_LANGUAGES.map(lang => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </select>

        <button
          onClick={handleSwapLanguages}
          disabled={sourceLang === 'auto'}
          className="p-1.5 hover:bg-accent rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title={sourceLang === 'auto' ? '自动检测时无法切换' : '切换语言'}
        >
          <Icon icon={ArrowLeftRight} size="sm" className="text-muted-foreground hover:text-foreground" />
        </button>

        <select
          value={targetLang}
          onChange={e => setTargetLang(e.target.value as LanguageCode)}
          className="flex-1 px-2 py-1.5 text-sm bg-background border border-input rounded focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {SUPPORTED_LANGUAGES.filter(lang => lang.code !== 'auto').map(lang => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </select>
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

      {/* 输入和翻译结果区域 */}
      <div className="flex-1 flex flex-col gap-4 min-h-0">
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium text-foreground">
              输入文本
            </label>
            {inputText.trim() && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleSpeak(inputText, sourceLang !== 'auto' ? sourceLang : undefined)}
                    className="p-1 hover:bg-accent rounded-md transition-colors"
                  >
                    <Icon icon={Volume2} size="sm" className="text-muted-foreground hover:text-foreground" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>朗读原文</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <textarea
            className="flex-1 p-3 border border-input rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring text-sm"
            placeholder="输入文本后失焦自动翻译，或按 Ctrl/Cmd + Enter"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
          />
        </div>

        {/* 翻译结果区域 */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium text-foreground">
              翻译结果
            </label>
            {translationResult && (
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleSpeak(translationResult.translation, targetLang)}
                      className="p-1 hover:bg-accent rounded-md transition-colors"
                    >
                      <Icon icon={Volume2} size="sm" className="text-muted-foreground hover:text-foreground" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>朗读译文</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleCopy(translationResult.translation)}
                      className="p-1 hover:bg-accent rounded-md transition-colors"
                    >
                      <Icon icon={Copy} size="sm" className="text-muted-foreground hover:text-foreground" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>复制译文</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handleSaveToFlashcard}
                      disabled={isSavingFlashcard}
                      className="p-1 hover:bg-accent rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Icon icon={BookmarkPlus} size="sm" className="text-muted-foreground hover:text-foreground" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isSavingFlashcard ? '保存中...' : '添加到卡片库'}</p>
                  </TooltipContent>
                </Tooltip>
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
                    {getLanguageName(translationResult.from)} → {getLanguageName(translationResult.to)}
                  </span>
                  <span className="mx-2">•</span>
                  <span>{translationResult.engine}</span>
                </div>
                {saveFlashcardMessage && (
                  <div className={`mt-2 p-2 rounded-md text-xs ${
                    saveFlashcardMessage.type === 'success'
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                  }`}>
                    {saveFlashcardMessage.type === 'success' ? '✓ ' : '✗ '}
                    {saveFlashcardMessage.text}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">翻译结果将在这里显示</p>
            )}
          </div>
        </div>
      </div>
    </div>
    </TooltipProvider>
  );
}
