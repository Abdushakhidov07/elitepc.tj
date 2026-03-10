import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ShoppingCart, Heart, ChevronLeft, ChevronRight, Package, Truck } from 'lucide-react';
import type { Product } from '../types';
import { productsApi, authApi } from '../api';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import ProductCard from '../components/ui/ProductCard';
import Breadcrumbs from '../components/ui/Breadcrumbs';
import { toast } from '../components/ui/Toast';

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [similar, setSimilar] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [activeTab, setActiveTab] = useState<'description' | 'specs'>('specs');
  const addItem = useCartStore(s => s.addItem);
  const isAuthenticated = useAuthStore(s => !!s.user);
  const [inWishlist, setInWishlist] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    productsApi.getProduct(slug)
      .then(productRes => {
        setProduct(productRes);
        setActiveImage(0);
        productsApi.getSimilarProducts(slug)
          .then(res => setSimilar(Array.isArray(res) ? res : []))
          .catch(() => setSimilar([]));
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return <div className="text-center py-32 text-text-secondary">Товар не найден</div>;
  }

  const images = product.images?.length > 0
    ? product.images
    : product.main_image
      ? [{ id: 0, image: product.main_image, alt_text: product.name, order: 0, is_main: true }]
      : [];

  const hasDiscount = product.discount_price && parseFloat(product.discount_price) > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Breadcrumbs items={[
        { label: 'Главная', href: '/' },
        { label: 'Каталог', href: '/catalog' },
        { label: product.category_name, href: `/catalog/${product.category_slug}` },
        { label: product.name },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8 mb-8 sm:mb-12">
        {/* Image Gallery */}
        <div>
          <div className="bg-bg-card shadow-sm rounded-xl p-4 mb-4 relative aspect-square flex items-center justify-center overflow-hidden">
            {images.length > 0 ? (
              <img
                src={images[activeImage]?.image}
                alt={images[activeImage]?.alt_text || product.name}
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <div className="text-text-muted text-6xl">
                <Package />
              </div>
            )}
            {hasDiscount && (
              <div className="absolute top-4 left-4 bg-danger text-white text-sm font-bold px-3 py-1 rounded-lg">
                -{product.discount_percent}%
              </div>
            )}
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setActiveImage(i => i > 0 ? i - 1 : images.length - 1)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-bg-card/90 shadow-md p-2 rounded-full hover:bg-primary transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setActiveImage(i => i < images.length - 1 ? i + 1 : 0)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-bg-card/90 shadow-md p-2 rounded-full hover:bg-primary transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImage(i)}
                  className={`w-16 h-16 flex-shrink-0 border rounded-lg overflow-hidden ${
                    i === activeImage ? 'border-primary' : 'border-border'
                  }`}
                >
                  <img src={img.image} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div>
          {product.brand_name && (
            <span className="text-text-muted text-sm mb-1 block">{product.brand_name}</span>
          )}
          <h1 className="text-xl sm:text-2xl font-bold mb-2">{product.name}</h1>
          <p className="text-text-secondary text-sm mb-4">Артикул: {product.sku}</p>

          {/* Price */}
          <div className="mb-6">
            {hasDiscount ? (
              <div className="flex items-end gap-3">
                <span className="text-3xl font-bold text-primary">
                  {parseFloat(product.discount_price!).toLocaleString()} сом.
                </span>
                <span className="text-xl text-text-muted line-through">
                  {parseFloat(product.price).toLocaleString()} сом.
                </span>
              </div>
            ) : (
              <span className="text-3xl font-bold">
                {parseFloat(product.price).toLocaleString()} сом.
              </span>
            )}
          </div>

          {/* Stock */}
          <div className="mb-6">
            {product.in_stock ? (
              <span className="text-success flex items-center gap-2">
                <Package className="w-4 h-4" /> В наличии ({product.stock_quantity} шт.)
              </span>
            ) : (
              <span className="text-danger">Нет в наличии</span>
            )}
          </div>

          {/* Short Description */}
          {product.short_description && (
            <p className="text-text-secondary mb-6">{product.short_description}</p>
          )}

          {/* Actions */}
          <div className="flex gap-4 mb-8">
            <button
              onClick={() => {
                if (product.in_stock) {
                  addItem({ product_id: product.id, quantity: 1, _product: product });
                  toast.success('Товар добавлен в корзину');
                }
              }}
              disabled={!product.in_stock}
              className="flex-1 bg-primary hover:bg-primary-dark disabled:bg-text-muted disabled:cursor-not-allowed text-white py-3 px-6 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-5 h-5" />
              В корзину
            </button>
            <button
              onClick={async () => {
                if (!isAuthenticated) {
                  toast.warning('Войдите, чтобы добавить в избранное');
                  return;
                }
                try {
                  if (inWishlist) {
                    await authApi.removeFromWishlist(product.id);
                    setInWishlist(false);
                    toast.info('Убрано из избранного');
                  } else {
                    await authApi.addToWishlist(product.id);
                    setInWishlist(true);
                    toast.success('Добавлено в избранное');
                  }
                } catch {
                  toast.error('Ошибка при обновлении избранного');
                }
              }}
              className={`border p-3 rounded-lg transition-colors ${
                inWishlist
                  ? 'border-danger text-danger bg-danger/10'
                  : 'border-border hover:border-danger hover:text-danger text-text-secondary'
              }`}
            >
              <Heart className={`w-5 h-5 ${inWishlist ? 'fill-current' : ''}`} />
            </button>
          </div>

          {/* Delivery Info */}
          <div className="bg-bg-secondary rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Truck className="w-5 h-5 text-accent" />
              <div>
                <p className="font-medium text-sm">Доставка по Душанбе</p>
                <p className="text-text-muted text-xs">Бесплатно при заказе от 1000 сом.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5 text-accent" />
              <div>
                <p className="font-medium text-sm">Самовывоз</p>
                <p className="text-text-muted text-xs">Бесплатно, г. Душанбе</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-12">
        <div className="flex gap-4 border-b border-border mb-6">
          <button
            onClick={() => setActiveTab('specs')}
            className={`pb-3 px-2 font-medium transition-colors ${
              activeTab === 'specs' ? 'text-primary border-b-2 border-primary' : 'text-text-secondary'
            }`}
          >
            Характеристики
          </button>
          <button
            onClick={() => setActiveTab('description')}
            className={`pb-3 px-2 font-medium transition-colors ${
              activeTab === 'description' ? 'text-primary border-b-2 border-primary' : 'text-text-secondary'
            }`}
          >
            Описание
          </button>
        </div>

        {activeTab === 'specs' && product.specifications && (
          <div className="bg-bg-card shadow-sm rounded-xl overflow-hidden">
            <table className="w-full">
              <tbody>
                {product.specifications.map((spec, i) => (
                  <tr key={spec.id} className={i % 2 === 0 ? 'bg-bg-card' : 'bg-bg-secondary'}>
                    <td className="px-3 sm:px-6 py-2.5 sm:py-3 text-text-secondary text-xs sm:text-sm w-2/5 sm:w-1/3">{spec.spec_name_display}</td>
                    <td className="px-3 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm">
                      {spec.value} {spec.unit && <span className="text-text-muted">{spec.unit}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'description' && (
          <div className="bg-bg-card shadow-sm rounded-xl p-6 text-text-secondary leading-relaxed">
            {product.description || 'Описание отсутствует'}
          </div>
        )}
      </div>

      {/* Similar Products */}
      {similar.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-6">Похожие товары</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {similar.slice(0, 4).map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
