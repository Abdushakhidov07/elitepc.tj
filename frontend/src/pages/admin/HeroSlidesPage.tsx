import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Image, GripVertical, Eye, EyeOff } from 'lucide-react';
import { adminApi } from '../../api';
import { toast } from '../../components/ui/Toast';
import type { AdminHeroSlide } from '../../types/admin';

export default function HeroSlidesPage() {
  const [slides, setSlides] = useState<AdminHeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formSubtitle, setFormSubtitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formImage, setFormImage] = useState<File | null>(null);
  const [formButtonText, setFormButtonText] = useState('');
  const [formButtonLink, setFormButtonLink] = useState('');
  const [formOrder, setFormOrder] = useState(0);
  const [formIsActive, setFormIsActive] = useState(true);

  // Preview of existing image when editing
  const [existingImage, setExistingImage] = useState<string | null>(null);

  const fetchSlides = () => {
    setLoading(true);
    adminApi.getAdminHeroSlides()
      .then(setSlides)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSlides(); }, []);

  const resetForm = () => {
    setFormTitle('');
    setFormSubtitle('');
    setFormDescription('');
    setFormImage(null);
    setFormButtonText('');
    setFormButtonLink('');
    setFormOrder(0);
    setFormIsActive(true);
    setExistingImage(null);
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (slide: AdminHeroSlide) => {
    setEditingId(slide.id);
    setFormTitle(slide.title);
    setFormSubtitle(slide.subtitle);
    setFormDescription(slide.description);
    setFormImage(null);
    setFormButtonText(slide.button_text);
    setFormButtonLink(slide.button_link);
    setFormOrder(slide.order);
    setFormIsActive(slide.is_active);
    setExistingImage(slide.image);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    setSaving(true);
    const fd = new FormData();
    fd.append('title', formTitle);
    fd.append('subtitle', formSubtitle);
    fd.append('description', formDescription);
    if (formImage) fd.append('image', formImage);
    fd.append('button_text', formButtonText);
    fd.append('button_link', formButtonLink);
    fd.append('order', String(formOrder));
    fd.append('is_active', String(formIsActive));

    try {
      if (editingId) {
        await adminApi.updateAdminHeroSlide(editingId, fd);
        toast.success('Слайд обновлён');
      } else {
        await adminApi.createAdminHeroSlide(fd);
        toast.success('Слайд создан');
      }
      setModalOpen(false);
      resetForm();
      fetchSlides();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (slide: AdminHeroSlide) => {
    if (!confirm(`Удалить слайд "${slide.title}"?`)) return;
    try {
      await adminApi.deleteAdminHeroSlide(slide.id);
      toast.success('Слайд удалён');
      fetchSlides();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Ошибка удаления');
    }
  };

  const toggleActive = async (slide: AdminHeroSlide) => {
    const fd = new FormData();
    fd.append('is_active', String(!slide.is_active));
    try {
      await adminApi.updateAdminHeroSlide(slide.id, fd);
      fetchSlides();
    } catch {
      toast.error('Ошибка обновления');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Слайды главной</h1>
          <p className="text-text-muted text-sm mt-1">Управление слайдером на главной странице</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Добавить слайд
        </button>
      </div>

      {/* Slides grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : slides.length === 0 ? (
        <div className="bg-bg-card rounded-xl p-12 text-center">
          <Image className="w-12 h-12 text-text-muted mx-auto mb-3" />
          <p className="text-text-muted">Слайдов пока нет</p>
          <button onClick={openCreate} className="mt-4 text-primary hover:underline text-sm">
            Создать первый слайд
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {slides.map(slide => (
            <div
              key={slide.id}
              className={`bg-bg-card rounded-xl overflow-hidden shadow-sm border transition-colors ${
                slide.is_active ? 'border-border' : 'border-danger/30 opacity-70'
              }`}
            >
              <div className="flex">
                {/* Image preview */}
                <div className="w-64 h-40 flex-shrink-0 relative">
                  {slide.image ? (
                    <img src={slide.image} alt={slide.title} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full bg-bg-secondary flex items-center justify-center">
                      <Image className="w-8 h-8 text-text-muted" />
                    </div>
                  )}
                  {!slide.is_active && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="text-white text-xs font-medium bg-danger/80 px-2 py-1 rounded">
                        Скрыт
                      </span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-lg leading-tight">{slide.title}</h3>
                        {slide.subtitle && (
                          <p className="text-text-secondary text-sm mt-0.5">{slide.subtitle}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-text-muted flex-shrink-0">
                        <GripVertical className="w-4 h-4" />
                        <span>#{slide.order}</span>
                      </div>
                    </div>
                    {slide.description && (
                      <p className="text-text-muted text-sm mt-2 line-clamp-2">{slide.description}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-3">
                      {slide.button_text && (
                        <span className="text-xs bg-primary/15 text-primary px-2.5 py-1 rounded-full">
                          {slide.button_text} &rarr; {slide.button_link || '—'}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleActive(slide)}
                        className="p-1.5 hover:bg-bg-card-hover rounded-lg transition-colors"
                        title={slide.is_active ? 'Скрыть' : 'Показать'}
                      >
                        {slide.is_active
                          ? <Eye className="w-4 h-4 text-success" />
                          : <EyeOff className="w-4 h-4 text-text-muted" />
                        }
                      </button>
                      <button
                        onClick={() => openEdit(slide)}
                        className="p-1.5 hover:bg-bg-card-hover rounded-lg transition-colors"
                        title="Редактировать"
                      >
                        <Pencil className="w-4 h-4 text-text-secondary" />
                      </button>
                      <button
                        onClick={() => handleDelete(slide)}
                        className="p-1.5 hover:bg-danger/10 rounded-lg transition-colors"
                        title="Удалить"
                      >
                        <Trash2 className="w-4 h-4 text-danger" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-bg-card shadow-sm rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editingId ? 'Редактировать слайд' : 'Новый слайд'}</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-bg-card-hover rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-text-secondary mb-1">Заголовок *</label>
                <input
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  required
                  className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs text-text-secondary mb-1">Подзаголовок</label>
                <input
                  value={formSubtitle}
                  onChange={e => setFormSubtitle(e.target.value)}
                  className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
                />
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
                <label className="block text-xs text-text-secondary mb-1">
                  Изображение {editingId ? '' : '*'}
                </label>
                {existingImage && !formImage && (
                  <div className="mb-2 rounded-lg overflow-hidden">
                    <img src={existingImage} alt="" className="w-full h-32 object-cover rounded-lg" loading="lazy" />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setFormImage(e.target.files?.[0] || null)}
                  required={!editingId}
                  className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-2 text-sm file:mr-3 file:bg-primary file:text-white file:border-0 file:rounded file:px-3 file:py-1 file:text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Текст кнопки</label>
                  <input
                    value={formButtonText}
                    onChange={e => setFormButtonText(e.target.value)}
                    placeholder="Например: Подробнее"
                    className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Ссылка кнопки</label>
                  <input
                    value={formButtonLink}
                    onChange={e => setFormButtonLink(e.target.value)}
                    placeholder="/catalog/cpu"
                    className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
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
                    <span className="text-sm">Активный</span>
                  </label>
                </div>
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
