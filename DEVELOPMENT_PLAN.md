# Chrome翻译插件开发规划

> 📅 最近更新：2025-11-03  
> 🎯 目标：交付体验优秀、响应迅速的 Chrome 翻译扩展  
> 👥 用户：需要跨语言阅读与沟通的学生、职场人士、开发者
>
> 📚 详细技术方案请参考：
> - [`docs/content-script.md`](docs/content-script.md)：划词与悬浮窗交互实现
> - [`docs/translation-services.md`](docs/translation-services.md)：翻译引擎抽象与回退策略
> - [`docs/storage-cache.md`](docs/storage-cache.md)：多级缓存与安全存储设计

---

## 目录
- [一、产品定位（简洁版）](#一产品定位简洁版)
- [二、功能清单与优先级](#二功能清单与优先级)
- [三、技术栈](#三技术栈)
- [四、架构设计](#四架构设计)
- [五、关键技术要点（概念层面）](#五关键技术要点概念层面)
- [六、开发路线图](#六开发路线图)
- [七、目录结构规划](#七目录结构规划)

---

## 一、产品定位（简洁版）

- **市场定位**：现代化、可定制、响应迅速的多引擎翻译插件，覆盖泛用户日常学习、工作与专业阅读场景。
- **用户价值**：
  - 学生：提高外文阅读效率，快速获取例句与朗读。
  - 职场人士：支持长文本与术语处理，便于撰写邮件与报告。
  - 开发者：强调代码注释、技术文章等场景的精准翻译。
- **差异化优势**：
  - 多引擎并行（Google、DeepL，预留大模型扩展）保证翻译质量和覆盖面。
  - 现代化 UI 体验（Shadcn UI + Tailwind），配合 Shadow DOM 悬浮窗确保样式隔离。
  - 多级缓存与性能优化策略，让划词响应迅速且在弱网场景可用。
  - 可定制性强：快捷键、自定义主题、翻译偏好及专业术语库。
- **竞品启发**：
  - Google 翻译：通用性强但体验陈旧 → 我们强化交互体验。
  - DeepL：翻译准确但额度有限 → 我们提供引擎切换与配额提醒。
  - Immersive Translate / 沙拉查词：功能强但学习成本高 → 我们聚焦开箱即用与渐进式配置。

---

## 二、功能清单与优先级

### 2.1 MVP 核心能力（Week 1-3）
- `划词翻译`：网页选中文本后弹出悬浮窗，支持发音、复制、翻译历史。
- `Popup 翻译面板`：扩展图标入口，输入框实时翻译，便于快速双向翻译。
- `基础设置`：语言偏好、翻译引擎切换、快捷键配置、深浅色主题。
- `本地缓存`：Chrome Storage 记录常用配置与最近翻译，IndexedDB 作为翻译结果缓存。

> 划词交互与 UI 流程详见 [`docs/content-script.md`](docs/content-script.md)。

### 2.2 第二阶段增强（Week 4-6）
- `网页全文翻译`：一键双语对照模式，可排除特定元素。
- `输入框增强`：支持在常见输入框中快速润色与翻译（右键菜单、快捷操作）。
- `翻译历史与生词本`：面向常用用户的记录与收藏能力，增设分组和搜索。
- `多语言发音与例句`：根据引擎能力拉取音标、例句、近义词提示。

### 2.3 第三阶段进阶（Week 7+）
- `AI 增强模式`：调用大语言模型理解上下文，提供润色、改写、术语建议。
- `专业术语库`：行业词库管理，结合团队共享与导入导出。
- `协作与同步`：账号体系、云同步历史、生词本与偏好配置。
- `多引擎智能选择`：根据文本类型与用户偏好自动选择最优翻译引擎。

---

## 三、技术栈

- **核心框架**：React 18 + TypeScript + Vite  
  快速开发、类型安全、HMR 体验佳，适合多入口构建。
- **界面系统**：Tailwind CSS + Shadcn UI + Radix UI  
  提供现代化外观、无障碍支持与高可定制性。
- **Chrome 平台能力**：Manifest V3、Service Worker、Chrome Storage、Context Menus  
  满足扩展发布要求，并支持消息通信、权限与存储。
- **翻译服务**：Google Translate（免费、覆盖广）+ DeepL（高质量），预留 LLM 接口  
  通过统一抽象层管理配额、错误与回退策略。
- **工程与工具链**：pnpm、ESLint、Prettier、Vitest + Testing Library、Zod  
  确保依赖管理高效、代码风格统一、关键逻辑具备可测试性。

> 翻译服务抽象与回退策略详见 [`docs/translation-services.md`](docs/translation-services.md)，缓存实现与安全方案见 [`docs/storage-cache.md`](docs/storage-cache.md)。

---

## 四、架构设计

```
[用户页面] ──选中文本──▶ [Content Script + Shadow DOM Popup]
      │                         │  chrome.runtime 消息
      │                         ▼
      │                 [Background Service Worker]
      │                         │  请求调度、缓存命中
      │                         ▼
      │                 [Translation Service Layer]
      │                         │  HTTP/SDK 调用
      ▼                         ▼
[Popup / Options UI] ◀──同步状态──▶ [Storage & Cache]
```

- **Content Script**：监听划词、注入悬浮窗、负责与页面交互；通过 Shadow DOM 隔离样式。
- **Popup UI**：提供输入翻译、历史、快捷操作；使用 Zustand/TanStack Query 管理状态。
- **Options 页面**：管理引擎配置、快捷键、主题与术语库。
- **Background Service Worker**：统一消息路由、队列化翻译请求、调度缓存与错误重试。
- **Translation Service Layer**：封装 Google、DeepL、LLM，支持熔断、重试、负载监控。
- **Storage & Cache**：Chrome Storage 管理轻量配置，IndexedDB 存放翻译缓存与历史，内存 LRU 提升同页面多次查询性能。
- **Shared Utilities**：统一类型定义、消息协议、日志与错误上报（可接入 Sentry/自建服务）。

> 详细架构与悬浮窗实现详见 [`docs/content-script.md`](docs/content-script.md)。

---

## 五、关键技术要点（概念层面）

- **划词翻译体验**：Shadow DOM 隔离样式；悬浮窗定位需考虑视口边界、滚动偏移、缩放比例；轻量防抖避免频繁调用。
- **消息通信**：基于类型安全的消息通道（TypeScript 枚举 + schema 校验），区分同步/异步响应，避免请求风暴与重复处理。
- **缓存策略**：内存 LRU 提升会话命中率，IndexedDB 存储 24 小时内翻译结果，失败时回退至最近可用结果并提示刷新。
- **权限与安全**：最小权限的 manifest 配置；对用户 API Key 进行加密存储，敏感数据仅在本地解密；记录引擎调用限额与速率限制。
- **多引擎策略**：抽象标准接口，支持按语言对、文本长度、用户偏好动态选择引擎并提供回退；收集调用指标以优化默认策略。

> 翻译引擎与缓存安全细节参见 [`docs/translation-services.md`](docs/translation-services.md) 与 [`docs/storage-cache.md`](docs/storage-cache.md)。

---

## 六、开发路线图

| 周期 | 主要目标 | 关键交付 |
|------|----------|----------|
| Week 1 | 项目初始化、技术栈落地、Content Script 原型 | Vite 多入口、基础目录、划词监听 Demo |
| Week 2 | MVP 核心功能闭环 | Popup 翻译、背景通信、Google 引擎接入 |
| Week 3 | 体验打磨与缓存 | Shadow DOM 悬浮窗、IndexedDB 缓存、设置页基础版 |
| Week 4 | 第二阶段开始：全文翻译 & 输入框增强 | DOM 扫描策略、对照模式 UI、上下文菜单 |
| Week 5 | 历史/生词体系与 DeepL 接入 | 数据模型、搜索过滤、配额监控 |
| Week 6 | 性能优化与 QA | 自测脚本、关键路径性能调优、发布候选版本 |
| Week 7-8 | AI 与高级功能探索 | LLM 接口试验、术语库管理、团队使用体验验证 |

---

## 七、目录结构规划

```
translator/
├── public/               # 静态资源与 manifest
├── src/
│   ├── background/       # Service Worker 入口与消息处理
│   ├── content/          # 划词逻辑、悬浮窗组件、页面适配
│   ├── popup/            # Popup 页 UI 与业务逻辑
│   ├── options/          # 设置页入口与子模块
│   ├── services/         # 翻译、存储、缓存等业务服务
│   ├── store/            # Zustand 状态与类型定义
│   ├── hooks/            # 共享自定义 Hook
│   ├── utils/            # 通用工具、消息协议、常量
│   └── styles/           # 全局样式与 Tailwind 配置入口
├── tests/                # 单元、集成、端到端测试
├── scripts/              # 构建与发布脚本
├── docs/                 # 项目文档（开发规划、架构、API）
└── 配置文件              # tsconfig、eslint、prettier、CI 配置等
```

---

> 本文档聚焦策略、架构与优先级，具体实现细节见 `docs/` 目录下各专题文档。
