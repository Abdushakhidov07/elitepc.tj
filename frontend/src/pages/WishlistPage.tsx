import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Trash2, ShoppingCart } from 'lucide-react';
import { Product } from '../types';
import { authApi } from '../api';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import ProductCard from '../components/ui/ProductCard';
import Breadcrumbs from '../components/ui/Breadcrumbs';

export default function WishlistPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const isAuthenticated = useAuthStore(s => !!s.user);
  const addItem = useCartStore(s => s.addItem);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    authApi.getWishlist()
      .then(res => setProducts(Array.isArray(res) ? res : []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const removeFromWishlist = async (productId: number) => {
    try {
      await authApi.removeFromWishlist(productId);
      setProducts(prev => prev.filter(p => p.id !== productId));
    } catch {}
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Breadcrumbs items={[{ label: 'Главная', href: '/' }, { label: 'Избранное' }]} />
        <div className="text-center py-20">
          <Heart className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Избранное</h1>
          <p className="text-text-secondary mb-6">Войдите, чтобы видеть свои избранные товары</p>
          <Link
            to="/login"
            className="inline-block bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Войти
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Breadcrumbs items={[{ label: 'Главная', href: '/' }, { label: 'Избранное' }]} />

      <h1 className="text-2xl font-bold mb-6">
        Избранное
        {products.length > 0 && (
          <span className="text-text-muted font-normal ml-2 text-lg">({products.length})</span>
        )}
      </h1>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20">
          <Heart className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <p className="text-text-secondary mb-6">В избранном пока ничего нет</p>
          <Link
            to="/catalog"
            className="inline-block bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Перейти в каталог
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map(product => (
            <div key={product.id} className="relative group">
              <ProductCard product={product} layout="grid" />
              <button
                onClick={() => removeFromWishlist(product.id)}
                className="absolute top-2 right-2 bg-black/40 hover:bg-danger/20 text-text-muted hover:text-danger p-2 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                title="Убрать из избранного"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
