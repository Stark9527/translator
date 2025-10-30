import { useState, useCallback } from 'react';
import { LanguageCode, TranslateResponse } from '../types';
import { sendMessage } from '../utils/message';
import { MESSAGE_ACTIONS } from '../utils/constants';

/**
 * 翻译状态
 */
interface TranslateState {
  result: TranslateResponse | null;
  loading: boolean;
  error: string | null;
}

/**
 * 翻译 Hook
 */
export function useTranslate() {
  const [state, setState] = useState<TranslateState>({
    result: null,
    loading: false,
    error: null,
  });

  // 执行翻译
  const translate = useCallback(
    async (text: string, from: LanguageCode, to: LanguageCode) => {
      // 验证输入
      if (!text || !text.trim()) {
        setState({
          result: null,
          loading: false,
          error: '请输入要翻译的文本',
        });
        return;
      }

      try {
        setState({
          result: null,
          loading: true,
          error: null,
        });

        const response = await sendMessage<TranslateResponse>({
          action: MESSAGE_ACTIONS.TRANSLATE,
          text: text.trim(),
          from,
          to,
        });

        if (response.success && response.data) {
          setState({
            result: response.data,
            loading: false,
            error: null,
          });
        } else {
          setState({
            result: null,
            loading: false,
            error: response.error || '翻译失败',
          });
        }
      } catch (err) {
        setState({
          result: null,
          loading: false,
          error: err instanceof Error ? err.message : '翻译失败，请检查网络连接',
        });
      }
    },
    []
  );

  // 清除结果
  const clear = useCallback(() => {
    setState({
      result: null,
      loading: false,
      error: null,
    });
  }, []);

  return {
    result: state.result,
    loading: state.loading,
    error: state.error,
    translate,
    clear,
  };
}
