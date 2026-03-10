import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Check, X, Plus, Pencil, Trash2 } from 'lucide-react';
import { adminApi } from '../../api';
import { toast } from '../../components/ui/Toast';
import type { AdminProduct } from '../../types/admin';

// Images use relative URLs (/media/...) — works with both Vite proxy and Nginx
const API_BASE = '';

export default function ProductsPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<{ price?: string; discount_price?: string; stock_quantity?: number; is_active?: boolean }>({});

  const fetchProducts = () => {
    setLoading(true);
    const params: { search?: string } = {};
    if (searchQuery.trim()) params.search = searchQuery.trim();
    adminApi.getAdminProducts(params)
      .then(setProducts)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(fetchProducts, 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => { fetchProducts(); }, []);

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
      fetchProducts();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Ошибка обновления');
    }
  };

  const toggleActive = async (product: AdminProduct) => {
    try {
      await adminApi.updateAdminProduct(product.id, { is_active: !product.is_active });
      toast.success(product.is_active ? 'Товар деактивирован' : 'Товар активирован');
      fetchProducts();
    } catch {
      toast.error('Ошибка обновления');
    }
  };

  const handleDeleteProduct = async (product: AdminProduct) => {
    if (!confirm(`Удалить товар "${product.name}"?`)) return;
    try {
      await adminApi.deleteAdminProduct(product.id);
      toast.success('Товар удалён');
      fetchProducts();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Ошибка удаления');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Товары</h1>
        <Link to="/admin/products/new"
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Добавить товар
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          type="text"
          placeholder="Поиск по названию или SKU..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-bg-secondary border border-border rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary"
        />
      </div>

      {/* Table */}
      <div className="bg-bg-card shadow-sm rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-text-muted text-xs border-b border-border bg-bg-secondary">
                <th className="text-left px-4 py-3">Фото</th>
                <th className="text-left px-4 py-3">Название</th>
                <th className="text-left px-4 py-3">SKU</th>
                <th className="text-left px-4 py-3">Категория</th>
                <th className="text-right px-4 py-3">Цена</th>
                <th className="text-right px-4 py-3">Скидка</th>
                <th className="text-center px-4 py-3">Остаток</th>
                <th className="text-center px-4 py-3">Активен</th>
                <th className="text-center px-4 py-3">Действия</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-10">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-text-muted">Товаров не найдено</td>
                </tr>
              ) : (
                products.map(product => {
                  const isEditing = editingId === product.id;
                  return (
                    <tr key={product.id} className="border-b border-border/50 hover:bg-bg-card-hover">
                      {/* Image */}
                      <td className="px-4 py-3">
                        {product.main_image ? (
                          <img
                            src={product.main_image.startsWith('http') ? product.main_image : `${API_BASE}${product.main_image}`}
                            alt={product.name}
                            className="w-10 h-10 rounded-lg object-cover bg-bg-secondary"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-bg-secondary flex items-center justify-center text-text-muted text-xs">--</div>
                        )}
                      </td>
                      {/* Name */}
                      <td className="px-4 py-3">
                        <div className="font-medium max-w-[200px] truncate" title={product.name}>{product.name}</div>
                        {product.brand_name && <span className="text-text-muted text-xs">{product.brand_name}</span>}
                      </td>
                      {/* SKU */}
                      <td className="px-4 py-3 text-text-secondary text-xs font-mono">{product.sku}</td>
                      {/* Category */}
                      <td className="px-4 py-3 text-text-secondary">{product.category_name}</td>
                      {/* Price */}
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editValues.price || ''}
                            onChange={e => setEditValues({ ...editValues, price: e.target.value })}
                            className="w-24 bg-bg-secondary border border-border rounded px-2 py-1 text-sm text-right focus:outline-none focus:border-primary"
                          />
                        ) : (
                          <span className="font-medium">{parseFloat(product.price).toLocaleString()} с.</span>
                        )}
                      </td>
                      {/* Discount Price */}
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editValues.discount_price || ''}
                            onChange={e => setEditValues({ ...editValues, discount_price: e.target.value })}
                            placeholder="—"
                            className="w-24 bg-bg-secondary border border-border rounded px-2 py-1 text-sm text-right focus:outline-none focus:border-primary"
                          />
                        ) : (
                          <span className={product.discount_price ? 'text-green-400 font-medium' : 'text-text-muted'}>
                            {product.discount_price ? `${parseFloat(product.discount_price).toLocaleString()} с.` : '—'}
                          </span>
                        )}
                      </td>
                      {/* Stock */}
                      <td className="px-4 py-3 text-center">
                        {isEditing ? (
                          <input
                            type="number"
                            min={0}
                            value={editValues.stock_quantity ?? 0}
                            onChange={e => setEditValues({ ...editValues, stock_quantity: parseInt(e.target.value) || 0 })}
                            className="w-16 bg-bg-secondary border border-border rounded px-2 py-1 text-sm text-center focus:outline-none focus:border-primary"
                          />
                        ) : (
                          <span className={`font-medium ${product.stock_quantity <= 5 ? 'text-red-400' : product.stock_quantity <= 15 ? 'text-yellow-400' : 'text-green-400'}`}>
                            {product.stock_quantity}
                          </span>
                        )}
                      </td>
                      {/* Active Toggle */}
                      <td className="px-4 py-3 text-center">
                        {isEditing ? (
                          <button
                            onClick={() => setEditValues({ ...editValues, is_active: !editValues.is_active })}
                            className={`w-10 h-5 rounded-full relative transition-colors ${editValues.is_active ? 'bg-green-500' : 'bg-gray-600'}`}
                          >
                            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${editValues.is_active ? 'left-5' : 'left-0.5'}`} />
                          </button>
                        ) : (
                          <button
                            onClick={() => toggleActive(product)}
                            className={`w-10 h-5 rounded-full relative transition-colors ${product.is_active ? 'bg-green-500' : 'bg-gray-600'}`}
                          >
                            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${product.is_active ? 'left-5' : 'left-0.5'}`} />
                          </button>
                        )}
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => saveEdit(product.id)}
                              className="p-1.5 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                              title="Сохранить"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                              title="Отмена"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <Link
                              to={`/admin/products/${product.id}/edit`}
                              className="p-1.5 hover:bg-bg-card-hover rounded-lg transition-colors"
                              title="Редактировать"
                            >
                              <Pencil className="w-4 h-4 text-text-secondary" />
                            </Link>
                            <button
                              onClick={() => startEdit(product)}
                              className="text-xs bg-bg-secondary border border-border rounded-lg px-2 py-1 hover:border-primary transition-colors"
                              title="Быстрое редактирование"
                            >
                              Инлайн
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product)}
                              className="p-1.5 hover:bg-danger/10 rounded-lg transition-colors"
                              title="Удалить"
                            >
                              <Trash2 className="w-4 h-4 text-danger" />
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
      </div>
    </div>
  );
}
