import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Star, Trash2, Edit2, Volume2 } from 'lucide-react';
import type { Flashcard } from '@/types/flashcard';
import { Icon } from '@/components/ui/icon';
import { ProficiencyBadge } from './ProficiencyBadge';
import { cn } from '@/utils/cn';

interface FlashcardCardProps {
  flashcard: Flashcard;
  onToggleFavorite?: (id: string) => void;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
  onClick?: (id: string) => void;
}

export function FlashcardCard({
  flashcard,
  onToggleFavorite,
  onDelete,
  onEdit,
  onClick,
}: FlashcardCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const handleSpeak = (text: string, lang: string) => {
    if (isPlaying) return;

    setIsPlaying(true);
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.9;
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('Speech error:', error);
      setIsPlaying(false);
    }
  };

  // 计算下次复习时间
  const nextReviewText = formatDistanceToNow(new Date(flashcard.nextReview), {
    addSuffix: true,
    locale: zhCN,
  });

  // 判断是否逾期
  const isOverdue = new Date(flashcard.nextReview) < new Date();

  return (
    <div
      className={cn(
        'group relative p-4 border border-border rounded-lg bg-card hover:shadow-md transition-all cursor-pointer',
        onClick && 'hover:border-primary/50'
      )}
      onClick={() => onClick?.(flashcard.id)}
    >
      {/* 头部：单词 + 发音 + 收藏 */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 flex items-center gap-2">
          <h3 className="text-lg font-semibold text-foreground">{flashcard.word}</h3>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleSpeak(flashcard.word, flashcard.sourceLanguage);
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-accent rounded"
            title="朗读"
          >
            <Icon icon={Volume2} size="xs" className={cn('text-muted-foreground', isPlaying && 'text-primary')} />
          </button>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite?.(flashcard.id);
          }}
          className="p-1 hover:bg-accent rounded transition-colors"
          title={flashcard.favorite ? '取消收藏' : '收藏'}
        >
          <Icon
            icon={Star}
            size="sm"
            className={cn(
              'transition-colors',
              flashcard.favorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
            )}
          />
        </button>
      </div>

      {/* 翻译 */}
      <p className="text-sm text-muted-foreground mb-3">{flashcard.translation}</p>

      {/* 发音（如果有） */}
      {flashcard.pronunciation && (
        <p className="text-xs text-muted-foreground mb-2">
          <span className="font-mono">[{flashcard.pronunciation}]</span>
        </p>
      )}

      {/* 例句（如果有，只显示第一条） */}
      {flashcard.examples && flashcard.examples.length > 0 && (
        <p className="text-xs text-muted-foreground italic mb-3 line-clamp-2">
          &quot;{flashcard.examples[0]}&quot;
        </p>
      )}

      {/* 底部：徽章 + 标签 + 操作 */}
      <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-border">
        <div className="flex items-center gap-2 flex-wrap">
          <ProficiencyBadge level={flashcard.proficiency} />

          <span
            className={cn(
              'text-xs',
              isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-muted-foreground'
            )}
          >
            {isOverdue ? '逾期' : nextReviewText}
          </span>

          {/* 标签 */}
          {flashcard.tags.length > 0 && (
            <div className="flex gap-1">
              {flashcard.tags.slice(0, 2).map(tag => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 text-xs bg-accent text-accent-foreground rounded"
                >
                  {tag}
                </span>
              ))}
              {flashcard.tags.length > 2 && (
                <span className="px-1.5 py-0.5 text-xs text-muted-foreground">
                  +{flashcard.tags.length - 2}
                </span>
              )}
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(flashcard.id);
              }}
              className="p-1.5 hover:bg-accent rounded transition-colors"
              title="编辑"
            >
              <Icon icon={Edit2} size="xs" className="text-muted-foreground" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`确定要删除「${flashcard.word}」吗？`)) {
                  onDelete(flashcard.id);
                }
              }}
              className="p-1.5 hover:bg-destructive/10 rounded transition-colors"
              title="删除"
            >
              <Icon icon={Trash2} size="xs" className="text-destructive" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
