import { useState, useEffect, useCallback } from 'react';
import { Rating, Grade } from 'ts-fsrs';
import { Play, RotateCcw, X, GraduationCap, AlertTriangle } from 'lucide-react';
import type { Flashcard } from '@/types/flashcard';
import { studySessionService } from '@/services/flashcard';
import { StudyCard } from '@/components/flashcard/StudyCard';
import { ProgressRing } from '@/components/flashcard/ProgressRing';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const ratingButtons: Array<{ rating: Grade; label: string; shortcut: string; color: string }> = [
  { rating: Rating.Again as Grade, label: '重来', shortcut: '1', color: 'bg-red-500 hover:bg-red-600' },
  { rating: Rating.Hard as Grade, label: '困难', shortcut: '2', color: 'bg-yellow-500 hover:bg-yellow-600' },
  { rating: Rating.Good as Grade, label: '良好', shortcut: '3', color: 'bg-blue-500 hover:bg-blue-600' },
  { rating: Rating.Easy as Grade, label: '简单', shortcut: '4', color: 'bg-green-500 hover:bg-green-600' },
];

export default function StudyPage() {
  const [currentCard, setCurrentCard] = useState<Flashcard | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [stats, setStats] = useState({ correct: 0, wrong: 0 });
  const [startTime, setStartTime] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);

  // 加载当前卡片
  const loadCurrentCard = useCallback(() => {
    const card = studySessionService.getCurrentCard();
    setCurrentCard(card);
    setIsFlipped(false);

    const currentProgress = studySessionService.getProgress();
    if (currentProgress) {
      setProgress({
        current: currentProgress.current,
        total: currentProgress.total,
      });
    }

    const currentStats = studySessionService.getSessionStats();
    if (currentStats) {
      setStats({
        correct: currentStats.correct,
        wrong: currentStats.wrong,
      });
    }
  }, []);

  // 开始学习会话
  const startSession = async () => {
    setIsLoading(true);
    try {
      await studySessionService.createTodayReviewSession();
      setIsSessionActive(true);
      setStartTime(Date.now());
      loadCurrentCard();
    } catch (error) {
      console.error('Failed to start session:', error);
      alert(error instanceof Error ? error.message : '无法开始学习会话');
    } finally {
      setIsLoading(false);
    }
  };

  // 提交答案
  const submitAnswer = useCallback(
    async (rating: Grade) => {
      if (!currentCard || !isFlipped) return;

      const responseTime = Date.now() - startTime;

      try {
        // 先获取当前统计，因为 submitAnswer 后会话可能被清空
        const currentStats = studySessionService.getSessionStats();

        await studySessionService.submitAnswer(rating, responseTime);

        // 检查是否还有下一张卡片
        const nextCard = studySessionService.getCurrentCard();
        if (!nextCard) {
          // 会话已完成
          setIsSessionActive(false);
          setCurrentCard(null);
          alert(
            `学习完成！\n✓ 答对：${currentStats?.correct || 0}\n✗ 答错：${currentStats?.wrong || 0}`
          );
        } else {
          // 加载下一张卡片
          setStartTime(Date.now());
          loadCurrentCard();
        }
      } catch (error) {
        console.error('Failed to submit answer:', error);
        alert('提交答案失败');
      }
    },
    [currentCard, isFlipped, startTime, loadCurrentCard]
  );

  // 翻转卡片
  const handleFlip = useCallback(() => {
    setIsFlipped(prev => !prev);
  }, []);

  // 快捷键处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 只在有活动会话且当前卡片存在时响应
      if (!isSessionActive || !currentCard) return;

      // 空格键翻转卡片
      if (e.code === 'Space') {
        e.preventDefault();
        handleFlip();
        return;
      }

      // 数字键 1-4 答题（只有翻转后才能答题）
      if (!isFlipped) return;

      switch (e.key) {
        case '1':
          e.preventDefault();
          submitAnswer(Rating.Again);
          break;
        case '2':
          e.preventDefault();
          submitAnswer(Rating.Hard);
          break;
        case '3':
          e.preventDefault();
          submitAnswer(Rating.Good);
          break;
        case '4':
          e.preventDefault();
          submitAnswer(Rating.Easy);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSessionActive, currentCard, isFlipped, handleFlip, startTime]);

  // 显示退出确认对话框
  const handleCancelSession = () => {
    setShowExitDialog(true);
  };

  // 确认退出学习
  const confirmExit = () => {
    studySessionService.cancelSession();
    setIsSessionActive(false);
    setCurrentCard(null);
    setShowExitDialog(false);
  };

  // 未开始状态
  if (!isSessionActive) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <Icon icon={GraduationCap} size="xl" className="text-primary mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-2">开始学习</h2>
        <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
          使用 FSRS 算法智能安排复习，帮助你高效记忆单词
        </p>

        <button
          onClick={startSession}
          disabled={isLoading}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
        >
          <Icon icon={Play} size="sm" />
          <span>{isLoading ? '加载中...' : '开始今日复习'}</span>
        </button>

        <div className="mt-8 p-4 bg-muted rounded-lg max-w-md">
          <h3 className="text-sm font-medium text-foreground mb-2">快捷键提示</h3>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li><kbd className="px-1.5 py-0.5 bg-background border border-border rounded">空格</kbd> - 翻转卡片</li>
            <li><kbd className="px-1.5 py-0.5 bg-background border border-border rounded">1</kbd> - 重来（完全忘记）</li>
            <li><kbd className="px-1.5 py-0.5 bg-background border border-border rounded">2</kbd> - 困难（勉强记得）</li>
            <li><kbd className="px-1.5 py-0.5 bg-background border border-border rounded">3</kbd> - 良好（记得清楚）</li>
            <li><kbd className="px-1.5 py-0.5 bg-background border border-border rounded">4</kbd> - 简单（太简单了）</li>
          </ul>
        </div>
      </div>
    );
  }

  // 学习中状态
  if (!currentCard) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mb-4"></div>
          <p className="text-sm text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  const progressPercentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 头部：进度和统计 */}
      <div className="p-4 border-b border-border bg-background">
        <div className="flex items-center justify-between">
          {/* 进度 */}
          <div className="flex items-center gap-3">
            <ProgressRing percentage={progressPercentage} size={40} showLabel={false} />
            <div>
              <p className="text-sm font-medium text-foreground">
                {progress.current} / {progress.total}
              </p>
              <p className="text-xs text-muted-foreground">
                ✓ {stats.correct} · ✗ {stats.wrong}
              </p>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-2">
            {isFlipped && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setIsFlipped(false);
                  loadCurrentCard();
                }}
                title="重新开始当前卡片"
              >
                <Icon icon={RotateCcw} size="sm" className="text-muted-foreground" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCancelSession}
              title="退出学习"
            >
              <Icon icon={X} size="sm" className="text-destructive" />
            </Button>
          </div>
        </div>
      </div>

      {/* 卡片区域 */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <StudyCard
          flashcard={currentCard}
          isFlipped={isFlipped}
          onFlip={handleFlip}
        />

        {/* 答题按钮（只在翻转后显示） */}
        {isFlipped && (
          <div className="mt-4 flex gap-3">
            {ratingButtons.map(({ rating, label, shortcut, color }) => (
              <button
                key={rating}
                onClick={() => submitAnswer(rating)}
                className={cn(
                  'px-6 py-3 text-white rounded-lg transition-all font-medium shadow-md hover:shadow-lg',
                  color
                )}
              >
                <div className="text-center">
                  <div className="text-lg">{label}</div>
                  <div className="text-xs opacity-75">按 {shortcut}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* 提示文字 */}
        {!isFlipped && (
          <div className="mt-6 text-sm text-muted-foreground">
            按<kbd className="px-1.5 py-0.5 mx-1 bg-muted border border-border rounded text-foreground">空格</kbd>或点击卡片查看答案
          </div>
        )}
      </div>

      {/* 退出确认对话框 */}
      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon icon={AlertTriangle} size="sm" className="text-destructive" />
              退出学习
            </DialogTitle>
            <DialogDescription>
              确定要退出学习吗？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowExitDialog(false)}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={confirmExit}
            >
              确认退出
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
