// 消息通信工具函数
import type { Message, MessageResponse, ApiResponse } from '@/types/message';

/**
 * 发送消息到 Background Service Worker
 * 从 Content Script 或 Popup 调用
 */
export async function sendMessage<T extends Message>(
  message: T
): Promise<MessageResponse<T>> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response: ApiResponse<MessageResponse<T>>) => {
      // 检查 Chrome API 错误
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      // 检查业务逻辑错误
      if (!response || !response.success) {
        reject(new Error(response?.error || 'Unknown error'));
        return;
      }

      resolve(response.data!);
    });
  });
}

/**
 * 发送消息到指定 Tab
 * 从 Background 调用
 */
export async function sendMessageToTab<T extends Message>(
  tabId: number,
  message: T
): Promise<MessageResponse<T>> {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response: ApiResponse<MessageResponse<T>>) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (!response || !response.success) {
        reject(new Error(response?.error || 'Unknown error'));
        return;
      }

      resolve(response.data!);
    });
  });
}

/**
 * 广播消息到所有 Content Scripts
 */
export async function broadcastMessage<T extends Message>(message: T): Promise<void> {
  const tabs = await chrome.tabs.query({});

  await Promise.allSettled(
    tabs.map(tab => {
      if (tab.id) {
        return sendMessageToTab(tab.id, message);
      }
      return Promise.resolve();
    })
  );
}

/**
 * 创建消息监听器
 * 用于 Background 或 Content Script
 */
export function createMessageListener(
  handler: (message: Message, sender: chrome.runtime.MessageSender) => Promise<any>
) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // 异步处理消息
    handler(message, sender)
      .then(data => {
        sendResponse({ success: true, data });
      })
      .catch(error => {
        console.error('Message handler error:', error);
        sendResponse({ success: false, error: error.message });
      });

    // 返回 true 表示异步响应
    return true;
  });
}
