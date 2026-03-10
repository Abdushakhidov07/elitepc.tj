import { useEffect, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  TrendingUp, ShoppingCart, DollarSign, XCircle, AlertTriangle,
  Package, Truck, BarChart2,
} from 'lucide-react';
import { adminApi } from '../../api';
import type { AnalyticsReport } from '../../types/admin';

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  new: 'Новый', confirmed: 'Подтверждён', paid: 'Оплачен',
  assembling: 'Собирается', shipping: 'Доставляется',
  completed: 'Выполнен', cancelled: 'Отменён',
};
const STATUS_COLORS: Record<string, string> = {
  new: '#0066FF', confirmed: '#FFB300', paid: '#00C853',
  assembling: '#00D4FF', shipping: '#A855F7',
  completed: '#10B981', cancelled: '#FF1744',
};
const DELIVERY_LABELS: Record<string, string> = { pickup: 'Самовывоз', delivery: 'Доставка' };

type Period = 'today' | 'week' | 'month' | 'year' | 'custom';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: 'Сегодня' },
  { key: 'week',  label: 'Неделя' },
  { key: 'month', label: 'Месяц' },
  { key: 'year',  label: 'Год' },
  { key: 'custom', label: 'Период' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) { return n.toLocaleString('ru-RU'); }
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

// ── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({
  icon, label, value, sub, color, negative,
}: {
  icon: React.ReactNode; label: string; value: string | number;
  sub?: string; color: string; negative?: boolean;
}) {
  return (
    <div className="bg-bg-card shadow-sm rounded-xl p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-text-muted text-xs mb-0.5">{label}</p>
        <p className={`text-xl font-bold ${negative ? 'text-danger' : ''}`}>{value}</p>
        {sub && <p className="text-xs text-text-muted mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
      {children}
    </h2>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = (p: Period, cs = customStart, ce = customEnd) => {
    setLoading(true);
    setError('');
    adminApi.getAnalyticsReport(p, cs, ce)
      .then(setReport)
      .catch((e) => setError(e.response?.data?.detail || 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load('month'); }, []);

  const handlePeriod = (p: Period) => {
    setPeriod(p);
    if (p !== 'custom') load(p);
  };

  const handleCustomApply = () => {
    if (!customStart || !customEnd) return;
    load('custom', customStart, customEnd);
  };

  // ── Derived data ────────────────────────────────────────────────────────
  const pieData = report
    ? Object.entries(report.status_distribution).map(([status, count]) => ({
        name: STATUS_LABELS[status] || status,
        value: count,
        color: STATUS_COLORS[status] || '#94a3b8',
      }))
    : [];

  const deliveryRows = report
    ? Object.entries(report.delivery_breakdown).map(([key, v]) => ({
        name: DELIVERY_LABELS[key] || key,
        count: v.count,
        revenue: v.revenue,
      }))
    : [];

  return (
    <div className="space-y-6">
      {/* Header + period selector */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart2 className="w-6 h-6 text-primary" />
          Аналитика доходов
        </h1>

        <div className="flex flex-wrap items-center gap-2">
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => handlePeriod(p.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                period === p.key
                  ? 'bg-primary text-white'
                  : 'bg-bg-secondary border border-border text-text-secondary hover:border-primary'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom date range */}
      {period === 'custom' && (
        <div className="flex flex-wrap items-center gap-3 bg-bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-text-muted">С</label>
            <input
              type="date"
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
              className="bg-bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-text-muted">По</label>
            <input
              type="date"
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
              className="bg-bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <button
            onClick={handleCustomApply}
            disabled={!customStart || !customEnd}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            Применить
          </button>
        </div>
      )}

      {/* Loading / Error */}
      {loading && (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && !loading && (
        <div className="bg-danger/10 border border-danger/30 text-danger rounded-xl p-4 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && report && (
        <>
          {/* Period label */}
          <p className="text-xs text-text-muted">
            Период: {fmtDate(report.period.start)} — {fmtDate(report.period.end)}
            {' '}({report.period.days} {report.period.days === 1 ? 'день' : 'дней'})
          </p>

          {/* ── Summary cards ─────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              icon={<DollarSign className="w-5 h-5" />}
              label="Выручка"
              value={`${fmt(Math.round(report.summary.revenue_total))} с.`}
              sub={`${report.summary.revenue_orders_count} оплач. заказов`}
              color="text-primary bg-primary/10"
            />
            <MetricCard
              icon={<ShoppingCart className="w-5 h-5" />}
              label="Всего заказов"
              value={report.summary.total_orders}
              sub={`Средний чек: ${fmt(Math.round(report.summary.avg_order_value))} с.`}
              color="text-accent bg-accent/10"
            />
            <MetricCard
              icon={<XCircle className="w-5 h-5" />}
              label="Отменено"
              value={report.summary.cancelled_count}
              sub={`Ставка: ${report.summary.cancellation_rate}%`}
              color="text-danger bg-danger/10"
            />
            <MetricCard
              icon={<TrendingUp className="w-5 h-5" />}
              label="Потери от отмен"
              value={`${fmt(Math.round(report.summary.cancelled_revenue_lost))} с.`}
              sub="Сумма отменённых заказов"
              color="text-warning bg-warning/10"
              negative={report.summary.cancelled_revenue_lost > 0}
            />
          </div>

          {/* ── Revenue & Orders charts ────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Revenue area chart */}
            <div className="lg:col-span-3 bg-bg-card shadow-sm rounded-xl p-5">
              <SectionTitle>
                <DollarSign className="w-4 h-4 text-primary" />
                Динамика выручки
              </SectionTitle>
              <ResponsiveContainer width="100%" height={280} className="mt-4">
                <AreaChart data={report.daily_breakdown}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0066FF" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0066FF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="date"
                    stroke="#6b7280"
                    tick={{ fontSize: 10 }}
                    tickFormatter={v => v.slice(5)}
                    interval={report.period.days > 30 ? Math.floor(report.period.days / 12) : 'preserveStartEnd'}
                  />
                  <YAxis stroke="#6b7280" tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }}
                    labelFormatter={v => `Дата: ${v}`}
                    formatter={(value: number) => [`${fmt(Math.round(value))} с.`, 'Выручка']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#0066FF" strokeWidth={2} fill="url(#revGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Orders bar chart */}
            <div className="lg:col-span-2 bg-bg-card shadow-sm rounded-xl p-5">
              <SectionTitle>
                <ShoppingCart className="w-4 h-4 text-accent" />
                Заказы и отмены
              </SectionTitle>
              <ResponsiveContainer width="100%" height={280} className="mt-4">
                <BarChart data={report.daily_breakdown} barSize={report.period.days > 30 ? 3 : 8}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="date"
                    stroke="#6b7280"
                    tick={{ fontSize: 10 }}
                    tickFormatter={v => v.slice(5)}
                    interval={report.period.days > 30 ? Math.floor(report.period.days / 10) : 'preserveStartEnd'}
                  />
                  <YAxis stroke="#6b7280" tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }}
                    labelFormatter={v => `Дата: ${v}`}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="orders" name="Заказов" fill="#0066FF" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="cancelled" name="Отменено" fill="#FF1744" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Status pie + Delivery breakdown ───────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status pie */}
            <div className="bg-bg-card shadow-sm rounded-xl p-5">
              <SectionTitle>Распределение по статусам</SectionTitle>
              {pieData.length > 0 ? (
                <div className="flex items-center gap-4 mt-4">
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={2}>
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-1.5">
                    {pieData.map(item => (
                      <div key={item.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: item.color }} />
                          <span className="text-text-secondary text-xs">{item.name}</span>
                        </div>
                        <span className="font-semibold text-xs">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-text-muted text-sm text-center py-10">Нет данных</p>
              )}
            </div>

            {/* Delivery breakdown */}
            <div className="bg-bg-card shadow-sm rounded-xl p-5">
              <SectionTitle>
                <Truck className="w-4 h-4 text-text-muted" />
                Способ доставки (выручка)
              </SectionTitle>
              {deliveryRows.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {deliveryRows.map(row => {
                    const totalRevenue = deliveryRows.reduce((s, r) => s + r.revenue, 0);
                    const pct = totalRevenue > 0 ? Math.round(row.revenue / totalRevenue * 100) : 0;
                    return (
                      <div key={row.name}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-medium">{row.name}</span>
                          <div className="text-right">
                            <span className="font-bold">{fmt(Math.round(row.revenue))} с.</span>
                            <span className="text-text-muted ml-2 text-xs">({row.count} заказов)</span>
                          </div>
                        </div>
                        <div className="h-2 bg-bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="text-xs text-text-muted text-right mt-0.5">{pct}%</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-text-muted text-sm text-center py-10">Нет оплаченных заказов</p>
              )}
            </div>
          </div>

          {/* ── Top products ──────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By revenue */}
            <div className="bg-bg-card shadow-sm rounded-xl overflow-hidden">
              <div className="p-4 border-b border-border flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                <SectionTitle>Топ-10 по выручке</SectionTitle>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-text-muted text-xs border-b border-border bg-bg-secondary">
                      <th className="text-left px-4 py-2">#</th>
                      <th className="text-left px-4 py-2">Товар</th>
                      <th className="text-center px-4 py-2">Кол-во</th>
                      <th className="text-right px-4 py-2">Выручка</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.top_by_revenue.length === 0 ? (
                      <tr><td colSpan={4} className="text-center py-8 text-text-muted">Нет данных</td></tr>
                    ) : (
                      report.top_by_revenue.map((p, i) => (
                        <tr key={p.id} className="border-b border-border/50 hover:bg-bg-card-hover">
                          <td className="px-4 py-2.5 text-text-muted text-xs">{i + 1}</td>
                          <td className="px-4 py-2.5">
                            <div className="font-medium text-xs leading-tight">{p.name}</div>
                            <div className="text-text-muted text-xs font-mono">{p.sku}</div>
                          </td>
                          <td className="px-4 py-2.5 text-center text-sm">{p.quantity_sold}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-sm">{fmt(Math.round(p.revenue))} с.</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* By quantity */}
            <div className="bg-bg-card shadow-sm rounded-xl overflow-hidden">
              <div className="p-4 border-b border-border flex items-center gap-2">
                <Package className="w-4 h-4 text-accent" />
                <SectionTitle>Топ-10 по количеству продаж</SectionTitle>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-text-muted text-xs border-b border-border bg-bg-secondary">
                      <th className="text-left px-4 py-2">#</th>
                      <th className="text-left px-4 py-2">Товар</th>
                      <th className="text-center px-4 py-2">Продано</th>
                      <th className="text-right px-4 py-2">Выручка</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.top_by_quantity.length === 0 ? (
                      <tr><td colSpan={4} className="text-center py-8 text-text-muted">Нет данных</td></tr>
                    ) : (
                      report.top_by_quantity.map((p, i) => (
                        <tr key={p.id} className="border-b border-border/50 hover:bg-bg-card-hover">
                          <td className="px-4 py-2.5 text-text-muted text-xs">{i + 1}</td>
                          <td className="px-4 py-2.5">
                            <div className="font-medium text-xs leading-tight">{p.name}</div>
                            <div className="text-text-muted text-xs font-mono">{p.sku}</div>
                          </td>
                          <td className="px-4 py-2.5 text-center font-bold text-primary">{p.quantity_sold}</td>
                          <td className="px-4 py-2.5 text-right text-sm">{fmt(Math.round(p.revenue))} с.</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ── Cancellations section ─────────────────────────────────── */}
          <div className="bg-bg-card shadow-sm rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-danger" />
                <SectionTitle>Отменённые заказы</SectionTitle>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="text-right">
                  <div className="text-text-muted text-xs">Ставка отмен</div>
                  <div className="font-bold text-danger">{report.summary.cancellation_rate}%</div>
                </div>
                <div className="text-right">
                  <div className="text-text-muted text-xs">Потери</div>
                  <div className="font-bold text-danger">{fmt(Math.round(report.summary.cancelled_revenue_lost))} с.</div>
                </div>
                <div className="text-right">
                  <div className="text-text-muted text-xs">Отменено</div>
                  <div className="font-bold">{report.summary.cancelled_count}</div>
                </div>
              </div>
            </div>

            {report.recent_cancelled.length === 0 ? (
              <p className="text-text-muted text-sm text-center py-8">
                Нет отменённых заказов за период
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-text-muted text-xs border-b border-border bg-bg-secondary">
                      <th className="text-left px-4 py-2">Номер</th>
                      <th className="text-left px-4 py-2">Клиент</th>
                      <th className="text-left px-4 py-2">Телефон</th>
                      <th className="text-left px-4 py-2">Доставка</th>
                      <th className="text-right px-4 py-2">Сумма</th>
                      <th className="text-left px-4 py-2">Дата</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.recent_cancelled.map(order => (
                      <tr key={order.id} className="border-b border-border/50 hover:bg-bg-card-hover">
                        <td className="px-4 py-2.5 font-medium text-danger">{order.order_number}</td>
                        <td className="px-4 py-2.5">{order.customer_name}</td>
                        <td className="px-4 py-2.5 text-text-secondary">{order.customer_phone}</td>
                        <td className="px-4 py-2.5 text-text-secondary text-xs">
                          {DELIVERY_LABELS[order.delivery_method] || order.delivery_method}
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium">
                          {fmt(Math.round(parseFloat(order.total_price)))} с.
                        </td>
                        <td className="px-4 py-2.5 text-text-muted text-xs">
                          {new Date(order.created_at).toLocaleDateString('ru-RU')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
