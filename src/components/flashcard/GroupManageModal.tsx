import { useState, useEffect } from 'react';
import { X, Edit2, Trash2, Folder, Check } from 'lucide-react';
import type { FlashcardGroup } from '@/types/flashcard';
import { flashcardService } from '@/services/flashcard';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/utils/cn';

interface GroupManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupsChanged?: () => void;
}

const GROUP_COLORS = [
  { value: '#ef4444', label: '红色' },
  { value: '#f97316', label: '橙色' },
  { value: '#eab308', label: '黄色' },
  { value: '#22c55e', label: '绿色' },
  { value: '#06b6d4', label: '青色' },
  { value: '#3b82f6', label: '蓝色' },
  { value: '#8b5cf6', label: '紫色' },
  { value: '#ec4899', label: '粉色' },
  { value: '#64748b', label: '灰色' },
];

export function GroupManageModal({ isOpen, onClose, onGroupsChanged }: GroupManageModalProps) {
  const [groups, setGroups] = useState<FlashcardGroup[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingGroup, setEditingGroup] = useState<FlashcardGroup | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: GROUP_COLORS[0].value,
  });

  useEffect(() => {
    if (isOpen) {
      loadGroups();
    }
  }, [isOpen]);

  const loadGroups = async () => {
    try {
      const allGroups = await flashcardService.getAllGroups();
      setGroups(allGroups);
    } catch (error) {
      console.error('Failed to load groups:', error);
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
        color: formData.color,
      });

      setFormData({ name: '', description: '', color: GROUP_COLORS[0].value });
      setIsEditing(false);
      await loadGroups();
      onGroupsChanged?.();
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
        color: formData.color,
      });

      setFormData({ name: '', description: '', color: GROUP_COLORS[0].value });
      setIsEditing(false);
      setEditingGroup(null);
      await loadGroups();
      onGroupsChanged?.();
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

    if (!confirm(`确定要删除分组「${group.name}」吗？\n该分组的卡片将移动到默认分组。`)) {
      return;
    }

    try {
      await flashcardService.deleteGroup(group.id);
      await loadGroups();
      onGroupsChanged?.();
    } catch (error) {
      console.error('Failed to delete group:', error);
      alert('删除分组失败');
    }
  };

  const startEdit = (group: FlashcardGroup) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      description: group.description || '',
      color: group.color || GROUP_COLORS[0].value,
    });
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setEditingGroup(null);
    setFormData({ name: '', description: '', color: GROUP_COLORS[0].value });
    setIsEditing(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingGroup) {
      handleUpdate();
    } else {
      handleCreate();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">分组管理</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-accent rounded transition-colors"
          >
            <Icon icon={X} size="sm" className="text-muted-foreground" />
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-auto p-4">
          {/* 创建/编辑表单 */}
          <div className="mb-6 p-4 bg-muted rounded-lg">
            <h3 className="text-sm font-semibold mb-3">
              {editingGroup ? '编辑分组' : '创建新分组'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">分组名称 *</label>
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
                <label className="block text-xs text-muted-foreground mb-1">描述（可选）</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="简要描述这个分组..."
                  className="w-full px-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-2">颜色</label>
                <div className="flex gap-2 flex-wrap">
                  {GROUP_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={cn(
                        'w-8 h-8 rounded-full border-2 transition-all relative',
                        formData.color === color.value
                          ? 'border-foreground scale-110'
                          : 'border-transparent hover:scale-105'
                      )}
                      style={{ backgroundColor: color.value }}
                      title={color.label}
                    >
                      {formData.color === color.value && (
                        <Icon icon={Check} size="xs" className="absolute inset-0 m-auto text-white" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground text-sm rounded-md hover:opacity-90 transition-opacity"
                >
                  {editingGroup ? '更新' : '创建'}
                </button>
                {isEditing && (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="px-4 py-2 bg-muted text-muted-foreground text-sm rounded-md hover:bg-accent transition-colors"
                  >
                    取消
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* 分组列表 */}
          <div>
            <h3 className="text-sm font-semibold mb-3">所有分组 ({groups.length})</h3>
            <div className="space-y-2">
              {groups.map((group) => (
                <div
                  key={group.id}
                  className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-accent transition-colors"
                >
                  {/* 颜色标识 */}
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: group.color || '#64748b' }}
                  />

                  {/* 分组信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Icon icon={Folder} size="xs" className="text-muted-foreground flex-shrink-0" />
                      <h4 className="text-sm font-medium text-foreground truncate">
                        {group.name}
                      </h4>
                      {group.id === 'default' && (
                        <span className="text-xs text-muted-foreground">(默认)</span>
                      )}
                    </div>
                    {group.description && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {group.description}
                      </p>
                    )}
                  </div>

                  {/* 卡片数量 */}
                  <span className="text-sm text-muted-foreground flex-shrink-0">
                    {group.cardCount} 张
                  </span>

                  {/* 操作按钮 */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => startEdit(group)}
                      className="p-1.5 hover:bg-accent rounded transition-colors"
                      title="编辑"
                    >
                      <Icon icon={Edit2} size="xs" className="text-muted-foreground" />
                    </button>
                    {group.id !== 'default' && (
                      <button
                        onClick={() => handleDelete(group)}
                        className="p-1.5 hover:bg-destructive/10 rounded transition-colors"
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
        </div>
      </div>
    </div>
  );
}
