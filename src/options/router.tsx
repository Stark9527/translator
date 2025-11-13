import { createHashRouter, Navigate } from 'react-router-dom';
import App from './App';
import { SyncSettingsPage } from '@/pages/SyncSettingsPage';
import { Layout } from './Layout';

/**
 * Options 页面路由配置
 * 使用 HashRouter 以支持 Chrome 扩展环境
 */
export const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <App />,
      },
      {
        path: 'sync',
        element: <SyncSettingsPage />,
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);
