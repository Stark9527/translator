// 同步设置页面组件
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { sendMessage } from '@/utils/message';
import { Cloud, CloudOff, RefreshCw, Check, X, LogIn, LogOut, UserPlus } from 'lucide-react';

interface SyncStatus {
  isSyncing: boolean;
  lastSyncTime: number;
  isAuthenticated: boolean;
}

export function SyncSettingsPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isSyncing: false,
    lastSyncTime: 0,
    isAuthenticated: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 获取同步状态
  const fetchSyncStatus = async () => {
    try {
      const status = await sendMessage({ type: 'GET_SYNC_STATUS', payload: null }) as unknown as SyncStatus;
      setSyncStatus(status);
    } catch (error) {
      console.error('获取同步状态失败:', error);
    }
  };

  useEffect(() => {
    fetchSyncStatus();
    // 每 5 秒刷新一次状态
    const interval = setInterval(fetchSyncStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  // 登录
  const handleSignIn = async () => {
    if (!email || !password) {
      setMessage({ type: 'error', text: '请输入邮箱和密码' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      await sendMessage({
        type: 'SUPABASE_SIGN_IN',
        payload: { email, password },
      });
      setMessage({ type: 'success', text: '登录成功！' });
      setPassword('');
      await fetchSyncStatus();
    } catch (error) {
      setMessage({ type: 'error', text: (error as Error).message });
    } finally {
      setIsLoading(false);
    }
  };

  // 注册
  const handleSignUp = async () => {
    if (!email || !password) {
      setMessage({ type: 'error', text: '请输入邮箱和密码' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      await sendMessage({
        type: 'SUPABASE_SIGN_UP',
        payload: { email, password },
      });
      setMessage({ type: 'success', text: '注册成功！请检查邮箱完成验证' });
      setPassword('');
      await fetchSyncStatus();
    } catch (error) {
      setMessage({ type: 'error', text: (error as Error).message });
    } finally {
      setIsLoading(false);
    }
  };

  // 登出
  const handleSignOut = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      await sendMessage({
        type: 'SUPABASE_SIGN_OUT',
        payload: null,
      });
      setMessage({ type: 'success', text: '已退出登录' });
      setEmail('');
      setPassword('');
      await fetchSyncStatus();
    } catch (error) {
      setMessage({ type: 'error', text: (error as Error).message });
    } finally {
      setIsLoading(false);
    }
  };

  // 立即同步
  const handleSyncNow = async () => {
    if (!syncStatus.isAuthenticated) {
      setMessage({ type: 'error', text: '请先登录' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const result = await sendMessage({ type: 'SYNC_NOW', payload: null }) as any;

      if (result.status === 'success') {
        setMessage({
          type: 'success',
          text: `同步成功！上传 ${result.uploadedCount} 条，下载 ${result.downloadedCount} 条`,
        });
      } else {
        setMessage({ type: 'error', text: result.error || '同步失败' });
      }

      await fetchSyncStatus();
    } catch (error) {
      setMessage({ type: 'error', text: (error as Error).message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">云同步设置</h1>
        <p className="text-sm text-gray-600">
          使用 Supabase 云同步，在多个设备之间同步您的 Flashcard 数据
        </p>
      </div>

      {/* 同步状态卡片 */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {syncStatus.isAuthenticated ? (
              <Cloud className="w-6 h-6 text-blue-500" />
            ) : (
              <CloudOff className="w-6 h-6 text-gray-400" />
            )}
            <div>
              <div className="font-semibold">
                {syncStatus.isAuthenticated ? '已连接' : '未连接'}
              </div>
              {syncStatus.lastSyncTime > 0 && (
                <div className="text-sm text-gray-600">
                  上次同步: {new Date(syncStatus.lastSyncTime).toLocaleString('zh-CN')}
                </div>
              )}
            </div>
          </div>

          {syncStatus.isAuthenticated && (
            <Button
              onClick={handleSyncNow}
              disabled={isLoading || syncStatus.isSyncing}
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${syncStatus.isSyncing ? 'animate-spin' : ''}`} />
              {syncStatus.isSyncing ? '同步中...' : '立即同步'}
            </Button>
          )}
        </div>
      </Card>

      {/* 消息提示 */}
      {message && (
        <Card className={`p-4 ${message.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <Check className="w-5 h-5 text-green-600" />
            ) : (
              <X className="w-5 h-5 text-red-600" />
            )}
            <span className={message.type === 'success' ? 'text-green-700' : 'text-red-700'}>
              {message.text}
            </span>
          </div>
        </Card>
      )}

      {/* 登录/注册表单 */}
      {!syncStatus.isAuthenticated ? (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">登录或注册</h2>

          <div className="space-y-4">
            <div>
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                disabled={isLoading}
              />
            </div>

            <div>
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleSignIn}
                disabled={isLoading}
                className="flex-1"
              >
                <LogIn className="w-4 h-4 mr-2" />
                登录
              </Button>
              <Button
                onClick={handleSignUp}
                disabled={isLoading}
                variant="outline"
                className="flex-1"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                注册
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">已登录</h2>
              <p className="text-sm text-gray-600 mt-1">
                您的数据将自动同步到云端
              </p>
            </div>
            <Button
              onClick={handleSignOut}
              disabled={isLoading}
              variant="outline"
            >
              <LogOut className="w-4 h-4 mr-2" />
              退出登录
            </Button>
          </div>
        </Card>
      )}

      {/* 说明 */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h3 className="font-semibold mb-2">关于云同步</h3>

        <div className="mb-3">
          <h4 className="text-sm font-semibold text-gray-800 mb-1">同步的数据类型：</h4>
          <ul className="text-sm text-gray-700 space-y-1 ml-2">
            <li>✓ Flashcard 学习卡片及分组</li>
            <li>✓ 学习记录和复习进度</li>
            <li>✓ 学习统计数据</li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-800 mb-1">重要说明：</h4>
          <ul className="text-sm text-gray-700 space-y-1 ml-2">
            <li>• 使用 Supabase 提供的云端存储服务</li>
            <li>• 您的数据将被加密并安全存储在云端</li>
            <li>• 支持多设备自动同步，随时随地学习</li>
            <li>• 建议定期手动同步以确保数据最新</li>
            <li>• <strong>API 配置和翻译历史不会同步</strong>，仅保存在本地</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
