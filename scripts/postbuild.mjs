import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.resolve(__dirname, '../dist');
const publicDir = path.resolve(__dirname, '../public');

async function postBuild() {
  console.log('开始后处理构建文件...');

  try {
    // 1. 复制manifest.json
    await fs.copy(
      path.join(publicDir, 'manifest.json'),
      path.join(distDir, 'manifest.json')
    );
    console.log('✓ 复制 manifest.json');

    // 2. 复制icons目录
    if (await fs.pathExists(path.join(publicDir, 'icons'))) {
      await fs.copy(
        path.join(publicDir, 'icons'),
        path.join(distDir, 'icons')
      );
      console.log('✓ 复制 icons 目录');
    }

    // 3. 重命名HTML文件
    const htmlFiles = [
      { from: 'src/popup/index.html', to: 'popup.html' },
      { from: 'src/options/index.html', to: 'options.html' },
    ];

    for (const { from, to } of htmlFiles) {
      const sourcePath = path.join(distDir, from);
      const targetPath = path.join(distDir, to);

      if (await fs.pathExists(sourcePath)) {
        await fs.move(sourcePath, targetPath, { overwrite: true });
        console.log(`✓ 移动 ${from} -> ${to}`);
      }
    }

    // 4. 清理不需要的目录
    const dirsToRemove = ['src'];
    for (const dir of dirsToRemove) {
      const dirPath = path.join(distDir, dir);
      if (await fs.pathExists(dirPath)) {
        await fs.remove(dirPath);
        console.log(`✓ 清理目录 ${dir}`);
      }
    }

    console.log('✓ 构建后处理完成！');
  } catch (error) {
    console.error('构建后处理失败:', error);
    process.exit(1);
  }
}

postBuild();
