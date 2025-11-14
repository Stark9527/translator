import { useState, useEffect, useRef } from 'react';
import type { TranslateResult, UserConfig, LanguageCode } from '@/types';
import type { FlashcardGroup } from '@/types/flashcard';
import { Icon } from '@/components/ui/icon';
import { Volume2, ArrowLeftRight, BookmarkPlus } from 'lucide-react';
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
  const [isCardExists, setIsCardExists] = useState(false);
  const [groups, setGroups] = useState<FlashcardGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('default');
  const isInitialMount = useRef(true);
  const lastTranslatedText = useRef<string>(''); // 记录上次翻译的文本
  const textareaRef = useRef<HTMLTextAreaElement>(null); // 输入框引用

  useEffect(() => {
    // 加载配置
    loadConfig();
  }, []);

  // 自动聚焦和检测划词/剪贴板内容
  useEffect(() => {
    // 只在组件首次挂载时执行
    if (!config) return;

    const autoFocusAndFillText = async () => {
      let textToFill = '';

      try {
        // 获取上次已使用的内容
        const { lastUsedText } = await chrome.storage.session.get(['lastUsedText']);

        // 1. 检查剪贴板内容（最高优先级）
        let clipboardText = '';
        try {
          clipboardText = await navigator.clipboard.readText();
        } catch (clipboardError) {
          // 无法读取剪贴板（权限问题或其他原因）
        }

        // 2. 检查最近的划词内容（10秒内有效）
        const { recentSelectionText, recentSelectionTimestamp } = await chrome.storage.session.get([
          'recentSelectionText',
          'recentSelectionTimestamp'
        ]);

        const now = Date.now();
        const isRecentSelection = recentSelectionTimestamp && (now - recentSelectionTimestamp < 10000); // 延长到10秒

        // 3. 优先级判断:剪贴板 > 划词
        if (clipboardText && clipboardText.trim() && clipboardText !== lastUsedText) {
          // 优先使用剪贴板
          textToFill = clipboardText;
        } else if (isRecentSelection && recentSelectionText && recentSelectionText.trim() && recentSelectionText !== lastUsedText) {
          // 如果剪贴板无效，使用划词内容
          textToFill = recentSelectionText;
        }

        // 清除划词内容记录（无论是否使用）
        if (recentSelectionText) {
          await chrome.storage.session.remove(['recentSelectionText', 'recentSelectionTimestamp']);
        }

        // 4. 填充内容并触发翻译
        if (textToFill) {
          setInputText(textToFill);
          // 记录已使用的内容
          await chrome.storage.session.set({ lastUsedText: textToFill });

          // 等待 DOM 更新后，触发翻译
          setTimeout(() => {
            // 自动触发翻译
            handleTranslate(textToFill);
          }, 0);
        } else {
          // 没有任何内容，只聚焦
          textareaRef.current?.focus();
        }
      } catch (error) {
        // 如果出现任何错误，至少保证聚焦
        console.error('自动填充文本失败:', error);
        textareaRef.current?.focus();
      }
    };

    autoFocusAndFillText();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  // 当输入框清空时,清空上次翻译的文本记录
  useEffect(() => {
    if (!inputText.trim()) {
      lastTranslatedText.current = '';
    }
  }, [inputText]);

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
        // 设置默认选中的分组
        setSelectedGroupId(response.data.defaultFlashcardGroupId || 'default');
      }

      // 加载所有分组
      const allGroups = await flashcardService.getAllGroups();
      setGroups(allGroups);
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
        // 更新上次翻译的文本
        lastTranslatedText.current = text;
        // 检查卡片是否已存在
        await checkCardExists(response.data);
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

  // 检查卡片是否已存在
  const checkCardExists = async (translation: TranslateResult) => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'CHECK_FLASHCARD_EXISTS',
        payload: {
          word: translation.text,
          sourceLanguage: translation.from,
          targetLanguage: translation.to,
        },
      });

      if (response.success) {
        setIsCardExists(response.data);
      }
    } catch (err) {
      console.error('Check card exists error:', err);
      // 检查失败时默认为不存在，允许用户添加
      setIsCardExists(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleTranslate();
    }
  };

  // 输入框失焦时自动翻译(仅当文本发生变化时)
  const handleBlur = () => {
    const trimmedText = inputText.trim();
    // 只有当文本非空、API已配置、且文本与上次翻译的文本不同时才翻译
    if (trimmedText && isApiKeyConfigured() && trimmedText !== lastTranslatedText.current) {
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


  const handleSaveToFlashcard = async () => {
    if (!translationResult) return;

    setIsSavingFlashcard(true);

    try {
      await flashcardService.createFromTranslation(translationResult, {
        groupId: selectedGroupId
      });
      // 更新卡片已存在状态
      setIsCardExists(true);
    } catch (error) {
      console.error('Save flashcard error:', error);
      // 保存失败，可以在这里添加错误处理逻辑
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

  return (
    <TooltipProvider>
      <div className="flex-1 p-4 flex flex-col overflow-auto">
        {/* 页面标题 */}
        <PageHeader
          title="智能翻译助手"
        />

        {/* 语言选择器 */}
        <div className="mb-2 flex items-center gap-2 p-1.5 bg-muted rounded-md">
          <Select value={sourceLang} onValueChange={(value) => setSourceLang(value as LanguageCode)}>
            <SelectTrigger className="flex-1 h-8">
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

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleSwapLanguages}
                disabled={sourceLang === 'auto'}
              >
                <Icon icon={ArrowLeftRight} size="sm" className="text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{sourceLang === 'auto' ? '自动检测时无法切换' : '切换语言'}</p>
            </TooltipContent>
          </Tooltip>

          <Select value={targetLang} onValueChange={(value) => setTargetLang(value as LanguageCode)}>
            <SelectTrigger className="flex-1 h-8">
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
          <div className="flex-[0.4] flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-1.5">
              <Label className="h-8 text-sm font-medium" style={{lineHeight: '2rem'}}>
                输入文本
              </Label>
            </div>
            <Textarea
              ref={textareaRef}
              className="flex-1 resize-none text-sm"
              placeholder="请输入要翻译的文本"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
            />
          </div>

          {/* 翻译结果区域 */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-1.5">
              <Label className="h-8 text-sm font-medium" style={{lineHeight: '2rem'}}>
                翻译结果
              </Label>
              {translationResult && (
                <div className="flex items-center gap-1">
                  <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                    <SelectTrigger className="h-auto w-auto min-w-0 border-0 bg-accent/50 text-xs px-2 py-1 focus:ring-0 focus:ring-offset-0">
                      <SelectValue placeholder="选择分组" />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map(group => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={handleSaveToFlashcard}
                    disabled={isSavingFlashcard || isCardExists}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: isCardExists ? 'not-allowed' : 'pointer',
                      opacity: isCardExists ? 0.5 : 1,
                    }}
                  >
                    <Icon icon={BookmarkPlus} size="sm" className="text-muted-foreground" />
                    <span style={{ fontSize: '12px' }}>
                      {isCardExists ? '已添加' : '添加到卡片'}
                    </span>
                  </Button>
                </div>
              )}
            </div>
            <div className="flex-1 rounded-md overflow-auto">
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
                  {/* 判断是否有词典信息 */}
                  {translationResult.meanings && translationResult.meanings.length > 0 ? (
                    <div className="space-y-2">
                      {/* 音标和发音按钮 */}
                      {translationResult.phonetic && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-purple-600 font-medium">
                            {translationResult.phonetic}
                          </span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleSpeak(translationResult.text, translationResult.from)}
                              >
                                <Icon icon={Volume2} size="sm" className="text-muted-foreground" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>朗读原文</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      )}

                      {/* 按词性展示翻译 */}
                      {translationResult.meanings.map((meaning, meaningIndex) => {
                        // 收集该词性下的所有例句，只取第一个
                        const allExamples = meaning.translations
                          .flatMap(trans => trans.examples || [])
                          .slice(0, 1); // 只显示1个例句

                        return (
                          <div key={meaningIndex} className="space-y-2">
                            {/* 词性和翻译（同一行，用分号分隔） */}
                            <div className="leading-relaxed">
                              <span className="text-xs text-muted-foreground font-medium">
                                {meaning.partOfSpeech}.
                              </span>
                              <span className="text-sm text-foreground font-medium ml-1">
                                {meaning.translations.slice(0, 5).map(trans => trans.text).join('；')}
                              </span>
                            </div>

                            {/* 例句 */}
                            {allExamples.length > 0 && allExamples[0].source && (
                              <div className="bg-accent/50 rounded-lg p-2 space-y-1">
                                {allExamples.map((example, exIdx) => (
                                  <div key={exIdx}>
                                    {/* 英文例句 */}
                                    <div className="text-xs text-foreground leading-relaxed mb-1">
                                      {example.sourcePrefix}
                                      <span className="text-purple-600 font-medium">{example.sourceTerm}</span>
                                      {example.sourceSuffix}
                                    </div>
                                    {/* 中文翻译 */}
                                    <div className="text-xs text-muted-foreground leading-relaxed">
                                      {example.targetPrefix}
                                      <span className="text-purple-600 font-medium">{example.targetTerm}</span>
                                      {example.targetSuffix}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* 普通翻译结果 */
                    <p className="text-sm text-foreground">{translationResult.translation}</p>
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
