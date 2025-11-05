import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit2, Trash2, Folder } from 'lucide-react';
import type { FlashcardGroup } from '@/types/flashcard';
import { flashcardService } from '@/services/flashcard';
import { Icon } from '@/components/ui/icon';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function GroupManagePage() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<FlashcardGroup[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<FlashcardGroup | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; group: FlashcardGroup } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    setIsLoading(true);
    try {
      const allGroups = await flashcardService.getAllGroups();
      setGroups(allGroups);
    } catch (error) {
      console.error('Failed to load groups:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      alert('请输入分组名称');
      return;
    }

    try {
      await flashcardService.createGroup(formData.name, {
        description: formData.description || undefined,
      });

      setFormData({ name: '', description: '' });
      setShowModal(false);
      await loadGroups();
    } catch (error) {
      console.error('Failed to create group:', error);
      alert('创建分组失败');
    }
  };

  const handleUpdate = async () => {
    if (!editingGroup || !formData.name.trim()) {
      alert('请输入分组名称');
      return;
    }

    try {
      await flashcardService.updateGroup(editingGroup.id, {
        name: formData.name,
        description: formData.description || undefined,
      });

      setFormData({ name: '', description: '' });
      setShowModal(false);
      setEditingGroup(null);
      await loadGroups();
    } catch (error) {
      console.error('Failed to update group:', error);
      alert('更新分组失败');
    }
  };

  const handleDelete = async (group: FlashcardGroup) => {
    if (group.id === 'default') {
      alert('默认分组不能删除');
      return;
    }

    // 显示删除确认对话框
    setDeleteModal({ show: true, group });
  };

  const confirmDelete = async () => {
    if (!deleteModal) return;

    try {
      await flashcardService.deleteGroup(deleteModal.group.id);
      await loadGroups();
      setDeleteModal(null);
    } catch (error) {
      console.error('Failed to delete group:', error);
      alert('删除分组失败');
    }
  };

  const openCreateModal = () => {
    setEditingGroup(null);
    setFormData({ name: '', description: '' });
    setShowModal(true);
  };

  const openEditModal = (group: FlashcardGroup) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      description: group.description || '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingGroup(null);
    setFormData({ name: '', description: '' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingGroup) {
      handleUpdate();
    } else {
      handleCreate();
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
      <div className="p-4 border-b border-border bg-background">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/flashcards')}
              className="p-1.5 hover:bg-accent rounded transition-colors"
              title="返回"
            >
              <Icon icon={ArrowLeft} size="sm" className="text-muted-foreground" />
            </button>
            <h1 className="text-lg font-bold text-foreground">分组管理</h1>
          </div>
          <button
            onClick={openCreateModal}
            className="px-3 py-1.5 bg-primary text-primary-foreground text-sm rounded-md hover:opacity-90 transition-opacity flex items-center gap-1"
          >
            <Icon icon={Plus} size="xs" />
            <span>新建</span>
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          共 {groups.length} 个分组
        </p>
      </div>

      {/* 分组列表 */}
      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-2">
          {groups.map((group) => (
            <div
              key={group.id}
              className="flex items-center gap-3 p-4 border border-border rounded-lg bg-card hover:bg-accent/50 transition-colors"
            >
              {/* 分组信息 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Icon icon={Folder} size="sm" className="text-muted-foreground flex-shrink-0" />
                  <h4 className="text-sm font-medium text-foreground truncate">
                    {group.name}
                  </h4>
                  {group.id === 'default' && (
                    <span className="text-xs px-1.5 py-0.5 bg-muted text-muted-foreground rounded">
                      默认
                    </span>
                  )}
                </div>
                {group.description && (
                  <p className="text-xs text-muted-foreground truncate">
                    {group.description}
                  </p>
                )}
              </div>

              {/* 卡片数量 */}
              <div className="text-sm font-medium text-muted-foreground flex-shrink-0">
                {group.cardCount} 张
              </div>

              {/* 操作按钮 */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => openEditModal(group)}
                  className="p-2 hover:bg-accent rounded transition-colors"
                  title="编辑"
                >
                  <Icon icon={Edit2} size="xs" className="text-muted-foreground" />
                </button>
                {group.id !== 'default' && (
                  <button
                    onClick={() => handleDelete(group)}
                    className="p-2 hover:bg-destructive/10 rounded transition-colors"
                    title="删除"
                  >
                    <Icon icon={Trash2} size="xs" className="text-destructive" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 创建/编辑对话框 */}
      <Dialog open={showModal} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>{editingGroup ? '编辑分组' : '创建新分组'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                分组名称 <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例如：工作、生活、考试..."
                className="w-full px-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                描述（可选）
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="简要描述这个分组..."
                className="w-full px-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 px-4 py-2 text-sm border border-input rounded-md hover:bg-accent transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90 transition-opacity"
              >
                {editingGroup ? '更新' : '创建'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={deleteModal?.show} onOpenChange={(open) => !open && setDeleteModal(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除分组「<span className="font-medium text-foreground">{deleteModal?.group.name}</span>」吗？
              <br />
              该分组的卡片将移动到默认分组。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <button
              onClick={() => setDeleteModal(null)}
              className="flex-1 px-4 py-2 text-sm border border-input rounded-md hover:bg-accent transition-colors"
            >
              取消
            </button>
            <button
              onClick={confirmDelete}
              className="flex-1 px-4 py-2 bg-destructive text-destructive-foreground text-sm font-medium rounded-md hover:opacity-90 transition-opacity"
            >
              删除
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
