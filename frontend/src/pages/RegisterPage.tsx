import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, error, isLoading, clearError } = useAuthStore();
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    password_confirm: '',
    first_name: '',
    last_name: '',
    phone: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await register(form);
      navigate('/profile');
    } catch {
      // error is handled by the store
    }
  };

  return (
    <div className="bg-gradient-to-b from-bg-secondary to-bg-card">
    <div className="min-h-[60vh] flex items-center">
    <div className="max-w-md mx-auto px-4 py-12 w-full">
      <h1 className="text-2xl font-bold mb-8 text-center">Регистрация</h1>
      <form onSubmit={handleSubmit} className="bg-bg-card shadow-lg border border-border rounded-xl p-6 space-y-4">
        {error && (
          <div className="bg-danger/10 border border-danger/30 text-danger rounded-lg p-3 text-sm">{error}</div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1">Имя</label>
            <input
              type="text"
              value={form.first_name}
              onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
              className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Фамилия</label>
            <input
              type="text"
              value={form.last_name}
              onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
              className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm text-text-secondary mb-1">Имя пользователя *</label>
          <input
            type="text"
            required
            value={form.username}
            onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
            className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label className="block text-sm text-text-secondary mb-1">Email *</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label className="block text-sm text-text-secondary mb-1">Телефон</label>
          <input
            type="tel"
            placeholder="+992"
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label className="block text-sm text-text-secondary mb-1">Пароль *</label>
          <input
            type="password"
            required
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label className="block text-sm text-text-secondary mb-1">Подтверждение пароля *</label>
          <input
            type="password"
            required
            value={form.password_confirm}
            onChange={e => setForm(f => ({ ...f, password_confirm: e.target.value }))}
            className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-primary hover:bg-primary-dark disabled:opacity-50 text-white py-3 rounded-lg font-semibold transition-colors"
        >
          {isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
        </button>
        <p className="text-center text-text-secondary text-sm">
          Уже есть аккаунт?{' '}
          <Link to="/login" className="text-primary hover:text-accent transition-colors">
            Войти
          </Link>
        </p>
      </form>
    </div>
    </div>
    </div>
  );
}
