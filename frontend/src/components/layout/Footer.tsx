import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin } from 'lucide-react';

const catalogLinks = [
  { to: '/catalog/cpu', label: 'Процессоры' },
  { to: '/catalog/motherboards', label: 'Материнские платы' },
  { to: '/catalog/ram', label: 'Оперативная память' },
  { to: '/catalog/gpu', label: 'Видеокарты' },
  { to: '/catalog/storage', label: 'SSD / HDD' },
  { to: '/catalog/psu', label: 'Блоки питания' },
  { to: '/catalog/cases', label: 'Корпуса' },
  { to: '/catalog/coolers', label: 'Охлаждение' },
];

const infoLinks = [
  { to: '/about', label: 'О нас' },
  { to: '/delivery', label: 'Доставка и оплата' },
  { to: '/warranty', label: 'Гарантия' },
  { to: '/contacts', label: 'Контакты' },
  { to: '/configurator', label: 'Конфигуратор ПК' },
];

export default function Footer() {
  return (
    <footer className="bg-bg-secondary border-t border-border">
      {/* Gradient accent line */}
      <div className="h-1 bg-gradient-to-r from-primary to-accent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Column 1: Logo & description */}
          <div className="flex flex-col gap-4">
            <Link to="/" className="inline-flex items-center gap-2">
              <span className="text-2xl font-extrabold tracking-tight">
                <span className="text-primary">Elite</span>
                <span className="text-accent">&nbsp;PC</span>
              </span>
            </Link>
            <p className="text-sm text-text-secondary leading-relaxed">
              Магазин компьютеров и комплектующих в Таджикистане. Собери свой идеальный ПК вместе с нами.
            </p>
          </div>

          {/* Column 2: Catalog */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-4">
              Каталог
            </h3>
            <ul className="flex flex-col gap-2.5">
              {catalogLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-text-secondary hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Information */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-4">
              Информация
            </h3>
            <ul className="flex flex-col gap-2.5">
              {infoLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-text-secondary hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Contacts */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-4">
              Контакты
            </h3>
            <ul className="flex flex-col gap-3">
              <li>
                <a
                  href="tel:+992900123456"
                  className="flex items-center gap-2.5 text-sm text-text-secondary hover:text-primary transition-colors"
                >
                  <Phone size={16} className="shrink-0 text-primary" />
                  +992 900 123 456
                </a>
              </li>
              <li>
                <a
                  href="mailto:info@elitepc.tj"
                  className="flex items-center gap-2.5 text-sm text-text-secondary hover:text-primary transition-colors"
                >
                  <Mail size={16} className="shrink-0 text-primary" />
                  info@elitepc.tj
                </a>
              </li>
              <li>
                <span className="flex items-start gap-2.5 text-sm text-text-secondary">
                  <MapPin size={16} className="shrink-0 text-primary mt-0.5" />
                  <span>
                    г. Душанбе, ул. Рудаки 123,
                    <br />
                    Таджикистан
                  </span>
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-text-muted">
            &copy; {new Date().getFullYear()} Elite PC. Все права защищены.
          </p>
          <p className="text-xs text-text-muted">
            Все цены указаны в сомони (TJS)
          </p>
        </div>
      </div>
    </footer>
  );
}
