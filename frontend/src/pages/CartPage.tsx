import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trash2, Plus, Minus, ShoppingCart, Package, BarChart3,
  TrendingUp, DollarSign, CalendarDays, ChevronRight, Eye,
} from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { ordersApi } from '../api';
import type { Order } from '../types';

type Tab = 'cart' | 'orders' | 'stats';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  new: { label: 'Новый', color: 'text-blue-400 bg-blue-500/15 ring-1 ring-blue-500/30' },
  confirmed: { label: 'Подтверждён', color: 'text-green-400 bg-green-500/15 ring-1 ring-green-500/30' },
  paid: { label: 'Оплачен', color: 'text-emerald-400 bg-emerald-500/15 ring-1 ring-emerald-500/30' },
  assembling: { label: 'Собирается', color: 'text-orange-400 bg-orange-500/15 ring-1 ring-orange-500/30' },
  shipping: { label: 'Доставляется', color: 'text-yellow-400 bg-yellow-500/15 ring-1 ring-yellow-500/30' },
  completed: { label: 'Выполнен', color: 'text-success bg-success/10 ring-1 ring-success/30' },
  cancelled: { label: 'Отменён', color: 'text-danger bg-danger/10 ring-1 ring-danger/30' },
};

export default function CartPage() {
  const [activeTab, setActiveTab] = useState<Tab>('cart');
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersLoaded, setOrdersLoaded] = useState(false);

  const { items, total, count, loading, fetchCart, updateItem, removeItem, clearCart } = useCartStore();
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // Load orders when switching to orders/stats tab
  useEffect(() => {
    if ((activeTab === 'orders' || activeTab === 'stats') && isAuthenticated && !ordersLoaded) {
      setOrdersLoading(true);
      ordersApi.getMyOrders()
        .then(res => {
          setOrders(Array.isArray(res) ? res : []);
          setOrdersLoaded(true);
        })
        .catch(() => {})
        .finally(() => setOrdersLoading(false));
    }
  }, [activeTab, isAuthenticated, ordersLoaded]);

  const tabs = [
    { key: 'cart' as Tab, label: 'Корзина', icon: ShoppingCart, badge: count || undefined },
    { key: 'orders' as Tab, label: 'Мои заказы', icon: Package, badge: ordersLoaded ? orders.length || undefined : undefined },
    { key: 'stats' as Tab, label: 'Статистика', icon: BarChart3 },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Tabs */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'bg-bg-card text-text-secondary border border-border hover:border-primary/30 hover:text-text-primary'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'cart' && (
          <motion.div
            key="cart"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <CartContent
              items={items}
              total={total}
              count={count}
              loading={loading}
              updateItem={updateItem}
              removeItem={removeItem}
              clearCart={clearCart}
            />
          </motion.div>
        )}

        {activeTab === 'orders' && (
          <motion.div
            key="orders"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <OrdersContent
              orders={orders}
              loading={ordersLoading}
              isAuthenticated={isAuthenticated}
            />
          </motion.div>
        )}

        {activeTab === 'stats' && (
          <motion.div
            key="stats"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <StatsContent
              orders={orders}
              loading={ordersLoading}
              isAuthenticated={isAuthenticated}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ====================================================================
   Cart Tab
   ==================================================================== */

interface CartContentProps {
  items: ReturnType<typeof useCartStore.getState>['items'];
  total: number;
  count: number;
  loading: boolean;
  updateItem: (id: number, qty: number) => void;
  removeItem: (id: number) => void;
  clearCart: () => void;
}

function CartContent({ items, total, count, loading, updateItem, removeItem, clearCart }: CartContentProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <ShoppingCart className="w-16 h-16 text-text-muted mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Корзина пуста</h2>
        <p className="text-text-secondary mb-6">Добавьте товары из каталога</p>
        <Link
          to="/catalog"
          className="inline-block bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          Перейти в каталог
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Товары ({count})</h2>
        <button
          onClick={() => clearCart()}
          className="text-text-secondary hover:text-danger text-sm transition-colors"
        >
          Очистить корзину
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <AnimatePresence>
            {items.map(item => {
              const product = item.product;
              const config = item.configuration;
              const name = product?.name || config?.name || 'Товар';
              const image = product?.main_image;
              const price = item.item_total || '0';

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0 }}
                  className="bg-bg-card shadow-sm border border-border rounded-xl p-3 sm:p-4 flex gap-3 sm:gap-4"
                >
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-bg-secondary rounded-lg flex-shrink-0 overflow-hidden">
                    {image && <img src={image} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      to={product ? `/product/${product.slug}` : '#'}
                      className="font-medium hover:text-primary transition-colors line-clamp-2 text-sm sm:text-base"
                    >
                      {name}
                    </Link>
                    {item.with_assembly && (
                      <span className="text-accent text-xs mt-1 block">+ Сборка</span>
                    )}
                    <div className="flex items-center gap-3 mt-3">
                      <div className="flex items-center bg-bg-card-hover rounded-lg">
                        <button
                          onClick={() => updateItem(item.id, Math.max(1, item.quantity - 1))}
                          className="p-2 hover:text-primary transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="px-3 min-w-[2rem] text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateItem(item.id, item.quantity + 1)}
                          className="p-2 hover:text-primary transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-text-muted hover:text-danger transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-sm sm:text-lg whitespace-nowrap">{parseFloat(price).toLocaleString()} с.</p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Order Summary */}
        <div>
          <div className="bg-bg-card shadow-md border border-border rounded-xl p-6 sticky top-20">
            <h3 className="font-bold text-lg mb-4">Итого</h3>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-text-secondary">
                <span>Товары ({count})</span>
                <span>{total.toLocaleString()} сом.</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>Доставка</span>
                <span>По договорённости</span>
              </div>
              <div className="border-t border-border pt-3 flex justify-between text-lg font-bold">
                <span>К оплате</span>
                <span className="text-primary">{total.toLocaleString()} сом.</span>
              </div>
            </div>
            <Link
              to="/checkout"
              className="block w-full bg-primary hover:bg-primary-dark text-white py-3 rounded-lg font-semibold text-center transition-colors"
            >
              Оформить заказ
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

/* ====================================================================
   Orders Tab
   ==================================================================== */

function OrdersContent({
  orders,
  loading,
  isAuthenticated,
}: {
  orders: Order[];
  loading: boolean;
  isAuthenticated: boolean;
}) {
  if (!isAuthenticated) {
    return (
      <div className="text-center py-20">
        <Package className="w-16 h-16 text-text-muted mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Войдите в аккаунт</h2>
        <p className="text-text-secondary mb-6">Чтобы видеть историю заказов, нужно авторизоваться</p>
        <Link
          to="/login"
          className="inline-block bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          Войти
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-20">
        <Package className="w-16 h-16 text-text-muted mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Нет заказов</h2>
        <p className="text-text-secondary mb-6">Вы ещё не оформляли заказы</p>
        <Link
          to="/catalog"
          className="inline-block bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          Перейти в каталог
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold mb-2">История заказов ({orders.length})</h2>
      {orders.map((order, i) => {
        const st = STATUS_MAP[order.status] || { label: order.status_display || order.status, color: '' };
        const date = new Date(order.created_at);
        const totalPrice = parseFloat(order.total_price);

        return (
          <motion.div
            key={order.id || order.order_number}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link
              to={`/track/${order.order_number}`}
              className="block bg-bg-card shadow-sm border border-border rounded-xl p-5 hover:border-primary/40 hover:shadow-md transition-all group"
            >
              <div className="flex items-start sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 sm:gap-3 mb-1 flex-wrap">
                    <p className="font-bold text-sm sm:text-base">{order.order_number}</p>
                    <span className={`text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1 rounded-full font-medium ${st.color}`}>
                      {st.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-text-muted">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      {date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                    </span>
                    {order.items_count > 0 && (
                      <span>{order.items_count} шт.</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                  <p className="font-bold text-sm sm:text-lg whitespace-nowrap">
                    {totalPrice.toLocaleString()} <span className="text-text-muted text-xs sm:text-sm font-normal">с.</span>
                  </p>
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-text-muted group-hover:text-primary transition-colors" />
                </div>
              </div>

              {/* Order items preview */}
              {order.items && order.items.length > 0 && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-border overflow-x-auto">
                  {order.items.slice(0, 5).map((item, idx) => (
                    <div
                      key={idx}
                      className="w-10 h-10 bg-bg-secondary rounded-lg flex-shrink-0 overflow-hidden"
                    >
                      {item.product_detail?.main_image ? (
                        <img src={item.product_detail.main_image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-text-muted">
                          <Eye className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  ))}
                  {order.items.length > 5 && (
                    <div className="w-10 h-10 bg-bg-secondary rounded-lg flex-shrink-0 flex items-center justify-center text-xs text-text-muted font-medium">
                      +{order.items.length - 5}
                    </div>
                  )}
                </div>
              )}
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ====================================================================
   Stats Tab
   ==================================================================== */

function StatsContent({
  orders,
  loading,
  isAuthenticated,
}: {
  orders: Order[];
  loading: boolean;
  isAuthenticated: boolean;
}) {
  const stats = useMemo(() => {
    if (!orders.length) return null;

    const totalSpent = orders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + parseFloat(o.total_price), 0);

    const completedOrders = orders.filter(o => o.status === 'completed');
    const activeOrders = orders.filter(o => !['completed', 'cancelled'].includes(o.status));
    const cancelledOrders = orders.filter(o => o.status === 'cancelled');

    const avgOrderValue = orders.length > 0
      ? totalSpent / orders.filter(o => o.status !== 'cancelled').length
      : 0;

    // Monthly spending (last 6 months)
    const monthlySpending: { month: string; amount: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = d.toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' });
      const amount = orders
        .filter(o => {
          if (o.status === 'cancelled') return false;
          const oDate = new Date(o.created_at);
          return oDate.getFullYear() === d.getFullYear() && oDate.getMonth() === d.getMonth();
        })
        .reduce((sum, o) => sum + parseFloat(o.total_price), 0);
      monthlySpending.push({ month: monthLabel, amount });
    }

    const maxMonthly = Math.max(...monthlySpending.map(m => m.amount), 1);

    // Status breakdown
    const statusBreakdown = [
      { key: 'completed', label: 'Выполнен', count: completedOrders.length, color: 'bg-success' },
      { key: 'active', label: 'Активные', count: activeOrders.length, color: 'bg-primary' },
      { key: 'cancelled', label: 'Отменены', count: cancelledOrders.length, color: 'bg-danger' },
    ].filter(s => s.count > 0);

    return {
      totalSpent,
      totalOrders: orders.length,
      completedCount: completedOrders.length,
      activeCount: activeOrders.length,
      cancelledCount: cancelledOrders.length,
      avgOrderValue,
      monthlySpending,
      maxMonthly,
      statusBreakdown,
    };
  }, [orders]);

  if (!isAuthenticated) {
    return (
      <div className="text-center py-20">
        <BarChart3 className="w-16 h-16 text-text-muted mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Войдите в аккаунт</h2>
        <p className="text-text-secondary mb-6">Чтобы видеть статистику, нужно авторизоваться</p>
        <Link
          to="/login"
          className="inline-block bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          Войти
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-20">
        <BarChart3 className="w-16 h-16 text-text-muted mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Нет данных</h2>
        <p className="text-text-secondary">Статистика появится после первого заказа</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={DollarSign}
          label="Всего потрачено"
          value={`${stats.totalSpent.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} сом.`}
          color="text-primary bg-primary/10"
          delay={0}
        />
        <StatCard
          icon={Package}
          label="Всего заказов"
          value={String(stats.totalOrders)}
          color="text-accent bg-accent/10"
          delay={0.1}
        />
        <StatCard
          icon={TrendingUp}
          label="Средний чек"
          value={`${stats.avgOrderValue.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} сом.`}
          color="text-success bg-success/10"
          delay={0.2}
        />
        <StatCard
          icon={CalendarDays}
          label="Активные заказы"
          value={String(stats.activeCount)}
          color="text-warning bg-warning/10"
          delay={0.3}
        />
      </div>

      {/* Monthly chart */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-bg-card shadow-sm border border-border rounded-xl p-6"
      >
        <h3 className="font-bold text-lg mb-6">Расходы по месяцам</h3>
        <div className="flex items-end gap-3 h-48">
          {stats.monthlySpending.map((m, i) => {
            const heightPct = stats.maxMonthly > 0 ? (m.amount / stats.maxMonthly) * 100 : 0;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-xs text-text-muted font-medium">
                  {m.amount > 0 ? `${(m.amount / 1000).toFixed(m.amount >= 10000 ? 0 : 1)}к` : '—'}
                </span>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(heightPct, 2)}%` }}
                  transition={{ delay: 0.3 + i * 0.08, duration: 0.5, ease: 'easeOut' }}
                  className={`w-full rounded-t-lg ${
                    m.amount > 0
                      ? 'bg-gradient-to-t from-primary to-primary-light'
                      : 'bg-border'
                  }`}
                />
                <span className="text-xs text-text-muted">{m.month}</span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Status breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="bg-bg-card shadow-sm border border-border rounded-xl p-6"
      >
        <h3 className="font-bold text-lg mb-4">Статусы заказов</h3>
        <div className="space-y-3">
          {stats.statusBreakdown.map(s => {
            const pct = stats.totalOrders > 0 ? (s.count / stats.totalOrders) * 100 : 0;
            return (
              <div key={s.key}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-text-secondary">{s.label}</span>
                  <span className="font-medium">{s.count} ({pct.toFixed(0)}%)</span>
                </div>
                <div className="h-2 bg-bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ delay: 0.5, duration: 0.6 }}
                    className={`h-full rounded-full ${s.color}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

/* ====================================================================
   Stat Card
   ==================================================================== */

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  delay,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-bg-card shadow-sm border border-border rounded-xl p-5"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-lg sm:text-2xl font-bold truncate">{value}</p>
      <p className="text-xs sm:text-sm text-text-muted mt-0.5">{label}</p>
    </motion.div>
  );
}
