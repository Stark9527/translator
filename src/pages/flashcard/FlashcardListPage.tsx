import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, SortAsc, Library, Settings, CheckSquare, X, Trash2, FolderInput } from 'lucide-react';
import type { Flashcard, FlashcardGroup } from '@/types/flashcard';
import { ProficiencyLevel } from '@/types/flashcard';
import { flashcardService } from '@/services/flashcard';
import { FlashcardCard } from '@/components/flashcard/FlashcardCard';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const proficiencyOptions: { value: ProficiencyLevel | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: ProficiencyLevel.New, label: '新卡片' },
  { value: ProficiencyLevel.Learning, label: '学习中' },
  { value: ProficiencyLevel.Review, label: '复习中' },
  { value: ProficiencyLevel.Mastered, label: '已精通' },
];

const sortOptions = [
  { value: 'createdAt', label: '创建时间' },
  { value: 'nextReview', label: '复习时间' },
  { value: 'word', label: '单词' },
];

export default function FlashcardListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [filteredCards, setFilteredCards] = useState<Flashcard[]>([]);
  const [groups, setGroups] = useState<FlashcardGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProficiency, setSelectedProficiency] = useState<ProficiencyLevel | 'all'>('all');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'createdAt' | 'nextReview' | 'word'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFavoriteOnly, setShowFavoriteOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 批量操作相关状态
  const [batchMode, setBatchMode] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());

  // 模态框状态
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; cardId: string; cardWord: string } | null>(null);
  const [moveModal, setMoveModal] = useState<{ show: boolean; cardId: string; cardWord: string; currentGroupId: string } | null>(null);
  const [batchDeleteModal, setBatchDeleteModal] = useState(false); // 批量删除确认模态框
  const [batchMoveModal, setBatchMoveModal] = useState(false); // 批量移动确认模态框

  // 当从其他页面返回时重新加载数据
  useEffect(() => {
    if (location.pathname === '/flashcards') {
      const initialize = async () => {
        await flashcardService.ensureDefaultGroup();
        await Promise.all([loadFlashcards(), loadGroups()]);
      };
      initialize();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // 应用筛选和排序
  useEffect(() => {
    applyFiltersAndSort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flashcards, searchQuery, selectedProficiency, selectedGroupId, sortBy, sortOrder, showFavoriteOnly]);

  // 当筛选条件改变时，清理不在当前筛选结果中的选中项
  useEffect(() => {
    if (batchMode && selectedCardIds.size > 0) {
      const currentFilteredIds = new Set(filteredCards.map(card => card.id));
      const newSelectedIds = new Set(
        Array.from(selectedCardIds).filter(id => currentFilteredIds.has(id))
      );
      if (newSelectedIds.size !== selectedCardIds.size) {
        setSelectedCardIds(newSelectedIds);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredCards, batchMode]);

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

  const loadGroups = async () => {
    try {
      const allGroups = await flashcardService.getAllGroups();
      setGroups(allGroups);
    } catch (error) {
      console.error('Failed to load groups:', error);
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

    // 筛选分组
    if (selectedGroupId !== 'all') {
      result = result.filter(card => card.groupId === selectedGroupId);
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
    const card = flashcards.find(c => c.id === id);
    if (!card) return;

    // 显示删除确认模态框
    setDeleteModal({ show: true, cardId: id, cardWord: card.word });
  };

  const confirmDelete = async () => {
    if (!deleteModal) return;

    try {
      await flashcardService.delete(deleteModal.cardId);
      await loadFlashcards();
      setDeleteModal(null);
    } catch (error) {
      console.error('Failed to delete flashcard:', error);
      alert('删除失败，请重试');
    }
  };

  const handleMoveToGroup = async (cardId: string) => {
    const card = flashcards.find(c => c.id === cardId);
    if (!card) return;

    // 显示移动分组模态框
    setMoveModal({ show: true, cardId, cardWord: card.word, currentGroupId: card.groupId });
  };

  const confirmMoveToGroup = async (targetGroupId: string) => {
    if (!moveModal) return;

    try {
      await flashcardService.moveToGroup(moveModal.cardId, targetGroupId);
      await loadFlashcards();
      await loadGroups();
      setMoveModal(null);
    } catch (error) {
      console.error('Failed to move to group:', error);
      alert('移动失败，请重试');
    }
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
  };

  // 进入/退出批量操作模式
  const toggleBatchMode = () => {
    setBatchMode(prev => !prev);
    setSelectedCardIds(new Set()); // 清空选择
  };

  // 切换单个卡片的选中状态
  const toggleCardSelection = (cardId: string) => {
    setSelectedCardIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedCardIds.size === filteredCards.length) {
      // 已全选，则取消全选
      setSelectedCardIds(new Set());
    } else {
      // 未全选，则全选当前筛选后的卡片
      setSelectedCardIds(new Set(filteredCards.map(card => card.id)));
    }
  };

  // 批量删除
  const handleBatchDelete = () => {
    if (selectedCardIds.size === 0) return;
    setBatchDeleteModal(true);
  };

  const confirmBatchDelete = async () => {
    try {
      await Promise.all(
        Array.from(selectedCardIds).map(id => flashcardService.delete(id))
      );
      await loadFlashcards();
      setSelectedCardIds(new Set());
      setBatchMode(false);
      setBatchDeleteModal(false);
    } catch (error) {
      console.error('Failed to batch delete:', error);
      alert('批量删除失败，请重试');
    }
  };

  // 批量移动
  const handleBatchMove = () => {
    if (selectedCardIds.size === 0) return;
    setBatchMoveModal(true);
  };

  const confirmBatchMove = async (targetGroupId: string) => {
    try {
      await Promise.all(
        Array.from(selectedCardIds).map(id => flashcardService.moveToGroup(id, targetGroupId))
      );
      await loadFlashcards();
      await loadGroups();
      setSelectedCardIds(new Set());
      setBatchMode(false);
      setBatchMoveModal(false);
    } catch (error) {
      console.error('Failed to batch move:', error);
      alert('批量移动失败，请重试');
    }
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
      <div className="px-4 py-2 border-b border-border bg-background">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold text-foreground">卡片</h1>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/flashcards/groups')}
            title="管理分组"
          >
            <Icon icon={Settings} size="xs" />
            <span className="ml-1">分组</span>
          </Button>
        </div>

        {/* 搜索框 */}
        <div className="relative mb-3">
          <Icon icon={Search} size="sm" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="搜索单词、翻译"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-sm"
          />
        </div>

        {/* 筛选和排序 */}
        <div className="space-y-2 text-xs">
          {/* 第一行：分组、熟练度、排序、收藏 */}
          <div className="flex items-center gap-1.5">
            {/* 分组筛选 */}
            <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
              <SelectTrigger className="h-8 text-xs min-w-0">
                <SelectValue placeholder="全部分组" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部分组</SelectItem>
                {groups.map(group => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name} ({group.cardCount})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 熟练度筛选 */}
            <Select value={selectedProficiency} onValueChange={(value) => setSelectedProficiency(value as ProficiencyLevel | 'all')}>
              <SelectTrigger className="h-8 text-xs min-w-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {proficiencyOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 分隔符 */}
            <div className="w-px h-5 bg-border" />

            {/* 排序方式 */}
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
              <SelectTrigger className="h-8 text-xs min-w-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 排序按钮 */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0"
              onClick={toggleSortOrder}
              title={sortOrder === 'asc' ? '升序' : '降序'}
            >
              <Icon icon={SortAsc} size="xs" className={cn('text-muted-foreground transition-transform', sortOrder === 'desc' && 'rotate-180')} />
            </Button>

            {/* 只显示收藏 */}
            <label className="flex items-center gap-1 cursor-pointer whitespace-nowrap">
              <Checkbox
                checked={showFavoriteOnly}
                onCheckedChange={(checked) => setShowFavoriteOnly(checked as boolean)}
              />
              <span className="text-muted-foreground">仅收藏</span>
            </label>
          </div>

          {/* 第二行：统计 */}
          <div className="flex items-center justify-between">
            {/* 批量操作按钮 */}
            <div className="flex items-center gap-0.5">
              {batchMode ? (
                <>
                  {/* 全选checkbox */}
                  <label className="flex items-center gap-1.5 cursor-pointer px-1">
                    <Checkbox
                      checked={selectedCardIds.size === filteredCards.length && filteredCards.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                    <span className="text-xs text-muted-foreground">全选</span>
                  </label>

                  {/* 批量操作按钮 - 只有选中卡片时显示 */}
                  {selectedCardIds.size > 0 && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-1 text-primary hover:text-primary hover:bg-primary/10"
                        onClick={handleBatchMove}
                      >
                        <Icon icon={FolderInput} size="xs" />
                        <span className="ml-1 text-xs">({selectedCardIds.size})</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={handleBatchDelete}
                      >
                        <Icon icon={Trash2} size="xs" />
                        <span className="ml-1 text-xs">({selectedCardIds.size})</span>
                      </Button>
                    </>
                  )}
                  {/* 取消按钮 */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={toggleBatchMode}
                  >
                    <Icon icon={X} size="xs" />
                  </Button>
                </>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 px-1"
                  onClick={toggleBatchMode}
                  title="批量操作"
                >
                  <Icon icon={CheckSquare} size="sm" className="text-muted-foreground" />
                </Button>
              )}
            </div>

            {/* 统计 */}
            <div className="text-muted-foreground whitespace-nowrap">
              {filteredCards.length} / {flashcards.length} 张
            </div>
          </div>
        </div>
      </div>

      {/* 卡片列表 */}
      <div className="flex-1 overflow-auto p-4">
        {filteredCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <Icon icon={Library} size="xl" className="text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
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
            {filteredCards.map(card => {
              const group = groups.find(g => g.id === card.groupId);
              return (
                <FlashcardCard
                  key={card.id}
                  flashcard={card}
                  groupName={group?.name}
                  onToggleFavorite={handleToggleFavorite}
                  onDelete={handleDelete}
                  onMoveToGroup={handleMoveToGroup}
                  batchMode={batchMode}
                  isSelected={selectedCardIds.has(card.id)}
                  onToggleSelect={toggleCardSelection}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* 删除确认对话框 */}
      <Dialog open={deleteModal?.show} onOpenChange={(open) => !open && setDeleteModal(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除卡片「<span className="font-medium text-foreground">{deleteModal?.cardWord}</span>」吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteModal(null)}>
              取消
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 移动分组对话框 */}
      <Dialog open={moveModal?.show} onOpenChange={(open) => !open && setMoveModal(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>移动到分组</DialogTitle>
            <DialogDescription>
              将「<span className="font-medium text-foreground">{moveModal?.cardWord}</span>」移动到：
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-64 overflow-auto py-4">
            {groups
              .filter(g => g.id !== moveModal?.currentGroupId)
              .map(group => (
                <Button
                  key={group.id}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => confirmMoveToGroup(group.id)}
                >
                  <div className="text-left flex-1">
                    <div className="font-medium text-foreground">{group.name}</div>
                    {group.description && (
                      <div className="text-xs text-muted-foreground mt-0.5">{group.description}</div>
                    )}
                  </div>
                </Button>
              ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveModal(null)} className="w-full">
              取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 批量删除确认对话框 */}
      <Dialog open={batchDeleteModal} onOpenChange={setBatchDeleteModal}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>确认批量删除</DialogTitle>
            <DialogDescription>
              确定要删除选中的 <span className="font-medium text-foreground">{selectedCardIds.size}</span> 张卡片吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setBatchDeleteModal(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={confirmBatchDelete}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 批量移动对话框 */}
      <Dialog open={batchMoveModal} onOpenChange={setBatchMoveModal}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>批量移动到分组</DialogTitle>
            <DialogDescription>
              将选中的 <span className="font-medium text-foreground">{selectedCardIds.size}</span> 张卡片移动到：
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-64 overflow-auto py-4">
            {groups.map(group => (
              <Button
                key={group.id}
                variant="outline"
                className="w-full justify-start"
                onClick={() => confirmBatchMove(group.id)}
              >
                <div className="text-left flex-1">
                  <div className="font-medium text-foreground">{group.name}</div>
                  {group.description && (
                    <div className="text-xs text-muted-foreground mt-0.5">{group.description}</div>
                  )}
                </div>
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchMoveModal(false)} className="w-full">
              取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
