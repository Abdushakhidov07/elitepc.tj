import { useEffect, useState } from 'react';
import { Shield, AlertTriangle, CheckCircle, Phone } from 'lucide-react';
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

export default function WarrantyPage() {
  const [s, setS] = useState<SiteSettings>(FALLBACK);

  useEffect(() => {
    productsApi.getSiteSettings().then(data => setS({ ...FALLBACK, ...data }));
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Breadcrumbs items={[{ label: 'Главная', href: '/' }, { label: 'Гарантия' }]} />

      <h1 className="text-3xl font-bold mb-8">Гарантия</h1>

      <div className="space-y-6">
        <div className="bg-bg-card shadow-sm rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" /> Гарантийные условия
          </h2>
          <p className="text-text-secondary leading-relaxed">
            Все товары, представленные в магазине {s.site_name}, имеют официальную гарантию производителя.
            Гарантийный срок составляет от 12 до 36 месяцев в зависимости от категории товара и производителя.
          </p>
        </div>

        <div className="bg-bg-card shadow-sm rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4">Сроки гарантии</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 text-text-secondary font-medium">Категория</th>
                  <th className="text-left py-3 px-2 text-text-secondary font-medium">Гарантия</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Процессоры', '36 месяцев'],
                  ['Видеокарты', '36 месяцев'],
                  ['Материнские платы', '36 месяцев'],
                  ['Оперативная память', '24 месяца'],
                  ['SSD накопители', '36 месяцев'],
                  ['HDD накопители', '24 месяца'],
                  ['Блоки питания', '24-60 месяцев'],
                  ['Корпуса', '12 месяцев'],
                  ['Кулеры / СЖО', '12-24 месяца'],
                  ['Собранные ПК', '12 месяцев (сборка)'],
                ].map(([cat, period]) => (
                  <tr key={cat} className="border-b border-border/50">
                    <td className="py-3 px-2">{cat}</td>
                    <td className="py-3 px-2 text-text-secondary">{period}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-bg-card shadow-sm rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-success" /> Гарантия действует при
          </h2>
          <ul className="space-y-2 text-text-secondary text-sm">
            {[
              'Наличии товарного чека или подтверждения заказа',
              'Соблюдении условий эксплуатации',
              'Отсутствии механических повреждений',
              'Сохранности серийного номера на изделии',
              'Неисправность возникла по вине производителя',
            ].map(item => (
              <li key={item} className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-bg-card shadow-sm rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-warning" /> Гарантия не распространяется на
          </h2>
          <ul className="space-y-2 text-text-secondary text-sm">
            {[
              'Механические повреждения (удары, падения, трещины)',
              'Повреждения от перепадов напряжения',
              'Повреждения от попадания жидкости',
              'Самостоятельный ремонт или вскрытие',
              'Программные неисправности и вирусы',
              'Естественный износ (вентиляторы, термопаста)',
            ].map(item => (
              <li key={item} className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-bg-card shadow-sm rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Phone className="w-6 h-6 text-primary" /> Как обратиться по гарантии
          </h2>
          <ol className="space-y-3 text-text-secondary text-sm list-decimal list-inside">
            <li>
              Свяжитесь с нами по телефону{' '}
              <a href={`tel:${s.phone_primary.replace(/\s/g, '')}`} className="text-primary hover:text-accent">
                {s.phone_primary}
              </a>
              {s.telegram_handle && (
                <> или через <a href={s.telegram_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-accent">{s.telegram_handle}</a></>
              )}
            </li>
            <li>Опишите проблему и укажите номер заказа</li>
            <li>Привезите товар в наш магазин или отправьте транспортной компанией</li>
            <li>Мы проведём диагностику в течение 3-5 рабочих дней</li>
            <li>При подтверждении гарантийного случая — ремонт или замена</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
