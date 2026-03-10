import { Link } from 'react-router-dom';
import { ShoppingCart, Eye } from 'lucide-react';
import clsx from 'clsx';
import type { Product } from '../../types';
import Button from './Button';
import { useCartStore } from '../../store/cartStore';
import { toast } from './Toast';

interface ProductCardProps {
  product: Product;
  layout?: 'grid' | 'list';
  className?: string;
}

export default function ProductCard({ product, layout = 'grid', className }: ProductCardProps) {
  const addItem = useCartStore(s => s.addItem);
  const hasDiscount = product.discount_price !== null && product.discount_percent > 0;

  const formatPrice = (price: string | number) => {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    return num.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const displayPrice = hasDiscount ? product.discount_price! : product.price;

  return (
    <div
      className={clsx(
        'group relative flex flex-col bg-bg-card rounded-2xl shadow-sm border border-border overflow-hidden',
        'transition-all duration-300 hover:shadow-xl hover:border-primary/20',
        'hover:-translate-y-2',
        className
      )}
    >
      {/* Discount badge */}
      {hasDiscount && (
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10 bg-danger text-white text-[10px] sm:text-xs font-bold px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg shadow-sm">
          -{product.discount_percent}%
        </div>
      )}

      {/* Image container */}
      <Link
        to={`/product/${product.slug}`}
        className="relative aspect-square bg-bg-secondary overflow-hidden"
      >
        {product.main_image ? (
          <img
            src={product.main_image}
            alt={product.name}
            className="w-full h-full object-contain p-2 sm:p-4 transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-muted">
            <Eye size={48} strokeWidth={1} />
          </div>
        )}

        {/* Hover overlay */}
        <div
          className={clsx(
            'absolute inset-0 bg-black/40 flex items-center justify-center',
            'opacity-0 group-hover:opacity-100 transition-opacity duration-300'
          )}
        >
          <span className="flex items-center gap-2 text-sm text-white bg-primary/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-md">
            <Eye size={16} />
            Подробнее
          </span>
        </div>
      </Link>

      {/* Content */}
      <div className="flex flex-col flex-1 p-2.5 sm:p-4 gap-1 sm:gap-2">
        {/* Brand */}
        {product.brand_name && (
          <span className="text-[10px] sm:text-xs text-text-muted uppercase tracking-wider font-medium">
            {product.brand_name}
          </span>
        )}

        {/* Name */}
        <Link
          to={`/product/${product.slug}`}
          className="text-xs sm:text-sm font-medium text-text-primary line-clamp-2 hover:text-primary transition-colors leading-snug min-h-[2rem] sm:min-h-[2.5rem]"
        >
          {product.name}
        </Link>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Stock indicator */}
        <div className="flex items-center gap-1.5">
          <span
            className={clsx(
              'w-2 h-2 rounded-full shrink-0',
              product.in_stock ? 'bg-success' : 'bg-danger'
            )}
          />
          <span
            className={clsx(
              'text-[10px] sm:text-xs',
              product.in_stock ? 'text-success' : 'text-danger'
            )}
          >
            {product.in_stock ? 'В наличии' : 'Нет'}
          </span>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-1 sm:gap-2 mt-1 flex-wrap">
          <span className={clsx('text-sm sm:text-lg font-bold', hasDiscount ? 'text-primary' : 'text-text-primary')}>
            {formatPrice(displayPrice)} с.
          </span>
          {hasDiscount && (
            <span className="text-[10px] sm:text-sm text-text-muted line-through">
              {formatPrice(product.price)}
            </span>
          )}
        </div>

        {/* Add to cart button */}
        <Button
          variant="primary"
          size="sm"
          className="w-full mt-1 sm:mt-2 !text-xs sm:!text-sm !py-1.5 sm:!py-2"
          disabled={!product.in_stock}
          onClick={(e) => {
            e.preventDefault();
            addItem({ product_id: product.id, quantity: 1, _product: product });
            toast.success('Товар добавлен в корзину');
          }}
        >
          <ShoppingCart size={14} className="sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">В корзину</span>
          <span className="sm:hidden">Купить</span>
        </Button>
      </div>
    </div>
  );
}
