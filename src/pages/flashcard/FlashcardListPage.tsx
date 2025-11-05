import { useState, useEffect } from 'react';
import { Search, Filter, SortAsc, Plus, Library } from 'lucide-react';
import type { Flashcard } from '@/types/flashcard';
import { ProficiencyLevel } from '@/types/flashcard';
import { flashcardService } from '@/services/flashcard';
import { FlashcardCard } from '@/components/flashcard/FlashcardCard';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/utils/cn';

const proficiencyOptions: { value: ProficiencyLevel | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: ProficiencyLevel.New, label: '新卡片' },
  { value: ProficiencyLevel.Learning, label: '学习中' },
  { value: ProficiencyLevel.Review, label: '复习中' },
  { value: ProficiencyLevel.Mastered, label: '已精通' },
];

const sortOptions = [
  { value: 'createdAt', label: '创建时间' },
  { value: 'updatedAt', label: '更新时间' },
  { value: 'nextReview', label: '复习时间' },
  { value: 'word', label: '单词' },
];

export default function FlashcardListPage() {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [filteredCards, setFilteredCards] = useState<Flashcard[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProficiency, setSelectedProficiency] = useState<ProficiencyLevel | 'all'>('all');
  const [sortBy, setSortBy] = useState<'createdAt' | 'updatedAt' | 'nextReview' | 'word'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFavoriteOnly, setShowFavoriteOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 加载卡片
  useEffect(() => {
    loadFlashcards();
  }, []);

  // 应用筛选和排序
  useEffect(() => {
    applyFiltersAndSort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flashcards, searchQuery, selectedProficiency, sortBy, sortOrder, showFavoriteOnly]);

  const loadFlashcards = async () => {
    setIsLoading(true);
    try {
      const cards = await flashcardService.getAll();
      setFlashcards(cards);
    } catch (error) {
      console.error('Failed to load flashcards:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let result = [...flashcards];

    // 搜索
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        card =>
          card.word.toLowerCase().includes(query) ||
          card.translation.toLowerCase().includes(query) ||
          card.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // 筛选熟练度
    if (selectedProficiency !== 'all') {
      result = result.filter(card => card.proficiency === selectedProficiency);
    }

    // 只显示收藏
    if (showFavoriteOnly) {
      result = result.filter(card => card.favorite);
    }

    // 排序
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'word':
          comparison = a.word.localeCompare(b.word);
          break;
        case 'createdAt':
          comparison = a.createdAt - b.createdAt;
          break;
        case 'updatedAt':
          comparison = a.updatedAt - b.updatedAt;
          break;
        case 'nextReview':
          comparison = new Date(a.nextReview).getTime() - new Date(b.nextReview).getTime();
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredCards(result);
  };

  const handleToggleFavorite = async (id: string) => {
    try {
      await flashcardService.toggleFavorite(id);
      await loadFlashcards();
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await flashcardService.delete(id);
      await loadFlashcards();
    } catch (error) {
      console.error('Failed to delete flashcard:', error);
    }
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mb-4"></div>
          <p className="text-sm text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 头部 */}
      <div className="p-4 border-b border-border bg-background">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold text-foreground">卡片库</h1>
          <button className="px-3 py-1.5 bg-primary text-primary-foreground text-sm rounded-md hover:opacity-90 transition-opacity flex items-center gap-1">
            <Icon icon={Plus} size="xs" />
            <span>新建</span>
          </button>
        </div>

        {/* 搜索框 */}
        <div className="relative mb-3">
          <Icon icon={Search} size="sm" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="搜索单词、翻译或标签..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* 筛选和排序 */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* 熟练度筛选 */}
          <div className="flex items-center gap-1 text-xs">
            <Icon icon={Filter} size="xs" className="text-muted-foreground" />
            <select
              value={selectedProficiency}
              onChange={(e) => setSelectedProficiency(e.target.value as ProficiencyLevel | 'all')}
              className="px-2 py-1 text-xs border border-input rounded bg-background"
            >
              {proficiencyOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* 排序 */}
          <div className="flex items-center gap-1 text-xs">
            <button
              onClick={toggleSortOrder}
              className="p-1 hover:bg-accent rounded transition-colors"
              title={sortOrder === 'asc' ? '升序' : '降序'}
            >
              <Icon icon={SortAsc} size="xs" className={cn('text-muted-foreground transition-transform', sortOrder === 'desc' && 'rotate-180')} />
            </button>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-2 py-1 text-xs border border-input rounded bg-background"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* 只显示收藏 */}
          <label className="flex items-center gap-1 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={showFavoriteOnly}
              onChange={(e) => setShowFavoriteOnly(e.target.checked)}
              className="rounded"
            />
            <span className="text-muted-foreground">仅收藏</span>
          </label>

          {/* 统计 */}
          <div className="ml-auto text-xs text-muted-foreground">
            {filteredCards.length} / {flashcards.length} 张卡片
          </div>
        </div>
      </div>

      {/* 卡片列表 */}
      <div className="flex-1 overflow-auto p-4">
        {filteredCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <Icon icon={Library} size="xl" className="text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {flashcards.length === 0 ? '还没有卡片' : '没有找到匹配的卡片'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {flashcards.length === 0
                ? '开始翻译单词并收藏，建立你的专属单词库'
                : '尝试调整搜索或筛选条件'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredCards.map(card => (
              <FlashcardCard
                key={card.id}
                flashcard={card}
                onToggleFavorite={handleToggleFavorite}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
