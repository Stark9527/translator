# Translator - Chrome 翻译扩展

一个功能强大的Chrome浏览器翻译扩展，支持划词翻译、输入框翻译，以及多种翻译API切换。

## 项目简介

Translator是一个基于现代Web技术栈开发的Chrome浏览器扩展，旨在提供便捷、高效的网页翻译体验。

## 核心功能

- ✅ **划词翻译**: 选中文本后即可显示翻译结果
- ✅ **输入框翻译**: 通过popup界面输入文本进行翻译
- ✅ **多API支持**: 支持Google翻译、DeepL、OpenAI等多种翻译服务
- ✅ **API切换**: 用户可在设置页面自由切换翻译服务
- ✅ **自定义配置**: 支持配置API密钥和翻译偏好

## 技术栈

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite
- **样式方案**: CSS Modules / Tailwind CSS
- **状态管理**: React Context / Zustand
- **Chrome APIs**: Manifest V3
- **包管理**: npm / yarn / pnpm

## 项目结构

```
translator/
├── public/                  # 静态资源
│   ├── icons/              # 扩展图标
│   └── manifest.json       # Chrome扩展配置文件
├── src/
│   ├── background/         # Background Service Worker
│   │   └── index.ts
│   ├── content/            # Content Scripts
│   │   ├── index.tsx       # 划词翻译主逻辑
│   │   └── SelectionPopup.tsx  # 划词弹窗组件
│   ├── popup/              # Popup页面
│   │   ├── index.tsx       # Popup入口
│   │   ├── App.tsx         # Popup主组件
│   │   └── index.html
│   ├── options/            # 设置页面
│   │   ├── index.tsx       # Options入口
│   │   ├── App.tsx         # Options主组件
│   │   └── index.html
│   ├── services/           # 服务层
│   │   ├── translator/     # 翻译服务
│   │   │   ├── index.ts    # 翻译服务统一接口
│   │   │   ├── google.ts   # Google翻译实现
│   │   │   ├── deepl.ts    # DeepL翻译实现
│   │   │   ├── openai.ts   # OpenAI翻译实现
│   │   │   └── types.ts    # 类型定义
│   │   └── storage/        # 存储服务
│   │       └── index.ts    # Chrome storage封装
│   ├── components/         # 共享组件
│   │   ├── TranslateResult.tsx  # 翻译结果展示
│   │   ├── LanguageSelector.tsx # 语言选择器
│   │   └── LoadingSpinner.tsx   # 加载动画
│   ├── hooks/              # 自定义Hooks
│   │   ├── useTranslate.ts # 翻译Hook
│   │   └── useStorage.ts   # 存储Hook
│   ├── utils/              # 工具函数
│   │   ├── message.ts      # 消息通信
│   │   └── constants.ts    # 常量定义
│   └── types/              # 全局类型定义
│       └── index.ts
├── vite.config.ts          # Vite配置
├── tsconfig.json           # TypeScript配置
├── package.json
└── README.md
```

## 开发计划 / TODO

### Phase 1: 项目基础搭建 🔨 ✅ **已完成**

- [x] **1.1 项目初始化**
  - [x] 创建Vite + React + TypeScript项目
  - [x] 安装必要依赖
  - [x] 配置TypeScript和ESLint

- [x] **1.2 Chrome扩展基础配置**
  - [x] 创建manifest.json (Manifest V3)
  - [x] 配置扩展权限 (storage, activeTab, scripting等)
  - [x] 准备扩展图标资源（SVG占位，待PNG）

- [x] **1.3 Vite构建配置**
  - [x] 配置多入口打包 (popup, content, background, options)
  - [x] 配置静态资源处理
  - [x] 配置开发环境热更新
  - [x] 配置生产环境构建

### Phase 2: 核心服务开发 ⚙️ ✅ **已完成**

- [x] **2.1 存储服务**
  - [x] 封装Chrome Storage API
  - [x] 定义配置数据结构
  - [x] 实现配置读写方法
  - [x] 添加默认配置

- [x] **2.2 翻译服务接口设计**
  - [x] 定义统一的翻译服务接口
  - [x] 定义翻译请求/响应类型
  - [x] 定义错误处理机制
  - [x] 设计服务工厂模式

- [x] **2.3 Google翻译实现**
  - [x] 实现Google翻译API调用
  - [x] 处理语言检测
  - [x] 处理错误和重试逻辑
  - [x] 添加请求限流

- [x] **2.4 DeepL翻译实现**
  - [x] 实现DeepL API调用
  - [x] API密钥验证
  - [x] 处理免费/付费版本差异
  - [x] 错误处理

- [x] **2.5 OpenAI翻译实现**
  - [x] 实现OpenAI API调用
  - [x] 配置翻译prompt
  - [x] 处理流式响应（可选）
  - [x] 错误处理

- [x] **2.6 消息通信机制**
  - [x] 设计content script与background通信协议
  - [x] 设计popup与background通信协议
  - [x] 实现消息发送/接收封装
  - [x] 添加消息类型定义

### Phase 3: Background Service Worker 🔧 ✅ **已完成**

- [x] **3.1 Background基础**
  - [x] 创建background service worker入口
  - [x] 实现扩展安装/更新逻辑
  - [x] 设置默认配置

- [x] **3.2 消息处理**
  - [x] 实现翻译请求消息处理
  - [x] 实现配置更新消息处理
  - [x] 添加消息路由

- [x] **3.3 翻译服务集成**
  - [x] 集成翻译服务到background
  - [x] 实现翻译服务切换逻辑
  - [x] 添加缓存机制（可选）

### Phase 4: Popup输入框翻译 💬 ✅ **已完成**

- [x] **4.1 Popup UI开发**
  - [x] 创建Popup HTML模板
  - [x] 创建Popup React入口
  - [x] 设计Popup界面布局

- [x] **4.2 输入框组件**
  - [x] 实现文本输入区域
  - [x] 添加字符计数
  - [x] 添加清空按钮
  - [x] 实现快捷键支持 (Ctrl+Enter翻译)

- [x] **4.3 翻译结果展示**
  - [x] 创建翻译结果展示组件
  - [x] 添加复制功能
  - [x] 添加朗读功能（可选）
  - [x] 添加加载状态

- [x] **4.4 语言选择**
  - [x] 创建源语言选择器
  - [x] 创建目标语言选择器
  - [x] 添加语言自动检测
  - [x] 保存语言偏好设置

- [x] **4.5 翻译服务选择**
  - [x] 添加翻译服务切换下拉菜单
  - [x] 显示当前使用的服务
  - [x] 集成翻译服务

### Phase 5: Content Script划词翻译 🖱️ ✅ **已完成**

- [x] **5.1 文本选择监听**
  - [x] 监听鼠标选择事件
  - [x] 获取选中文本
  - [x] 过滤无效选择（空白、过短等）
  - [x] 处理跨元素选择

- [x] **5.2 翻译弹窗组件**
  - [x] 创建悬浮弹窗UI组件
  - [x] 实现弹窗定位逻辑
  - [x] 处理窗口边界溢出
  - [x] 添加弹窗动画

- [x] **5.3 翻译功能集成**
  - [x] 向background发送翻译请求
  - [x] 接收并展示翻译结果
  - [x] 添加加载状态
  - [x] 错误处理和提示

- [x] **5.4 交互优化**
  - [x] 添加图标按钮触发
  - [x] 点击外部关闭弹窗
  - [x] 支持快捷键触发（可选）
  - [x] 添加复制按钮

- [x] **5.5 样式隔离**
  - [x] 使用Shadow DOM或CSS命名空间
  - [x] 防止网页样式污染
  - [x] 保证弹窗样式一致性

### Phase 6: 设置页面 (Options) ⚙️ ✅ **已完成**

- [x] **6.1 Options页面基础**
  - [x] 创建Options HTML模板
  - [x] 创建Options React入口
  - [x] 设计设置页面布局

- [x] **6.2 翻译服务配置**
  - [x] 创建服务选择界面
  - [x] Google翻译配置项
  - [x] DeepL API密钥输入
  - [x] OpenAI API密钥输入
  - [x] API密钥验证

- [x] **6.3 通用设置**
  - [x] 默认源语言设置
  - [x] 默认目标语言设置
  - [x] 划词翻译开关
  - [x] 快捷键配置（可选）

- [x] **6.4 数据持久化**
  - [x] 保存配置到Chrome Storage
  - [x] 读取配置并回显
  - [x] 重置为默认配置
  - [x] 导入/导出配置（可选）

### Phase 7: 样式和UI优化 🎨

- [ ] **7.1 样式系统选择**
  - [ ] 决定使用CSS Modules或Tailwind CSS
  - [ ] 配置样式构建

- [ ] **7.2 UI设计实现**
  - [ ] 设计统一的色彩方案
  - [ ] 实现深色/浅色主题（可选）
  - [ ] 优化按钮和输入框样式
  - [ ] 添加图标和插图

- [ ] **7.3 响应式设计**
  - [ ] Popup界面适配不同尺寸
  - [ ] 翻译弹窗适配
  - [ ] 设置页面响应式布局

### Phase 8: 测试和优化 🧪

- [ ] **8.1 功能测试**
  - [ ] 测试各个翻译API
  - [ ] 测试划词翻译功能
  - [ ] 测试输入框翻译功能
  - [ ] 测试设置保存和读取

- [ ] **8.2 边界情况测试**
  - [ ] 测试无网络情况
  - [ ] 测试API密钥错误
  - [ ] 测试超长文本
  - [ ] 测试特殊字符

- [ ] **8.3 性能优化**
  - [ ] 优化打包体积
  - [ ] 优化翻译响应速度
  - [ ] 添加请求缓存
  - [ ] 减少不必要的渲染

- [ ] **8.4 兼容性测试**
  - [ ] 测试不同网站兼容性
  - [ ] 测试Chrome不同版本
  - [ ] 测试与其他扩展的冲突

### Phase 9: 文档和发布 📦

- [ ] **9.1 用户文档**
  - [ ] 完善README
  - [ ] 编写使用说明
  - [ ] 添加截图和演示GIF
  - [ ] 创建FAQ

- [ ] **9.2 开发文档**
  - [ ] 编写架构说明
  - [ ] 代码注释完善
  - [ ] API文档

- [ ] **9.3 发布准备**
  - [ ] 准备Chrome Web Store素材
  - [ ] 编写更新日志
  - [ ] 版本号管理
  - [ ] 打包发布版本

- [ ] **9.4 持续优化**
  - [ ] 收集用户反馈
  - [ ] Bug修复
  - [ ] 功能迭代

## 安装说明

### 开发环境安装

```bash
# 克隆项目
git clone <repository-url>
cd translator

# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build
```

### 加载到Chrome

1. 构建项目: `npm run build`
2. 打开Chrome浏览器，访问 `chrome://extensions/`
3. 开启右上角"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目的 `dist` 目录

## 配置说明

### 翻译API配置

#### Google翻译
- 无需API密钥（使用免费服务）
- 可能需要代理访问

#### DeepL
- 需要API密钥
- 注册地址: https://www.deepl.com/pro-api
- 免费版每月50万字符

#### OpenAI
- 需要API密钥
- 注册地址: https://platform.openai.com
- 支持GPT-3.5/GPT-4模型

## 开发指南

### 添加新的翻译服务

1. 在 `src/services/translator/` 创建新的服务文件
2. 实现 `TranslatorService` 接口
3. 在 `src/services/translator/index.ts` 注册服务
4. 在设置页面添加配置项

### 自定义主题

修改 `src/styles/` 下的样式文件

## 贡献指南

欢迎提交Issue和Pull Request！

## 许可证

MIT License

## 联系方式

- 问题反馈: [GitHub Issues]
- 邮箱: [your-email]

---

**当前版本**: 0.1.0 (开发中)
**最后更新**: 2025-10-29
