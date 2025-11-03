import { useState, useEffect, useRef } from 'react';
import type { TranslateResult, UserConfig } from '@/types';
import { Icon } from '@/components/ui/icon';
import { Volume2, Copy } from 'lucide-react';

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
    const handleMouseUp = (e: MouseEvent) => {
      // 如果 popup 已打开，不处理新的划词（用户正在使用 popup）
      if (showPopupRef.current) {
        return;
      }

      // 如果只有 icon 显示，或者什么都没显示，都继续处理
      // 这样可以更新 icon 到新的划词位置
      const selection = window.getSelection();
      const text = selection?.toString().trim();

      if (text && text.length > 0 && text.length < 500) {
        setSelectedText(text);

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
        // 这样可以有消失再出现的效果，而不是移动过去
        setTimeout(() => {
          const iconSize = 26; // Icon 的大小
          const iconCenterX = iconLeft + iconSize / 2; // Icon 中心点 X 坐标

          setIconPosition({
            top: iconTop,
            left: iconLeft,
          });

          // Popup 基于 Icon 居中定位
          // 垂直位置与 Icon 相同，水平位置通过 icon 中心点 + translateX(-50%) 实现居中
          setPopupPosition({
            top: iconTop, // 保持与 Icon 相同的垂直位置
            left: iconCenterX, // Icon 中心点
          });

          setShowIcon(true);
        }, 0);
      }
    };

    // 只在组件挂载时添加一次事件监听器，使用 ref 来检查状态
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []); // 空依赖数组，只执行一次

  // 监听点击外部关闭悬浮窗
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // 只有在悬浮窗打开时才处理
      if (!showPopup) {
        return;
      }

      // 由于使用了 Shadow DOM，需要使用 composedPath 来获取真实的事件路径
      const path = e.composedPath();

      // 检查事件路径中是否包含 popup 或 icon
      const isClickInsidePopup = popupRef.current && path.includes(popupRef.current);
      const isClickInsideIcon = iconRef.current && path.includes(iconRef.current);

      // 如果点击在外部，关闭悬浮窗
      if (!isClickInsidePopup && !isClickInsideIcon) {
        handleClose();
      }
    };

    // 只在悬浮窗打开时添加监听器
    if (showPopup) {
      // 使用 mousedown 而不是 click，确保在其他事件之前触发
      document.addEventListener('mousedown', handleClickOutside, true); // 使用捕获阶段
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [showPopup]); // 依赖 showPopup，只在状态变化时更新监听器

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

  // 复制函数
  const handleCopy = async (text: string) => {
    if (!text.trim()) return;

    try {
      await navigator.clipboard.writeText(text);
      // 复制成功，可以添加提示
    } catch (error) {
      console.error('Copy error:', error);
    }
  };


  // 关闭所有（icon + popup）- 可通过点击 X 按钮或点击外部区域触发
  const handleClose = () => {
    setShowIcon(false);
    setShowPopup(false);
    setTranslationResult(null); // 清空翻译结果
    setError(null); // 清空错误信息
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

  // 如果 icon 和 popup 都不显示，则不渲染任何内容
  if (!showIcon && !showPopup) return null;

  return (
    <>
      {/* 悬浮 Icon - 只在 showIcon 为 true 时显示 */}
      {showIcon && (
        <div
          ref={iconRef}
          className="translator-icon"
          onMouseEnter={handleMouseEnter}
          style={{
            position: 'absolute',
            top: `${iconPosition.top}px`,
            left: `${iconPosition.left}px`,
            zIndex: 999999,
            width: '26px',
            height: '26px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            transition: 'all 0.2s ease',
          }}
        >
          {/* 翻译图标 SVG */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m5 8 6 6" />
            <path d="m4 14 6-6 2-3" />
            <path d="M2 5h12" />
            <path d="M7 2h1" />
            <path d="m22 22-5-10-5 10" />
            <path d="M14 18h6" />
          </svg>
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
            minWidth: '320px',
            maxWidth: '420px',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '500' }}>
                原文
              </div>
              {/* 朗读原文按钮 */}
              <button
                onClick={() => handleSpeak(selectedText, config?.defaultSourceLang)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  padding: '2px',
                  color: '#9ca3af',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f3f4f6';
                  e.currentTarget.style.color = '#6b7280';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#9ca3af';
                }}
                title="朗读原文"
              >
                <Icon icon={Volume2} size="xs" />
              </button>
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
              <button
                onClick={handleClose}
                style={{
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  color: '#9ca3af',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f3f4f6';
                  e.currentTarget.style.color = '#6b7280';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#9ca3af';
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
              </button>
            </div>
          </div>

          {/* 选中的文本 */}
          <div
            style={{
              fontSize: '15px',
              color: '#111827',
              lineHeight: '1.6',
              marginBottom: '16px',
              maxHeight: '120px',
              overflowY: 'auto',
            }}
          >
            {selectedText}
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
                  {/* 朗读译文按钮 */}
                  <button
                    onClick={() => handleSpeak(translationResult.translation, translationResult.to)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      padding: '2px',
                      color: '#9ca3af',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f3f4f6';
                      e.currentTarget.style.color = '#6b7280';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#9ca3af';
                    }}
                    title="朗读译文"
                  >
                    <Icon icon={Volume2} size="xs" />
                  </button>
                  {/* 复制译文按钮 */}
                  <button
                    onClick={() => handleCopy(translationResult.translation)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      padding: '2px',
                      color: '#9ca3af',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f3f4f6';
                      e.currentTarget.style.color = '#6b7280';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#9ca3af';
                    }}
                    title="复制译文"
                  >
                    <Icon icon={Copy} size="xs" />
                  </button>
                </div>
              )}
            </div>
            <div
              style={{
                fontSize: '15px',
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
                  {translationResult.translation}
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
