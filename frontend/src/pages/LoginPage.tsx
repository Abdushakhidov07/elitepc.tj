import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, error, isLoading, clearError } = useAuthStore();
  const syncCartOnLogin = useCartStore(s => s.syncCartOnLogin);
  const [form, setForm] = useState({ username: '', password: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await login(form.username, form.password);
      await syncCartOnLogin();
      navigate('/profile');
    } catch {
      // error is handled by the store
    }
  };

  return (
    <div className="bg-gradient-to-b from-bg-secondary to-bg-card">
    <div className="min-h-[60vh] flex items-center">
    <div className="max-w-md mx-auto px-4 py-20 w-full">
      <h1 className="text-2xl font-bold mb-8 text-center">Вход</h1>
      <form onSubmit={handleSubmit} className="bg-bg-card shadow-lg border border-border rounded-xl p-6 space-y-4">
        {error && (
          <div className="bg-danger/10 border border-danger/30 text-danger rounded-lg p-3 text-sm">{error}</div>
        )}
        <div>
          <label className="block text-sm text-text-secondary mb-1">Email или имя пользователя</label>
          <input
            type="text"
            required
            value={form.username}
            onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
            className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label className="block text-sm text-text-secondary mb-1">Пароль</label>
          <input
            type="password"
            required
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-primary hover:bg-primary-dark disabled:opacity-50 text-white py-3 rounded-lg font-semibold transition-colors"
        >
          {isLoading ? 'Входим...' : 'Войти'}
        </button>
        <p className="text-center text-text-secondary text-sm">
          Нет аккаунта?{' '}
          <Link to="/register" className="text-primary hover:text-accent transition-colors">
            Регистрация
          </Link>
        </p>
      </form>
    </div>
    </div>
    </div>
  );
}
