import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { ordersApi } from '../api';
import { toast } from '../components/ui/Toast';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { items, total, count, clearCart } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [form, setForm] = useState({
    customer_name: user ? `${user.first_name} ${user.last_name}`.trim() : '',
    customer_phone: user?.phone || '',
    customer_email: user?.email || '',
    customer_city: user?.city || 'Душанбе',
    customer_address: user?.address || '',
    delivery_method: 'pickup' as 'pickup' | 'delivery',
    comment: '',
  });

  // Update form when user data loads asynchronously
  useEffect(() => {
    if (user) {
      setForm(f => ({
        ...f,
        customer_name: f.customer_name || `${user.first_name} ${user.last_name}`.trim(),
        customer_phone: f.customer_phone || user.phone || '',
        customer_email: f.customer_email || user.email || '',
        customer_city: f.customer_city || user.city || 'Душанбе',
        customer_address: f.customer_address || user.address || '',
      }));
    }
  }, [user]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Redirect to cart if empty and no order placed — MUST be before any early return
  useEffect(() => {
    if (items.length === 0 && !orderNumber) {
      navigate('/cart');
    }
  }, [items.length, orderNumber, navigate]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.customer_name.trim()) errs.customer_name = 'Введите имя';
    if (!form.customer_phone.trim()) {
      errs.customer_phone = 'Введите телефон';
    } else if (!/^\+?992\s?\d{2,3}\s?\d{2,4}\s?\d{2,4}$/.test(form.customer_phone.replace(/\s+/g, ' ').trim())) {
      errs.customer_phone = 'Неверный формат телефона (+992 XXX XXXXXX)';
    }
    if (form.delivery_method === 'delivery' && !form.customer_address.trim()) {
      errs.customer_address = 'Введите адрес доставки';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const orderData: Record<string, unknown> = { ...form };
      // Always send items — backend will use them for guests,
      // and as fallback for authenticated users with empty server cart
      orderData.items = items.map(item => ({
        product_id: item.product?.id || undefined,
        configuration_id: item.configuration?.id || undefined,
        quantity: item.quantity,
        with_assembly: item.with_assembly || false,
      }));
      const res = await ordersApi.createOrder(orderData as any);
      setOrderNumber(res.order_number);
      clearCart();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || err.response?.data?.non_field_errors?.[0] || 'Ошибка при оформлении заказа');
    } finally {
      setLoading(false);
    }
  };

  if (orderNumber) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 sm:py-20 text-center">
        <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Заказ оформлен!</h2>
        <p className="text-text-secondary mb-2">Номер вашего заказа:</p>
        <p className="text-2xl font-bold text-accent mb-4">{orderNumber}</p>
        <p className="text-text-secondary mb-6">
          Наш менеджер свяжется с вами по телефону для подтверждения заказа.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => navigate(`/track/${orderNumber}`)}
            className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Отследить заказ
          </button>
          <button
            onClick={() => navigate('/')}
            className="border border-border text-text-secondary hover:text-text-primary px-6 py-3 rounded-lg font-medium transition-colors"
          >
            На главную
          </button>
        </div>
      </div>
    );
  }

  if (items.length === 0 && !orderNumber) {
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
      <h1 className="text-xl sm:text-2xl font-bold mb-6 sm:mb-8">Оформление заказа</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-4 sm:space-y-6">
          <div className="bg-bg-card shadow-sm border border-border rounded-xl p-4 sm:p-6">
            <h3 className="font-bold mb-4">Контактные данные</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1">Имя *</label>
                <input
                  type="text"
                  value={form.customer_name}
                  onChange={e => { setForm(f => ({ ...f, customer_name: e.target.value })); setErrors(e2 => ({ ...e2, customer_name: '' })); }}
                  className={`w-full bg-bg-secondary border rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 ${errors.customer_name ? 'border-danger' : 'border-border'}`}
                />
                {errors.customer_name && <p className="text-danger text-xs mt-1">{errors.customer_name}</p>}
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">Телефон *</label>
                <input
                  type="tel"
                  placeholder="+992"
                  value={form.customer_phone}
                  onChange={e => { setForm(f => ({ ...f, customer_phone: e.target.value })); setErrors(e2 => ({ ...e2, customer_phone: '' })); }}
                  className={`w-full bg-bg-secondary border rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 ${errors.customer_phone ? 'border-danger' : 'border-border'}`}
                />
                {errors.customer_phone && <p className="text-danger text-xs mt-1">{errors.customer_phone}</p>}
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm text-text-secondary mb-1">Email</label>
                <input
                  type="email"
                  value={form.customer_email}
                  onChange={e => setForm(f => ({ ...f, customer_email: e.target.value }))}
                  className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </div>

          <div className="bg-bg-card shadow-sm border border-border rounded-xl p-6">
            <h3 className="font-bold mb-4">Доставка</h3>
            <div className="flex gap-4 mb-4">
              <label className={`flex-1 border rounded-lg p-4 cursor-pointer transition-colors ${
                form.delivery_method === 'pickup' ? 'border-primary bg-primary/5' : 'border-border'
              }`}>
                <input
                  type="radio"
                  name="delivery"
                  value="pickup"
                  checked={form.delivery_method === 'pickup'}
                  onChange={() => setForm(f => ({ ...f, delivery_method: 'pickup' }))}
                  className="hidden"
                />
                <p className="font-medium">Самовывоз</p>
                <p className="text-text-secondary text-sm">Бесплатно, г. Душанбе</p>
              </label>
              <label className={`flex-1 border rounded-lg p-4 cursor-pointer transition-colors ${
                form.delivery_method === 'delivery' ? 'border-primary bg-primary/5' : 'border-border'
              }`}>
                <input
                  type="radio"
                  name="delivery"
                  value="delivery"
                  checked={form.delivery_method === 'delivery'}
                  onChange={() => setForm(f => ({ ...f, delivery_method: 'delivery' }))}
                  className="hidden"
                />
                <p className="font-medium">Доставка</p>
                <p className="text-text-secondary text-sm">По договорённости</p>
              </label>
            </div>

            {form.delivery_method === 'delivery' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-text-secondary mb-1">Город</label>
                  <input
                    type="text"
                    value={form.customer_city}
                    onChange={e => setForm(f => ({ ...f, customer_city: e.target.value }))}
                    className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm text-text-secondary mb-1">Адрес *</label>
                  <input
                    type="text"
                    value={form.customer_address}
                    onChange={e => { setForm(f => ({ ...f, customer_address: e.target.value })); setErrors(e2 => ({ ...e2, customer_address: '' })); }}
                    className={`w-full bg-bg-secondary border rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 ${errors.customer_address ? 'border-danger' : 'border-border'}`}
                  />
                  {errors.customer_address && <p className="text-danger text-xs mt-1">{errors.customer_address}</p>}
                </div>
              </div>
            )}
          </div>

          <div className="bg-bg-card shadow-sm border border-border rounded-xl p-6">
            <label className="block text-sm text-text-secondary mb-1">Комментарий к заказу</label>
            <textarea
              value={form.comment}
              onChange={e => setForm(f => ({ ...f, comment: e.target.value }))}
              rows={3}
              className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
              placeholder="Удобное время для звонка, пожелания..."
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-dark disabled:opacity-50 text-white py-3 rounded-lg font-semibold text-lg transition-colors"
          >
            {loading ? 'Оформляем...' : 'Подтвердить заказ'}
          </button>
        </form>

        {/* Order Summary */}
        <div>
          <div className="bg-bg-card shadow-md border border-border rounded-xl p-6 sticky top-20">
            <h3 className="font-bold mb-4">Ваш заказ</h3>
            <div className="space-y-3 mb-4">
              {items.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-text-secondary truncate mr-2">
                    {item.product?.name || item.configuration?.name} x{item.quantity}
                  </span>
                  <span className="flex-shrink-0">
                    {parseFloat(item.item_total || '0').toLocaleString()} сом.
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-3 flex justify-between font-bold text-lg">
              <span>Итого</span>
              <span className="text-primary">{total.toLocaleString()} сом.</span>
            </div>
            <p className="text-text-muted text-xs mt-4">
              После оформления наш менеджер свяжется с вами по телефону для подтверждения заказа и согласования оплаты.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
