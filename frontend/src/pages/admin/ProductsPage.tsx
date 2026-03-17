import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Check, X, Plus, Pencil, Trash2 } from 'lucide-react';
import { adminApi } from '../../api';
import { toast } from '../../components/ui/Toast';
import type { AdminProduct } from '../../types/admin';

// Images use relative URLs (/media/...) - works with both Vite proxy and Nginx
const API_BASE = '';
const PAGE_SIZE = 25;

export default function ProductsPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<{ price?: string; discount_price?: string; stock_quantity?: number; is_active?: boolean }>({});

  const fetchProducts = (pageToLoad = page) => {
    setLoading(true);
    const params: { search?: string; page: number; page_size: number } = {
      page: pageToLoad,
      page_size: PAGE_SIZE,
    };
    if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
    adminApi.getAdminProducts(params)
      .then((response) => {
        setProducts(response.results);
        setPage(response.page);
        setTotalPages(response.total_pages);
        setTotalCount(response.count);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    fetchProducts(page);
  }, [page, debouncedSearch]);

  const startEdit = (product: AdminProduct) => {
    setEditingId(product.id);
    setEditValues({
      price: product.price,
      discount_price: product.discount_price || '',
      stock_quantity: product.stock_quantity,
      is_active: product.is_active,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({});
  };

  const saveEdit = async (productId: number) => {
    try {
      await adminApi.updateAdminProduct(productId, {
        price: editValues.price,
        discount_price: editValues.discount_price || null,
        stock_quantity: editValues.stock_quantity,
        is_active: editValues.is_active,
      });
      toast.success('Товар обновлён');
      setEditingId(null);
      fetchProducts(page);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Ошибка обновления');
    }
  };

  const toggleActive = async (product: AdminProduct) => {
    try {
      await adminApi.updateAdminProduct(product.id, { is_active: !product.is_active });
      toast.success(product.is_active ? 'Товар деактивирован' : 'Товар активирован');
      fetchProducts(page);
    } catch {
      toast.error('Ошибка обновления');
    }
  };

  const handleDeleteProduct = async (product: AdminProduct) => {
    if (!confirm(`Удалить товар "${product.name}"?`)) return;
    try {
      await adminApi.deleteAdminProduct(product.id);
      toast.success('Товар удалён');
      fetchProducts(page);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Ошибка удаления');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Товары</h1>
        <Link
          to="/admin/products/new"
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
        >
          <Plus className="h-4 w-4" /> Добавить товар
        </Link>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          placeholder="Поиск по названию или SKU..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-border bg-bg-secondary py-2.5 pl-9 pr-4 text-sm focus:border-primary focus:outline-none"
        />
      </div>

      <div className="flex items-center justify-between text-sm text-text-muted">
        <span>Всего товаров: {totalCount}</span>
        <span>Страница {page} из {totalPages}</span>
      </div>

      <div className="overflow-hidden rounded-xl bg-bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-secondary text-xs text-text-muted">
                <th className="px-4 py-3 text-left">Фото</th>
                <th className="px-4 py-3 text-left">Название</th>
                <th className="px-4 py-3 text-left">SKU</th>
                <th className="px-4 py-3 text-left">Категория</th>
                <th className="px-4 py-3 text-right">Цена</th>
                <th className="px-4 py-3 text-right">Скидка</th>
                <th className="px-4 py-3 text-center">Остаток</th>
                <th className="px-4 py-3 text-center">Активен</th>
                <th className="px-4 py-3 text-center">Действия</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center">
                    <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-text-muted">Товаров не найдено</td>
                </tr>
              ) : (
                products.map(product => {
                  const isEditing = editingId === product.id;
                  return (
                    <tr key={product.id} className="border-b border-border/50 hover:bg-bg-card-hover">
                      <td className="px-4 py-3">
                        {product.main_image ? (
                          <img
                            src={product.main_image.startsWith('http') ? product.main_image : `${API_BASE}${product.main_image}`}
                            alt={product.name}
                            className="h-10 w-10 rounded-lg bg-bg-secondary object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-bg-secondary text-xs text-text-muted">--</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="max-w-[200px] truncate font-medium" title={product.name}>{product.name}</div>
                        {product.brand_name && <span className="text-xs text-text-muted">{product.brand_name}</span>}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-text-secondary">{product.sku}</td>
                      <td className="px-4 py-3 text-text-secondary">{product.category_name}</td>
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editValues.price || ''}
                            onChange={e => setEditValues({ ...editValues, price: e.target.value })}
                            className="w-24 rounded border border-border bg-bg-secondary px-2 py-1 text-right text-sm focus:border-primary focus:outline-none"
                          />
                        ) : (
                          <span className="font-medium">{parseFloat(product.price).toLocaleString()} с.</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editValues.discount_price || ''}
                            onChange={e => setEditValues({ ...editValues, discount_price: e.target.value })}
                            placeholder="—"
                            className="w-24 rounded border border-border bg-bg-secondary px-2 py-1 text-right text-sm focus:border-primary focus:outline-none"
                          />
                        ) : (
                          <span className={product.discount_price ? 'font-medium text-green-400' : 'text-text-muted'}>
                            {product.discount_price ? `${parseFloat(product.discount_price).toLocaleString()} с.` : '—'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isEditing ? (
                          <input
                            type="number"
                            min={0}
                            value={editValues.stock_quantity ?? 0}
                            onChange={e => setEditValues({ ...editValues, stock_quantity: parseInt(e.target.value, 10) || 0 })}
                            className="w-16 rounded border border-border bg-bg-secondary px-2 py-1 text-center text-sm focus:border-primary focus:outline-none"
                          />
                        ) : (
                          <span className={`font-medium ${product.stock_quantity <= 5 ? 'text-red-400' : product.stock_quantity <= 15 ? 'text-yellow-400' : 'text-green-400'}`}>
                            {product.stock_quantity}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isEditing ? (
                          <button
                            onClick={() => setEditValues({ ...editValues, is_active: !editValues.is_active })}
                            className={`relative h-5 w-10 rounded-full transition-colors ${editValues.is_active ? 'bg-green-500' : 'bg-gray-600'}`}
                          >
                            <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${editValues.is_active ? 'left-5' : 'left-0.5'}`} />
                          </button>
                        ) : (
                          <button
                            onClick={() => toggleActive(product)}
                            className={`relative h-5 w-10 rounded-full transition-colors ${product.is_active ? 'bg-green-500' : 'bg-gray-600'}`}
                          >
                            <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${product.is_active ? 'left-5' : 'left-0.5'}`} />
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => saveEdit(product.id)}
                              className="rounded-lg bg-green-500/20 p-1.5 text-green-400 transition-colors hover:bg-green-500/30"
                              title="Сохранить"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="rounded-lg bg-red-500/20 p-1.5 text-red-400 transition-colors hover:bg-red-500/30"
                              title="Отмена"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <Link
                              to={`/admin/products/${product.id}/edit`}
                              className="rounded-lg p-1.5 transition-colors hover:bg-bg-card-hover"
                              title="Редактировать"
                            >
                              <Pencil className="h-4 w-4 text-text-secondary" />
                            </Link>
                            <button
                              onClick={() => startEdit(product)}
                              className="rounded-lg border border-border bg-bg-secondary px-2 py-1 text-xs transition-colors hover:border-primary"
                              title="Быстрое редактирование"
                            >
                              Инлайн
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product)}
                              className="rounded-lg p-1.5 transition-colors hover:bg-danger/10"
                              title="Удалить"
                            >
                              <Trash2 className="h-4 w-4 text-danger" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-border bg-bg-secondary px-4 py-3">
          <button
            onClick={() => setPage(current => Math.max(1, current - 1))}
            disabled={page <= 1 || loading}
            className="rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            Назад
          </button>
          <div className="text-sm text-text-muted">
            {totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, totalCount)} из {totalCount}
          </div>
          <button
            onClick={() => setPage(current => Math.min(totalPages, current + 1))}
            disabled={page >= totalPages || loading}
            className="rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            Вперёд
          </button>
        </div>
      </div>
    </div>
  );
}
