import { useState, useEffect } from 'react';
import type { UserConfig, TranslationEngine, LanguageCode } from '@/types';
import type { FlashcardGroup } from '@/types/flashcard';
import { flashcardService } from '@/services/flashcard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function App() {
  const [config, setConfig] = useState<UserConfig>({
    engine: 'google',
    defaultSourceLang: 'auto',
    defaultTargetLang: 'zh-CN',
    googleApiKey: '',
    deeplApiKey: '',
    microsoftApiKey: '',
    microsoftRegion: 'global',
    enableDictionary: true,
    theme: 'auto',
    enableShortcut: true,
    enableHistory: true,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [saveMessage, setSaveMessage] = useState('');
  const [quotaInfo, setQuotaInfo] = useState<{
    used: number;
    total: number;
    percentage: number;
  } | null>(null);
  const [advancedMessage, setAdvancedMessage] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [flashcardGroups, setFlashcardGroups] = useState<FlashcardGroup[]>([]);

  // 检查是否是欢迎页面
  const isWelcome = new URLSearchParams(window.location.search).get('welcome') === 'true';

  useEffect(() => {
    // 加载保存的配置
    loadConfig();
    // 加载存储配额信息
    loadQuotaInfo();
    // 加载 Flashcard 分组
    loadFlashcardGroups();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_CONFIG' });
      if (response.success && response.data) {
        setConfig(response.data);
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  };

  const loadQuotaInfo = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_STORAGE_QUOTA' });
      if (response.success && response.data) {
        setQuotaInfo(response.data);
      }
    } catch (error) {
      console.error('Failed to load quota info:', error);
    }
  };

  const loadFlashcardGroups = async () => {
    try {
      await flashcardService.ensureDefaultGroup();
      const groups = await flashcardService.getAllGroups();
      setFlashcardGroups(groups);
    } catch (error) {
      console.error('Failed to load flashcard groups:', error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SAVE_CONFIG',
        payload: { config },
      });

      if (response.success) {
        setSaveMessage('设置已保存！');
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        setSaveMessage('保存失败，请重试');
      }
    } catch (error) {
      console.error('Failed to save config:', error);
      setSaveMessage('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestApiKey = async () => {
    const currentEngine = config.engine;
    const apiKey = currentEngine === 'google' ? config.googleApiKey : config.deeplApiKey;

    if (!apiKey || !apiKey.trim()) {
      setTestResult({
        type: 'error',
        message: '请先输入 API Key',
      });
      return;
    }

    setIsTesting(true);
    setTestResult({ type: 'info', message: '正在测试...' });

    try {
      // 先保存配置
      await chrome.runtime.sendMessage({
        type: 'SAVE_CONFIG',
        payload: { config },
      });

      // 测试翻译
      const response = await chrome.runtime.sendMessage({
        type: 'TRANSLATE',
        payload: {
          text: 'Hello',
          from: 'en',
          to: 'zh-CN',
        },
      });

      if (response.success && response.data) {
        setTestResult({
          type: 'success',
          message: `✓ API Key 有效！测试翻译：Hello → ${response.data.translation}`,
        });
      } else {
        setTestResult({
          type: 'error',
          message: `✗ API Key 测试失败：${response.error || '未知错误'}`,
        });
      }
    } catch (error) {
      console.error('Test API key error:', error);
      setTestResult({
        type: 'error',
        message: `✗ 测试失败：${error instanceof Error ? error.message : '未知错误'}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleEngineChange = (engine: TranslationEngine) => {
    setConfig({ ...config, engine });
    setTestResult(null); // 清除之前的测试结果
  };

  const handleApiKeyChange = (key: 'googleApiKey' | 'deeplApiKey', value: string) => {
    setConfig({ ...config, [key]: value });
    setTestResult(null); // 清除测试结果
  };

  const handleExportConfig = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'EXPORT_CONFIG' });
      if (response.success && response.data) {
        // 创建下载链接
        const blob = new Blob([response.data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `translator-config-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        setAdvancedMessage({ type: 'success', message: '配置已导出' });
        setTimeout(() => setAdvancedMessage(null), 3000);
      }
    } catch (error) {
      console.error('Failed to export config:', error);
      setAdvancedMessage({ type: 'error', message: '导出失败' });
      setTimeout(() => setAdvancedMessage(null), 3000);
    }
  };

  const handleImportConfig = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const response = await chrome.runtime.sendMessage({
        type: 'IMPORT_CONFIG',
        payload: { configJson: text },
      });

      if (response.success) {
        setAdvancedMessage({ type: 'success', message: '配置已导入' });
        setTimeout(() => setAdvancedMessage(null), 3000);
        // 重新加载配置
        await loadConfig();
        await loadQuotaInfo();
        await loadFlashcardGroups();
      } else {
        setAdvancedMessage({ type: 'error', message: `导入失败：${response.error || '未知错误'}` });
        setTimeout(() => setAdvancedMessage(null), 5000);
      }
    } catch (error) {
      console.error('Failed to import config:', error);
      setAdvancedMessage({
        type: 'error',
        message: `导入失败：${error instanceof Error ? error.message : '未知错误'}`,
      });
      setTimeout(() => setAdvancedMessage(null), 5000);
    }

    // 清除文件选择
    event.target.value = '';
  };

  const handleResetConfig = async () => {
    if (!confirm('确定要重置所有设置为默认值吗？此操作不可撤销！')) {
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({ type: 'RESET_CONFIG' });
      if (response.success) {
        setAdvancedMessage({ type: 'success', message: '配置已重置为默认值' });
        setTimeout(() => setAdvancedMessage(null), 3000);
        // 重新加载配置
        await loadConfig();
        await loadQuotaInfo();
        await loadFlashcardGroups();
      } else {
        setAdvancedMessage({ type: 'error', message: '重置失败' });
        setTimeout(() => setAdvancedMessage(null), 3000);
      }
    } catch (error) {
      console.error('Failed to reset config:', error);
      setAdvancedMessage({ type: 'error', message: '重置失败' });
      setTimeout(() => setAdvancedMessage(null), 3000);
    }
  };

  const getQuotaColor = () => {
    if (!quotaInfo) return 'bg-green-500';
    if (quotaInfo.percentage > 90) return 'bg-red-500';
    if (quotaInfo.percentage > 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-3xl mx-auto">
        {/* 欢迎信息 */}
        {isWelcome && (
          <Alert variant="info" className="mb-8">
            <AlertDescription>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                🎉 欢迎使用智能翻译助手！
              </h2>
              <p className="text-muted-foreground mb-3">
                感谢安装！请先配置您的翻译设置，然后就可以开始使用了。
              </p>
              <Alert variant="warning" className="text-sm">
                <AlertDescription>
                  <strong>重要提示：</strong> 使用 Google 翻译需要配置 Google Cloud Translation API Key。
                  <a
                    href="https://cloud.google.com/translate/docs/setup"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline ml-1"
                  >
                    点击查看如何获取
                  </a>
                </AlertDescription>
              </Alert>
            </AlertDescription>
          </Alert>
        )}

        {/* 标题栏 - 包含保存按钮 */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">设置</h1>
            <p className="text-muted-foreground">配置您的翻译偏好和 API 密钥</p>
          </div>
          <div className="flex items-center gap-3">
            {saveMessage && (
              <span className="text-sm text-green-600 dark:text-green-400">
                {saveMessage}
              </span>
            )}
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? '保存中...' : '保存设置'}
            </Button>
          </div>
        </div>

        {/* 翻译引擎选择 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl">翻译引擎</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={config.engine} onValueChange={(value) => handleEngineChange(value as TranslationEngine)}>
              <div className="flex items-center space-x-3 p-3 border border-border rounded-md hover:bg-accent cursor-pointer transition-colors">
                <RadioGroupItem value="google" id="google" />
                <Label htmlFor="google" className="flex-1 cursor-pointer">
                  <div className="font-medium">Google Cloud Translation</div>
                  <div className="text-sm text-muted-foreground">
                    官方 API、支持语言多、需要 API Key
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-3 p-3 border border-border rounded-md opacity-50 transition-colors">
                <RadioGroupItem value="deepl" id="deepl" disabled />
                <Label htmlFor="deepl" className="flex-1">
                  <div className="font-medium">DeepL</div>
                  <div className="text-sm text-muted-foreground">
                    翻译质量高、需要 API Key（即将支持）
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-3 p-3 border border-border rounded-md opacity-50 transition-colors">
                <RadioGroupItem value="openai" id="openai" disabled />
                <Label htmlFor="openai" className="flex-1">
                  <div className="font-medium">OpenAI</div>
                  <div className="text-sm text-muted-foreground">
                    AI 驱动、上下文理解强（即将支持）
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Google API Key */}
        {config.engine === 'google' && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Google Cloud Translation API Key</CardTitle>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleTestApiKey}
                  disabled={isTesting || !config.googleApiKey?.trim()}
                >
                  {isTesting ? '测试中...' : '测试 API Key'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                type="password"
                value={config.googleApiKey || ''}
                onChange={(e) => handleApiKeyChange('googleApiKey', e.target.value)}
                placeholder="请输入您的 Google Cloud Translation API Key"
                className="font-mono text-sm"
              />

              {/* 测试结果 */}
              {testResult && (
                <Alert variant={testResult.type === 'success' ? 'success' : testResult.type === 'error' ? 'destructive' : 'info'}>
                  <AlertDescription>{testResult.message}</AlertDescription>
                </Alert>
              )}

              {/* 帮助信息 */}
              <div className="p-4 bg-muted rounded-md space-y-2 text-sm">
                <p className="font-medium text-foreground">如何获取 Google Cloud Translation API Key：</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-2">
                  <li>
                    访问{' '}
                    <a
                      href="https://console.cloud.google.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Google Cloud Console
                    </a>
                  </li>
                  <li>创建或选择一个项目</li>
                  <li>启用 "Cloud Translation API"</li>
                  <li>在"凭据"页面创建 API 密钥</li>
                  <li>（推荐）限制 API 密钥仅用于 Translation API</li>
                </ol>
                <p className="text-muted-foreground mt-2">
                  <strong>注意：</strong> Google Cloud Translation API 是付费服务，但提供每月免费额度。
                  <a
                    href="https://cloud.google.com/translate/pricing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline ml-1"
                  >
                    查看价格
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Microsoft Translator API Key - 词典功能 */}
        {config.engine === 'google' && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Microsoft Translator API Key（词典功能）</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    可选配置，用于英文单词的词典翻译（多词性、多释义、例句）
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="enableDictionary" className="text-sm">启用词典</Label>
                  <input
                    id="enableDictionary"
                    type="checkbox"
                    checked={config.enableDictionary !== false}
                    onChange={(e) => setConfig({ ...config, enableDictionary: e.target.checked })}
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input
                  type="password"
                  value={config.microsoftApiKey || ''}
                  onChange={(e) => setConfig({ ...config, microsoftApiKey: e.target.value })}
                  placeholder="请输入您的 Microsoft Translator API Key（可选）"
                  className="font-mono text-sm"
                  disabled={config.enableDictionary === false}
                />
              </div>

              <div className="space-y-2">
                <Label>区域 (Region)</Label>
                <Select
                  value={config.microsoftRegion || 'global'}
                  onValueChange={(value) => setConfig({ ...config, microsoftRegion: value })}
                  disabled={config.enableDictionary === false}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global（全球）</SelectItem>
                    <SelectItem value="eastus">East US（美国东部）</SelectItem>
                    <SelectItem value="westus">West US（美国西部）</SelectItem>
                    <SelectItem value="eastasia">East Asia（东亚）</SelectItem>
                    <SelectItem value="southeastasia">Southeast Asia（东南亚）</SelectItem>
                    <SelectItem value="westeurope">West Europe（西欧）</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 帮助信息 */}
              <div className="p-4 bg-muted rounded-md space-y-2 text-sm">
                <p className="font-medium text-foreground">词典功能说明：</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                  <li>自动识别英文单词，展示多词性、多释义、例句、音标</li>
                  <li>仅对英文→中文的单词翻译生效</li>
                  <li>句子和非英文内容仍使用 Google 翻译</li>
                  <li>不配置则所有翻译均使用 Google 翻译</li>
                </ul>

                <p className="font-medium text-foreground mt-3">如何获取 Microsoft Translator API Key：</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-2">
                  <li>
                    访问{' '}
                    <a
                      href="https://portal.azure.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Azure Portal
                    </a>
                  </li>
                  <li>创建 "Translator" 资源</li>
                  <li>在资源页面的"密钥和终结点"中复制密钥</li>
                  <li>记下你的区域（如 global）</li>
                </ol>

                <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950 rounded text-xs">
                  <p className="text-blue-700 dark:text-blue-300">
                    <strong>💡 提示：</strong> Microsoft Translator 提供<strong>每月 200万字符</strong>免费额度。
                    <a
                      href="https://azure.microsoft.com/zh-cn/pricing/details/cognitive-services/translator/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline ml-1"
                    >
                      查看价格
                    </a>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* DeepL API Key */}
        {config.engine === 'deepl' && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-xl">DeepL API Key</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input
                type="password"
                value={config.deeplApiKey || ''}
                onChange={(e) => handleApiKeyChange('deeplApiKey', e.target.value)}
                placeholder="请输入您的 DeepL API Key"
                className="font-mono text-sm"
                disabled
              />
              <p className="text-sm text-muted-foreground">
                获取 API Key：
                <a
                  href="https://www.deepl.com/pro-api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline ml-1"
                >
                  DeepL API
                </a>
              </p>
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                DeepL 翻译器即将支持，敬请期待...
              </p>
            </CardContent>
          </Card>
        )}

        {/* 语言设置 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl">默认设置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>源语言</Label>
                <Select
                  value={config.defaultSourceLang}
                  onValueChange={(value) => setConfig({ ...config, defaultSourceLang: value as LanguageCode })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">自动检测</SelectItem>
                    <SelectItem value="zh-CN">简体中文</SelectItem>
                    <SelectItem value="zh-TW">繁体中文</SelectItem>
                    <SelectItem value="en">英语</SelectItem>
                    <SelectItem value="ja">日语</SelectItem>
                    <SelectItem value="ko">韩语</SelectItem>
                    <SelectItem value="fr">法语</SelectItem>
                    <SelectItem value="de">德语</SelectItem>
                    <SelectItem value="es">西班牙语</SelectItem>
                    <SelectItem value="ru">俄语</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>目标语言</Label>
                <Select
                  value={config.defaultTargetLang}
                  onValueChange={(value) => setConfig({ ...config, defaultTargetLang: value as LanguageCode })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zh-CN">简体中文</SelectItem>
                    <SelectItem value="zh-TW">繁体中文</SelectItem>
                    <SelectItem value="en">英语</SelectItem>
                    <SelectItem value="ja">日语</SelectItem>
                    <SelectItem value="ko">韩语</SelectItem>
                    <SelectItem value="fr">法语</SelectItem>
                    <SelectItem value="de">德语</SelectItem>
                    <SelectItem value="es">西班牙语</SelectItem>
                    <SelectItem value="ru">俄语</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 默认 Flashcard 分组 */}
            <div className="space-y-2">
              <Label>默认 Flashcard 分组</Label>
              <Select
                value={config.defaultFlashcardGroupId || 'default'}
                onValueChange={(value) => setConfig({ ...config, defaultFlashcardGroupId: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {flashcardGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name} ({group.cardCount} 张卡片)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                从翻译页或划词翻译添加到卡片库时，将自动保存到此分组
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 高级设置 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl">高级设置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 存储配额 */}
            {quotaInfo && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>存储配额使用</Label>
                  <span className="text-sm text-muted-foreground">
                    {quotaInfo.used} / {quotaInfo.total} 字节 ({quotaInfo.percentage}%)
                  </span>
                </div>
                <Progress value={quotaInfo.percentage} className={`h-2 [&>div]:${getQuotaColor()}`} />
                {quotaInfo.percentage > 90 && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertDescription className="text-xs">
                      ⚠️ 存储空间即将耗尽，建议清理数据
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* 配置管理按钮 */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Button variant="secondary" onClick={handleExportConfig} className="flex-1">
                  📤 导出配置
                </Button>
                <Button variant="secondary" asChild className="flex-1">
                  <label className="cursor-pointer">
                    📥 导入配置
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportConfig}
                      className="hidden"
                    />
                  </label>
                </Button>
              </div>

              <Button variant="destructive" onClick={handleResetConfig} className="w-full">
                🔄 重置为默认设置
              </Button>
            </div>

            {/* 高级操作消息 */}
            {advancedMessage && (
              <Alert variant={advancedMessage.type === 'success' ? 'success' : advancedMessage.type === 'error' ? 'destructive' : 'info'}>
                <AlertDescription>{advancedMessage.message}</AlertDescription>
              </Alert>
            )}

            <div className="p-3 bg-muted rounded-md text-xs text-muted-foreground space-y-1">
              <p><strong>导出配置：</strong>将当前设置保存为 JSON 文件</p>
              <p><strong>导入配置：</strong>从 JSON 文件恢复设置</p>
              <p><strong>重置设置：</strong>将所有设置恢复为默认值</p>
            </div>
          </CardContent>
        </Card>

        {/* 关于 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl">关于</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>版本：</strong> 0.1.0</p>
              <p><strong>描述：</strong> 一个支持多翻译引擎的智能 Chrome 翻译扩展</p>
              <p><strong>功能：</strong> 划词翻译、输入翻译、历史记录等</p>
              <p><strong>当前支持：</strong> Google Cloud Translation API v2</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
