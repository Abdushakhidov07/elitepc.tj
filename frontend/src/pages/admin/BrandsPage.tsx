import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Tag } from 'lucide-react';
import { adminApi } from '../../api';
import { toast } from '../../components/ui/Toast';
import type { AdminBrand } from '../../types/admin';

export default function BrandsPage() {
  const [brands, setBrands] = useState<AdminBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formLogo, setFormLogo] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchBrands = () => {
    setLoading(true);
    adminApi.getAdminBrands()
      .then(setBrands)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchBrands(); }, []);

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormLogo(null);
    setEditingId(null);
  };

  const openCreate = () => { resetForm(); setModalOpen(true); };

  const openEdit = (brand: AdminBrand) => {
    setEditingId(brand.id);
    setFormName(brand.name);
    setFormDescription(brand.description);
    setFormLogo(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    setSaving(true);
    const fd = new FormData();
    fd.append('name', formName);
    fd.append('description', formDescription);
    if (formLogo) fd.append('logo', formLogo);
    try {
      if (editingId) {
        await adminApi.updateAdminBrand(editingId, fd);
        toast.success('Бренд обновлён');
      } else {
        await adminApi.createAdminBrand(fd);
        toast.success('Бренд создан');
      }
      setModalOpen(false);
      resetForm();
      fetchBrands();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (brand: AdminBrand) => {
    if (!confirm(`Удалить бренд "${brand.name}"?`)) return;
    try {
      await adminApi.deleteAdminBrand(brand.id);
      toast.success('Бренд удалён');
      fetchBrands();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Ошибка удаления');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Бренды</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Добавить бренд
        </button>
      </div>

      <div className="bg-bg-card shadow-sm rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-text-muted text-xs border-b border-border bg-bg-secondary">
                <th className="text-left px-4 py-3">Логотип</th>
                <th className="text-left px-4 py-3">Название</th>
                <th className="text-left px-4 py-3">Slug</th>
                <th className="text-left px-4 py-3">Описание</th>
                <th className="text-center px-4 py-3">Действия</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-10">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : brands.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-text-muted">Брендов нет</td>
                </tr>
              ) : (
                brands.map(brand => (
                  <tr key={brand.id} className="border-b border-border/50 hover:bg-bg-card-hover">
                    <td className="px-4 py-3">
                      {brand.logo ? (
                        <img src={brand.logo} alt={brand.name} className="w-10 h-10 rounded object-contain bg-white p-1" loading="lazy" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-bg-secondary flex items-center justify-center">
                          <Tag className="w-4 h-4 text-text-muted" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">{brand.name}</td>
                    <td className="px-4 py-3 text-text-secondary font-mono text-xs">{brand.slug}</td>
                    <td className="px-4 py-3 text-text-secondary max-w-xs truncate">{brand.description || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEdit(brand)}
                          className="p-1.5 hover:bg-bg-card-hover rounded-lg transition-colors"
                          title="Редактировать"
                        >
                          <Pencil className="w-4 h-4 text-text-secondary" />
                        </button>
                        <button
                          onClick={() => handleDelete(brand)}
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

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-bg-card shadow-xl rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">{editingId ? 'Редактировать бренд' : 'Новый бренд'}</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-bg-card-hover rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-text-secondary mb-1">Название *</label>
                <input
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  required
                  placeholder="Например: ASUS, Intel, Samsung..."
                  className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs text-text-secondary mb-1">Описание</label>
                <textarea
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  rows={3}
                  placeholder="Краткое описание бренда..."
                  className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary resize-none"
                />
              </div>

              <div>
                <label className="block text-xs text-text-secondary mb-1">Логотип</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setFormLogo(e.target.files?.[0] || null)}
                  className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-2 text-sm file:mr-3 file:bg-primary file:text-white file:border-0 file:rounded file:px-3 file:py-1 file:text-xs cursor-pointer"
                />
                {editingId && !formLogo && (
                  <p className="text-xs text-text-muted mt-1">Оставьте пустым, чтобы не менять логотип</p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 bg-bg-secondary border border-border text-sm py-2.5 rounded-lg hover:bg-bg-card-hover transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-primary hover:bg-primary-dark text-white text-sm py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? 'Сохранение...' : editingId ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
