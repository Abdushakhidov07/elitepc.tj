import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Upload, Trash2, Settings2, ImagePlus } from 'lucide-react';
import { adminApi } from '../../api';
import { toast } from '../../components/ui/Toast';
import SpecNamesManager from '../../components/admin/SpecNamesManager';
import type {
  AdminCategoryTreeItem,
  AdminBrand,
  AdminSpecName,
  AdminProductDetail,
  AdminProductImage,
} from '../../types/admin';

export default function ProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  // Data for dropdowns
  const [categories, setCategories] = useState<AdminCategoryTreeItem[]>([]);
  const [brands, setBrands] = useState<AdminBrand[]>([]);
  const [specNames, setSpecNames] = useState<AdminSpecName[]>([]);

  // Product form state
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [brandId, setBrandId] = useState<string>('');
  const [price, setPrice] = useState('');
  const [discountPrice, setDiscountPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('0');
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  const [mainImagePreview, setMainImagePreview] = useState<string | null>(null);

  // Specifications
  const [specValues, setSpecValues] = useState<Record<number, string>>({});

  // Additional images (edit mode only)
  const [images, setImages] = useState<AdminProductImage[]>([]);

  // Spec names manager modal
  const [specManagerOpen, setSpecManagerOpen] = useState(false);
  const [specManagerCategoryName, setSpecManagerCategoryName] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load dropdowns
  useEffect(() => {
    Promise.all([adminApi.getAdminCategoryTree(), adminApi.getAdminBrands()])
      .then(([cats, brs]) => {
        setCategories(cats);
        setBrands(brs);
      });
  }, []);

  // Load product for editing
  useEffect(() => {
    if (!isEdit) {
      setLoading(false);
      return;
    }
    adminApi.getAdminProductDetail(Number(id))
      .then((p: AdminProductDetail) => {
        setName(p.name);
        setSku(p.sku);
        setDescription(p.description);
        setShortDescription(p.short_description);
        setCategoryId(String(p.category));
        setBrandId(p.brand ? String(p.brand) : '');
        setPrice(p.price);
        setDiscountPrice(p.discount_price || '');
        setStockQuantity(String(p.stock_quantity));
        setIsActive(p.is_active);
        setIsFeatured(p.is_featured);
        setMainImagePreview(p.main_image);
        setImages(p.images);

        // Build spec values map
        const sv: Record<number, string> = {};
        for (const spec of p.specifications) {
          sv[spec.spec_name] = spec.value;
        }
        setSpecValues(sv);
      })
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  // Load spec names when category changes
  useEffect(() => {
    if (!categoryId) {
      setSpecNames([]);
      return;
    }
    adminApi.getAdminSpecNames(Number(categoryId)).then(setSpecNames);
    const cat = categories.find(c => c.id === Number(categoryId));
    if (cat) setSpecManagerCategoryName(cat.name);
  }, [categoryId, categories]);

  const handleMainImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMainImageFile(file);
      setMainImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !sku.trim() || !categoryId || !price) {
      toast.error('Заполните обязательные поля: название, SKU, категория, цена');
      return;
    }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', name);
      fd.append('sku', sku);
      fd.append('description', description);
      fd.append('short_description', shortDescription);
      fd.append('category', categoryId);
      if (brandId) fd.append('brand', brandId);
      fd.append('price', price);
      if (discountPrice) fd.append('discount_price', discountPrice);
      fd.append('stock_quantity', stockQuantity);
      fd.append('is_active', String(isActive));
      fd.append('is_featured', String(isFeatured));
      if (mainImageFile) fd.append('main_image', mainImageFile);

      let productId: number;
      if (isEdit) {
        const updated = await adminApi.updateAdminProductFull(Number(id), fd);
        productId = updated.id;
      } else {
        const created = await adminApi.createAdminProduct(fd);
        productId = created.id;
      }

      // Save specifications
      const specs = specNames
        .filter(sn => specValues[sn.id]?.trim())
        .map(sn => ({ spec_name: sn.id, value: specValues[sn.id].trim() }));
      if (specs.length > 0) {
        await adminApi.setProductSpecs(productId, specs);
      }

      toast.success(isEdit ? 'Товар обновлён' : 'Товар создан');
      navigate('/admin/products');
    } catch (err: any) {
      const detail = err.response?.data;
      if (detail && typeof detail === 'object') {
        const messages = Object.entries(detail).map(([k, v]) => `${k}: ${v}`).join(', ');
        toast.error(messages);
      } else {
        toast.error('Ошибка сохранения');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    const fd = new FormData();
    fd.append('image', file);
    try {
      const img = await adminApi.uploadProductImage(Number(id), fd);
      setImages([...images, img]);
      toast.success('Изображение загружено');
    } catch {
      toast.error('Ошибка загрузки изображения');
    }
  };

  const handleImageDelete = async (imageId: number) => {
    try {
      await adminApi.deleteProductImage(imageId);
      setImages(images.filter(i => i.id !== imageId));
      toast.success('Изображение удалено');
    } catch {
      toast.error('Ошибка удаления');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/admin/products')} className="p-2 hover:bg-bg-card-hover rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">{isEdit ? 'Редактировать товар' : 'Новый товар'}</h1>
      </div>

      {/* Basic Info */}
      <div className="bg-bg-card shadow-sm rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Основная информация</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-text-secondary mb-1">Название *</label>
            <input value={name} onChange={e => setName(e.target.value)} required
              className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">SKU *</label>
            <input value={sku} onChange={e => setSku(e.target.value)} required
              className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary" />
          </div>
        </div>

        <div>
          <label className="block text-xs text-text-secondary mb-1">Краткое описание</label>
          <input value={shortDescription} onChange={e => setShortDescription(e.target.value)}
            className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary" />
        </div>

        <div>
          <label className="block text-xs text-text-secondary mb-1">Описание</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4}
            className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-text-secondary mb-1">Категория *</label>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)} required
              className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary">
              <option value="">— Выберите —</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{'—'.repeat(c.level)} {c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Бренд</label>
            <select value={brandId} onChange={e => setBrandId(e.target.value)}
              className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary">
              <option value="">— Без бренда —</option>
              {brands.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-text-secondary mb-1">Цена *</label>
            <input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} required
              className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Цена со скидкой</label>
            <input type="number" step="0.01" value={discountPrice} onChange={e => setDiscountPrice(e.target.value)}
              className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">На складе</label>
            <input type="number" value={stockQuantity} onChange={e => setStockQuantity(e.target.value)}
              className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary" />
          </div>
        </div>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-4 h-4 rounded" />
            <span className="text-sm">Активен</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isFeatured} onChange={e => setIsFeatured(e.target.checked)} className="w-4 h-4 rounded" />
            <span className="text-sm">Хит продаж</span>
          </label>
        </div>
      </div>

      {/* Main Image */}
      <div className="bg-bg-card shadow-sm rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Главное изображение</h2>
        <div className="flex items-start gap-4">
          {mainImagePreview && (
            <img src={mainImagePreview} alt="Preview" className="w-32 h-32 rounded-lg object-contain bg-bg-secondary" loading="lazy" />
          )}
          <div>
            <label className="flex items-center gap-2 bg-bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm cursor-pointer hover:border-primary transition-colors">
              <Upload className="w-4 h-4" /> Выбрать файл
              <input type="file" accept="image/*" onChange={handleMainImageChange} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {/* Additional Images (edit mode) */}
      {isEdit && (
        <div className="bg-bg-card shadow-sm rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Дополнительные изображения</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {images.map(img => (
              <div key={img.id} className="relative group rounded-lg overflow-hidden bg-bg-secondary">
                <img src={img.image} alt={img.alt_text} className="w-full h-32 object-contain" loading="lazy" />
                {img.is_main && (
                  <span className="absolute top-1 left-1 bg-primary text-white text-xs px-1.5 py-0.5 rounded">Главное</span>
                )}
                <button
                  onClick={() => handleImageDelete(img.id)}
                  className="absolute top-1 right-1 bg-bg-card-hover/80 hover:bg-danger/20 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5 text-danger" />
                </button>
              </div>
            ))}
            <label className="flex flex-col items-center justify-center h-32 rounded-lg border-2 border-dashed border-border hover:border-primary cursor-pointer transition-colors">
              <ImagePlus className="w-6 h-6 text-text-muted mb-1" />
              <span className="text-xs text-text-muted">Добавить</span>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          </div>
        </div>
      )}

      {/* Specifications */}
      {categoryId && (
        <div className="bg-bg-card shadow-sm rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Характеристики</h2>
            <button
              onClick={() => setSpecManagerOpen(true)}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary-dark transition-colors"
            >
              <Settings2 className="w-3.5 h-3.5" /> Управление
            </button>
          </div>

          {specNames.length === 0 ? (
            <p className="text-sm text-text-muted">
              Для этой категории нет характеристик.{' '}
              <button onClick={() => setSpecManagerOpen(true)} className="text-primary hover:underline">
                Добавить
              </button>
            </p>
          ) : (
            <div className="space-y-3">
              {specNames.map(sn => (
                <div key={sn.id} className="grid grid-cols-[200px_1fr] gap-3 items-center">
                  <label className="text-sm text-text-secondary">
                    {sn.name}
                    {sn.unit && <span className="text-text-muted ml-1">({sn.unit})</span>}
                  </label>
                  <input
                    value={specValues[sn.id] || ''}
                    onChange={e => setSpecValues({ ...specValues, [sn.id]: e.target.value })}
                    placeholder={`Значение${sn.unit ? ` (${sn.unit})` : ''}`}
                    className="bg-bg-secondary border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={() => navigate('/admin/products')}
          className="flex-1 bg-bg-secondary border border-border text-sm py-3 rounded-lg hover:bg-bg-card-hover transition-colors">
          Отмена
        </button>
        <button onClick={handleSave} disabled={saving}
          className="flex-1 bg-primary hover:bg-primary-dark text-white text-sm py-3 rounded-lg font-medium transition-colors disabled:opacity-50">
          {saving ? 'Сохранение...' : isEdit ? 'Сохранить изменения' : 'Создать товар'}
        </button>
      </div>

      {/* Spec Names Manager Modal */}
      <SpecNamesManager
        categoryId={Number(categoryId)}
        categoryName={specManagerCategoryName}
        open={specManagerOpen}
        onClose={() => {
          setSpecManagerOpen(false);
          // Reload spec names
          if (categoryId) {
            adminApi.getAdminSpecNames(Number(categoryId)).then(setSpecNames);
          }
        }}
      />
    </div>
  );
}
