import { useState } from 'react';

export default function App() {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleTranslate = async () => {
    if (!inputText.trim()) return;

    setIsLoading(true);

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'TRANSLATE',
        payload: {
          text: inputText,
          from: 'auto',
          to: 'zh-CN',
        },
      });

      console.info('Translation response:', response);
    } catch (error) {
      console.error('Translation error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-[400px] h-[500px] p-4 bg-background">
      <div className="flex flex-col h-full">
        {/* 标题 */}
        <div className="mb-4">
          <h1 className="text-xl font-bold text-foreground">智能翻译助手</h1>
          <p className="text-sm text-muted-foreground">输入文本进行翻译</p>
        </div>

        {/* 输入区域 */}
        <div className="flex-1 flex flex-col gap-3">
          <textarea
            className="flex-1 p-3 border border-input rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="请输入要翻译的文本..."
            value={inputText}
            onChange={e => setInputText(e.target.value)}
          />

          <button
            onClick={handleTranslate}
            disabled={isLoading || !inputText.trim()}
            className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {isLoading ? '翻译中...' : '翻译'}
          </button>

          {/* 翻译结果区域 */}
          <div className="flex-1 p-3 border border-input rounded-md bg-muted">
            <p className="text-sm text-muted-foreground">翻译结果将在这里显示</p>
          </div>
        </div>

        {/* 底部链接 */}
        <div className="mt-4 pt-3 border-t border-border text-center">
          <a
            href="#"
            onClick={() =>
              chrome.runtime.openOptionsPage()
            }
            className="text-sm text-primary hover:underline"
          >
            打开设置
          </a>
        </div>
      </div>
    </div>
  );
}
