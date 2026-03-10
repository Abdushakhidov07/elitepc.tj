import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User as UserIcon, Package, Heart, Settings, LogOut, Shield } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { ordersApi, authApi } from '../api';
import { toast } from '../components/ui/Toast';
import type { Order, Product, User } from '../types';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, loadProfile } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<'orders' | 'wishlist' | 'settings'>('orders');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    loadProfile();
    Promise.all([
      ordersApi.getMyOrders(),
      authApi.getWishlist(),
    ]).then(([ordersRes, wishlistRes]) => {
      setOrders(Array.isArray(ordersRes) ? ordersRes : []);
      setWishlist(Array.isArray(wishlistRes) ? wishlistRes : []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [isAuthenticated, navigate, loadProfile]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const statusColors: Record<string, string> = {
    new: 'text-blue-600 bg-blue-50 ring-1 ring-blue-200',
    confirmed: 'text-green-600 bg-green-50 ring-1 ring-green-200',
    paid: 'text-emerald-600 bg-emerald-50 ring-1 ring-emerald-200',
    assembling: 'text-orange-600 bg-orange-50 ring-1 ring-orange-200',
    shipping: 'text-yellow-600 bg-yellow-50 ring-1 ring-yellow-200',
    completed: 'text-success bg-success/10 ring-1 ring-success/30',
    cancelled: 'text-danger bg-danger/10 ring-1 ring-danger/30',
  };

  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Личный кабинет</h1>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-text-secondary hover:text-danger transition-colors"
        >
          <LogOut className="w-4 h-4" /> Выйти
        </button>
      </div>

      {/* Admin Panel Link */}
      {user.is_staff && (
        <Link
          to="/admin"
          className="flex items-center gap-3 bg-primary/10 border border-primary/30 rounded-xl p-4 mb-6 hover:bg-primary/20 transition-colors"
        >
          <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-primary">Админ-панель</p>
            <p className="text-text-muted text-xs">Управление заказами, товарами и настройками</p>
          </div>
          <span className="text-primary text-sm font-medium">Открыть &rarr;</span>
        </Link>
      )}

      {/* User Info */}
      <div className="bg-bg-card shadow-sm border border-border rounded-xl p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-primary/20 rounded-full flex items-center justify-center">
            <UserIcon className="w-7 h-7 text-primary" />
          </div>
          <div>
            <p className="font-bold text-lg">{user.first_name} {user.last_name}</p>
            <p className="text-text-secondary text-sm">{user.email}</p>
            {user.phone && <p className="text-text-muted text-sm">{user.phone}</p>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'orders', label: 'Заказы', icon: <Package className="w-4 h-4" /> },
          { key: 'wishlist', label: 'Избранное', icon: <Heart className="w-4 h-4" /> },
          { key: 'settings', label: 'Настройки', icon: <Settings className="w-4 h-4" /> },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as 'orders' | 'wishlist' | 'settings')}
            className={`flex items-center gap-2 py-2 px-4 font-medium transition-colors ${
              activeTab === tab.key ? 'bg-primary text-white rounded-lg shadow-sm' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Orders */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : orders.length === 0 ? (
            <p className="text-center text-text-secondary py-12">Нет заказов</p>
          ) : (
            orders.map((order) => (
              <Link
                key={order.id || order.order_number}
                to={`/track/${order.order_number}`}
                className="block bg-bg-card shadow-sm border border-border rounded-xl p-4 hover:border-primary transition-colors"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold">{order.order_number}</p>
                    <p className="text-text-muted text-sm">
                      {new Date(order.created_at).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm px-3 py-1 rounded-full ${statusColors[order.status] || ''}`}>
                      {order.status_display || order.status}
                    </span>
                    <p className="font-bold mt-1">{parseFloat(order.total_price).toLocaleString()} сом.</p>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {/* Wishlist */}
      {activeTab === 'wishlist' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {wishlist.length === 0 ? (
            <p className="text-center text-text-secondary py-12 col-span-full">Избранное пусто</p>
          ) : (
            wishlist.map((item) => (
              <Link
                key={item.id}
                to={`/product/${item.slug}`}
                className="bg-bg-card shadow-sm border border-border rounded-xl p-4 hover:border-primary transition-colors flex gap-3"
              >
                {item.main_image && (
                  <img src={item.main_image} alt={item.name} className="w-16 h-16 rounded-lg object-cover bg-bg-secondary flex-shrink-0" />
                )}
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-primary font-bold mt-2">
                    {parseFloat(item.current_price || item.price).toLocaleString()} сом.
                  </p>
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {/* Settings */}
      {activeTab === 'settings' && (
        <ProfileSettings user={user} onProfileUpdated={loadProfile} />
      )}
    </div>
  );
}

function ProfileSettings({ user, onProfileUpdated }: { user: User; onProfileUpdated: () => void }) {
  const [profile, setProfile] = useState({
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    phone: user.phone || '',
    city: user.city || '',
    address: user.address || '',
  });
  const [profileLoading, setProfileLoading] = useState(false);

  const [passwords, setPasswords] = useState({ old_password: '', new_password: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      await authApi.updateProfile(profile);
      onProfileUpdated();
      toast.success('Профиль обновлён');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Ошибка при обновлении профиля');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new_password !== passwords.confirm) {
      toast.warning('Пароли не совпадают');
      return;
    }
    if (passwords.new_password.length < 8) {
      toast.warning('Пароль должен быть не менее 8 символов');
      return;
    }
    setPwLoading(true);
    try {
      await authApi.changePassword({
        old_password: passwords.old_password,
        new_password: passwords.new_password,
      });
      setPasswords({ old_password: '', new_password: '', confirm: '' });
      toast.success('Пароль успешно изменён');
    } catch (err: any) {
      const msg = err.response?.data?.old_password?.[0]
        || err.response?.data?.new_password?.[0]
        || err.response?.data?.detail
        || 'Ошибка при смене пароля';
      toast.error(msg);
    } finally {
      setPwLoading(false);
    }
  };

  const inputClass = "w-full bg-bg-secondary border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <div className="space-y-6">
      <form onSubmit={handleProfileSave} className="bg-bg-card shadow-sm border border-border rounded-xl p-6">
        <h3 className="font-bold mb-4">Личные данные</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1">Имя</label>
            <input type="text" value={profile.first_name} onChange={e => setProfile(p => ({ ...p, first_name: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Фамилия</label>
            <input type="text" value={profile.last_name} onChange={e => setProfile(p => ({ ...p, last_name: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Телефон</label>
            <input type="tel" placeholder="+992" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Город</label>
            <input type="text" value={profile.city} onChange={e => setProfile(p => ({ ...p, city: e.target.value }))} className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm text-text-secondary mb-1">Адрес</label>
            <input type="text" value={profile.address} onChange={e => setProfile(p => ({ ...p, address: e.target.value }))} className={inputClass} />
          </div>
        </div>
        <button type="submit" disabled={profileLoading} className="mt-4 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium transition-colors">
          {profileLoading ? 'Сохраняем...' : 'Сохранить'}
        </button>
      </form>

      <form onSubmit={handlePasswordChange} className="bg-bg-card shadow-sm border border-border rounded-xl p-6">
        <h3 className="font-bold mb-4">Смена пароля</h3>
        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm text-text-secondary mb-1">Текущий пароль</label>
            <input type="password" required value={passwords.old_password} onChange={e => setPasswords(p => ({ ...p, old_password: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Новый пароль</label>
            <input type="password" required value={passwords.new_password} onChange={e => setPasswords(p => ({ ...p, new_password: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Подтвердите пароль</label>
            <input type="password" required value={passwords.confirm} onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} className={inputClass} />
          </div>
        </div>
        <button type="submit" disabled={pwLoading} className="mt-4 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium transition-colors">
          {pwLoading ? 'Меняем...' : 'Сменить пароль'}
        </button>
      </form>
    </div>
  );
}
