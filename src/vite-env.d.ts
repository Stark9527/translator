/// <reference types="vite/client" />

// 声明 CSS 模块的类型
declare module '*.css' {
  const content: string;
  export default content;
}

// 声明 CSS ?inline 导入的类型
declare module '*.css?inline' {
  const content: string;
  export default content;
}

// 声明 CSS ?raw 导入的类型
declare module '*.css?raw' {
  const content: string;
  export default content;
}
