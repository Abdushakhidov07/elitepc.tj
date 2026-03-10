import { useEffect, useState } from 'react';
import { MapPin, Phone, Mail, Clock, Shield, Truck, Wrench } from 'lucide-react';
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
  about_text: 'Elite PC — ведущий магазин компьютерной техники и комплектующих в Таджикистане. Мы предлагаем широкий ассортимент процессоров, видеокарт, материнских плат, оперативной памяти и другого оборудования от лучших мировых производителей.',
  about_mission: 'Наша миссия — сделать качественную компьютерную технику доступной для каждого жителя Таджикистана.',
  delivery_city_price: '50',
  delivery_free_threshold: '2000',
  delivery_city_days: '1-2 рабочих дня',
  delivery_country_days: '3-7 рабочих дней',
  site_name: 'Elite PC',
  meta_description: '',
};

export default function AboutPage() {
  const [s, setS] = useState<SiteSettings>(FALLBACK);

  useEffect(() => {
    productsApi.getSiteSettings().then(data => setS({ ...FALLBACK, ...data }));
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Breadcrumbs items={[{ label: 'Главная', href: '/' }, { label: 'О нас' }]} />

      <h1 className="text-3xl font-bold mb-8">О магазине {s.site_name}</h1>

      <div className="space-y-6">
        <div className="bg-bg-card shadow-sm rounded-xl p-6">
          <p className="text-text-secondary leading-relaxed">{s.about_text}</p>
          {s.about_mission && (
            <p className="text-text-secondary leading-relaxed mt-4">{s.about_mission}</p>
          )}
        </div>

        <h2 className="text-2xl font-bold mt-10">Наши преимущества</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-bg-card shadow-sm rounded-xl p-5 flex gap-4">
            <Shield className="w-8 h-8 text-primary flex-shrink-0" />
            <div>
              <h3 className="font-semibold mb-1">Гарантия качества</h3>
              <p className="text-text-secondary text-sm">Официальная гарантия на все товары от 12 месяцев</p>
            </div>
          </div>
          <div className="bg-bg-card shadow-sm rounded-xl p-5 flex gap-4">
            <Truck className="w-8 h-8 text-primary flex-shrink-0" />
            <div>
              <h3 className="font-semibold mb-1">Быстрая доставка</h3>
              <p className="text-text-secondary text-sm">
                По Душанбе за {s.delivery_city_days}, по стране за {s.delivery_country_days}
              </p>
            </div>
          </div>
          <div className="bg-bg-card shadow-sm rounded-xl p-5 flex gap-4">
            <Wrench className="w-8 h-8 text-primary flex-shrink-0" />
            <div>
              <h3 className="font-semibold mb-1">Сборка ПК</h3>
              <p className="text-text-secondary text-sm">Профессиональная сборка и тестирование компьютеров</p>
            </div>
          </div>
          <div className="bg-bg-card shadow-sm rounded-xl p-5 flex gap-4">
            <Phone className="w-8 h-8 text-primary flex-shrink-0" />
            <div>
              <h3 className="font-semibold mb-1">Консультации</h3>
              <p className="text-text-secondary text-sm">Бесплатная помощь в подборе комплектующих</p>
            </div>
          </div>
        </div>

        <h2 className="text-2xl font-bold mt-10">Контактная информация</h2>
        <div className="bg-bg-card shadow-sm rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-primary" />
            <span className="text-text-secondary">{s.address_line2}</span>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="w-5 h-5 text-primary" />
            <a href={`tel:${s.phone_primary.replace(/\s/g, '')}`} className="text-text-secondary hover:text-primary transition-colors">
              {s.phone_primary}
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-primary" />
            <a href={`mailto:${s.email_primary}`} className="text-text-secondary hover:text-primary transition-colors">
              {s.email_primary}
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-primary" />
            <span className="text-text-secondary">{s.working_hours}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
