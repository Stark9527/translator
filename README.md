# 智能翻译助手 Chrome Extension

> 支持 Google 和 DeepL 的智能翻译 Chrome 扩展，提供划词翻译、输入翻译等功能

## 🚀 功能特性

- ✅ **官方 API 支持**：使用 Google Cloud Translation API v2，稳定可靠
- ✅ **划词翻译**：选中文本后自动显示翻译悬浮窗
- ✅ **输入翻译**：点击扩展图标打开 Popup 进行翻译
- ✅ **API Key 管理**：安全配置、一键测试、实时验证
- ✅ **智能错误提示**：友好的错误信息和配置引导
- ✅ **快捷键**：Ctrl+Q / Command+Q 触发划词翻译
- ✅ **设置页面**：自定义翻译引擎、语言和偏好设置
- 🚧 **多引擎支持**：DeepL、OpenAI（计划中）
- 🚧 **翻译历史**：保存翻译历史记录（开发中）
- 🚧 **生词本**：收藏常用单词和短语（计划中）

## 📦 技术栈

- **框架**：React 18 + TypeScript
- **构建工具**：Vite 5.x
- **UI 库**：Tailwind CSS + Radix UI
- **状态管理**：Zustand
- **Chrome API**：Manifest V3

## 🛠️ 开发

### 前置要求

- Node.js >= 18.x
- npm >= 9.x

### 安装依赖

\`\`\`bash
npm install
\`\`\`

### 开发模式

\`\`\`bash
npm run dev
\`\`\`

### 加载扩展到 Chrome

1. 打开 Chrome 浏览器，访问 `chrome://extensions/`
2. 开启右上角的 **"开发者模式"**
3. 点击 **"加载已解压的扩展程序"**
4. 选择项目的 `dist` 目录

### 构建生产版本

\`\`\`bash
npm run build
\`\`\`

### 代码检查

\`\`\`bash
# ESLint 检查
npm run lint

# 自动修复
npm run lint:fix

# 格式化代码
npm run format

# TypeScript 类型检查
npm run type-check
\`\`\`

## 📁 项目结构

\`\`\`
translator-extension/
├── public/
│   ├── manifest.json          # Chrome Extension 配置
│   └── *.png                  # 图标文件
├── src/
│   ├── background/            # Background Service Worker
│   │   └── index.ts
│   ├── content/               # Content Scripts
│   │   ├── index.tsx
│   │   ├── SelectionPopup.tsx
│   │   └── index.css
│   ├── popup/                 # Popup UI
│   │   ├── App.tsx
│   │   ├── index.tsx
│   │   └── index.html
│   ├── options/               # Options 设置页面
│   │   ├── App.tsx
│   │   ├── index.tsx
│   │   └── index.html
│   ├── components/            # 共享组件
│   ├── hooks/                 # 自定义 Hooks
│   ├── services/              # 业务逻辑
│   │   ├── translator/        # 翻译服务
│   │   ├── storage/           # 存储服务
│   │   └── cache/             # 缓存服务
│   ├── types/                 # TypeScript 类型定义
│   ├── utils/                 # 工具函数
│   └── styles/                # 全局样式
├── DEVELOPMENT_PLAN.md        # 开发规划文档
└── package.json
\`\`\`

## 📖 使用指南

### ⚙️ 首次配置

**重要：本扩展使用 Google Cloud Translation API，需要您自己的 API Key**

#### 获取 Google Cloud Translation API Key

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目
3. 启用 **Cloud Translation API**：
   - 在左侧菜单选择 "APIs & Services" > "Library"
   - 搜索 "Cloud Translation API"
   - 点击启用
4. 创建 API Key：
   - 在左侧菜单选择 "APIs & Services" > "Credentials"
   - 点击 "Create Credentials" > "API Key"
   - 复制生成的 API Key
5. （推荐）限制 API Key：
   - 点击刚创建的 API Key 进行编辑
   - 在 "API restrictions" 中选择 "Restrict key"
   - 只勾选 "Cloud Translation API"
   - 保存

#### 配置扩展

1. 安装扩展后，首次打开会自动跳转到设置页面
2. 在 "Google Cloud Translation API Key" 输入框中粘贴您的 API Key
3. 点击 "测试 API Key" 按钮验证是否有效
4. 看到 "✓ API Key 有效" 后，点击 "保存设置"

**费用说明**：
- Google Cloud Translation API 是付费服务
- 提供每月 **500,000 字符** 的免费额度（约 250 页文本）
- 超出免费额度后，每 100 万字符收费 $20
- [查看详细价格](https://cloud.google.com/translate/pricing)

### 划词翻译

1. 在任意网页上选中文本
2. 自动弹出翻译悬浮窗
3. 或按 `Ctrl+Q`（Mac: `Command+Q`）手动触发

### Popup 翻译

1. 点击浏览器工具栏的扩展图标
2. 在输入框中输入要翻译的文本
3. 点击"翻译"按钮或按 `Ctrl+Enter` (Mac: `Cmd+Enter`)

### 设置

1. 右键扩展图标，选择"选项"
2. 或在 Popup 底部点击"设置"
3. 配置翻译引擎、API Key、默认语言等

## 🗺️ 开发路线图

详细的开发计划请查看 [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md)

### 当前状态：功能增强开发中 (Week 4-6)

#### ✅ 已完成 - 第一阶段：MVP 核心功能 (Week 1-3)

**基础架构 (Week 1)**
- [x] 项目脚手架搭建 (Vite + React + TypeScript)
- [x] Manifest V3 配置与权限设置
- [x] 开发工具链配置 (ESLint, Prettier, Vitest)
- [x] Tailwind CSS + Radix UI 集成
- [x] 消息通信框架 (Content ↔ Background)

**UI 界面层**
- [x] Content Script 划词翻译 UI (悬浮窗、图标、交互)
- [x] Popup 输入翻译界面
- [x] Options 设置页面 (引擎选择、API Key 配置)
- [x] Background Service Worker 基础框架

**P0 - 翻译核心能力**
- [x] Google Cloud Translation API v2 服务层实现
- [x] 翻译引擎抽象接口设计
- [x] Background 翻译逻辑完善
- [x] API Key 配置 UI（输入、验证、测试）
- [x] Popup 翻译结果展示
- [x] 错误处理与用户提示
- [x] 划词翻译功能接入真实翻译

**P1 - 性能与体验优化**
- [x] 复制译文功能
- [x] 文本朗读 (TTS)
- [x] IndexedDB 翻译缓存系统（两层缓存：内存 + 持久化）
- [x] Chrome Storage 配置管理（配置验证、导入/导出、Quota 监控、版本管理）
- [x] Shadow DOM 样式隔离优化（内联样式、:host 重置、完全隔离）

#### 🚧 进行中 - 第二阶段：功能增强 (Week 4-6)

**Flashcard 智能学习系统（使用 FSRS 算法）**
- [x] **阶段 1：基础设施 (1-2天)** ✅
  - [x] 1.1 安装依赖（ts-fsrs, recharts, date-fns, uuid）
  - [x] 1.2 定义 Flashcard 数据类型（src/types/flashcard.ts）
  - [x] 1.3 创建 FlashcardDB IndexedDB 服务
  - [x] 1.4 实现 CRUD 操作和批量接口

- [x] **阶段 2：核心服务层 (2-3天)** ✅
  - [x] 2.1 封装 FSRS 算法服务（FSRSService.ts）
  - [x] 2.2 实现复习调度逻辑（计算下次复习时间）
  - [x] 2.3 实现 FlashcardService 业务逻辑（收藏、分组、搜索）
  - [x] 2.4 实现学习会话管理服务（StudySessionService.ts）
  - [x] 2.5 实现统计分析服务（AnalyticsService.ts）

- [x] **阶段 3：UI 界面 (3-4天)** ✅
  - [x] 3.1 创建 Flashcard 列表页（网格布局、搜索、筛选）
  - [x] 3.2 创建学习模式界面（卡片翻转、答题按钮 Again/Hard/Good/Easy）
  - [x] 3.3 实现快捷键支持（1234 答题，空格翻转）
  - [x] 3.4 创建统计仪表盘（今日任务、掌握度分布、学习曲线）
  - [x] 3.5 实现 UI 组件库（FlashcardCard, ProficiencyBadge, ProgressRing）

- [ ] **阶段 4：集成与优化 (1-2天)**
  - [x] 4.1 在Popup的翻译页面对接FlashCard ✅
  - [ ] 4.2 在划词翻译对接FlashCard
  - [x] 4.3 添加页面路由和底部导航 ✅
  - [ ] 4.4 实现 Chrome Alarms 复习提醒
  - [ ] 4.5 实现数据导入导出（JSON + 可选 Anki 格式）

**其他功能增强**
- [ ] 输入框快速翻译（右键菜单）
- [ ] 翻译历史记录管理
- [ ] 多语言发音与例句
- [ ] 翻译配额监控与提醒

#### 📋 待开发功能

**第三阶段：高级特性 (Week 7+)**
- [ ] 网页全文翻译（双语对照模式）
- [ ] AI 增强模式 (LLM 接入)
- [ ] 专业术语库管理
- [ ] 云同步 (历史、生词本、配置)
- [ ] 多引擎智能选择策略
- [ ] 自定义主题与快捷键
- [ ] 数据导入导出

## 📝 许可

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📧 联系

如有问题或建议，请提交 Issue。
