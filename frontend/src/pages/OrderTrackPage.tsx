import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Search, CheckCircle, Clock, Package, Truck, XCircle } from 'lucide-react';
import type { Order } from '../types';
import { ordersApi } from '../api';

const STATUS_STEPS = [
  { key: 'new', label: 'Новый', icon: <Clock className="w-5 h-5" /> },
  { key: 'confirmed', label: 'Подтверждён', icon: <CheckCircle className="w-5 h-5" /> },
  { key: 'paid', label: 'Оплачен', icon: <CheckCircle className="w-5 h-5" /> },
  { key: 'assembling', label: 'Собирается', icon: <Package className="w-5 h-5" /> },
  { key: 'shipping', label: 'Доставляется', icon: <Truck className="w-5 h-5" /> },
  { key: 'completed', label: 'Выполнен', icon: <CheckCircle className="w-5 h-5" /> },
];

export default function OrderTrackPage() {
  const { orderNumber } = useParams<{ orderNumber?: string }>();
  const [searchNumber, setSearchNumber] = useState(orderNumber || '');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const searchOrder = async (num?: string) => {
    const number = num || searchNumber;
    if (!number) return;
    setLoading(true);
    setError('');
    try {
      const res = await ordersApi.getOrder(number);
      setOrder(res);
    } catch {
      setError('Заказ не найден');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderNumber) searchOrder(orderNumber);
  }, [orderNumber]);

  const getStatusIndex = (status: string) =>
    STATUS_STEPS.findIndex(s => s.key === status);

  const currentIndex = order ? getStatusIndex(order.status) : -1;
  const isCancelled = order?.status === 'cancelled';

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8 text-center">Отслеживание заказа</h1>

      {/* Search */}
      <div className="flex gap-2 mb-8">
        <input
          type="text"
          placeholder="Введите номер заказа (EPC-...)"
          value={searchNumber}
          onChange={e => setSearchNumber(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && searchOrder()}
          className="flex-1 bg-bg-card border border-border shadow-sm rounded-lg px-4 py-3 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <button
          onClick={() => searchOrder()}
          disabled={loading}
          className="bg-primary hover:bg-primary-dark text-white px-6 rounded-lg font-medium transition-colors"
        >
          <Search className="w-5 h-5" />
        </button>
      </div>

      {error && (
        <div className="bg-danger/10 border border-danger/30 text-danger rounded-lg p-4 text-center mb-8">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {order && (
        <div className="space-y-6">
          {/* Order Header */}
          <div className="bg-bg-card shadow-sm rounded-xl p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold">{order.order_number}</h2>
                <p className="text-text-muted text-sm">
                  от {new Date(order.created_at).toLocaleDateString('ru-RU', {
                    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </p>
              </div>
              <p className="text-2xl font-bold text-accent">
                {parseFloat(order.total_price).toLocaleString()} сом.
              </p>
            </div>

            {/* Status Progress */}
            {isCancelled ? (
              <div className="flex items-center gap-2 text-danger bg-danger/10 rounded-lg p-4">
                <XCircle className="w-6 h-6" /> Заказ отменён
              </div>
            ) : (
              <div className="flex items-center justify-between mt-6">
                {STATUS_STEPS.map((step, i) => (
                  <div key={step.key} className="flex items-center flex-1 last:flex-none">
                    <div className={`flex flex-col items-center ${
                      i <= currentIndex ? 'text-primary' : 'text-text-muted'
                    }`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                        i <= currentIndex ? 'border-primary bg-primary/20' : 'border-border'
                      }`}>
                        {step.icon}
                      </div>
                      <span className="text-xs mt-1 hidden sm:block">{step.label}</span>
                    </div>
                    {i < STATUS_STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-2 ${
                        i < currentIndex ? 'bg-primary' : 'bg-border'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Order Items */}
          <div className="bg-bg-card shadow-sm rounded-xl p-6">
            <h3 className="font-bold mb-4">Состав заказа</h3>
            <div className="space-y-3">
              {order.items?.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-text-secondary">
                    {item.product_detail?.name || 'Товар'} x{item.quantity}
                    {item.is_assembled && ' (со сборкой)'}
                  </span>
                  <span>{parseFloat(item.line_total).toLocaleString()} сом.</span>
                </div>
              ))}
            </div>
          </div>

          {/* Status History */}
          {order.status_history && order.status_history.length > 0 && (
            <div className="bg-bg-card shadow-sm rounded-xl p-6">
              <h3 className="font-bold mb-4">История</h3>
              <div className="space-y-3">
                {order.status_history.map((entry, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <div className="w-2 h-2 bg-primary rounded-full mt-1.5 flex-shrink-0" />
                    <div>
                      <p>{entry.old_status} → {entry.new_status}</p>
                      {entry.comment && <p className="text-text-muted">{entry.comment}</p>}
                      <p className="text-text-muted text-xs">
                        {new Date(entry.created_at).toLocaleString('ru-RU')}
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
  );
}
