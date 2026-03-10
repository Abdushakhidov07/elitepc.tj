import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Package, MessageSquare, Settings, ArrowLeft, LogOut, FolderTree, Monitor, Images, Tag, BarChart2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const NAV_ITEMS = [
  { to: '/admin', label: 'Дашборд', icon: LayoutDashboard, end: true, adminOnly: false },
  { to: '/admin/orders', label: 'Заказы', icon: ShoppingCart, end: false, adminOnly: false },
  { to: '/admin/products', label: 'Товары', icon: Package, end: false, adminOnly: false },
  { to: '/admin/categories', label: 'Категории', icon: FolderTree, end: false, adminOnly: false },
  { to: '/admin/brands', label: 'Бренды', icon: Tag, end: false, adminOnly: false },
  { to: '/admin/presets', label: 'Сборки', icon: Monitor, end: false, adminOnly: false },
  { to: '/admin/analytics', label: 'Аналитика', icon: BarChart2, end: false, adminOnly: true },
  { to: '/admin/hero-slides', label: 'Слайды', icon: Images, end: false, adminOnly: false },
  { to: '/admin/telegram', label: 'Telegram', icon: MessageSquare, end: false, adminOnly: false },
  { to: '/admin/settings', label: 'Настройки', icon: Settings, end: false, adminOnly: false },
];

export default function AdminLayout() {
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);

  return (
    <div className="min-h-screen bg-bg-dark flex">
      {/* Sidebar */}
      <aside className="w-64 bg-bg-card border-r border-border shadow-sm flex flex-col fixed h-full z-30">
        <div className="p-5 border-b border-border">
          <h1 className="text-lg font-bold text-primary">Elite PC</h1>
          <p className="text-text-muted text-xs">Панель управления</p>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.filter(item => !item.adminOnly || user?.is_superuser).map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary/15 text-primary'
                    : 'text-text-secondary hover:bg-bg-card-hover hover:text-text-primary'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-border space-y-1">
          <a
            href="/"
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-text-secondary hover:bg-bg-card-hover hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            На сайт
          </a>
          <button
            onClick={() => { logout(); window.location.href = '/login'; }}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-text-secondary hover:bg-danger/10 hover:text-danger transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Выйти
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 ml-64">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-bg-card/80 backdrop-blur-xl border-b border-border px-6 py-3 flex items-center justify-between">
          <div />
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
              <span className="text-primary text-sm font-bold">
                {user?.first_name?.[0] || user?.username?.[0] || 'A'}
              </span>
            </div>
            <span className="text-sm text-text-secondary">
              {user?.first_name || user?.username}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
