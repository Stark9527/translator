import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Settings, Cloud } from 'lucide-react';

/**
 * Options 页面布局组件
 * 提供顶部导航和页面内容区域
 */
export function Layout() {
  const location = useLocation();

  const navItems = [
    { path: '/', label: '设置', icon: Settings },
    { path: '/sync', label: '云同步', icon: Cloud },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航栏 */}
      <nav className="border-b bg-card shadow-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center h-16 space-x-8">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-foreground">智能翻译助手</h1>
            </div>

            <div className="flex space-x-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors
                      ${isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          </div>
        </div>
      </nav>

      {/* 页面内容 */}
      <main className="py-8">
        <Outlet />
      </main>
    </div>
  );
}
