import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, FolderTree, Settings2, ChevronRight } from 'lucide-react';
import { adminApi } from '../../api';
import { toast } from '../../components/ui/Toast';
import type { AdminCategory, AdminCategoryTreeItem, AdminSpecName } from '../../types/admin';

// ─── Spec modal ────────────────────────────────────────────────────────────────

const FILTER_TYPES: { value: AdminSpecName['filter_type']; label: string }[] = [
  { value: 'checkbox', label: 'Чекбокс' },
  { value: 'range',    label: 'Диапазон' },
  { value: 'select',   label: 'Список' },
];

const emptySpec = (categoryId: number): Omit<AdminSpecName, 'id'> => ({
  name: '',
  category: categoryId,
  unit: '',
  filter_type: 'checkbox',
  is_filterable: true,
  is_comparable: false,
  order: 0,
});

interface SpecModalProps {
  categoryId: number;
  spec: AdminSpecName | null; // null = create mode
  onClose: () => void;
  onSaved: () => void;
}

function SpecModal({ categoryId, spec, onClose, onSaved }: SpecModalProps) {
  const [form, setForm] = useState<Omit<AdminSpecName, 'id'>>(
    spec ? { ...spec } : emptySpec(categoryId)
  );
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (spec) {
        await adminApi.updateAdminSpecName(spec.id, form);
        toast.success('Характеристика обновлена');
      } else {
        await adminApi.createAdminSpecName(form);
        toast.success('Характеристика добавлена');
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-bg-card shadow-xl rounded-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg">{spec ? 'Редактировать' : 'Новая'} характеристику</h3>
          <button onClick={onClose} className="p-1 hover:bg-bg-card-hover rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-text-secondary mb-1">Название *</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
              placeholder="Например: Частота процессора"
              className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-secondary mb-1">Единица измерения</label>
              <input
                value={form.unit}
                onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                placeholder="ГГц, МБ, Вт..."
                className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Порядок</label>
              <input
                type="number"
                value={form.order}
                onChange={e => setForm(f => ({ ...f, order: Number(e.target.value) }))}
                className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-text-secondary mb-1">Тип фильтра</label>
            <select
              value={form.filter_type}
              onChange={e => setForm(f => ({ ...f, filter_type: e.target.value as AdminSpecName['filter_type'] }))}
              className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
            >
              {FILTER_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_filterable}
                onChange={e => setForm(f => ({ ...f, is_filterable: e.target.checked }))}
                className="w-4 h-4 rounded accent-primary"
              />
              <span className="text-sm">Фильтруемый</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_comparable}
                onChange={e => setForm(f => ({ ...f, is_comparable: e.target.checked }))}
                className="w-4 h-4 rounded accent-primary"
              />
              <span className="text-sm">Сравниваемый</span>
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-bg-secondary border border-border text-sm py-2.5 rounded-lg hover:bg-bg-card-hover transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-primary hover:bg-primary-dark text-white text-sm py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {saving ? 'Сохранение...' : spec ? 'Сохранить' : 'Добавить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function CategoriesPage() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [treeItems, setTreeItems] = useState<AdminCategoryTreeItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Category modal
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formParent, setFormParent] = useState<string>('');
  const [formImage, setFormImage] = useState<File | null>(null);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formOrder, setFormOrder] = useState(0);
  const [formMetaTitle, setFormMetaTitle] = useState('');
  const [formMetaDescription, setFormMetaDescription] = useState('');
  const [savingCat, setSavingCat] = useState(false);

  // Spec management
  const [selectedCat, setSelectedCat] = useState<AdminCategory | null>(null);
  const [specs, setSpecs] = useState<AdminSpecName[]>([]);
  const [specsLoading, setSpecsLoading] = useState(false);
  const [specModalOpen, setSpecModalOpen] = useState(false);
  const [editingSpec, setEditingSpec] = useState<AdminSpecName | null>(null);

  const fetchCategories = () => {
    setLoading(true);
    Promise.all([adminApi.getAdminCategories(), adminApi.getAdminCategoryTree()])
      .then(([cats, tree]) => {
        setCategories(cats);
        setTreeItems(tree);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCategories(); }, []);

  // Load specs when category is selected
  const selectCatForSpecs = (cat: AdminCategory) => {
    if (selectedCat?.id === cat.id) {
      setSelectedCat(null);
      setSpecs([]);
      return;
    }
    setSelectedCat(cat);
    setSpecsLoading(true);
    adminApi.getAdminSpecNames(cat.id)
      .then(setSpecs)
      .finally(() => setSpecsLoading(false));
  };

  const reloadSpecs = () => {
    if (!selectedCat) return;
    setSpecsLoading(true);
    adminApi.getAdminSpecNames(selectedCat.id)
      .then(setSpecs)
      .finally(() => setSpecsLoading(false));
  };

  const handleDeleteSpec = async (spec: AdminSpecName) => {
    if (!confirm(`Удалить характеристику "${spec.name}"?`)) return;
    try {
      await adminApi.deleteAdminSpecName(spec.id);
      toast.success('Характеристика удалена');
      reloadSpecs();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Ошибка удаления');
    }
  };

  // ── Category modal helpers ──────────────────────────────────────────────────

  const resetCatForm = () => {
    setFormName('');
    setFormDescription('');
    setFormParent('');
    setFormImage(null);
    setFormIsActive(true);
    setFormOrder(0);
    setFormMetaTitle('');
    setFormMetaDescription('');
    setEditingCatId(null);
  };

  const openCreateCat = () => { resetCatForm(); setCatModalOpen(true); };

  const openEditCat = (cat: AdminCategory) => {
    setEditingCatId(cat.id);
    setFormName(cat.name);
    setFormDescription(cat.description);
    setFormParent(cat.parent ? String(cat.parent) : '');
    setFormImage(null);
    setFormIsActive(cat.is_active);
    setFormOrder(cat.order);
    setFormMetaTitle(cat.meta_title);
    setFormMetaDescription(cat.meta_description);
    setCatModalOpen(true);
  };

  const handleCatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    setSavingCat(true);
    const fd = new FormData();
    fd.append('name', formName);
    fd.append('description', formDescription);
    if (formParent) fd.append('parent', formParent);
    if (formImage) fd.append('image', formImage);
    fd.append('is_active', String(formIsActive));
    fd.append('order', String(formOrder));
    fd.append('meta_title', formMetaTitle);
    fd.append('meta_description', formMetaDescription);
    try {
      if (editingCatId) {
        await adminApi.updateAdminCategory(editingCatId, fd);
        toast.success('Категория обновлена');
      } else {
        await adminApi.createAdminCategory(fd);
        toast.success('Категория создана');
      }
      setCatModalOpen(false);
      resetCatForm();
      fetchCategories();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Ошибка сохранения');
    } finally {
      setSavingCat(false);
    }
  };

  const handleDeleteCat = async (cat: AdminCategory) => {
    if (!confirm(`Удалить категорию "${cat.name}"?`)) return;
    try {
      await adminApi.deleteAdminCategory(cat.id);
      toast.success('Категория удалена');
      if (selectedCat?.id === cat.id) { setSelectedCat(null); setSpecs([]); }
      fetchCategories();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Ошибка удаления');
    }
  };

  const getIndent = (cat: AdminCategory) => {
    const tree = treeItems.find(t => t.id === cat.id);
    return tree ? tree.level : 0;
  };

  const filterTypeBadge = (ft: AdminSpecName['filter_type']) => {
    const map: Record<string, string> = { checkbox: 'Чекбокс', range: 'Диапазон', select: 'Список' };
    const colors: Record<string, string> = {
      checkbox: 'bg-primary/15 text-primary',
      range: 'bg-accent/15 text-accent-dark',
      select: 'bg-warning/15 text-warning',
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[ft]}`}>
        {map[ft]}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Категории</h1>
        <button
          onClick={openCreateCat}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Добавить категорию
        </button>
      </div>

      {/* Categories table */}
      <div className="bg-bg-card shadow-sm rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-text-muted text-xs border-b border-border bg-bg-secondary">
                <th className="text-left px-4 py-3">Изображение</th>
                <th className="text-left px-4 py-3">Название</th>
                <th className="text-left px-4 py-3">Slug</th>
                <th className="text-center px-4 py-3">Товаров</th>
                <th className="text-center px-4 py-3">Подкатегорий</th>
                <th className="text-center px-4 py-3">Активна</th>
                <th className="text-center px-4 py-3">Характеристики</th>
                <th className="text-center px-4 py-3">Действия</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-10">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-text-muted">Категорий нет</td>
                </tr>
              ) : (
                categories.map(cat => (
                  <tr
                    key={cat.id}
                    className={`border-b border-border/50 transition-colors ${selectedCat?.id === cat.id ? 'bg-primary/5' : 'hover:bg-bg-card-hover'}`}
                  >
                    <td className="px-4 py-3">
                      {cat.image ? (
                        <img src={cat.image} alt="" className="w-10 h-10 rounded object-cover" loading="lazy" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-bg-secondary flex items-center justify-center">
                          <FolderTree className="w-4 h-4 text-text-muted" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span style={{ paddingLeft: `${getIndent(cat) * 20}px` }} className="font-medium">
                        {'—'.repeat(getIndent(cat))}{getIndent(cat) > 0 ? ' ' : ''}{cat.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary font-mono text-xs">{cat.slug}</td>
                    <td className="px-4 py-3 text-center">{cat.products_count}</td>
                    <td className="px-4 py-3 text-center">{cat.children_count}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-1 rounded-full ${cat.is_active ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                        {cat.is_active ? 'Да' : 'Нет'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => selectCatForSpecs(cat)}
                        className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                          selectedCat?.id === cat.id
                            ? 'bg-primary text-white'
                            : 'bg-bg-secondary hover:bg-primary/10 text-text-secondary hover:text-primary border border-border'
                        }`}
                        title="Управление характеристиками"
                      >
                        <Settings2 className="w-3.5 h-3.5" />
                        Характеристики
                        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${selectedCat?.id === cat.id ? 'rotate-90' : ''}`} />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEditCat(cat)}
                          className="p-1.5 hover:bg-bg-card-hover rounded-lg transition-colors"
                          title="Редактировать"
                        >
                          <Pencil className="w-4 h-4 text-text-secondary" />
                        </button>
                        <button
                          onClick={() => handleDeleteCat(cat)}
                          className="p-1.5 hover:bg-danger/10 rounded-lg transition-colors"
                          title="Удалить"
                        >
                          <Trash2 className="w-4 h-4 text-danger" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Spec management panel ──────────────────────────────────────────────── */}
      {selectedCat && (
        <div className="bg-bg-card shadow-sm rounded-xl overflow-hidden border border-primary/20">
          {/* Panel header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-primary/5">
            <div className="flex items-center gap-3">
              <Settings2 className="w-5 h-5 text-primary" />
              <div>
                <h2 className="font-bold text-base">Характеристики категории</h2>
                <p className="text-text-secondary text-sm">{selectedCat.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setEditingSpec(null); setSpecModalOpen(true); }}
                className="flex items-center gap-1.5 bg-primary hover:bg-primary-dark text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" /> Добавить характеристику
              </button>
              <button
                onClick={() => { setSelectedCat(null); setSpecs([]); }}
                className="p-2 hover:bg-bg-card-hover rounded-lg transition-colors"
                title="Закрыть"
              >
                <X className="w-4 h-4 text-text-secondary" />
              </button>
            </div>
          </div>

          {/* Specs table */}
          <div className="overflow-x-auto">
            {specsLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : specs.length === 0 ? (
              <div className="text-center py-12 text-text-muted">
                <Settings2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Характеристик пока нет</p>
                <p className="text-sm mt-1">Нажмите «Добавить характеристику», чтобы создать первую</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-text-muted text-xs border-b border-border bg-bg-secondary">
                    <th className="text-left px-4 py-3">Название</th>
                    <th className="text-left px-4 py-3">Единица</th>
                    <th className="text-center px-4 py-3">Тип фильтра</th>
                    <th className="text-center px-4 py-3">Фильтр</th>
                    <th className="text-center px-4 py-3">Сравнение</th>
                    <th className="text-center px-4 py-3">Порядок</th>
                    <th className="text-center px-4 py-3">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {specs.map(spec => (
                    <tr key={spec.id} className="border-b border-border/50 hover:bg-bg-card-hover">
                      <td className="px-4 py-3 font-medium">{spec.name}</td>
                      <td className="px-4 py-3 text-text-secondary">{spec.unit || '—'}</td>
                      <td className="px-4 py-3 text-center">{filterTypeBadge(spec.filter_type)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${spec.is_filterable ? 'bg-success/20 text-success' : 'bg-border text-text-muted'}`}>
                          {spec.is_filterable ? 'Да' : 'Нет'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${spec.is_comparable ? 'bg-success/20 text-success' : 'bg-border text-text-muted'}`}>
                          {spec.is_comparable ? 'Да' : 'Нет'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-text-secondary">{spec.order}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => { setEditingSpec(spec); setSpecModalOpen(true); }}
                            className="p-1.5 hover:bg-bg-card-hover rounded-lg transition-colors"
                            title="Редактировать"
                          >
                            <Pencil className="w-4 h-4 text-text-secondary" />
                          </button>
                          <button
                            onClick={() => handleDeleteSpec(spec)}
                            className="p-1.5 hover:bg-danger/10 rounded-lg transition-colors"
                            title="Удалить"
                          >
                            <Trash2 className="w-4 h-4 text-danger" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Category modal ─────────────────────────────────────────────────────── */}
      {catModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-bg-card shadow-sm rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editingCatId ? 'Редактировать' : 'Новая категория'}</h2>
              <button onClick={() => setCatModalOpen(false)} className="p-1 hover:bg-bg-card-hover rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCatSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-text-secondary mb-1">Название *</label>
                <input
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  required
                  className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs text-text-secondary mb-1">Родительская категория</label>
                <select
                  value={formParent}
                  onChange={e => setFormParent(e.target.value)}
                  className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
                >
                  <option value="">— Нет (корневая) —</option>
                  {treeItems.filter(t => t.id !== editingCatId).map(t => (
                    <option key={t.id} value={t.id}>{'—'.repeat(t.level)} {t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-text-secondary mb-1">Описание</label>
                <textarea
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs text-text-secondary mb-1">Изображение</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setFormImage(e.target.files?.[0] || null)}
                  className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-2 text-sm file:mr-3 file:bg-primary file:text-white file:border-0 file:rounded file:px-3 file:py-1 file:text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Порядок</label>
                  <input
                    type="number"
                    value={formOrder}
                    onChange={e => setFormOrder(Number(e.target.value))}
                    className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={e => setFormIsActive(e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">Активна</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs text-text-secondary mb-1">Meta Title</label>
                <input
                  value={formMetaTitle}
                  onChange={e => setFormMetaTitle(e.target.value)}
                  className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs text-text-secondary mb-1">Meta Description</label>
                <textarea
                  value={formMetaDescription}
                  onChange={e => setFormMetaDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCatModalOpen(false)}
                  className="flex-1 bg-bg-secondary border border-border text-sm py-2.5 rounded-lg hover:bg-bg-card-hover transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={savingCat}
                  className="flex-1 bg-primary hover:bg-primary-dark text-white text-sm py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {savingCat ? 'Сохранение...' : editingCatId ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Spec modal ─────────────────────────────────────────────────────────── */}
      {specModalOpen && selectedCat && (
        <SpecModal
          categoryId={selectedCat.id}
          spec={editingSpec}
          onClose={() => setSpecModalOpen(false)}
          onSaved={reloadSpecs}
        />
      )}
    </div>
  );
}
