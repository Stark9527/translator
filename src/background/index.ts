import { addMessageListener, handleMessage } from '../utils/message';
import { MESSAGE_ACTIONS } from '../utils/constants';
import { DEFAULT_CONFIG } from '../types';
import translatorFactory from '../services/translator';
import storageService from '../services/storage';
import type { TranslateMessage, UpdateConfigMessage, Message } from '../types';

/**
 * Background Service Worker
 * 负责处理翻译请求和配置管理
 */

console.log('Translator background service worker loaded');

// 监听扩展安装/更新
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Translator extension installed/updated:', details.reason);

  if (details.reason === 'install') {
    // 首次安装，设置默认配置
    await storageService.updateConfig(DEFAULT_CONFIG);
    console.log('Default configuration set');
  } else if (details.reason === 'update') {
    // 更新时，可以在这里处理配置迁移
    console.log('Extension updated');
  }
});

// 处理翻译请求
async function handleTranslate(message: TranslateMessage) {
  const { text, from, to } = message;

  try {
    const result = await translatorFactory.translate({
      text,
      from,
      to,
    });

    return result;
  } catch (error) {
    console.error('Translation error:', error);
    throw error;
  }
}

// 处理获取配置请求
async function handleGetConfig() {
  try {
    const config = await storageService.getConfig();
    return config;
  } catch (error) {
    console.error('Get config error:', error);
    throw error;
  }
}

// 处理更新配置请求
async function handleUpdateConfig(message: UpdateConfigMessage) {
  try {
    await storageService.updateConfig(message.config);
    return { success: true };
  } catch (error) {
    console.error('Update config error:', error);
    throw error;
  }
}

// 处理验证API密钥请求
async function handleValidateApiKey(message: Message) {
  const { provider, apiKey } = message;

  try {
    const service = translatorFactory.getService(provider);

    if (!service.validateApiKey) {
      return { valid: true }; // 如果服务不支持验证，默认返回true
    }

    const valid = await service.validateApiKey(apiKey);
    return { valid };
  } catch (error) {
    console.error('Validate API key error:', error);
    throw error;
  }
}

// 统一消息路由处理
addMessageListener(
  handleMessage(async (message: Message) => {
    console.log('Received message:', message.action);

    switch (message.action) {
      case MESSAGE_ACTIONS.TRANSLATE:
        return await handleTranslate(message as TranslateMessage);

      case MESSAGE_ACTIONS.GET_CONFIG:
        return await handleGetConfig();

      case MESSAGE_ACTIONS.UPDATE_CONFIG:
        return await handleUpdateConfig(message as UpdateConfigMessage);

      case MESSAGE_ACTIONS.VALIDATE_API_KEY:
        return await handleValidateApiKey(message);

      default:
        throw new Error(`Unknown action: ${message.action}`);
    }
  })
);

// 监听存储变化
storageService.onConfigChange((changes) => {
  console.log('Configuration changed:', changes);
  // 可以在这里通知其他组件配置已更改
});

export {};
