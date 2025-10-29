# 图标资源说明

## 需要的图标尺寸

Chrome扩展需要以下尺寸的图标：

- icon16.png (16x16) - 用于扩展栏
- icon32.png (32x32) - 用于Windows系统
- icon48.png (48x48) - 用于扩展管理页面
- icon128.png (128x128) - 用于Chrome Web Store和安装时

## 设计建议

1. **设计风格**：简洁、现代、易识别
2. **主题**：翻译相关的图标元素（如：字母、语言符号、地球等）
3. **配色**：建议使用蓝色系（符合翻译工具的专业感）
4. **格式**：PNG格式，背景透明

## 临时占位图标

当前使用SVG生成的简单占位图标，后续可以替换为专业设计的图标。

## 制作工具推荐

- **在线工具**：Figma, Canva
- **专业软件**：Adobe Illustrator, Sketch
- **图标生成**：可以使用在线图标生成器如 https://www.favicon-generator.org/

## 如何替换图标

1. 将设计好的PNG图标文件放到 `public/icons/` 目录
2. 确保文件名与manifest.json中的配置一致
3. 重新构建项目
