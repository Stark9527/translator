import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { TabNavigator } from '@/components/TabNavigator';
import TranslatePage from '@/pages/TranslatePage';
import FlashcardListPage from '@/pages/flashcard/FlashcardListPage';
import StudyPage from '@/pages/flashcard/StudyPage';
import StatisticsPage from '@/pages/flashcard/StatisticsPage';

export default function App() {
  return (
    <MemoryRouter>
      <div className="w-[400px] h-[600px] bg-background flex flex-col">
        {/* 路由内容区域 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Routes>
            <Route path="/" element={<TranslatePage />} />
            <Route path="/flashcards" element={<FlashcardListPage />} />
            <Route path="/study" element={<StudyPage />} />
            <Route path="/statistics" element={<StatisticsPage />} />
          </Routes>
        </div>

        {/* 底部导航栏 */}
        <TabNavigator />
      </div>
    </MemoryRouter>
  );
}
