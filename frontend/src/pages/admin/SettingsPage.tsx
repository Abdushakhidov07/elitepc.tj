import { useEffect, useState } from 'react';
import { Save, Eye, EyeOff } from 'lucide-react';
import { adminApi } from '../../api';
import { toast } from '../../components/ui/Toast';
import type { NotificationSettings } from '../../types/admin';
import type { SiteSettings } from '../../types';

// ─── Notification defaults ────────────────────────────────────────────────────

const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  telegram_bot_token: '',
  telegram_channel_id: '',
  is_active: true,
  notify_on_new_order: true,
  notify_on_status_change: true,
  notify_on_low_stock: true,
  low_stock_threshold: 5,
  daily_report_time: '09:00',
};

// ─── Company settings defaults (match Django model defaults) ──────────────────

const DEFAULT_COMPANY: SiteSettings = {
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

// ─── Small helpers ────────────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm text-text-secondary mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-text-muted mt-1">{hint}</p>}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
    />
  );
}

function TextArea({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary resize-none"
    />
  );
}

function ToggleRow({ label, description, checked, onChange }: {
  label: string; description: string; checked: boolean; onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-text-muted">{description}</div>
      </div>
      <button
        onClick={onChange}
        className={`w-11 h-6 rounded-full relative transition-colors shrink-0 ${checked ? 'bg-primary' : 'bg-gray-600'}`}
      >
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'company' | 'notifications'>('company');

  // ── Notifications ────────────────────────────────────────────────────────────
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATIONS);
  const [notifLoading, setNotifLoading] = useState(true);
  const [notifSaving, setNotifSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    adminApi.getSettings()
      .then(data => setSettings({ ...DEFAULT_NOTIFICATIONS, ...data }))
      .catch(() => toast.error('Не удалось загрузить настройки уведомлений'))
      .finally(() => setNotifLoading(false));
  }, []);

  const handleNotifSave = async () => {
    setNotifSaving(true);
    try {
      const updated = await adminApi.updateSettings(settings);
      setSettings({ ...DEFAULT_NOTIFICATIONS, ...updated });
      toast.success('Настройки уведомлений сохранены');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Ошибка сохранения');
    } finally {
      setNotifSaving(false);
    }
  };

  const toggleField = (field: keyof NotificationSettings) =>
    setSettings(prev => ({ ...prev, [field]: !prev[field] }));

  // ── Company ──────────────────────────────────────────────────────────────────
  const [company, setCompany] = useState<SiteSettings>(DEFAULT_COMPANY);
  const [companyLoading, setCompanyLoading] = useState(true);
  const [companySaving, setCompanySaving] = useState(false);

  useEffect(() => {
    adminApi.getCompanySettings()
      .then(data => setCompany({ ...DEFAULT_COMPANY, ...data }))
      .catch(() => toast.error('Не удалось загрузить настройки компании'))
      .finally(() => setCompanyLoading(false));
  }, []);

  const setC = (field: keyof SiteSettings) => (value: string) =>
    setCompany(prev => ({ ...prev, [field]: value }));

  const handleCompanySave = async () => {
    setCompanySaving(true);
    try {
      const updated = await adminApi.updateCompanySettings(company);
      setCompany({ ...DEFAULT_COMPANY, ...updated });
      toast.success('Настройки компании сохранены');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Ошибка сохранения');
    } finally {
      setCompanySaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Настройки</h1>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-bg-card shadow-sm rounded-xl p-1 w-fit">
        {([
          { key: 'company' as const,       label: 'Настройки компании' },
          { key: 'notifications' as const, label: 'Telegram-уведомления' },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-primary text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Company tab ──────────────────────────────────────────────────────── */}
      {activeTab === 'company' && (
        companyLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Contacts */}
            <section className="bg-bg-card shadow-sm rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-semibold">Контакты</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Основной телефон">
                  <TextInput value={company.phone_primary} onChange={setC('phone_primary')} placeholder="+992 900 000 000" />
                </Field>
                <Field label="Дополнительный телефон">
                  <TextInput value={company.phone_secondary} onChange={setC('phone_secondary')} placeholder="+992 918 000 000" />
                </Field>
                <Field label="Основной Email">
                  <TextInput type="email" value={company.email_primary} onChange={setC('email_primary')} placeholder="info@elitepc.tj" />
                </Field>
                <Field label="Email поддержки">
                  <TextInput type="email" value={company.email_support} onChange={setC('email_support')} placeholder="support@elitepc.tj" />
                </Field>
                <Field label="Telegram (аккаунт)">
                  <TextInput value={company.telegram_handle} onChange={setC('telegram_handle')} placeholder="@elitepc_tj" />
                </Field>
                <Field label="Telegram (ссылка)" hint="Полный URL для кнопки">
                  <TextInput value={company.telegram_url} onChange={setC('telegram_url')} placeholder="https://t.me/elitepc_tj" />
                </Field>
              </div>
            </section>

            {/* Address */}
            <section className="bg-bg-card shadow-sm rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-semibold">Адрес и режим работы</h2>
              <Field label="Адрес — строка 1" hint="Например: Республика Таджикистан">
                <TextInput value={company.address_line1} onChange={setC('address_line1')} placeholder="Республика Таджикистан" />
              </Field>
              <Field label="Адрес — строка 2" hint="Улица и номер дома">
                <TextInput value={company.address_line2} onChange={setC('address_line2')} placeholder="г. Душанбе, ул. Рудаки 123" />
              </Field>
              <Field label="Адрес — строка 3" hint="Этаж, офис, ориентир">
                <TextInput value={company.address_line3} onChange={setC('address_line3')} placeholder="2 этаж, офис 205" />
              </Field>
              <Field label="Режим работы">
                <TextInput value={company.working_hours} onChange={setC('working_hours')} placeholder="Пн-Сб: 09:00 — 19:00, Вс: выходной" />
              </Field>
            </section>

            {/* About */}
            <section className="bg-bg-card shadow-sm rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-semibold">О компании</h2>
              <Field label="Основной текст (страница «О нас»)">
                <TextArea rows={4} value={company.about_text} onChange={setC('about_text')} placeholder="Расскажите о магазине..." />
              </Field>
              <Field label="Миссия компании">
                <TextArea rows={3} value={company.about_mission} onChange={setC('about_mission')} placeholder="Наша миссия — ..." />
              </Field>
            </section>

            {/* Delivery */}
            <section className="bg-bg-card shadow-sm rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-semibold">Доставка</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Стоимость доставки по городу (с.)" hint="В сомони, например: 50">
                  <TextInput type="number" value={company.delivery_city_price} onChange={setC('delivery_city_price')} placeholder="50" />
                </Field>
                <Field label="Порог бесплатной доставки (с.)" hint="Заказ от этой суммы — бесплатно">
                  <TextInput type="number" value={company.delivery_free_threshold} onChange={setC('delivery_free_threshold')} placeholder="2000" />
                </Field>
                <Field label="Срок доставки по городу">
                  <TextInput value={company.delivery_city_days} onChange={setC('delivery_city_days')} placeholder="1-2 рабочих дня" />
                </Field>
                <Field label="Срок доставки по Таджикистану">
                  <TextInput value={company.delivery_country_days} onChange={setC('delivery_country_days')} placeholder="3-7 рабочих дней" />
                </Field>
              </div>
            </section>

            {/* SEO */}
            <section className="bg-bg-card shadow-sm rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-semibold">Сайт / SEO</h2>
              <Field label="Название сайта">
                <TextInput value={company.site_name} onChange={setC('site_name')} placeholder="Elite PC" />
              </Field>
              <Field label="Мета-описание" hint="Отображается в результатах поиска Google">
                <TextArea rows={2} value={company.meta_description} onChange={setC('meta_description')} placeholder="Магазин компьютерной техники в Таджикистане..." />
              </Field>
            </section>

            <button
              onClick={handleCompanySave}
              disabled={companySaving}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg px-6 py-3 text-sm transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {companySaving ? 'Сохранение...' : 'Сохранить настройки компании'}
            </button>
          </>
        )
      )}

      {/* ─── Notifications tab ─────────────────────────────────────────────────── */}
      {activeTab === 'notifications' && (
        notifLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <section className="bg-bg-card shadow-sm rounded-xl p-6 space-y-5">
              <h2 className="text-lg font-semibold">Telegram-бот</h2>
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">Токен бота</label>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={settings.telegram_bot_token}
                    onChange={e => setSettings({ ...settings, telegram_bot_token: e.target.value })}
                    placeholder="123456:ABC-DEF..."
                    className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm pr-10 focus:outline-none focus:border-primary font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">ID канала (fallback)</label>
                <input
                  type="text"
                  value={settings.telegram_channel_id}
                  onChange={e => setSettings({ ...settings, telegram_channel_id: e.target.value })}
                  placeholder="-100123456789"
                  className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary font-mono"
                />
                <p className="text-xs text-text-muted mt-1">Используется, если нет одобренных чатов</p>
              </div>
              <ToggleRow
                label="Уведомления активны"
                description="Глобальный переключатель всех Telegram-уведомлений"
                checked={settings.is_active}
                onChange={() => toggleField('is_active')}
              />
            </section>

            <section className="bg-bg-card shadow-sm rounded-xl p-6 space-y-5">
              <h2 className="text-lg font-semibold">Типы уведомлений</h2>
              <ToggleRow
                label="Новые заказы"
                description="Отправлять уведомление при создании нового заказа"
                checked={settings.notify_on_new_order}
                onChange={() => toggleField('notify_on_new_order')}
              />
              <ToggleRow
                label="Смена статуса"
                description="Отправлять уведомление при изменении статуса заказа"
                checked={settings.notify_on_status_change}
                onChange={() => toggleField('notify_on_status_change')}
              />
              <ToggleRow
                label="Низкий остаток"
                description="Предупреждение когда товар заканчивается"
                checked={settings.notify_on_low_stock}
                onChange={() => toggleField('notify_on_low_stock')}
              />
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">Порог низкого остатка</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={settings.low_stock_threshold}
                  onChange={e => setSettings({ ...settings, low_stock_threshold: parseInt(e.target.value) || 5 })}
                  className="w-24 bg-bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
                />
                <p className="text-xs text-text-muted mt-1">Уведомление отправится, когда остаток станет меньше этого числа</p>
              </div>
            </section>

            <section className="bg-bg-card shadow-sm rounded-xl p-6 space-y-5">
              <h2 className="text-lg font-semibold">Ежедневные отчёты</h2>
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">Время отправки отчёта</label>
                <input
                  type="time"
                  value={settings.daily_report_time}
                  onChange={e => setSettings({ ...settings, daily_report_time: e.target.value })}
                  className="w-36 bg-bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
                />
                <p className="text-xs text-text-muted mt-1">Время по часовому поясу Asia/Dushanbe (UTC+5)</p>
              </div>
            </section>

            <button
              onClick={handleNotifSave}
              disabled={notifSaving}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg px-6 py-3 text-sm transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {notifSaving ? 'Сохранение...' : 'Сохранить настройки'}
            </button>
          </>
        )
      )}
    </div>
  );
}
