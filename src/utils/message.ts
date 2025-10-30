import { Message, MessageResponse } from '../types';
import { DEFAULT_TIMEOUT } from './constants';

/**
 * 发送消息到 background script
 */
export async function sendMessage<T = any>(message: Message): Promise<MessageResponse<T>> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Message timeout'));
    }, DEFAULT_TIMEOUT);

    chrome.runtime.sendMessage(message, (response: MessageResponse<T>) => {
      clearTimeout(timeoutId);

      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve(response);
    });
  });
}

/**
 * 发送消息到指定的 tab
 */
export async function sendMessageToTab<T = any>(
  tabId: number,
  message: Message
): Promise<MessageResponse<T>> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Message timeout'));
    }, DEFAULT_TIMEOUT);

    chrome.tabs.sendMessage(tabId, message, (response: MessageResponse<T>) => {
      clearTimeout(timeoutId);

      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve(response);
    });
  });
}

/**
 * 监听消息
 */
export function addMessageListener(
  callback: (
    message: Message,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: MessageResponse) => void
  ) => boolean | void
) {
  chrome.runtime.onMessage.addListener(callback);
}

/**
 * 移除消息监听器
 */
export function removeMessageListener(
  callback: (
    message: Message,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: MessageResponse) => void
  ) => boolean | void
) {
  chrome.runtime.onMessage.removeListener(callback);
}

/**
 * 创建成功响应
 */
export function createSuccessResponse<T>(data: T): MessageResponse<T> {
  return {
    success: true,
    data,
  };
}

/**
 * 创建错误响应
 */
export function createErrorResponse(error: string | Error): MessageResponse {
  return {
    success: false,
    error: error instanceof Error ? error.message : error,
  };
}

/**
 * 处理消息的包装函数
 */
export function handleMessage<T = any>(
  handler: (message: Message, sender: chrome.runtime.MessageSender) => Promise<T>
) {
  return (
    message: Message,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: MessageResponse<T>) => void
  ): boolean => {
    handler(message, sender)
      .then((data) => sendResponse(createSuccessResponse(data)))
      .catch((error) => sendResponse(createErrorResponse(error)));

    // 返回 true 表示异步响应
    return true;
  };
}
