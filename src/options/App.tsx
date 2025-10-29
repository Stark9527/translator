import { useState } from 'react';
import './App.css';

function App() {
  const [apiProvider, setApiProvider] = useState('google');

  return (
    <div className="options-container">
      <h1>Translator 设置</h1>

      <section className="settings-section">
        <h2>翻译服务</h2>
        <div className="setting-item">
          <label>选择翻译服务：</label>
          <select
            value={apiProvider}
            onChange={(e) => setApiProvider(e.target.value)}
          >
            <option value="google">Google 翻译</option>
            <option value="deepl">DeepL</option>
            <option value="openai">OpenAI</option>
          </select>
        </div>

        {apiProvider === 'deepl' && (
          <div className="setting-item">
            <label>DeepL API Key:</label>
            <input type="password" placeholder="输入您的 DeepL API Key" />
          </div>
        )}

        {apiProvider === 'openai' && (
          <div className="setting-item">
            <label>OpenAI API Key:</label>
            <input type="password" placeholder="输入您的 OpenAI API Key" />
          </div>
        )}
      </section>

      <section className="settings-section">
        <h2>语言设置</h2>
        <div className="setting-item">
          <label>默认源语言：</label>
          <select>
            <option value="auto">自动检测</option>
            <option value="zh">中文</option>
            <option value="en">英语</option>
          </select>
        </div>
        <div className="setting-item">
          <label>默认目标语言：</label>
          <select>
            <option value="en">英语</option>
            <option value="zh">中文</option>
          </select>
        </div>
      </section>

      <section className="settings-section">
        <h2>功能设置</h2>
        <div className="setting-item">
          <label>
            <input type="checkbox" defaultChecked />
            启用划词翻译
          </label>
        </div>
      </section>

      <button className="save-btn">保存设置</button>
    </div>
  );
}

export default App;
