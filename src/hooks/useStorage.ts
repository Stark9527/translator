import { useState, useEffect, useCallback } from 'react';
import { ExtensionConfig } from '../types';
import { sendMessage } from '../utils/message';
import { MESSAGE_ACTIONS } from '../utils/constants';

/**
 * 使用 Chrome Storage 的 Hook
 */
export function useStorage() {
  const [config, setConfig] = useState<ExtensionConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载配置
  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await sendMessage({
        action: MESSAGE_ACTIONS.GET_CONFIG,
      });

      if (response.success && response.data) {
        setConfig(response.data);
      } else {
        setError(response.error || '加载配置失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载配置失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 更新配置
  const updateConfig = useCallback(async (newConfig: Partial<ExtensionConfig>) => {
    try {
      setError(null);

      const response = await sendMessage({
        action: MESSAGE_ACTIONS.UPDATE_CONFIG,
        config: newConfig,
      });

      if (response.success) {
        setConfig((prev) => (prev ? { ...prev, ...newConfig } : null));
      } else {
        setError(response.error || '更新配置失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新配置失败');
    }
  }, []);

  // 监听配置变化
  useEffect(() => {
    loadConfig();

    // 监听存储变化
    const handleStorageChange = (
      _changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === 'sync') {
        loadConfig();
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [loadConfig]);

  return {
    config,
    loading,
    error,
    updateConfig,
    reloadConfig: loadConfig,
  };
}
