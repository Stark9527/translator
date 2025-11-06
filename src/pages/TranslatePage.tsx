import { useState, useEffect, useRef } from 'react';
import type { TranslateResult, UserConfig, LanguageCode } from '@/types';
import { Icon } from '@/components/ui/icon';
import { Volume2, Copy, ArrowLeftRight, BookmarkPlus } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '@/utils/constants';
import { flashcardService } from '@/services/flashcard';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
        groupId: config?.defaultFlashcardGroupId || 'default'
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
        {/* 页面标题 */}
        <PageHeader
          title="智能翻译助手"
          subtitle={config ? `当前引擎: ${config.engine === 'google' ? 'Google 翻译' : config.engine}` : '加载中...'}
        />

        {/* 语言选择器 */}
        <div className="mb-3 flex items-center gap-2 p-2 bg-muted rounded-md">
          <Select value={sourceLang} onValueChange={(value) => setSourceLang(value as LanguageCode)}>
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_LANGUAGES.map(lang => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleSwapLanguages}
            disabled={sourceLang === 'auto'}
            title={sourceLang === 'auto' ? '自动检测时无法切换' : '切换语言'}
          >
            <Icon icon={ArrowLeftRight} size="sm" className="text-muted-foreground" />
          </Button>

          <Select value={targetLang} onValueChange={(value) => setTargetLang(value as LanguageCode)}>
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_LANGUAGES.filter(lang => lang.code !== 'auto').map(lang => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* API Key 未配置提示 */}
        {config && !isApiKeyConfigured() && (
          <Alert variant="warning" className="mb-3">
            <AlertDescription>
              <p className="text-sm">
                ⚠️ 请先在设置中配置 API Key
              </p>
              <Button
                variant="link"
                size="sm"
                onClick={() => chrome.runtime.openOptionsPage()}
                className="p-0 h-auto text-xs mt-2"
              >
                前往设置 →
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* 输入和翻译结果区域 */}
        <div className="flex-1 flex flex-col gap-4 min-h-0">
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-sm font-medium">
                输入文本
              </Label>
              {inputText.trim() && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleSpeak(inputText, sourceLang !== 'auto' ? sourceLang : undefined)}
                    >
                      <Icon icon={Volume2} size="sm" className="text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>朗读原文</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <Textarea
              className="flex-1 resize-none text-sm"
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
              <Label className="text-sm font-medium">
                翻译结果
              </Label>
              {translationResult && (
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleSpeak(translationResult.translation, targetLang)}
                      >
                        <Icon icon={Volume2} size="sm" className="text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>朗读译文</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleCopy(translationResult.translation)}
                      >
                        <Icon icon={Copy} size="sm" className="text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>复制译文</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={handleSaveToFlashcard}
                        disabled={isSavingFlashcard}
                      >
                        <Icon icon={BookmarkPlus} size="sm" className="text-muted-foreground" />
                      </Button>
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
                <Alert variant="destructive" className="border-0">
                  <AlertDescription>
                    <p className="font-medium mb-1">翻译失败：</p>
                    <p className="text-sm">{error}</p>
                  </AlertDescription>
                </Alert>
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
                    <Alert variant={saveFlashcardMessage.type === 'success' ? 'success' : 'destructive'} className="mt-2">
                      <AlertDescription className="text-xs">
                        {saveFlashcardMessage.type === 'success' ? '✓ ' : '✗ '}
                        {saveFlashcardMessage.text}
                      </AlertDescription>
                    </Alert>
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
