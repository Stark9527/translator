// Background Service Worker
console.log('Translator background service worker loaded');

// 监听扩展安装
chrome.runtime.onInstalled.addListener(() => {
  console.log('Translator extension installed');

  // 设置默认配置
  chrome.storage.sync.set({
    apiProvider: 'google',
    sourceLang: 'auto',
    targetLang: 'zh',
    enableSelection: true,
  });
});

// 监听来自content script或popup的消息
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  console.log('Received message:', request);

  if (request.action === 'translate') {
    // 处理翻译请求
    handleTranslate(request.text, request.from, request.to)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));

    return true; // 保持消息通道开放以支持异步响应
  }

  if (request.action === 'getConfig') {
    // 获取配置
    chrome.storage.sync.get(null, (config) => {
      sendResponse({ success: true, config });
    });

    return true;
  }
});

// 翻译处理函数（占位符，后续实现具体的翻译逻辑）
async function handleTranslate(text: string, from: string, to: string): Promise<string> {
  // TODO: 根据配置调用不同的翻译服务
  console.log(`Translating: ${text} from ${from} to ${to}`);

  // 临时返回示例结果
  return `翻译结果: ${text}`;
}

export {};
