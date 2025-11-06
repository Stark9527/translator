import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { TabNavigator } from '@/components/TabNavigator';
import TranslatePage from '@/pages/TranslatePage';
import FlashcardListPage from '@/pages/flashcard/FlashcardListPage';
import GroupManagePage from '@/pages/flashcard/GroupManagePage';
import StudyPage from '@/pages/flashcard/StudyPage';
import StatisticsPage from '@/pages/flashcard/StatisticsPage';

function AppContent() {
  const location = useLocation();
  const showTabNavigator = location.pathname !== '/flashcards/groups';

  return (
    <div className="w-[428px] h-[600px] bg-background flex flex-col">
      {/* 路由内容区域 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Routes>
          <Route path="/" element={<TranslatePage />} />
          <Route path="/flashcards" element={<FlashcardListPage />} />
          <Route path="/flashcards/groups" element={<GroupManagePage />} />
          <Route path="/study" element={<StudyPage />} />
          <Route path="/statistics" element={<StatisticsPage />} />
        </Routes>
      </div>

      {/* 底部导航栏 - 子页面不显示 */}
      {showTabNavigator && <TabNavigator />}
    </div>
  );
}

export default function App() {
  return (
    <MemoryRouter>
      <AppContent />
    </MemoryRouter>
  );
}
