import { useNavigate, useLocation } from 'react-router-dom';
import { Languages, Library, GraduationCap, BarChart3 } from 'lucide-react';
import { Icon } from './ui/icon';
import { cn } from '@/utils/cn';

interface TabItem {
  path: string;
  label: string;
  icon: typeof Languages;
}

const tabs: TabItem[] = [
  { path: '/', label: '翻译', icon: Languages },
  { path: '/flashcards', label: '卡片', icon: Library },
  { path: '/study', label: '学习', icon: GraduationCap },
  { path: '/statistics', label: '统计', icon: BarChart3 },
];

export function TabNavigator() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="border-t border-border bg-background">
      <div className="flex items-center justify-around h-16">
        {tabs.map(tab => {
          const isActive = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-3 py-2 transition-colors flex-1',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon icon={tab.icon} size="sm" />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
