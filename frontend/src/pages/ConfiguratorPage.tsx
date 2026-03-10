import { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, AlertTriangle, CheckCircle, XCircle,
  Cpu, CircuitBoard, MemoryStick, MonitorPlay, HardDrive, Database,
  Zap, Box, Fan, Bot, ShoppingCart, Search, X, Sparkles, ChevronRight,
} from 'lucide-react';
import { PCConfiguration, Product, CompatibilityResult, AIEvaluation } from '../types';
import { configuratorApi } from '../api';
import { useCartStore } from '../store/cartStore';
import { toast } from '../components/ui/Toast';
import AnimatedSection from '../components/ui/AnimatedSection';

const COMPONENT_TYPES = [
  { key: 'cpu', label: 'Процессор', icon: Cpu },
  { key: 'motherboard', label: 'Мат. плата', icon: CircuitBoard },
  { key: 'ram', label: 'Оперативка', icon: MemoryStick },
  { key: 'gpu', label: 'Видеокарта', icon: MonitorPlay },
  { key: 'ssd', label: 'SSD', icon: HardDrive },
  { key: 'hdd', label: 'HDD', icon: Database },
  { key: 'psu', label: 'Блок питания', icon: Zap },
  { key: 'case', label: 'Корпус', icon: Box },
  { key: 'cooler', label: 'Кулер', icon: Fan },
];

export default function ConfiguratorPage() {
  const [config, setConfig] = useState<PCConfiguration | null>(null);
  const [activeType, setActiveType] = useState('cpu');
  const [compatibleProducts, setCompatibleProducts] = useState<Product[]>([]);
  const [compatibility, setCompatibility] = useState<CompatibilityResult | null>(null);
  const [aiEval, setAIEval] = useState<AIEvaluation | null>(null);
  const [loading, setLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [aiLoading, setAILoading] = useState(false);
  const [presets, setPresets] = useState<PCConfiguration[]>([]);
  const [showPresets, setShowPresets] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const addItem = useCartStore(s => s.addItem);

  useEffect(() => {
    configuratorApi.getPresets().then(res => setPresets(Array.isArray(res) ? res : []));
  }, []);

  const createConfig = async () => {
    setLoading(true);
    try {
      const res = await configuratorApi.createConfiguration({ name: '' });
      setConfig(res);
      setShowPresets(false);
      loadCompatible(res.id, 'cpu');
    } finally {
      setLoading(false);
    }
  };

  const loadConfig = async (id: number) => {
    const res = await configuratorApi.getConfiguration(id);
    setConfig(res);
    setShowPresets(false);
  };

  const loadCompatible = useCallback(async (configId: number, type: string, search?: string) => {
    setProductsLoading(true);
    try {
      const params: { page_size?: number; search?: string } = { page_size: 50 };
      if (search) params.search = search;
      const res = await configuratorApi.getCompatibleProducts(configId, type, params);
      setCompatibleProducts(res.results || []);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!config) return;
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      loadCompatible(config.id, activeType, searchQuery || undefined);
    }, 300);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery, config, activeType, loadCompatible]);

  const switchType = (type: string) => {
    setActiveType(type);
    setSearchQuery('');
    if (config) loadCompatible(config.id, type);
  };

  const addComponent = async (productId: number) => {
    if (!config) return;
    setLoading(true);
    try {
      await configuratorApi.addComponent(config.id, {
        product_id: productId,
        component_type: activeType,
        quantity: 1,
      });
      const res = await configuratorApi.getConfiguration(config.id);
      setConfig(res);
      const compatRes = await configuratorApi.checkCompatibility(config.id);
      setCompatibility(compatRes);
    } finally {
      setLoading(false);
    }
  };

  const removeComponent = async (type: string) => {
    if (!config) return;
    setLoading(true);
    try {
      await configuratorApi.removeComponent(config.id, type);
      const res = await configuratorApi.getConfiguration(config.id);
      setConfig(res);
      if (res.items.length > 0) {
        const compatRes = await configuratorApi.checkCompatibility(config.id);
        setCompatibility(compatRes);
      } else {
        setCompatibility(null);
      }
      loadCompatible(config.id, activeType, searchQuery || undefined);
    } finally {
      setLoading(false);
    }
  };

  const evaluateAI = async () => {
    if (!config) return;
    setAILoading(true);
    try {
      const res = await configuratorApi.aiEvaluate(config.id);
      setAIEval(res);
    } finally {
      setAILoading(false);
    }
  };

  const addToCart = async (withAssembly: boolean) => {
    if (!config) return;
    try {
      await configuratorApi.addConfigToCart(config.id, { with_assembly: withAssembly });
      toast.success(withAssembly ? 'Конфигурация с сборкой добавлена в корзину!' : 'Конфигурация добавлена в корзину!');
    } catch {
      toast.error('Не удалось добавить конфигурацию в корзину');
    }
  };

  const getSelectedComponent = (type: string) => {
    return config?.items.find(item => item.component_type === type);
  };

  const totalTDP = config?.items.reduce((sum, item) => {
    const product = item.product_detail || item.product;
    if (!product) return sum;
    const tdpSpec = product.specifications?.find(s =>
      s.spec_name_display === 'TDP' || s.spec_name_display === 'Мощность'
    );
    return sum + (tdpSpec ? parseInt(tdpSpec.value) || 0 : 0);
  }, 0) || 0;

  const completedCount = config?.items.length || 0;
  const totalPrice = config ? parseFloat(config.total_price) : 0;

  // ============= PRESETS VIEW =============
  if (showPresets && !config) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <AnimatedSection>
          <div className="text-center mb-12">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl md:text-4xl font-bold mb-4"
            >
              <span className="text-gradient">Конфигуратор ПК</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-text-secondary text-lg mb-8 max-w-xl mx-auto"
            >
              Соберите компьютер мечты с проверкой совместимости и AI-оценкой
            </motion.p>

            {/* Start from scratch card */}
            <motion.button
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={createConfig}
              disabled={loading}
              className="inline-flex items-center gap-3 bg-gradient-to-r from-primary to-accent text-white px-10 py-4 rounded-2xl font-semibold text-lg shadow-lg shadow-primary/25 hover:shadow-xl transition-shadow disabled:opacity-50"
            >
              <Plus className="w-6 h-6" />
              Начать новую сборку
            </motion.button>
          </div>
        </AnimatedSection>

        {presets.length > 0 && (
          <AnimatedSection delay={0.2}>
            <h2 className="text-2xl font-bold mb-6">Готовые сборки</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {presets.map((preset, i) => (
                <motion.div
                  key={preset.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i }}
                  whileHover={{ y: -4 }}
                  className="bg-bg-card rounded-2xl shadow-sm overflow-hidden border border-border hover:shadow-xl transition-all duration-300"
                >
                  {/* Preset image or gradient stripe */}
                  {preset.image ? (
                    <div className="aspect-video bg-bg-secondary overflow-hidden">
                      <img
                        src={preset.image}
                        alt={preset.name || preset.preset_label}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-1.5 bg-gradient-to-r from-primary to-accent" />
                  )}

                  <div className="p-6">
                    <h3 className="text-lg font-bold mb-1">{preset.name || preset.preset_label}</h3>
                    {preset.preset_label && preset.name && (
                      <p className="text-sm text-text-muted mb-4">{preset.preset_label}</p>
                    )}

                    <div className="space-y-2 mb-5">
                      {preset.items.map(item => {
                        const ct = COMPONENT_TYPES.find(c => c.key === item.component_type);
                        const Icon = ct?.icon || Cpu;
                        return (
                          <div key={item.id} className="flex items-center gap-2.5 text-sm">
                            <div className="w-7 h-7 bg-bg-card-hover rounded-lg flex items-center justify-center flex-shrink-0">
                              <Icon className="w-4 h-4 text-text-muted" />
                            </div>
                            <span className="text-text-secondary truncate flex-1">
                              {(item.product_detail || item.product)?.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-border">
                      <div>
                        <p className="text-xs text-text-muted">Итого</p>
                        <p className="text-xl font-bold text-primary">
                          {parseFloat(preset.total_price).toLocaleString()} сом.
                        </p>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => loadConfig(preset.id)}
                        className="bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors shadow-sm flex items-center gap-1.5"
                      >
                        Выбрать <ChevronRight className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatedSection>
        )}
      </div>
    );
  }

  // ============= BUILDER VIEW =============
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">
          <span className="text-gradient">Конфигуратор</span>
        </h1>
        <button
          onClick={() => { setConfig(null); setShowPresets(true); setCompatibility(null); setAIEval(null); }}
          className="text-sm text-text-muted hover:text-text-primary transition-colors"
        >
          ← К готовым сборкам
        </button>
      </div>

      {/* Step Progress Bar */}
      <div className="bg-bg-card rounded-2xl shadow-sm border border-border p-3 sm:p-4 mb-6 overflow-x-auto scrollbar-hide">
        <div className="flex items-center min-w-[580px] sm:min-w-0">
          {COMPONENT_TYPES.map((ct, i) => {
            const selected = getSelectedComponent(ct.key);
            const isActive = activeType === ct.key;
            const Icon = ct.icon;

            return (
              <div key={ct.key} className="flex items-center flex-1">
                <button
                  onClick={() => switchType(ct.key)}
                  className="flex flex-col items-center gap-1.5 relative group"
                >
                  <motion.div
                    animate={{
                      backgroundColor: selected ? '#16A34A' : isActive ? '#2563EB' : '#E2E8F0',
                      scale: isActive ? 1.15 : 1,
                    }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-white shadow-sm cursor-pointer"
                  >
                    {selected ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <Icon className={`w-5 h-5 ${!isActive ? 'text-slate-500' : ''}`} />
                    )}
                  </motion.div>
                  <span className={`text-[10px] md:text-xs font-medium text-center leading-tight ${
                    isActive ? 'text-primary' : selected ? 'text-success' : 'text-text-muted'
                  }`}>
                    {ct.label}
                  </span>
                </button>

                {i < COMPONENT_TYPES.length - 1 && (
                  <div className="flex-1 h-0.5 mx-1 bg-border rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-primary to-accent"
                      initial={{ width: 0 }}
                      animate={{ width: selected ? '100%' : '0%' }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main 2-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Panel — Build Summary */}
        <div className="lg:col-span-5 space-y-4">
          {/* Component Slots */}
          <div className="bg-bg-card rounded-2xl shadow-sm border border-border p-4">
            <h3 className="font-bold text-sm text-text-muted uppercase tracking-wider mb-3">Компоненты сборки</h3>
            <div className="space-y-2">
              {COMPONENT_TYPES.map(ct => {
                const selected = getSelectedComponent(ct.key);
                const isActive = activeType === ct.key;
                const product = selected ? (selected.product_detail || selected.product) : null;
                const Icon = ct.icon;

                return (
                  <motion.div
                    key={ct.key}
                    layout
                    onClick={() => switchType(ct.key)}
                    className={`rounded-xl p-3 cursor-pointer transition-all duration-200 ${
                      isActive
                        ? 'ring-2 ring-primary bg-primary/5'
                        : selected
                          ? 'bg-bg-secondary hover:bg-bg-card-hover'
                          : 'border-2 border-dashed border-border hover:border-primary/30 hover:bg-bg-secondary'
                    }`}
                  >
                    {selected && product ? (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-bg-card rounded-lg shadow-sm flex-shrink-0 overflow-hidden border border-border">
                          {product.main_image ? (
                            <img src={product.main_image} alt="" className="w-full h-full object-contain p-1" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Icon className="w-5 h-5 text-text-muted" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-text-muted uppercase font-medium">{ct.label}</p>
                          <p className="text-sm font-medium truncate">{product.name}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-sm font-bold text-primary">
                            {parseFloat(selected.price_at_addition).toLocaleString()}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeComponent(ct.key); }}
                            disabled={loading}
                            className="p-1.5 text-text-muted hover:text-danger hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-bg-card-hover rounded-lg flex items-center justify-center flex-shrink-0">
                          <Icon className="w-5 h-5 text-text-muted" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-text-muted">{ct.label}</p>
                          <p className="text-xs text-text-muted">Нажмите чтобы выбрать</p>
                        </div>
                        <Plus className="w-4 h-4 text-text-muted" />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Power Meter */}
          {totalTDP > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-bg-card rounded-2xl shadow-sm border border-border p-4"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-text-secondary flex items-center gap-2">
                  <Zap className="w-4 h-4 text-warning" /> Энергопотребление
                </span>
                <motion.span
                  key={totalTDP}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className="text-sm font-bold"
                >
                  {totalTDP} Вт
                </motion.span>
              </div>
              <div className="w-full bg-bg-card-hover rounded-full h-3 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(totalTDP / 800 * 100, 100)}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-text-muted mt-1">
                <span>0W</span>
                <span>Оптимально</span>
                <span>800W</span>
              </div>
            </motion.div>
          )}

          {/* Compatibility Status */}
          <AnimatePresence>
            {compatibility && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-2"
              >
                {compatibility.errors.map((err, i) => (
                  <div key={`e-${i}`} className="flex items-start gap-2.5 bg-red-50 text-red-700 border border-red-200 rounded-xl p-3 text-sm">
                    <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{err}</span>
                  </div>
                ))}
                {compatibility.warnings.map((warn, i) => (
                  <div key={`w-${i}`} className="flex items-start gap-2.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl p-3 text-sm">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{warn}</span>
                  </div>
                ))}
                {compatibility.is_compatible && compatibility.errors.length === 0 && compatibility.warnings.length === 0 && (
                  <div className="flex items-center gap-2.5 bg-green-50 text-green-700 border border-green-200 rounded-xl p-3 text-sm">
                    <CheckCircle className="w-4 h-4" /> Все компоненты совместимы
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Price + Actions */}
          <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl border border-primary/10 p-5">
            <div className="flex justify-between items-center mb-1">
              <span className="text-text-secondary text-sm">Итого:</span>
              <span className="text-xs text-text-muted">{completedCount} из 9 компонентов</span>
            </div>
            <motion.p
              key={totalPrice}
              initial={{ scale: 1.05 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300 }}
              className="text-3xl font-bold mb-4"
            >
              {totalPrice.toLocaleString()} <span className="text-lg font-normal text-text-secondary">сом.</span>
            </motion.p>

            <div className="space-y-2">
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={evaluateAI}
                disabled={aiLoading || !config?.items.length}
                className="w-full bg-gradient-to-r from-violet-600 to-blue-600 disabled:opacity-50 text-white py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 shadow-md shadow-violet-500/20 hover:shadow-lg"
              >
                <Bot className="w-5 h-5" />
                {aiLoading ? 'Оцениваем...' : 'AI оценка сборки'}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => addToCart(false)}
                disabled={!config?.items.length}
                className="w-full bg-primary hover:bg-primary-dark disabled:opacity-50 text-white py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 shadow-md shadow-primary/20"
              >
                <ShoppingCart className="w-4 h-4" /> Купить запчастями
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => addToCart(true)}
                disabled={!config?.items.length}
                className="w-full bg-white border-2 border-accent text-accent hover:bg-accent hover:text-white disabled:opacity-50 py-3 rounded-xl font-medium transition-all"
              >
                Купить с сборкой (+{config?.assembly_fee || 500} сом.)
              </motion.button>
            </div>
          </div>

          {/* AI Evaluation */}
          <AnimatePresence>
            {aiEval && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-bg-card rounded-2xl shadow-sm border border-violet-200 p-5"
              >
                <h4 className="font-bold mb-4 flex items-center gap-2 text-violet-700">
                  <Sparkles className="w-5 h-5" /> AI Оценка
                </h4>

                {/* Rating circle */}
                <div className="flex items-center gap-5 mb-4">
                  <div className="relative w-20 h-20">
                    <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="35" fill="none" stroke="#E2E8F0" strokeWidth="6" />
                      <motion.circle
                        cx="40" cy="40" r="35"
                        fill="none"
                        stroke="url(#ratingGrad)"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={220}
                        initial={{ strokeDashoffset: 220 }}
                        animate={{ strokeDashoffset: 220 - (220 * aiEval.rating / 10) }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                      />
                      <defs>
                        <linearGradient id="ratingGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#7C3AED" />
                          <stop offset="100%" stopColor="#2563EB" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold text-gradient">{aiEval.rating}</span>
                    </div>
                  </div>
                  <p className="text-sm text-text-secondary flex-1">{aiEval.comment}</p>
                </div>

                {aiEval.suitable_for.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-text-muted mb-2">Подходит для:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {aiEval.suitable_for.map((s, i) => (
                        <span key={i} className="bg-violet-50 text-violet-700 text-xs px-3 py-1 rounded-full border border-violet-200 font-medium">{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {aiEval.recommendations.length > 0 && (
                  <div>
                    <p className="text-xs text-text-muted mb-2">Рекомендации:</p>
                    <ul className="space-y-1.5">
                      {aiEval.recommendations.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                          <span className="w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center text-xs text-primary font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Panel — Product Selection */}
        <div className="lg:col-span-7">
          <div className="bg-bg-card rounded-2xl shadow-sm border border-border lg:sticky lg:top-20">
            {/* Search header */}
            <div className="p-4 border-b border-border">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-lg">
                  {COMPONENT_TYPES.find(c => c.key === activeType)?.label || 'Выберите'}
                </h3>
                <span className="text-text-muted text-sm bg-bg-card-hover px-3 py-1 rounded-full">
                  {compatibleProducts.length} товаров
                </span>
              </div>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  placeholder="Поиск по названию..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-bg-secondary border border-border rounded-xl pl-10 pr-9 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Product grid */}
            <div className="max-h-[600px] overflow-y-auto p-4">
              {productsLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : compatibleProducts.length === 0 ? (
                <div className="p-8 text-center text-text-muted">
                  {searchQuery ? 'Ничего не найдено' : 'Нет совместимых товаров'}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {compatibleProducts.map((product, i) => {
                    const isSelected = config?.items.some(
                      it => it.component_type === activeType && (it.product_detail || it.product)?.id === product.id
                    );
                    return (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.03, 0.3) }}
                        className={`rounded-xl p-3 border transition-all duration-200 ${
                          isSelected
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                            : 'border-border hover:border-primary/30 hover:shadow-md bg-bg-card'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-16 h-16 bg-bg-secondary rounded-lg flex-shrink-0 overflow-hidden border border-border">
                            {product.main_image ? (
                              <img src={product.main_image} alt="" className="w-full h-full object-contain p-1" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-text-muted">
                                <Cpu className="w-6 h-6" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <Link to={`/product/${product.slug}`} className="text-sm font-medium hover:text-primary transition-colors line-clamp-2 leading-snug">
                              {product.name}
                            </Link>
                            <p className="text-xs text-text-muted mt-0.5">{product.brand_name}</p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="font-bold text-primary">
                                {parseFloat(product.current_price).toLocaleString()} сом.
                              </span>
                              {isSelected ? (
                                <motion.button
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => removeComponent(activeType)}
                                  disabled={loading}
                                  className="px-3 py-1 rounded-lg text-xs font-medium bg-red-50 text-danger hover:bg-red-100 border border-red-200 transition-colors"
                                >
                                  Убрать
                                </motion.button>
                              ) : (
                                <motion.button
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => addComponent(product.id)}
                                  disabled={loading}
                                  className="px-3 py-1 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary-dark transition-colors shadow-sm"
                                >
                                  Выбрать
                                </motion.button>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
