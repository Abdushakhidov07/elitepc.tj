import { useState, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Search, Heart, ShoppingCart, User, Menu, X, Shield, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';

const navLinks = [
  { to: '/catalog', label: 'Каталог' },
  { to: '/configurator', label: 'Конфигуратор' },
  { to: '/about', label: 'О нас' },
  { to: '/contacts', label: 'Контакты' },
];

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const cartItemCount = useCartStore(s => s.count);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const user = useAuthStore(s => s.user);
  const initialize = useAuthStore(s => s.initialize);
  const fetchCart = useCartStore(s => s.fetchCart);
  const { theme, toggleTheme } = useThemeStore();

  useEffect(() => {
    initialize();
    fetchCart();
  }, [initialize, fetchCart]);

  return (
    <header className="sticky top-0 z-50 bg-bg-card/80 backdrop-blur-xl border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className="text-2xl font-extrabold tracking-tight">
              <span className="text-primary">Elite</span>
              <span className="text-accent">&nbsp;PC</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  clsx(
                    'px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200',
                    isActive
                      ? 'text-primary bg-primary/10'
                      : 'text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5'
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Right side icons */}
          <div className="flex items-center gap-1">
            <Link
              to="/search"
              className="p-2 text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
              aria-label="Поиск"
            >
              <Search size={20} />
            </Link>

            <Link
              to="/wishlist"
              className="p-2 text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors hidden sm:inline-flex"
              aria-label="Избранное"
            >
              <Heart size={20} />
            </Link>

            <Link
              to="/cart"
              className="relative p-2 text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
              aria-label="Корзина"
            >
              <ShoppingCart size={20} />
              {cartItemCount > 0 && (
                <motion.span
                  key={cartItemCount}
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-primary rounded-full"
                >
                  {cartItemCount > 99 ? '99+' : cartItemCount}
                </motion.span>
              )}
            </Link>

            {isAuthenticated && user?.is_staff && (
              <Link
                to="/admin"
                className="p-2 text-primary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors hidden sm:inline-flex"
                aria-label="Админ-панель"
                title="Админ-панель"
              >
                <Shield size={20} />
              </Link>
            )}

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
              aria-label={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <Link
              to={isAuthenticated ? '/profile' : '/login'}
              className="p-2 text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors hidden sm:inline-flex"
              aria-label={isAuthenticated ? 'Профиль' : 'Войти'}
            >
              <User size={20} />
            </Link>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="p-2 text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors md:hidden"
              aria-label={mobileMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="md:hidden overflow-hidden border-t border-border bg-bg-card/95 backdrop-blur-xl"
          >
            <nav className="flex flex-col px-4 py-3 gap-1">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    clsx(
                      'px-4 py-3 text-sm font-medium rounded-lg transition-colors',
                      isActive
                        ? 'text-primary bg-primary/10'
                        : 'text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5'
                    )
                  }
                >
                  {link.label}
                </NavLink>
              ))}

              <div className="flex items-center gap-2 mt-2 pt-3 border-t border-border">
                <Link
                  to="/wishlist"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-3 text-sm text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors flex-1"
                >
                  <Heart size={18} />
                  Избранное
                </Link>
                <Link
                  to={isAuthenticated ? '/profile' : '/login'}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-3 text-sm text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors flex-1"
                >
                  <User size={18} />
                  {isAuthenticated ? 'Профиль' : 'Войти'}
                </Link>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
