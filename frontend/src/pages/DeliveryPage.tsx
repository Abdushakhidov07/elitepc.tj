import { useEffect, useState } from 'react';
import { Truck, MapPin, Clock, CreditCard, Phone } from 'lucide-react';
import Breadcrumbs from '../components/ui/Breadcrumbs';
import { productsApi } from '../api';
import type { SiteSettings } from '../types';

const FALLBACK: SiteSettings = {
  phone_primary: '+992 900 123 456',
  phone_secondary: '+992 918 654 321',
  email_primary: 'info@elitepc.tj',
  email_support: 'support@elitepc.tj',
  telegram_handle: '@elitepc_tj',
  telegram_url: 'https://t.me/elitepc_tj',
  address_line1: 'Республика Таджикистан',
  address_line2: 'г. Душанбе, ул. Рудаки 123',
  address_line3: '2 этаж, офис 205',
  working_hours: 'Пн-Сб: 09:00 — 19:00, Вс: выходной',
  about_text: '',
  about_mission: '',
  delivery_city_price: '50',
  delivery_free_threshold: '2000',
  delivery_city_days: '1-2 рабочих дня',
  delivery_country_days: '3-7 рабочих дней',
  site_name: 'Elite PC',
  meta_description: '',
};

function fmtPrice(val: string) {
  return Number(val).toLocaleString('ru-RU');
}

export default function DeliveryPage() {
  const [s, setS] = useState<SiteSettings>(FALLBACK);

  useEffect(() => {
    productsApi.getSiteSettings().then(data => setS({ ...FALLBACK, ...data }));
  }, []);

  const pickupAddress = [s.address_line2, s.address_line3].filter(Boolean).join(', ');

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Breadcrumbs items={[{ label: 'Главная', href: '/' }, { label: 'Доставка и оплата' }]} />

      <h1 className="text-3xl font-bold mb-8">Доставка и оплата</h1>

      <div className="space-y-6">
        {/* Delivery */}
        <div className="bg-bg-card shadow-sm rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Truck className="w-6 h-6 text-primary" /> Доставка
          </h2>
          <div className="space-y-4">
            <div className="border-b border-border pb-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold">Самовывоз — бесплатно</h3>
                  <p className="text-text-secondary text-sm mt-1">
                    Забрать заказ можно в нашем магазине по адресу: {pickupAddress}.
                  </p>
                  <p className="text-text-muted text-sm mt-1">{s.working_hours}</p>
                </div>
              </div>
            </div>
            <div className="border-b border-border pb-4">
              <div className="flex items-start gap-3">
                <Truck className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold">Курьером по Душанбе</h3>
                  <p className="text-text-secondary text-sm mt-1">
                    Доставка по городу — <strong className="text-text-primary">{fmtPrice(s.delivery_city_price)} сомони</strong>.
                    Бесплатная доставка при заказе от <strong className="text-text-primary">{fmtPrice(s.delivery_free_threshold)} сомони</strong>.
                  </p>
                  <p className="text-text-muted text-sm mt-1">Срок: {s.delivery_city_days}</p>
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-start gap-3">
                <Truck className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold">Доставка по Таджикистану</h3>
                  <p className="text-text-secondary text-sm mt-1">
                    Отправка транспортными компаниями в любой город страны.
                    Стоимость зависит от веса и города назначения.
                  </p>
                  <p className="text-text-muted text-sm mt-1">Срок: {s.delivery_country_days}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment */}
        <div className="bg-bg-card shadow-sm rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-primary" /> Оплата
          </h2>
          <div className="space-y-4">
            <div className="border-b border-border pb-4">
              <div className="flex items-start gap-3">
                <CreditCard className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold">Перевод на карту / счёт</h3>
                  <p className="text-text-secondary text-sm mt-1">
                    После подтверждения заказа менеджер отправит реквизиты для оплаты.
                    Принимаем переводы через любой банк Таджикистана.
                  </p>
                </div>
              </div>
            </div>
            <div className="border-b border-border pb-4">
              <div className="flex items-start gap-3">
                <CreditCard className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold">Наличными при получении</h3>
                  <p className="text-text-secondary text-sm mt-1">
                    Оплата наличными при самовывозе или курьеру при доставке.
                  </p>
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold">Как происходит оплата</h3>
                  <ol className="text-text-secondary text-sm mt-1 space-y-1 list-decimal list-inside">
                    <li>Вы оформляете заказ на сайте</li>
                    <li>Наш менеджер звонит для подтверждения</li>
                    <li>Вы оплачиваете удобным способом</li>
                    <li>Мы отправляем заказ</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Timing table */}
        <div className="bg-bg-card shadow-sm rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Clock className="w-6 h-6 text-primary" /> Сроки
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 text-text-secondary font-medium">Способ</th>
                  <th className="text-left py-3 px-2 text-text-secondary font-medium">Срок</th>
                  <th className="text-left py-3 px-2 text-text-secondary font-medium">Стоимость</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/50">
                  <td className="py-3 px-2">Самовывоз</td>
                  <td className="py-3 px-2 text-text-secondary">В день подтверждения</td>
                  <td className="py-3 px-2 text-success">Бесплатно</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-3 px-2">Курьер (Душанбе)</td>
                  <td className="py-3 px-2 text-text-secondary">{s.delivery_city_days}</td>
                  <td className="py-3 px-2">{fmtPrice(s.delivery_city_price)} сомони</td>
                </tr>
                <tr>
                  <td className="py-3 px-2">По Таджикистану</td>
                  <td className="py-3 px-2 text-text-secondary">{s.delivery_country_days}</td>
                  <td className="py-3 px-2">По тарифу ТК</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
