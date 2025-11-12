# 智能翻译助手 Chrome Extension

> 支持 Google 和 DeepL 的智能翻译 Chrome 扩展，提供划词翻译、输入翻译和智能学习等功能

## 🚀 功能特性

### 核心翻译能力
- ✅ **官方 API 支持**：使用 Google Cloud Translation API v2，稳定可靠
- ✅ **划词翻译**：选中文本后自动显示翻译悬浮窗
- ✅ **输入翻译**：点击扩展图标打开 Popup 进行翻译
- ✅ **字典查询**：集成 FreeDictionary 和 Microsoft Dictionary，提供详细释义、音标、例句
- ✅ **翻译缓存**：多级缓存系统（内存 + IndexedDB），快速响应重复查询

### 智能学习系统
- ✅ **Flashcard 学习**：基于 FSRS 算法的间隔重复学习系统
- ✅ **分组管理**：支持自定义分组和标签，灵活组织学习内容
- ✅ **学习统计**：可视化学习进度、掌握度分布和学习曲线
- ✅ **复习提醒**：智能计算最佳复习时间，提升记忆效果
- ✅ **快捷收藏**：翻译结果一键收藏到 Flashcard，划词即可保存

### 用户体验
- ✅ **API Key 管理**：安全配置、一键测试、实时验证
- ✅ **智能错误提示**：友好的错误信息和配置引导
- ✅ **快捷键支持**：Ctrl+Q / Command+Q 触发划词翻译
- ✅ **页面路由**：Popup 内支持多页面切换（翻译/学习/统计）
- ✅ **设置页面**：自定义翻译引擎、语言和偏好设置

### 计划中功能
- 🚧 **多引擎支持**：DeepL、OpenAI（计划中）
- 🚧 **Chrome Alarms 提醒**：定时复习提醒（开发中）
- 🚧 **数据导入导出**：支持 JSON 和 Anki 格式（计划中）

## 📦 技术栈

### 核心框架
- **框架**：React 18 + TypeScript
- **构建工具**：Vite 5.x + @crxjs/vite-plugin
- **Chrome API**：Manifest V3

### UI & 交互
- **UI 库**：Tailwind CSS + Radix UI
- **图标库**：Lucide React
- **路由管理**：React Router DOM
- **数据可视化**：Recharts

### 数据管理
- **状态管理**：Zustand + Immer
- **数据验证**：Zod
- **存储方案**：Chrome Storage API + IndexedDB
- **缓存策略**：内存 LRU + 持久化缓存

### 学习系统
- **间隔重复算法**：ts-fsrs (FSRS v5)
- **日期处理**：date-fns
- **唯一标识**：uuid

### 翻译服务
- **翻译 API**：Google Cloud Translation API v2
- **字典 API**：FreeDictionary API、Microsoft Dictionary API
- **HTTP 客户端**：Axios

### 开发工具
- **代码规范**：ESLint + Prettier
- **类型检查**：TypeScript 5.3+
- **测试框架**：Vitest + Testing Library

## 🛠️ 开发

### 前置要求

- Node.js >= 18.x
- npm >= 9.x

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 加载扩展到 Chrome

1. 打开 Chrome 浏览器，访问 `chrome://extensions/`
2. 开启右上角的 **"开发者模式"**
3. 点击 **"加载已解压的扩展程序"**
4. 选择项目的 `dist` 目录

### 构建生产版本

```bash
npm run build
```

### 代码检查

```bash
# ESLint 检查
npm run lint

# 自动修复
npm run lint:fix

# 格式化代码
npm run format

# TypeScript 类型检查
npm run type-check
```

## 📁 项目结构

```
translator/
├── public/
│   ├── manifest.json          # Chrome Extension 配置
│   └── icon-*.png             # 图标文件（16/32/48/128）
├── src/
│   ├── background/            # Background Service Worker
│   │   └── index.ts           # 消息处理与后台任务
│   ├── content/               # Content Scripts
│   │   ├── index.tsx          # 划词监听入口
│   │   ├── SelectionPopup.tsx # 翻译悬浮窗组件
│   │   └── index.css          # 样式文件
│   ├── popup/                 # Popup UI 入口
│   │   ├── App.tsx            # 主应用组件（路由配置）
│   │   ├── index.tsx          # 渲染入口
│   │   └── index.html         # HTML 模板
│   ├── pages/                 # 页面组件 ⭐ 新增
│   │   ├── TranslatePage.tsx  # 翻译主页面
│   │   └── flashcard/         # Flashcard 学习系统页面
│   │       ├── FlashcardListPage.tsx  # 卡片列表
│   │       ├── StudyPage.tsx          # 学习模式
│   │       ├── StatisticsPage.tsx     # 统计分析
│   │       └── GroupManagePage.tsx    # 分组管理
│   ├── options/               # Options 设置页面
│   │   ├── App.tsx
│   │   ├── index.tsx
│   │   └── index.html
│   ├── components/            # 共享组件
│   │   ├── ui/                # 基础 UI 组件（基于 Radix UI）
│   │   ├── flashcard/         # Flashcard 专用组件
│   │   │   ├── FlashcardCard.tsx     # 卡片组件
│   │   │   ├── StudyCard.tsx         # 学习卡片
│   │   │   ├── ProficiencyBadge.tsx  # 掌握度徽章
│   │   │   ├── ProgressRing.tsx      # 进度环
│   │   │   └── GroupManageModal.tsx  # 分组管理弹窗
│   │   ├── TabNavigator.tsx   # 底部导航栏
│   │   └── PageHeader.tsx     # 页面头部
│   ├── services/              # 业务逻辑服务层
│   │   ├── translator/        # 翻译引擎服务
│   │   │   ├── ITranslator.ts         # 翻译器接口定义
│   │   │   ├── GoogleTranslator.ts    # Google 翻译实现
│   │   │   ├── DictionaryTranslator.ts # 字典翻译实现
│   │   │   ├── TranslatorFactory.ts   # 翻译器工厂
│   │   │   └── errors.ts              # 错误定义
│   │   ├── dictionary/        # 字典服务 ⭐ 新增
│   │   │   ├── FreeDictionaryService.ts      # 免费字典 API
│   │   │   ├── MicrosoftDictionaryService.ts # 微软字典 API
│   │   │   └── types.ts                      # 字典类型定义
│   │   ├── flashcard/         # Flashcard 学习系统 ⭐ 新增
│   │   │   ├── FlashcardDB.ts          # IndexedDB 数据库
│   │   │   ├── FlashcardService.ts     # 卡片业务逻辑
│   │   │   ├── FSRSService.ts          # FSRS 算法封装
│   │   │   ├── StudySessionService.ts  # 学习会话管理
│   │   │   └── AnalyticsService.ts     # 统计分析服务
│   │   ├── cache/             # 缓存服务
│   │   │   ├── TranslationCache.ts    # 翻译缓存管理
│   │   │   └── IndexedDBCache.ts      # IndexedDB 缓存实现
│   │   ├── config/            # 配置服务 ⭐ 新增
│   │   │   └── ConfigService.ts       # 配置管理
│   │   └── translation/       # 翻译管理服务
│   │       └── TranslationManager.ts  # 统一翻译入口
│   ├── types/                 # TypeScript 类型定义
│   │   ├── message.ts         # 消息通信类型
│   │   ├── flashcard.ts       # Flashcard 类型 ⭐ 新增
│   │   └── index.ts           # 类型导出
│   ├── utils/                 # 工具函数
│   │   ├── message.ts         # 消息通信工具
│   │   ├── constants.ts       # 常量定义
│   │   ├── textAnalyzer.ts    # 文本分析工具
│   │   └── cn.ts              # 样式合并工具
│   ├── store/                 # 状态管理 ⭐ 新增
│   └── styles/                # 全局样式
│       └── global.css
├── docs/                      # 技术文档
│   ├── content-script.md
│   ├── translation-services.md
│   ├── storage-cache.md
│   └── shadow-dom-optimization.md
├── tests/                     # 测试文件
├── DEVELOPMENT_PLAN.md        # 开发规划文档
├── STORAGE_ARCHITECTURE.md    # 存储架构文档 ⭐ 新增
└── package.json
```

## 📚 技术文档

详细的技术方案和架构设计请参考：

- **[开发规划](./DEVELOPMENT_PLAN.md)** - 项目路线图、功能清单和开发周期
- **[存储架构](./STORAGE_ARCHITECTURE.md)** - 三层存储系统设计与实现（内存/IndexedDB/Chrome Storage）
- **[Content Script 实现](./docs/content-script.md)** - 划词翻译交互和悬浮窗实现细节
- **[翻译服务设计](./docs/translation-services.md)** - 多引擎抽象层和回退策略
- **[缓存策略](./docs/storage-cache.md)** - 多级缓存实现和性能优化
- **[Shadow DOM 优化](./docs/shadow-dom-optimization.md)** - 样式隔离和兼容性方案

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

### Flashcard 学习系统

#### 收藏单词
- 在翻译结果页面点击"收藏"按钮，将单词添加到 Flashcard
- 支持自动保存翻译、发音、例句等信息

#### 学习复习
1. 在 Popup 中切换到"学习"标签页
2. 点击"开始学习"进入学习模式
3. 根据记忆程度选择 Again/Hard/Good/Easy
4. 系统会根据 FSRS 算法自动调度复习时间

#### 分组管理
1. 在卡片列表页面点击"分组"按钮
2. 创建自定义分组，为卡片分类
3. 可以批量移动卡片到不同分组

#### 数据导入导出
1. **导出数据**
   - 在卡片列表页面点击"导出"按钮
   - 选择导出格式：
     - **JSON 格式**：包含完整的卡片、分组和学习数据，适合备份
     - **Anki CSV 格式**：兼容 Anki 的 CSV 格式，可导入到 Anki
   - 点击"导出"，自动下载文件

2. **导入数据**
   - 在卡片列表页面点击"导入"按钮
   - 点击"选择文件"，选择要导入的文件
   - 支持格式：
     - **JSON 文件**：从本扩展导出的完整数据
     - **CSV 文件**：从 Anki 导出的卡片数据
   - 已存在的卡片会自动跳过，避免重复
   - 导入完成后会显示成功导入的卡片和分组数量

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

#### ✅ 已完成 - 第二阶段：Flashcard 学习系统 (Week 4-6)

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

- [x] **阶段 4：集成与优化 (1-2天)** ✅
  - [x] 4.1 在Popup的翻译页面对接FlashCard
  - [x] 4.2 在划词翻译对接FlashCard
  - [x] 4.3 添加页面路由和底部导航
  - [x] 4.4 实现数据导入导出（JSON + Anki CSV 格式）
  - [ ] 4.5 实现 Chrome Alarms 复习提醒

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
