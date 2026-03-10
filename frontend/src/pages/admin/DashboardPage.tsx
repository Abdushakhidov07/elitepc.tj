import { useEffect, useState } from 'react';
import { ShoppingCart, DollarSign, Users, Package, AlertTriangle, Clock } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { adminApi } from '../../api';
import { useAuthStore } from '../../store/authStore';
import type { DashboardData, ManagerDashboardData } from '../../types/admin';

const STATUS_LABELS: Record<string, string> = {
  new: 'Новый',
  confirmed: 'Подтверждён',
  paid: 'Оплачен',
  assembling: 'Собирается',
  shipping: 'Доставляется',
  completed: 'Выполнен',
  cancelled: 'Отменён',
};

const STATUS_COLORS: Record<string, string> = {
  new: '#0066FF',
  confirmed: '#FFB300',
  paid: '#00C853',
  assembling: '#00D4FF',
  shipping: '#A855F7',
  completed: '#10B981',
  cancelled: '#FF1744',
};

const PIE_COLORS = ['#0066FF', '#FFB300', '#00C853', '#00D4FF', '#A855F7', '#10B981', '#FF1744'];

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-bg-card shadow-sm rounded-xl p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-text-muted text-xs">{label}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    </div>
  );
}

function StatusPieChart({ statusDist }: { statusDist: Record<string, number> }) {
  const pieData = Object.entries(statusDist).map(([status, count]) => ({
    name: STATUS_LABELS[status] || status,
    value: count,
    color: STATUS_COLORS[status] || '#94a3b8',
  }));

  if (pieData.length === 0) {
    return <p className="text-text-muted text-sm text-center py-10">Нет данных</p>;
  }

  return (
    <>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
            {pieData.map((entry, i) => (
              <Cell key={i} fill={entry.color || PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, color: '#1e293b' }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-1 mt-2">
        {pieData.map(item => (
          <div key={item.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm" style={{ background: item.color }} />
              <span className="text-text-secondary">{item.name}</span>
            </div>
            <span className="font-medium">{item.value}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function LowStockPanel({ products }: { products: { id: number; name: string; sku: string; stock_quantity: number }[] }) {
  return (
    <div className="bg-bg-card shadow-sm rounded-xl overflow-hidden">
      <div className="p-4 border-b border-border flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-warning" />
        <h3 className="font-bold">Низкий остаток</h3>
      </div>
      {products.length > 0 ? (
        <div className="divide-y divide-border/50">
          {products.map(p => (
            <div key={p.id} className="px-4 py-3 flex items-center justify-between hover:bg-bg-card-hover">
              <div>
                <p className="text-sm font-medium">{p.name}</p>
                <p className="text-text-muted text-xs">{p.sku}</p>
              </div>
              <span className={`text-sm font-bold ${p.stock_quantity <= 2 ? 'text-danger' : 'text-warning'}`}>
                {p.stock_quantity} шт.
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-text-muted text-sm text-center py-10">Все товары в достаточном количестве</p>
      )}
    </div>
  );
}

// ── Full Admin Dashboard (superuser) ────────────────────────────────────────

function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getDashboard()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return <p className="text-text-secondary">Ошибка загрузки данных</p>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<ShoppingCart className="w-6 h-6" />} label="Заказов сегодня" value={data.orders_today} color="text-primary bg-primary/10" />
        <StatCard icon={<DollarSign className="w-6 h-6" />} label="Выручка сегодня" value={`${data.revenue_today.toLocaleString()} с.`} color="text-accent bg-accent/10" />
        <StatCard icon={<Users className="w-6 h-6" />} label="Новых клиентов" value={data.new_customers} color="text-success bg-success/10" />
        <StatCard icon={<Package className="w-6 h-6" />} label="Товаров на складе" value={data.total_products} color="text-warning bg-warning/10" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-bg-card shadow-sm rounded-xl p-5">
          <h3 className="font-bold mb-4">
            Продажи за 30 дней
            <span className="text-xs text-text-muted font-normal ml-2">(оплаченные заказы)</span>
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.daily_sales}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0066FF" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0066FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, color: '#1e293b' }}
                labelFormatter={v => `Дата: ${v}`}
                formatter={(value: number | undefined) => [`${(value ?? 0).toLocaleString()} сом.`, 'Выручка']}
              />
              <Area type="monotone" dataKey="revenue" stroke="#0066FF" strokeWidth={2} fill="url(#colorRevenue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-bg-card shadow-sm rounded-xl p-5">
          <h3 className="font-bold mb-4">Статусы заказов</h3>
          <StatusPieChart statusDist={data.status_distribution} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-bg-card shadow-sm rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-bold">Последние заказы</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-text-muted text-xs border-b border-border">
                  <th className="text-left px-4 py-2">Номер</th>
                  <th className="text-left px-4 py-2">Клиент</th>
                  <th className="text-right px-4 py-2">Сумма</th>
                  <th className="text-center px-4 py-2">Статус</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_orders.map(order => (
                  <tr key={order.id} className="border-b border-border/50 hover:bg-bg-card-hover">
                    <td className="px-4 py-2.5 font-medium">{order.order_number}</td>
                    <td className="px-4 py-2.5 text-text-secondary">{order.customer_name}</td>
                    <td className="px-4 py-2.5 text-right">{parseFloat(order.total_price).toLocaleString()} с.</td>
                    <td className="px-4 py-2.5 text-center">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ color: STATUS_COLORS[order.status], background: `${STATUS_COLORS[order.status]}20` }}
                      >
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <LowStockPanel products={data.low_stock_products} />
      </div>
    </div>
  );
}

// ── Manager Dashboard (is_staff, not superuser) ──────────────────────────────

function ManagerDashboard() {
  const [data, setData] = useState<ManagerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getManagerDashboard()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return <p className="text-text-secondary">Ошибка загрузки данных</p>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={<ShoppingCart className="w-6 h-6" />} label="Заказов сегодня" value={data.orders_today} color="text-primary bg-primary/10" />
        <StatCard icon={<Clock className="w-6 h-6" />} label="Новых заказов" value={data.orders_new} color="text-accent bg-accent/10" />
        <StatCard icon={<Package className="w-6 h-6" />} label="Товаров на складе" value={data.total_products} color="text-warning bg-warning/10" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-bg-card shadow-sm rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-bold">Последние заказы</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-text-muted text-xs border-b border-border">
                  <th className="text-left px-4 py-2">Номер</th>
                  <th className="text-left px-4 py-2">Клиент</th>
                  <th className="text-left px-4 py-2">Телефон</th>
                  <th className="text-center px-4 py-2">Статус</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_orders.map(order => (
                  <tr key={order.id} className="border-b border-border/50 hover:bg-bg-card-hover">
                    <td className="px-4 py-2.5 font-medium">{order.order_number}</td>
                    <td className="px-4 py-2.5 text-text-secondary">{order.customer_name}</td>
                    <td className="px-4 py-2.5 text-text-secondary">{order.customer_phone}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ color: STATUS_COLORS[order.status], background: `${STATUS_COLORS[order.status]}20` }}
                      >
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-bg-card shadow-sm rounded-xl p-5">
          <h3 className="font-bold mb-4">Статусы заказов</h3>
          <StatusPieChart statusDist={data.status_distribution} />
        </div>
      </div>

      <LowStockPanel products={data.low_stock_products} />
    </div>
  );
}

// ── Entry point ──────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const user = useAuthStore(s => s.user);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Дашборд</h1>
        {user?.is_superuser && (
          <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-medium">
            Полный доступ
          </span>
        )}
      </div>

      {user?.is_superuser ? <AdminDashboard /> : <ManagerDashboard />}
    </div>
  );
}
