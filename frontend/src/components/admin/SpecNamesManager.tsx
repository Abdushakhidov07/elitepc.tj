import { useEffect, useState } from 'react';
import { Plus, Trash2, X, Save } from 'lucide-react';
import { adminApi } from '../../api';
import { toast } from '../ui/Toast';
import type { AdminSpecName } from '../../types/admin';

interface Props {
  categoryId: number;
  categoryName: string;
  open: boolean;
  onClose: () => void;
}

interface SpecRow {
  id: number | null;
  name: string;
  unit: string;
  filter_type: 'checkbox' | 'range' | 'select';
  is_filterable: boolean;
  order: number;
}

export default function SpecNamesManager({ categoryId, categoryName, open, onClose }: Props) {
  const [rows, setRows] = useState<SpecRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !categoryId) return;
    setLoading(true);
    adminApi.getAdminSpecNames(categoryId)
      .then(specs => {
        setRows(specs.map(s => ({
          id: s.id,
          name: s.name,
          unit: s.unit,
          filter_type: s.filter_type,
          is_filterable: s.is_filterable,
          order: s.order,
        })));
      })
      .finally(() => setLoading(false));
  }, [open, categoryId]);

  const addRow = () => {
    setRows([...rows, { id: null, name: '', unit: '', filter_type: 'checkbox', is_filterable: true, order: rows.length }]);
  };

  const updateRow = (index: number, field: keyof SpecRow, value: any) => {
    setRows(rows.map((r, i) => i === index ? { ...r, [field]: value } : r));
  };

  const removeRow = async (index: number) => {
    const row = rows[index];
    if (row.id) {
      try {
        await adminApi.deleteAdminSpecName(row.id);
        toast.success('Характеристика удалена');
      } catch {
        toast.error('Ошибка удаления');
        return;
      }
    }
    setRows(rows.filter((_, i) => i !== index));
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      for (const row of rows) {
        if (!row.name.trim()) continue;
        const data = {
          name: row.name,
          category: categoryId,
          unit: row.unit,
          filter_type: row.filter_type,
          is_filterable: row.is_filterable,
          is_comparable: true,
          order: row.order,
        };
        if (row.id) {
          await adminApi.updateAdminSpecName(row.id, data);
        } else {
          const created = await adminApi.createAdminSpecName(data);
          row.id = created.id;
        }
      }
      toast.success('Характеристики сохранены');
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white shadow-sm rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Характеристики: {categoryName}</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {/* Header */}
            <div className="grid grid-cols-[1fr_80px_100px_60px_40px] gap-2 text-xs text-text-muted px-1">
              <span>Название</span>
              <span>Единица</span>
              <span>Тип фильтра</span>
              <span>Фильтр</span>
              <span></span>
            </div>

            {rows.map((row, i) => (
              <div key={row.id ?? `new-${i}`} className="grid grid-cols-[1fr_80px_100px_60px_40px] gap-2 items-center">
                <input
                  value={row.name}
                  onChange={e => updateRow(i, 'name', e.target.value)}
                  placeholder="Название"
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                />
                <input
                  value={row.unit}
                  onChange={e => updateRow(i, 'unit', e.target.value)}
                  placeholder="ГБ, МГц"
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                />
                <select
                  value={row.filter_type}
                  onChange={e => updateRow(i, 'filter_type', e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-primary"
                >
                  <option value="checkbox">Чекбокс</option>
                  <option value="range">Диапазон</option>
                  <option value="select">Выбор</option>
                </select>
                <label className="flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={row.is_filterable}
                    onChange={e => updateRow(i, 'is_filterable', e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                </label>
                <button onClick={() => removeRow(i)} className="p-1 hover:bg-danger/10 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4 text-danger" />
                </button>
              </div>
            ))}

            <button onClick={addRow} className="flex items-center gap-2 text-sm text-primary hover:text-primary-dark transition-colors pt-2">
              <Plus className="w-4 h-4" /> Добавить характеристику
            </button>

            <div className="flex gap-3 pt-4 border-t border-border mt-4">
              <button onClick={onClose}
                className="flex-1 bg-slate-50 border border-slate-200 text-sm py-2.5 rounded-lg hover:bg-slate-100 transition-colors">
                Отмена
              </button>
              <button onClick={saveAll} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white text-sm py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50">
                <Save className="w-4 h-4" /> {saving ? 'Сохранение...' : 'Сохранить все'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
