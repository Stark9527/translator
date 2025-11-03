// Background Service Worker for Chrome Extension

console.info('Background service worker started');

// 监听扩展安装事件
chrome.runtime.onInstalled.addListener(details => {
  console.info('Extension installed:', details.reason);

  if (details.reason === 'install') {
    // 首次安装，打开欢迎页面
    chrome.tabs.create({
      url: chrome.runtime.getURL('src/options/index.html?welcome=true'),
    });
  } else if (details.reason === 'update') {
    console.info('Extension updated');
  }
});

// 监听来自 Content Script 和 Popup 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.info('Received message:', message.type, 'from:', sender);

  // 异步处理消息
  handleMessage(message, sender)
    .then(response => {
      sendResponse({ success: true, data: response });
    })
    .catch(error => {
      console.error('Message handler error:', error);
      sendResponse({ success: false, error: error.message });
    });

  // 返回 true 表示异步响应
  return true;
});

// 消息处理函数
async function handleMessage(message: any, _sender: chrome.runtime.MessageSender) {
  const { type, payload } = message;

  switch (type) {
    case 'PING':
      return { message: 'PONG' };

    case 'GET_CONFIG':
      // TODO: 实现配置获取
      return { engine: 'google', targetLang: 'zh-CN' };

    case 'TRANSLATE':
      // TODO: 实现翻译功能
      console.info('Translation request:', payload);
      return {
        text: payload.text,
        translation: '翻译功能待实现',
        from: payload.from,
        to: payload.to,
        engine: 'google',
      };

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

console.info('Background service worker initialized');
