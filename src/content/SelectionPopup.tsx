import { useState, useEffect, useRef } from 'react';
import type { TranslateResult, UserConfig } from '@/types';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Volume2, BookmarkPlus } from 'lucide-react';

export default function SelectionPopup() {
  const [showIcon, setShowIcon] = useState(false); // 控制 icon 是否显示
  const [showPopup, setShowPopup] = useState(false); // 控制 popup 是否显示
  const [iconPosition, setIconPosition] = useState({ top: 0, left: 0 });
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const [selectedText, setSelectedText] = useState('');
  const [isLoading, setIsLoading] = useState(false); // 翻译加载状态
  const [error, setError] = useState<string | null>(null); // 错误信息
  const [translationResult, setTranslationResult] = useState<TranslateResult | null>(null); // 翻译结果
  const [config, setConfig] = useState<UserConfig | null>(null); // 用户配置
  const [isSavingFlashcard, setIsSavingFlashcard] = useState(false); // 保存FlashCard状态
  const [isCardExists, setIsCardExists] = useState(false); // 卡片是否已存在
  const iconRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const isOpenRef = useRef(false);
  const showPopupRef = useRef(false);

  // 使用 ref 跟踪打开状态，避免 useEffect 依赖导致的问题
  useEffect(() => {
    isOpenRef.current = showIcon || showPopup;
    showPopupRef.current = showPopup; // 单独跟踪 popup 状态
  }, [showIcon, showPopup]);

  // 获取用户配置
  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_CONFIG', payload: null }, (response) => {
      if (response?.success && response.data) {
        setConfig(response.data);
      }
    });
  }, []);

  // 监听文本选中事件
  useEffect(() => {
    let lastSelectedText = ''; // 记录上一次选中的文字

    const handleMouseUp = (e: MouseEvent) => {
      console.info('MouseUp 事件触发');

      // 如果 popup 已打开，不处理新的划词（用户正在使用 popup）
      if (showPopupRef.current) {
        console.info('Popup 已打开，忽略');
        return;
      }

      // 如果只有 icon 显示，或者什么都没显示，都继续处理
      // 这样可以更新 icon 到新的划词位置
      const selection = window.getSelection();
      const text = selection?.toString().trim();

      console.info('选中的文本:', text, '长度:', text?.length);

      if (text && text.length > 0 && text.length < 500) {
        // 如果选中的文字和上次相同，说明用户只是点击了已划词区域，不重新显示 icon
        if (text === lastSelectedText) {
          console.info('与上次选中的文本相同，忽略');
          return;
        }

        console.info('准备显示 icon');
        lastSelectedText = text; // 更新记录
        setSelectedText(text);

        // 通过 background script 保存划词内容（content script 无法直接访问 session storage）
        chrome.runtime.sendMessage({
          type: 'SAVE_SELECTION',
          payload: { text, timestamp: Date.now() }
        }).then(() => {
          console.info('✅ 划词内容已发送到 background 保存');
        }).catch(err => {
          console.error('❌ 保存划词内容失败:', err);
        });

        // 获取鼠标松开时的位置（光标位置）
        const mouseX = e.clientX;
        const mouseY = e.clientY;

        // Icon 定位在鼠标光标的右下角
        // clientX/Y 是相对于视口的，需要加上滚动偏移
        const iconTop = mouseY + window.scrollY + 10; // 光标下方 10px
        const iconLeft = mouseX + window.scrollX + 10; // 光标右侧 10px

        // 先关闭旧的 icon（如果有的话）
        setShowIcon(false);
        setShowPopup(false);

        // 使用微任务确保状态更新后再显示新 icon
        // 这样可以有消失再出现的效果,而不是移动过去
        setTimeout(() => {
          const iconSize = 20; // Icon 的大小（缩小了）
          const iconCenterX = iconLeft + iconSize / 2; // Icon 中心点 X 坐标

          setIconPosition({
            top: iconTop,
            left: iconLeft,
          });

          // Popup 基于 Icon 居中定位，并调整确保在视口内
          // 垂直位置与 Icon 相同，水平位置通过 icon 中心点 + translateX(-50%) 实现居中
          const adjustedPosition = adjustPopupPosition(iconTop, iconCenterX);
          setPopupPosition(adjustedPosition);

          setShowIcon(true);
        }, 0);
      } else {
        // 如果没有选中文字，清空记录
        lastSelectedText = '';
      }
    };

    // 只在组件挂载时添加一次事件监听器，使用 ref 来检查状态
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []); // 空依赖数组，只执行一次

  // 监听点击外部关闭悬浮窗和icon
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // 只有在 icon 或悬浮窗打开时才处理
      if (!showIcon && !showPopup) {
        return;
      }

      // 由于使用了 Shadow DOM，需要使用 composedPath 来获取真实的事件路径
      const path = e.composedPath();

      // 检查事件路径中是否包含 popup 或 icon
      const isClickInsidePopup = popupRef.current && path.includes(popupRef.current);
      const isClickInsideIcon = iconRef.current && path.includes(iconRef.current);

      // 如果点击在外部，关闭悬浮窗/icon
      if (!isClickInsidePopup && !isClickInsideIcon) {
        handleClose();
      }
    };

    // 在 icon 或悬浮窗打开时添加监听器
    if (showIcon || showPopup) {
      // 使用 mousedown 而不是 click，确保在其他事件之前触发
      document.addEventListener('mousedown', handleClickOutside, true); // 使用捕获阶段
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [showIcon, showPopup]); // 依赖 showIcon 和 showPopup，只在状态变化时更新监听器

  // 翻译函数
  const handleTranslate = async () => {
    if (!selectedText.trim() || !config) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'TRANSLATE',
        payload: {
          text: selectedText,
          from: config.defaultSourceLang || 'auto',
          to: config.defaultTargetLang || 'zh-CN',
        },
      });

      if (response.success && response.data) {
        setTranslationResult(response.data);
        // 检查卡片是否已存在
        await checkCardExists(response.data);
      } else {
        setError(response.error || '翻译失败，请重试');
      }
    } catch (err) {
      console.error('Translation error:', err);
      setError(err instanceof Error ? err.message : '翻译失败，请重试');
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

  // 朗读函数
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


  // 保存到FlashCard
  const handleSaveToFlashcard = async () => {
    if (!translationResult) {
      console.warn('No translation result to save');
      return;
    }

    setIsSavingFlashcard(true);

    try {
      console.info('Saving flashcard:', translationResult);

      // 通过 background script 创建 flashcard
      const groupId = config?.defaultFlashcardGroupId || 'default';
      console.info('Using groupId:', groupId);

      const response = await chrome.runtime.sendMessage({
        type: 'CREATE_FLASHCARD',
        payload: {
          translation: translationResult,
          groupId
        }
      });

      if (response.success && response.data) {
        console.info('Flashcard saved successfully:', response.data);
        // 更新卡片已存在状态
        setIsCardExists(true);
      } else {
        throw new Error(response.error || '保存失败');
      }
    } catch (error) {
      console.error('Save flashcard error:', error);
      console.error('Error details:', {
        translationResult,
        config,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined
      });
      // 保存失败，可以在这里添加错误处理逻辑
    } finally {
      setIsSavingFlashcard(false);
    }
  };


  // 关闭所有（icon + popup）- 可通过点击 X 按钮或点击外部区域触发
  const handleClose = () => {
    setShowIcon(false);
    setShowPopup(false);
    setTranslationResult(null); // 清空翻译结果
    setError(null); // 清空错误信息
    setIsCardExists(false); // 重置卡片存在状态
  };

  // 鼠标进入icon，隐藏 icon 并展开 popup 面板
  const handleMouseEnter = () => {
    setShowIcon(false); // 隐藏 icon
    setShowPopup(true);  // 显示 popup
    // 自动触发翻译
    if (selectedText && !translationResult) {
      handleTranslate();
    }
  };

  // 调整popup位置，确保它完全显示在视口内
  const adjustPopupPosition = (top: number, left: number) => {
    // 估算popup的尺寸（实际渲染后可能会有所不同）
    const estimatedPopupWidth = 420; // maxWidth
    const estimatedPopupHeight = 250; // 估算高度，减小以避免过度调整
    const padding = 16; // 距离边界的安全距离

    // 获取视口尺寸
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    let adjustedTop = top;
    let adjustedLeft = left;

    // 检查水平方向（考虑translateX(-50%)，popup实际左边界是 left - popupWidth/2）
    const popupLeftEdge = left - estimatedPopupWidth / 2;
    const popupRightEdge = left + estimatedPopupWidth / 2;

    // 如果左边超出视口
    if (popupLeftEdge < scrollX + padding) {
      adjustedLeft = scrollX + padding + estimatedPopupWidth / 2;
    }
    // 如果右边超出视口
    else if (popupRightEdge > scrollX + viewportWidth - padding) {
      adjustedLeft = scrollX + viewportWidth - padding - estimatedPopupWidth / 2;
    }

    // 检查垂直方向 - 优化策略：尽量保持原位置，只在必要时微调
    const popupBottomEdge = top + estimatedPopupHeight;
    const viewportBottom = scrollY + viewportHeight;

    // 如果popup底部会超出视口底部
    if (popupBottomEdge > viewportBottom - padding) {
      // 优先策略：向上移动，让popup底部对齐视口底部
      adjustedTop = viewportBottom - padding - estimatedPopupHeight;

      // 如果向上移动后顶部超出视口顶部，则让popup填满可视区域
      if (adjustedTop < scrollY + padding) {
        adjustedTop = scrollY + padding;
      }
    }

    return { top: adjustedTop, left: adjustedLeft };
  };

  // 如果 icon 和 popup 都不显示，则不渲染任何内容
  if (!showIcon && !showPopup) return null;

  return (
    <>
      {/* 悬浮 Icon - 只在 showIcon 为 true 时显示 */}
      {showIcon && (
        <div
          ref={iconRef}
          onMouseEnter={handleMouseEnter}
          style={{
            position: 'absolute',
            top: `${iconPosition.top}px`,
            left: `${iconPosition.left}px`,
            zIndex: 999999,
          }}
        >
          <Button
            size="icon"
            className="translator-icon"
            style={{
              width: '10px',
              height: '10px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '50%',
              padding: 0,
              minWidth: 0,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
              border: 'none',
            }}
          >
            {/* 去掉图标，只保留圆形背景 */}
          </Button>
        </div>
      )}

      {/* 翻译 Popup 面板 */}
      {showPopup && (
        <div
          ref={popupRef}
          className="translator-popup-panel"
          onMouseUp={(e) => {
            // 阻止 mouseup 事件冒泡到 document，防止触发 handleMouseUp
            e.stopPropagation();
          }}
          style={{
            position: 'absolute',
            top: `${popupPosition.top}px`,
            left: `${popupPosition.left}px`,
            transform: 'translateX(-50%)', // 水平居中
            zIndex: 999998,
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.12)',
            width: '420px',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          {/* 标题栏 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
              paddingBottom: '8px',
              borderBottom: '1px solid #f3f4f6',
            }}
          >
            <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '500' }}>
              原文
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  fontSize: '11px',
                  color: '#6b7280',
                  background: '#f3f4f6',
                  padding: '2px 8px',
                  borderRadius: '12px',
                }}
              >
                {selectedText.length} 字符
              </div>
              {/* 关闭按钮 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                style={{
                  width: '20px',
                  height: '20px',
                  padding: 0,
                  minWidth: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* X 图标 */}
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </Button>
            </div>
          </div>

          {/* 选中的文本、音标和朗读按钮 */}
          <div
            style={{
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {/* 原文 */}
            <div
              style={{
                fontSize: '14px',
                color: '#111827',
                fontWeight: '600',
              }}
            >
              {selectedText}
            </div>
            {/* 音标 - 只在有翻译结果且有音标时显示 */}
            {translationResult?.phonetic && (
              <div
                style={{
                  fontSize: '11px',
                  color: '#8b5cf6',
                }}
              >
                {translationResult.phonetic}
              </div>
            )}
            {/* 朗读原文按钮 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSpeak(selectedText, translationResult?.from || config?.defaultSourceLang)}
              style={{
                height: '24px',
                padding: '0 4px',
                minWidth: '24px',
              }}
              title="朗读原文"
            >
              <Icon icon={Volume2} size="xs" style={{verticalAlign: '-2px'}} />
            </Button>
          </div>

          {/* 分隔线 */}
          <div
            style={{
              height: '1px',
              background: 'linear-gradient(90deg, transparent, #e5e7eb, transparent)',
              margin: '12px 0',
            }}
          />

          {/* 翻译结果区域 */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '500' }}>
                译文
              </div>
              {/* 只在有翻译结果时显示操作按钮 */}
              {translationResult && !isLoading && !error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {/* 保存到FlashCard按钮 - 带文字描述，作为一个整体 */}
                  <div title={isCardExists ? '已添加到卡片' : (isSavingFlashcard ? '保存中...' : '添加到卡片')}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSaveToFlashcard}
                      disabled={isSavingFlashcard || isCardExists}
                      className="flashcard-save-button"
                      style={{
                        height: '20px',
                        padding: '0 6px',
                        minWidth: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: isCardExists ? 'not-allowed' : 'pointer',
                        opacity: isCardExists ? 0.5 : 1,
                      }}
                    >
                      <Icon icon={BookmarkPlus} size="xs" />
                      <span style={{ fontSize: '12px', lineHeight: '1' }}>
                        {isCardExists ? '已添加' : '添加到卡片'}
                      </span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <div
              style={{
                fontSize: '14px',
                color: '#4b5563',
                lineHeight: '1.6',
                minHeight: '40px',
              }}
            >
              {isLoading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9ca3af' }}>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="spinner"
                    style={{ animation: 'spin 1s linear infinite' }}
                  >
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  <span>翻译中...</span>
                </div>
              )}
              {error && !isLoading && (
                <div style={{ color: '#ef4444', fontSize: '14px' }}>
                  ❌ {error}
                </div>
              )}
              {translationResult && !isLoading && !error && (
                <div style={{ color: '#111827' }}>
                  {/* 如果有词典信息，展示词典格式 */}
                  {translationResult.meanings && translationResult.meanings.length > 0 ? (
                    <div>
                      {/* 按词性展示翻译 */}
                      {translationResult.meanings.map((meaning, meaningIndex) => {
                        // 收集该词性下的所有例句，只取第一个
                        const allExamples = meaning.translations
                          .flatMap(trans => trans.examples || [])
                          .slice(0, 1); // 只显示1个例句

                        return (
                          <div key={meaningIndex} style={{ marginBottom: meaningIndex < translationResult.meanings!.length - 1 ? '16px' : '0' }}>
                            {/* 词性和翻译（同一行，用分号分隔） */}
                            <div style={{ marginBottom: '8px', lineHeight: '1.6' }}>
                              <span style={{ fontSize: '11px', color: '#5e5d59', fontWeight: '600' }}>
                                {meaning.partOfSpeech}.
                              </span>
                              <span style={{ fontSize: '13px', color: '#111827', fontWeight: '600' }}>
                                {' '}
                                {meaning.translations.slice(0, 5).map(trans => trans.text).join('；')}
                              </span>
                            </div>

                            {/* 例句 */}
                            {allExamples.length > 0 && allExamples[0].source && (
                              <div style={{
                                marginLeft: '0px',
                                background: '#f3f4f6',
                                padding: '8px 12px',
                                borderRadius: '8px'
                              }}>
                                {allExamples.map((example, exIdx) => (
                                  <div key={exIdx} style={{ marginBottom: exIdx < allExamples.length - 1 ? '8px' : '0' }}>
                                    {/* 英文例句 */}
                                    <div style={{
                                      fontSize: '13px',
                                      color: '#111827',
                                      marginBottom: '2px',
                                      lineHeight: '1.5'
                                    }}>
                                      {example.sourcePrefix}<span style={{  color: '#8b5cf6' }}>{example.sourceTerm}</span>{example.sourceSuffix}
                                    </div>
                                    {/* 中文翻译 */}
                                    <div style={{
                                      fontSize: '12px',
                                      color: '#6b7280',
                                      lineHeight: '1.5'
                                    }}>
                                      {example.targetPrefix}<span style={{ color: '#8b5cf6' }}>{example.targetTerm}</span>{example.targetSuffix}
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
                    <div>{translationResult.translation}</div>
                  )}
                </div>
              )}
              {!isLoading && !error && !translationResult && (
                <div style={{ color: '#9ca3af', fontStyle: 'italic' }}>
                  正在准备翻译...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
