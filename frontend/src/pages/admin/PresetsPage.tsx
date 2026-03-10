import { useEffect, useState } from 'react';
import { Plus, Trash2, X, Search, Package, ImagePlus } from 'lucide-react';
import { adminApi } from '../../api';
import { toast } from '../../components/ui/Toast';
import type { AdminPreset, AdminProduct } from '../../types/admin';

const COMPONENT_SLOTS = [
  { type: 'cpu', label: 'Процессор', slug: 'cpu' },
  { type: 'motherboard', label: 'Материнская плата', slug: 'motherboards' },
  { type: 'ram', label: 'Оперативная память', slug: 'ram' },
  { type: 'gpu', label: 'Видеокарта', slug: 'gpu' },
  { type: 'ssd', label: 'SSD', slug: 'storage' },
  { type: 'hdd', label: 'HDD', slug: 'storage' },
  { type: 'psu', label: 'Блок питания', slug: 'psu' },
  { type: 'case', label: 'Корпус', slug: 'cases' },
  { type: 'cooler', label: 'Кулер / СЖО', slug: 'coolers' },
] as const;

export default function PresetsPage() {
  const [presets, setPresets] = useState<AdminPreset[]>([]);
  const [loading, setLoading] = useState(true);

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [formFee, setFormFee] = useState('500');
  const [formImage, setFormImage] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // Edit preset
  const [editingPreset, setEditingPreset] = useState<AdminPreset | null>(null);

  // Product picker
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerType, setPickerType] = useState('');
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerProducts, setPickerProducts] = useState<AdminProduct[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);

  const fetchPresets = () => {
    setLoading(true);
    adminApi.getAdminPresets().then(setPresets).finally(() => setLoading(false));
  };

  useEffect(() => { fetchPresets(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    setSaving(true);
    try {
      const preset = await adminApi.createAdminPreset({
        name: formName,
        preset_label: formLabel,
        assembly_fee: formFee,
        image: formImage,
      });
      setPresets([preset, ...presets]);
      setCreateOpen(false);
      setFormName('');
      setFormLabel('');
      setFormFee('500');
      setFormImage(null);
      toast.success('Сборка создана');
      setEditingPreset(preset);
    } catch {
      toast.error('Ошибка создания');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (preset: AdminPreset) => {
    if (!confirm(`Удалить сборку "${preset.name}"?`)) return;
    try {
      await adminApi.deleteAdminPreset(preset.id);
      setPresets(presets.filter(p => p.id !== preset.id));
      if (editingPreset?.id === preset.id) setEditingPreset(null);
      toast.success('Сборка удалена');
    } catch {
      toast.error('Ошибка удаления');
    }
  };

  const openPicker = (componentType: string) => {
    setPickerType(componentType);
    setPickerSearch('');
    setPickerProducts([]);
    setPickerOpen(true);
  };

  const searchProducts = () => {
    setPickerLoading(true);
    const slot = COMPONENT_SLOTS.find(s => s.type === pickerType);
    const params: { search?: string; category_slug?: string } = {};
    if (pickerSearch.trim()) params.search = pickerSearch;
    if (slot) params.category_slug = slot.slug;
    adminApi.getAdminProducts(params)
      .then(setPickerProducts)
      .finally(() => setPickerLoading(false));
  };

  useEffect(() => {
    if (!pickerOpen) return;
    const t = setTimeout(searchProducts, pickerSearch.trim() ? 400 : 0);
    return () => clearTimeout(t);
  }, [pickerSearch, pickerOpen]);

  const selectProduct = async (productId: number) => {
    if (!editingPreset) return;
    try {
      await adminApi.addPresetItem(editingPreset.id, {
        product_id: productId,
        component_type: pickerType,
      });
      // Reload preset
      const updated = await adminApi.getAdminPresets();
      setPresets(updated);
      const refreshed = updated.find(p => p.id === editingPreset.id);
      if (refreshed) setEditingPreset(refreshed);
      setPickerOpen(false);
      toast.success('Компонент добавлен');
    } catch {
      toast.error('Ошибка добавления');
    }
  };

  const removeItem = async (itemId: number) => {
    if (!editingPreset) return;
    try {
      await adminApi.removePresetItem(editingPreset.id, itemId);
      const updated = await adminApi.getAdminPresets();
      setPresets(updated);
      const refreshed = updated.find(p => p.id === editingPreset.id);
      if (refreshed) setEditingPreset(refreshed);
      toast.success('Компонент удалён');
    } catch {
      toast.error('Ошибка удаления');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Готовые сборки</h1>
        <button onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Создать сборку
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Presets list */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Список сборок</h2>
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : presets.length === 0 ? (
            <div className="bg-bg-card shadow-sm rounded-xl p-8 text-center">
              <Package className="w-10 h-10 text-text-muted mx-auto mb-3" />
              <p className="text-text-muted">Сборок пока нет</p>
            </div>
          ) : (
            presets.map(preset => (
              <div
                key={preset.id}
                className={`bg-bg-card shadow-sm border rounded-xl p-4 cursor-pointer transition-colors ${
                  editingPreset?.id === preset.id ? 'border-primary' : 'border-border hover:border-primary/40'
                }`}
                onClick={() => setEditingPreset(preset)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {preset.image && (
                      <img src={preset.image} alt="" className="w-12 h-12 rounded-lg object-cover bg-bg-secondary shrink-0" loading="lazy" />
                    )}
                    <div>
                      <h3 className="font-medium">{preset.name}</h3>
                      {preset.preset_label && (
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded mt-1 inline-block">{preset.preset_label}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{parseFloat(preset.total_price).toLocaleString()} с.</span>
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(preset); }}
                      className="p-1.5 hover:bg-danger/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-danger" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-text-muted mt-1">{preset.items_count} компонент(ов) | Сборка: {preset.assembly_fee} с.</p>
              </div>
            ))
          )}
        </div>

        {/* Preset editor */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
            {editingPreset ? `Компоненты: ${editingPreset.name}` : 'Выберите сборку'}
          </h2>

          {editingPreset ? (
            <div className="space-y-3">
              {/* Preset image */}
              <div className="bg-bg-card shadow-sm rounded-xl p-3">
                <div className="flex items-center gap-3">
                  {editingPreset.image ? (
                    <img src={editingPreset.image} alt="" className="w-20 h-20 rounded-lg object-cover bg-bg-secondary" loading="lazy" />
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-bg-secondary flex items-center justify-center">
                      <ImagePlus className="w-6 h-6 text-text-muted" />
                    </div>
                  )}
                  <label className="cursor-pointer text-sm text-primary hover:text-primary-dark transition-colors">
                    {editingPreset.image ? 'Сменить фото' : 'Загрузить фото'}
                    <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const updated = await adminApi.updateAdminPreset(editingPreset.id, { image: file });
                        setPresets(prev => prev.map(p => p.id === updated.id ? updated : p));
                        setEditingPreset(updated);
                        toast.success('Фото обновлено');
                      } catch { toast.error('Ошибка загрузки'); }
                    }} />
                  </label>
                </div>
              </div>

              {COMPONENT_SLOTS.map(slot => {
                const item = editingPreset.items.find(i => i.component_type === slot.type);
                return (
                  <div key={slot.type} className="bg-bg-card shadow-sm rounded-xl p-3 flex items-center gap-3">
                    <div className="w-24 text-xs text-text-secondary font-medium">{slot.label}</div>
                    {item ? (
                      <>
                        {item.product_image && (
                          <img src={item.product_image} alt="" className="w-10 h-10 rounded object-contain bg-bg-secondary shrink-0" loading="lazy" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{item.product_name}</p>
                          <p className="text-xs text-text-muted">{parseFloat(item.product_price).toLocaleString()} с.</p>
                        </div>
                        <button onClick={() => removeItem(item.id)} className="p-1.5 hover:bg-danger/10 rounded-lg transition-colors shrink-0">
                          <Trash2 className="w-4 h-4 text-danger" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => openPicker(slot.type)}
                        className="flex-1 text-left text-sm text-text-muted border border-dashed border-border rounded-lg px-3 py-2 hover:border-primary hover:text-primary transition-colors"
                      >
                        + Выбрать {slot.label.toLowerCase()}
                      </button>
                    )}
                  </div>
                );
              })}

              <div className="bg-bg-card shadow-sm border border-primary/30 rounded-xl p-4 mt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Итого за комплектующие:</span>
                  <span className="font-bold">{parseFloat(editingPreset.total_price).toLocaleString()} с.</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-text-secondary">Сборка:</span>
                  <span>{parseFloat(editingPreset.assembly_fee).toLocaleString()} с.</span>
                </div>
                <div className="flex justify-between text-sm mt-2 pt-2 border-t border-border">
                  <span className="font-medium">Итого с сборкой:</span>
                  <span className="font-bold text-primary">
                    {(parseFloat(editingPreset.total_price) + parseFloat(editingPreset.assembly_fee)).toLocaleString()} с.
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-bg-card shadow-sm rounded-xl p-8 text-center text-text-muted">
              Выберите сборку из списка слева
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-bg-card shadow-sm rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Новая сборка</h2>
              <button onClick={() => setCreateOpen(false)} className="p-1 hover:bg-bg-card-hover rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs text-text-secondary mb-1">Название *</label>
                <input value={formName} onChange={e => setFormName(e.target.value)} required placeholder="Игровой ПК Ultra"
                  className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Лейбл</label>
                <input value={formLabel} onChange={e => setFormLabel(e.target.value)} placeholder="Gaming, Budget, Pro..."
                  className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Стоимость сборки (с.)</label>
                <input type="number" value={formFee} onChange={e => setFormFee(e.target.value)}
                  className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Фото сборки</label>
                <label className="flex items-center gap-2 cursor-pointer bg-bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm hover:border-primary transition-colors">
                  <ImagePlus className="w-4 h-4 text-text-muted" />
                  <span className="text-text-muted">{formImage ? formImage.name : 'Выбрать фото...'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={e => setFormImage(e.target.files?.[0] || null)} />
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setCreateOpen(false)}
                  className="flex-1 bg-bg-secondary border border-border text-sm py-2.5 rounded-lg hover:bg-bg-card-hover transition-colors">
                  Отмена
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-primary hover:bg-primary-dark text-white text-sm py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50">
                  {saving ? 'Создание...' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Picker Modal */}
      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-bg-card shadow-sm rounded-xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Выбрать товар</h2>
              <button onClick={() => setPickerOpen(false)} className="p-1 hover:bg-bg-card-hover rounded-lg"><X className="w-5 h-5" /></button>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                autoFocus
                value={pickerSearch}
                onChange={e => setPickerSearch(e.target.value)}
                placeholder="Поиск по названию или SKU..."
                className="w-full bg-bg-secondary border border-border rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {pickerLoading ? (
                <div className="flex justify-center py-6">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : pickerProducts.length === 0 ? (
                <p className="text-center text-text-muted py-6 text-sm">
                  {pickerSearch ? 'Ничего не найдено' : 'Введите запрос для поиска'}
                </p>
              ) : (
                pickerProducts.map(p => (
                  <button
                    key={p.id}
                    onClick={() => selectProduct(p.id)}
                    className="w-full flex items-center gap-3 bg-bg-secondary border border-border rounded-lg p-3 hover:border-primary transition-colors text-left"
                  >
                    {p.main_image ? (
                      <img src={p.main_image} alt="" className="w-12 h-12 rounded object-contain bg-bg-secondary shrink-0" loading="lazy" />
                    ) : (
                      <div className="w-12 h-12 rounded bg-bg-secondary shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{p.name}</p>
                      <p className="text-xs text-text-muted">{p.sku}</p>
                    </div>
                    <span className="text-sm font-medium shrink-0">{parseFloat(p.price).toLocaleString()} с.</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
