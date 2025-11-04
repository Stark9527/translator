// Background Service Worker for Chrome Extension
import type { Message } from '@/types/message';
import type { UserConfig } from '@/types';
import { TranslationManager } from '@/services/translation/TranslationManager';
import { ConfigService, ConfigValidationError, StorageQuotaError } from '@/services/config/ConfigService';

console.info('Background service worker started');

// 监听扩展安装事件
chrome.runtime.onInstalled.addListener(async details => {
  console.info('Extension installed:', details.reason);

  if (details.reason === 'install') {
    // 首次安装，初始化默认配置
    const defaultConfig = ConfigService.getDefaultConfig();
    await ConfigService.saveConfig(defaultConfig);

    // 打开欢迎页面
    chrome.tabs.create({
      url: chrome.runtime.getURL('src/options/index.html?welcome=true'),
    });
  } else if (details.reason === 'update') {
    console.info('Extension updated');
  }
});

// 监听来自 Content Script 和 Popup 的消息
chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  console.info('Received message:', message.type, 'from:', sender);

  // 异步处理消息
  handleMessage(message, sender)
    .then(response => {
      sendResponse({ success: true, data: response });
    })
    .catch(error => {
      console.error('Message handler error:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      });
    });

  // 返回 true 表示异步响应
  return true;
});

// 消息处理函数
async function handleMessage(message: Message, _sender: chrome.runtime.MessageSender) {
  const { type, payload } = message;

  switch (type) {
    case 'PING':
      return { message: 'PONG' };

    case 'GET_CONFIG': {
      // 获取用户配置
      const config = await ConfigService.getConfig();
      return config;
    }

    case 'SAVE_CONFIG': {
      // 保存用户配置
      const { config } = payload as { config: UserConfig };
      try {
        await ConfigService.saveConfig(config);
        return { success: true };
      } catch (error) {
        if (error instanceof ConfigValidationError) {
          throw new Error(`配置验证失败: ${error.message}`);
        }
        if (error instanceof StorageQuotaError) {
          throw new Error(`存储空间不足: ${error.message}`);
        }
        throw error;
      }
    }

    case 'RESET_CONFIG': {
      // 重置配置为默认值
      await ConfigService.resetConfig();
      return { success: true };
    }

    case 'EXPORT_CONFIG': {
      // 导出配置
      const configJson = await ConfigService.exportConfig();
      return configJson;
    }

    case 'IMPORT_CONFIG': {
      // 导入配置
      const { configJson } = payload as { configJson: string };
      try {
        await ConfigService.importConfig(configJson);
        return { success: true };
      } catch (error) {
        if (error instanceof ConfigValidationError) {
          throw new Error(`配置导入失败: ${error.message}`);
        }
        throw error;
      }
    }

    case 'GET_STORAGE_QUOTA': {
      // 获取存储配额信息
      const quota = await ConfigService.getStorageQuota();
      return quota;
    }

    case 'TRANSLATE': {
      // 执行翻译
      console.info('Translation request:', payload);
      const result = await TranslationManager.translate(payload);
      return result;
    }

    default:
      throw new Error(`Unknown message type: ${type}`);
  }
}

// 监听快捷键命令
chrome.commands.onCommand.addListener(command => {
  console.info('Command triggered:', command);

  if (command === 'translate-selection') {
    // 触发划词翻译
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'TRIGGER_TRANSLATE',
          payload: null,
        });
      }
    });
  }
});

// 监听配置变化
ConfigService.onConfigChange(async (config) => {
  console.info('Config changed:', config);

  // 清除翻译缓存（当引擎切换时）
  await TranslationManager.clearCache();
});

console.info('Background service worker initialized');
