import { useState } from 'react';
import './App.css';

function App() {
  const [sourceText, setSourceText] = useState('');
  const [translatedText, _setTranslatedText] = useState('');

  return (
    <div className="app">
      <h1>Translator</h1>
      <div className="translator-container">
        <textarea
          className="source-text"
          placeholder="输入要翻译的文本..."
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
        />
        <button className="translate-btn">翻译</button>
        <div className="result-text">
          {translatedText || '翻译结果将显示在这里'}
        </div>
      </div>
    </div>
  );
}

export default App;
