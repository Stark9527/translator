# 开发指南

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 开发模式

```bash
npm run dev
```

这会启动Vite开发服务器，但注意Chrome扩展需要加载构建后的文件。

### 3. 构建项目

```bash
npm run build
```

构建输出在 `dist/` 目录。

### 4. 加载到Chrome浏览器

1. 打开Chrome浏览器
2. 访问 `chrome://extensions/`
3. 开启右上角的 **"开发者模式"**
4. 点击 **"加载已解压的扩展程序"**
5. 选择项目的 `dist` 目录

### 5. 调试

- **Popup页面**: 右键点击扩展图标 → 检查弹出内容
- **Options页面**: 在扩展管理页面点击"详细信息" → "扩展程序选项"，然后右键检查
- **Content Script**: 在任意网页上右键 → 检查 → Console中查看
- **Background**: 在扩展管理页面点击"Service Worker"链接

## 项目结构说明

```
translator/
├── public/                  # 静态资源
│   ├── icons/              # 扩展图标（需要PNG格式）
│   └── manifest.json       # Chrome扩展配置
├── src/
│   ├── background/         # Background Service Worker
│   ├── content/            # Content Scripts（划词翻译）
│   ├── popup/              # Popup页面（输入框翻译）
│   ├── options/            # Settings页面
│   ├── services/           # 服务层（翻译API等）
│   ├── components/         # 共享组件
│   ├── hooks/              # 自定义Hooks
│   ├── utils/              # 工具函数
│   └── types/              # TypeScript类型
├── scripts/                # 构建脚本
│   └── postbuild.mjs      # 构建后处理脚本
└── dist/                   # 构建输出目录
```

## 当前进度

### ✅ Phase 1: 项目基础搭建（已完成）

- [x] 创建Vite + React + TypeScript项目
- [x] 安装必要依赖
- [x] 配置TypeScript和ESLint
- [x] 创建manifest.json (Manifest V3)
- [x] 配置扩展权限
- [x] 准备扩展图标资源（SVG占位符）
- [x] 配置Vite多入口打包
- [x] 配置开发和生产环境构建
- [x] 测试构建流程

### 🔄 Phase 2: 核心服务开发（待进行）

接下来需要实现：
- 存储服务封装
- 翻译服务接口设计
- Google翻译实现
- DeepL翻译实现
- OpenAI翻译实现
- 消息通信机制完善

## 技术要点

### Chrome Extension Manifest V3

项目使用Manifest V3，主要特点：
- 使用Service Worker替代Background Page
- 更严格的CSP（内容安全策略）
- 需要声明host_permissions

### Vite多入口配置

通过 `vite.config.ts` 配置多个入口点：
- popup.html - Popup界面
- options.html - 设置页面
- background.ts - 后台脚本
- content.tsx - 内容脚本

### 构建流程

1. TypeScript编译检查
2. Vite打包
3. 后处理脚本（postbuild.mjs）：
   - 复制manifest.json和icons
   - 移动HTML文件到正确位置
   - 清理临时目录

## 常见问题

### Q: 修改代码后扩展没有更新？

A: 需要重新构建并刷新扩展：
1. 运行 `npm run build`
2. 在 `chrome://extensions/` 点击扩展的刷新按钮

### Q: 如何查看Console日志？

A:
- Background: 点击扩展管理页面的"Service Worker"
- Content: 在网页上右键 → 检查 → Console
- Popup: 右键扩展图标 → 检查弹出内容

### Q: 图标不显示？

A: 当前只有SVG占位图标，需要提供PNG格式的图标文件：
- icon16.png
- icon32.png
- icon48.png
- icon128.png

放置在 `public/icons/` 目录即可。

## 下一步

查看 `README.md` 中的完整开发计划，继续Phase 2的开发。

## 有用的命令

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 代码检查
npm run lint

# 预览（用于普通web应用，扩展需要在Chrome中加载）
npm run preview
```
