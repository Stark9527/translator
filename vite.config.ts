import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        // Popup页面
        popup: resolve(__dirname, 'src/popup/index.html'),
        // Options设置页面
        options: resolve(__dirname, 'src/options/index.html'),
        // Background Service Worker
        background: resolve(__dirname, 'src/background/index.ts'),
        // Content Script
        content: resolve(__dirname, 'src/content/index.tsx'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // 为不同的入口生成不同的文件名
          const name = chunkInfo.name;
          if (name === 'background' || name === 'content') {
            return `${name}.js`;
          }
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name || '';
          // CSS文件特殊处理
          if (name.includes('content') && name.endsWith('.css')) {
            return 'content.css';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
  },
});
