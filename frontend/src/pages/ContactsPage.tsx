import { useEffect, useState } from 'react';
import { MapPin, Phone, Mail, Clock, MessageCircle } from 'lucide-react';
import Breadcrumbs from '../components/ui/Breadcrumbs';
import { toast } from '../components/ui/Toast';
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

export default function ContactsPage() {
  const [s, setS] = useState<SiteSettings>(FALLBACK);

  useEffect(() => {
    productsApi.getSiteSettings().then(data => setS({ ...FALLBACK, ...data }));
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Breadcrumbs items={[{ label: 'Главная', href: '/' }, { label: 'Контакты' }]} />

      <h1 className="text-3xl font-bold mb-8">Контакты</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-bg-card shadow-sm rounded-xl p-6">
            <h2 className="font-bold text-lg mb-4">Свяжитесь с нами</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Телефон</p>
                  <a href={`tel:${s.phone_primary.replace(/\s/g, '')}`} className="text-text-secondary hover:text-primary transition-colors">
                    {s.phone_primary}
                  </a>
                  {s.phone_secondary && (
                    <>
                      <br />
                      <a href={`tel:${s.phone_secondary.replace(/\s/g, '')}`} className="text-text-secondary hover:text-primary transition-colors">
                        {s.phone_secondary}
                      </a>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Email</p>
                  <a href={`mailto:${s.email_primary}`} className="text-text-secondary hover:text-primary transition-colors">
                    {s.email_primary}
                  </a>
                  {s.email_support && s.email_support !== s.email_primary && (
                    <>
                      <br />
                      <a href={`mailto:${s.email_support}`} className="text-text-secondary hover:text-primary transition-colors">
                        {s.email_support}
                      </a>
                    </>
                  )}
                </div>
              </div>
              {s.telegram_handle && (
                <div className="flex items-start gap-3">
                  <MessageCircle className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Telegram</p>
                    <a href={s.telegram_url} target="_blank" rel="noopener noreferrer" className="text-text-secondary hover:text-primary transition-colors">
                      {s.telegram_handle}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-bg-card shadow-sm rounded-xl p-6">
            <h2 className="font-bold text-lg mb-4">Адрес</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Магазин и пункт выдачи</p>
                  <p className="text-text-secondary">
                    {s.address_line1 && <>{s.address_line1}<br /></>}
                    {s.address_line2 && <>{s.address_line2}<br /></>}
                    {s.address_line3}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Режим работы</p>
                  <p className="text-text-secondary">{s.working_hours}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-bg-card shadow-sm rounded-xl p-6">
          <h2 className="font-bold text-lg mb-4">Напишите нам</h2>
          <form className="space-y-4" onSubmit={e => { e.preventDefault(); toast.success('Сообщение отправлено!'); }}>
            <div>
              <label className="block text-sm text-text-secondary mb-1">Имя</label>
              <input
                type="text"
                required
                className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="Ваше имя"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">Телефон</label>
              <input
                type="tel"
                required
                className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="+992 ..."
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">Сообщение</label>
              <textarea
                required
                rows={4}
                className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
                placeholder="Ваш вопрос..."
              />
            </div>
            <button
              type="submit"
              className="w-full bg-primary hover:bg-primary-dark text-white py-2.5 rounded-lg font-medium transition-colors"
            >
              Отправить
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
