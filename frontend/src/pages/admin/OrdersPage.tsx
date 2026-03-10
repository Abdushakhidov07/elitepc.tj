import { useEffect, useState } from 'react';
import { Search, ChevronDown, X, Package, User, Phone, Mail, MapPin, Truck, MessageSquare, Clock, ChevronRight } from 'lucide-react';
import { adminApi } from '../../api';
import { toast } from '../../components/ui/Toast';
import type { AdminOrder, AdminOrderDetail } from '../../types/admin';

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

const ALL_STATUS_KEYS = ['new', 'confirmed', 'paid', 'assembling', 'shipping', 'completed', 'cancelled'];
const ALL_STATUSES = ['', ...ALL_STATUS_KEYS];

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] || '#888';
  return (
    <span
      className="text-xs px-2.5 py-1 rounded-full font-medium"
      style={{ color, background: `${color}20` }}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}

// ── Order Detail Drawer ──────────────────────────────────────────────────────

interface DrawerProps {
  orderId: number;
  onClose: () => void;
  onStatusChanged: () => void;
}

function OrderDetailDrawer({ orderId, onClose, onStatusChanged }: DrawerProps) {
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [changingStatus, setChangingStatus] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  useEffect(() => {
    setLoading(true);
    adminApi.getAdminOrderDetail(orderId)
      .then(setOrder)
      .catch(() => toast.error('Не удалось загрузить заказ'))
      .finally(() => setLoading(false));
  }, [orderId]);

  const changeStatus = async (newStatus: string) => {
    if (!order) return;
    setChangingStatus(true);
    setShowStatusMenu(false);
    try {
      await adminApi.updateOrderStatus(order.id, { status: newStatus });
      toast.success(`Статус изменён на "${STATUS_LABELS[newStatus]}"`);
      const updated = await adminApi.getAdminOrderDetail(orderId);
      setOrder(updated);
      onStatusChanged();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Ошибка смены статуса');
    } finally {
      setChangingStatus(false);
    }
  };

  const transitions = order
    ? ALL_STATUS_KEYS.filter(s => s !== order.status)
    : [];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-bg-card border-l border-border z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-lg font-bold">
              {loading ? 'Загрузка...' : order?.order_number}
            </h2>
            {order && (
              <p className="text-xs text-text-muted mt-0.5">
                {new Date(order.created_at).toLocaleString('ru-RU')}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-bg-secondary rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !order ? (
          <div className="flex-1 flex items-center justify-center text-text-muted">
            Заказ не найден
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Status + actions */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-4">
              <StatusBadge status={order.status} />
              <div className="relative">
                <button
                  disabled={changingStatus || transitions.length === 0}
                  onClick={() => setShowStatusMenu(v => !v)}
                  className="flex items-center gap-2 text-sm bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  Изменить статус <ChevronDown className="w-4 h-4" />
                </button>
                {showStatusMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-bg-card border border-border rounded-lg shadow-xl z-10 min-w-[180px]">
                    {transitions.map(s => (
                      <button
                        key={s}
                        onClick={() => changeStatus(s)}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-bg-card-hover transition-colors first:rounded-t-lg last:rounded-b-lg flex items-center gap-2"
                        style={{ color: STATUS_COLORS[s] }}
                      >
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: STATUS_COLORS[s] }} />
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Customer info */}
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">Клиент</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-text-muted shrink-0" />
                  <span className="text-sm font-medium">{order.customer_name}</span>
                  {order.is_guest_order && (
                    <span className="text-xs bg-bg-secondary text-text-muted px-2 py-0.5 rounded-full">Гость</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-text-muted shrink-0" />
                  <a href={`tel:${order.customer_phone}`} className="text-sm text-primary hover:underline">
                    {order.customer_phone}
                  </a>
                </div>
                {order.customer_email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-text-muted shrink-0" />
                    <span className="text-sm">{order.customer_email}</span>
                  </div>
                )}
                {(order.customer_city || order.customer_address) && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
                    <span className="text-sm">
                      {[order.customer_city, order.customer_address].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Delivery & comment */}
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">Доставка</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Truck className="w-4 h-4 text-text-muted shrink-0" />
                  <span className="text-sm">{order.delivery_method_display}</span>
                </div>
                {order.comment && (
                  <div className="flex items-start gap-3">
                    <MessageSquare className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
                    <span className="text-sm text-text-secondary">{order.comment}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Items */}
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">
                Товары ({order.items.length})
              </h3>
              <div className="space-y-3">
                {order.items.map(item => (
                  <div key={item.id} className="flex items-center gap-3 bg-bg-secondary rounded-lg p-3">
                    {item.product_image ? (
                      <img
                        src={item.product_image}
                        alt={item.product_name || ''}
                        className="w-12 h-12 rounded object-contain bg-white p-1 shrink-0"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-bg-card flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5 text-text-muted" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {item.product_name || item.configuration_name || 'Товар удалён'}
                      </p>
                      {item.product_sku && (
                        <p className="text-xs text-text-muted font-mono">{item.product_sku}</p>
                      )}
                      {item.is_assembled && (
                        <p className="text-xs text-primary">
                          Со сборкой (+{parseFloat(item.assembly_fee).toLocaleString()} с.)
                        </p>
                      )}
                      <p className="text-xs text-text-muted mt-0.5">
                        {parseFloat(item.price_at_purchase).toLocaleString()} с. × {item.quantity}
                      </p>
                    </div>
                    <div className="text-sm font-semibold shrink-0">
                      {parseFloat(item.line_total).toLocaleString()} с.
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="mt-4 space-y-1.5">
                {parseFloat(order.discount_amount) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Скидка</span>
                    <span className="text-green-400">-{parseFloat(order.discount_amount).toLocaleString()} с.</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold pt-2 border-t border-border">
                  <span>Итого</span>
                  <span>{parseFloat(order.total_price).toLocaleString()} с.</span>
                </div>
              </div>
            </div>

            {/* Status history */}
            {order.status_history.length > 0 && (
              <div className="px-6 py-4">
                <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">
                  История статусов
                </h3>
                <div className="space-y-3">
                  {order.status_history.map(h => (
                    <div key={h.id} className="flex items-start gap-3">
                      <Clock className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusBadge status={h.old_status} />
                          <ChevronRight className="w-3 h-3 text-text-muted" />
                          <StatusBadge status={h.new_status} />
                          {h.changed_by_name && (
                            <span className="text-xs text-text-muted">— {h.changed_by_name}</span>
                          )}
                        </div>
                        {h.comment && (
                          <p className="text-xs text-text-secondary mt-0.5">{h.comment}</p>
                        )}
                        <p className="text-xs text-text-muted mt-0.5">
                          {new Date(h.created_at).toLocaleString('ru-RU')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  const fetchOrders = () => {
    setLoading(true);
    const params: { status?: string; search?: string } = {};
    if (statusFilter) params.status = statusFilter;
    if (searchQuery.trim()) params.search = searchQuery.trim();
    adminApi.getAdminOrders(params)
      .then(setOrders)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrders(); }, [statusFilter]);

  useEffect(() => {
    const t = setTimeout(fetchOrders, 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const changeStatus = async (orderId: number, newStatus: string) => {
    try {
      await adminApi.updateOrderStatus(orderId, { status: newStatus });
      toast.success(`Статус изменён на "${STATUS_LABELS[newStatus]}"`);
      setOpenDropdown(null);
      fetchOrders();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Ошибка смены статуса');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Заказы</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Поиск по номеру, имени, телефону..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-bg-secondary border border-border rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
        >
          {ALL_STATUSES.map(s => (
            <option key={s} value={s}>{s ? STATUS_LABELS[s] : 'Все статусы'}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-bg-card shadow-sm rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-text-muted text-xs border-b border-border bg-bg-secondary">
                <th className="text-left px-4 py-3">Номер</th>
                <th className="text-left px-4 py-3">Клиент</th>
                <th className="text-left px-4 py-3">Телефон</th>
                <th className="text-center px-4 py-3">Товаров</th>
                <th className="text-right px-4 py-3">Сумма</th>
                <th className="text-center px-4 py-3">Статус</th>
                <th className="text-left px-4 py-3">Дата</th>
                <th className="text-center px-4 py-3">Действия</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-10">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-text-muted">Заказов не найдено</td>
                </tr>
              ) : (
                orders.map(order => {
                  const transitions = ALL_STATUS_KEYS.filter(s => s !== order.status);
                  return (
                    <tr
                      key={order.id}
                      className="border-b border-border/50 hover:bg-bg-card-hover cursor-pointer"
                      onClick={() => setSelectedOrderId(order.id)}
                    >
                      <td className="px-4 py-3 font-medium text-primary">{order.order_number}</td>
                      <td className="px-4 py-3">
                        <div>{order.customer_name}</div>
                        {order.is_guest_order && <span className="text-text-muted text-xs">Гость</span>}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">{order.customer_phone}</td>
                      <td className="px-4 py-3 text-center">{order.items_count}</td>
                      <td className="px-4 py-3 text-right font-medium">{parseFloat(order.total_price).toLocaleString()} с.</td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-4 py-3 text-text-secondary text-xs">
                        {new Date(order.created_at).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="px-4 py-3 text-center relative" onClick={e => e.stopPropagation()}>
                        {transitions.length > 0 ? (
                          <div className="relative inline-block">
                            <button
                              onClick={() => setOpenDropdown(openDropdown === order.id ? null : order.id)}
                              className="flex items-center gap-1 text-xs bg-bg-secondary border border-border rounded-lg px-3 py-1.5 hover:border-primary transition-colors"
                            >
                              Изменить <ChevronDown className="w-3 h-3" />
                            </button>
                            {openDropdown === order.id && (
                              <div className="absolute right-0 top-full mt-1 bg-bg-card border border-border rounded-lg shadow-xl z-10 min-w-[140px]">
                                {transitions.map(s => (
                                  <button
                                    key={s}
                                    onClick={() => changeStatus(order.id, s)}
                                    className="w-full text-left px-3 py-2 text-xs hover:bg-bg-card-hover transition-colors first:rounded-t-lg last:rounded-b-lg"
                                    style={{ color: STATUS_COLORS[s] }}
                                  >
                                    {STATUS_LABELS[s]}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-text-muted text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order detail drawer */}
      {selectedOrderId !== null && (
        <OrderDetailDrawer
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
          onStatusChanged={fetchOrders}
        />
      )}
    </div>
  );
}
