# Supabase 云同步功能使用指南

## 概述

本项目已集成 Supabase 云同步功能，支持在多个设备之间同步 Flashcard 学习数据。

## 配置步骤

### 1. 创建 Supabase 项目

1. 访问 [Supabase](https://supabase.com/) 并创建账号
2. 创建一个新项目
3. 在项目设置中找到 API 凭证：
   - `Project URL`
   - `anon/public key`

### 2. 创建数据库表

在 Supabase SQL Editor 中执行 `supabase-schema.sql` 文件中的 SQL 语句，创建以下表：
- `user_configs` - 用户配置
- `flashcard_groups` - Flashcard 分组
- `flashcards` - Flashcard 卡片
- `review_records` - 复习记录
- `daily_stats` - 每日统计

### 3. 配置环境变量

创建 `.env` 文件（参考 `.env.example`）：

```bash
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. 构建并加载扩展

```bash
npm run build
```

在 Chrome 中加载 `dist` 目录。

## 使用方法

### 1. 登录/注册

1. 打开扩展选项页面（Options）
2. 找到"云同步"设置部分
3. 输入邮箱和密码
4. 点击"登录"或"注册"

### 2. 同步数据

- **自动同步**：登录后，数据会在后台自动同步
- **手动同步**：点击"立即同步"按钮手动触发同步

### 3. 同步状态

- ☁️ 蓝色云图标：已连接并同步
- ⛅ 灰色云图标：未登录
- 🔄 旋转图标：正在同步

## 数据同步内容

以下数据会被同步到云端：
- ✅ Flashcard 卡片（单词、翻译、发音、例句等）
- ✅ 分组信息
- ✅ 学习进度（FSRS 数据）
- ✅ 复习记录
- ✅ 每日统计

## 冲突处理

当本地和云端数据发生冲突时，采用以下策略：
- 以**最后更新时间**为准
- 本地更新较新：上传到云端
- 云端更新较新：下载到本地

## 安全性

- 使用 Supabase 的 Row Level Security (RLS) 保护数据
- 每个用户只能访问自己的数据
- 密码通过 Supabase Auth 安全管理
- API 密钥使用环境变量配置

## 故障排除

### 同步失败

1. 检查网络连接
2. 确认 Supabase 项目状态
3. 验证环境变量配置是否正确
4. 查看浏览器控制台日志

### 数据丢失

- 同步不会删除本地数据
- 如果遇到问题，可以导出 JSON 备份

## 开发说明

### 服务层架构

```
src/services/sync/
├── SupabaseService.ts    # Supabase 客户端封装
├── SyncService.ts         # 同步逻辑
└── index.ts               # 导出

src/types/supabase.ts      # 类型定义
```

### 消息通信

新增以下消息类型：
- `SUPABASE_SIGN_IN` - 登录
- `SUPABASE_SIGN_UP` - 注册
- `SUPABASE_SIGN_OUT` - 登出
- `SYNC_NOW` - 立即同步
- `GET_SYNC_STATUS` - 获取同步状态

### 扩展功能

可以在 `SyncService.ts` 中添加：
- 自动同步间隔配置
- 更复杂的冲突解决策略
- 增量同步优化
- 离线队列管理

## 注意事项

1. **数据隐私**：所有数据存储在您自己的 Supabase 项目中
2. **免费额度**：Supabase 免费版有存储和流量限制，请注意使用量
3. **备份建议**：定期导出 JSON 备份，以防万一
4. **多设备**：可以在多个设备上使用同一账号登录并同步数据

## 技术栈

- **后端**: Supabase (PostgreSQL + Auth + Realtime)
- **客户端**: @supabase/supabase-js
- **同步策略**: 基于时间戳的双向同步
- **冲突解决**: Last-Write-Wins (最后写入胜出)
