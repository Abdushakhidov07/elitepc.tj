import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Package2, ShoppingCart, Cpu, Zap, Star, ChevronRight, Monitor } from 'lucide-react';
import { PCConfiguration } from '../types';
import { productsApi } from '../api';
import { useCartStore } from '../store/cartStore';

const COMPONENT_LABELS: Record<string, string> = {
  cpu: 'Процессор',
  motherboard: 'Материнская плата',
  ram: 'Оперативная память',
  gpu: 'Видеокарта',
  ssd: 'SSD',
  hdd: 'HDD',
  psu: 'Блок питания',
  case: 'Корпус',
  cooler: 'Кулер',
};

const PRESET_LABELS: Record<string, { label: string; color: string }> = {
  budget: { label: 'Бюджетная', color: 'bg-green-500/15 text-green-400 border-green-500/30' },
  gaming: { label: 'Игровая', color: 'bg-primary/15 text-primary border-primary/30' },
  office: { label: 'Офисная', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  workstation: { label: 'Рабочая станция', color: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
  streamer: { label: 'Для стриминга', color: 'bg-pink-500/15 text-pink-400 border-pink-500/30' },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] },
  }),
};

function formatPrice(val: string | number): string {
  const n = typeof val === 'string' ? parseFloat(val) : val;
  return n.toLocaleString('ru-RU') + ' с.';
}

export default function PresetsPage() {
  const [presets, setPresets] = useState<PCConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const addToCart = useCartStore(s => s.addItem);
  const addPresetToCart = async (configId: number) => {
    await addToCart({ configuration_id: configId, with_assembly: false });
  };

  useEffect(() => {
    productsApi.getPresets()
      .then(data => setPresets(data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
      {/* Header */}
      <div className="mb-8 sm:mb-12">
        <nav className="flex items-center gap-2 text-sm text-text-muted mb-4">
          <Link to="/" className="hover:text-primary transition-colors">Главная</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-text-primary">Готовые сборки</span>
        </nav>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center">
            <Package2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Готовые сборки ПК</h1>
            <p className="text-text-muted text-sm mt-1">Проверенные конфигурации под разные задачи и бюджеты</p>
          </div>
        </div>
      </div>

      {/* Advantages strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        {[
          { icon: <Cpu className="w-5 h-5" />, text: 'Совместимые компоненты' },
          { icon: <Star className="w-5 h-5" />, text: 'AI-оценка сборки' },
          { icon: <Zap className="w-5 h-5" />, text: 'Быстрый заказ' },
          { icon: <Monitor className="w-5 h-5" />, text: 'Гарантия на сборку' },
        ].map((item, i) => (
          <div key={i} className="bg-bg-card rounded-xl px-4 py-3 flex items-center gap-3 border border-border">
            <span className="text-primary">{item.icon}</span>
            <span className="text-sm text-text-secondary font-medium">{item.text}</span>
          </div>
        ))}
      </div>

      {/* Presets grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-bg-card rounded-2xl p-6 animate-pulse border border-border">
              <div className="w-full h-48 bg-bg-card-hover rounded-xl mb-4" />
              <div className="h-5 bg-bg-card-hover rounded w-2/3 mb-2" />
              <div className="h-4 bg-bg-card-hover rounded w-1/2 mb-6" />
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="h-3 bg-bg-card-hover rounded w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : presets.length === 0 ? (
        <div className="text-center py-20">
          <Package2 className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Сборки пока не добавлены</h2>
          <p className="text-text-muted mb-6">Но вы можете собрать свой ПК в конфигураторе</p>
          <Link
            to="/configurator"
            className="inline-block bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary-dark transition-colors"
          >
            Открыть конфигуратор
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {presets.map((preset, i) => (
            <PresetCard key={preset.id} preset={preset} index={i} onAddToCart={addPresetToCart} />
          ))}
        </div>
      )}

      {/* CTA bottom */}
      {!loading && presets.length > 0 && (
        <div className="mt-12 bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-2xl p-6 sm:p-8 text-center">
          <h3 className="text-xl font-bold mb-2">Нужна уникальная сборка?</h3>
          <p className="text-text-muted mb-4">Используйте конфигуратор с проверкой совместимости и AI-оценкой</p>
          <Link
            to="/configurator"
            className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary-dark transition-colors"
          >
            <Cpu className="w-5 h-5" />
            Собрать свой ПК
          </Link>
        </div>
      )}
    </div>
  );
}

/* ─── Preset Card ──────────────────────────────────────────────────────────── */

function PresetCard({
  preset,
  index,
  onAddToCart,
}: {
  preset: PCConfiguration;
  index: number;
  onAddToCart: (configId: number) => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const badgeInfo = preset.preset_label ? PRESET_LABELS[preset.preset_label] : null;

  const handleAddToCart = async () => {
    setAdding(true);
    try {
      await onAddToCart(preset.id);
    } finally {
      setAdding(false);
    }
  };

  // Group items by component_type and show key components
  const keyComponents = preset.items.slice(0, 5);

  return (
    <motion.div
      custom={index}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={fadeUp}
      className="bg-bg-card rounded-2xl border border-border hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 flex flex-col overflow-hidden"
    >
      {/* Image */}
      <div className="relative h-48 bg-gradient-to-br from-bg-card-hover to-bg-dark overflow-hidden">
        {preset.image ? (
          <img src={preset.image} alt={preset.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package2 className="w-16 h-16 text-text-muted/30" />
          </div>
        )}
        {badgeInfo && (
          <span className={`absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full border ${badgeInfo.color}`}>
            {badgeInfo.label}
          </span>
        )}
        {preset.ai_rating !== null && (
          <span className="absolute top-3 right-3 flex items-center gap-1 bg-black/50 backdrop-blur text-white text-xs font-bold px-2.5 py-1 rounded-full">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            {preset.ai_rating}/10
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-bold text-base mb-1 line-clamp-2">{preset.name}</h3>

        {preset.ai_comment && (
          <p className="text-text-muted text-xs mb-3 line-clamp-2">{preset.ai_comment}</p>
        )}

        {/* Components list */}
        <div className="space-y-1.5 mb-4 flex-1">
          {keyComponents.map(item => (
            <div key={item.id} className="flex items-center gap-2 text-xs text-text-secondary">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/50 flex-shrink-0" />
              <span className="font-medium text-text-muted w-20 flex-shrink-0">
                {COMPONENT_LABELS[item.component_type] || item.component_type}:
              </span>
              <span className="truncate">{item.product_detail?.name || item.product?.name || '—'}</span>
            </div>
          ))}
          {preset.items.length > 5 && (
            <div className="text-xs text-text-muted pl-3.5">
              + ещё {preset.items.length - 5} компонент(а)
            </div>
          )}
        </div>

        {/* Price & actions */}
        <div className="border-t border-border pt-4 mt-auto">
          <div className="flex items-end justify-between mb-3">
            <div>
              <div className="text-xs text-text-muted mb-0.5">Цена сборки</div>
              <div className="text-xl font-bold text-primary">
                {formatPrice(preset.total_price)}
              </div>
              {parseFloat(preset.assembly_fee) > 0 && (
                <div className="text-xs text-text-muted">
                  + сборка {formatPrice(preset.assembly_fee)}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-xs text-text-muted mb-0.5">{preset.items.length} компонентов</div>
            </div>
          </div>

          <div className="flex gap-2">
            <Link
              to={`/configurator?preset=${preset.id}`}
              className="flex-1 text-center text-sm font-medium px-3 py-2.5 rounded-xl border border-border hover:border-primary hover:text-primary transition-colors"
            >
              Подробнее
            </Link>
            <button
              onClick={handleAddToCart}
              disabled={adding}
              className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold px-3 py-2.5 rounded-xl bg-primary text-white hover:bg-primary-dark transition-colors disabled:opacity-60"
            >
              <ShoppingCart className="w-4 h-4" />
              {adding ? 'Добавляем...' : 'В корзину'}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
