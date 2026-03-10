import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { SlidersHorizontal, Grid3X3, List, X, Cpu, CircuitBoard, MemoryStick, Monitor, HardDrive, Zap, Box, Fan, Keyboard, MonitorPlay, Package2 } from 'lucide-react';
import { Product, Category, FilterOption } from '../types';
import { productsApi } from '../api';
import ProductCard from '../components/ui/ProductCard';
import Breadcrumbs from '../components/ui/Breadcrumbs';

const PAGE_SIZE = 20;

// Always shown in sidebar even before seed_data is run
const STATIC_EXTRA_CATS: Category[] = [
  { id: -1, slug: 'monitors',    name: 'Мониторы',  description: '', image: null, parent: null, is_active: true, children: [] },
  { id: -2, slug: 'peripherals', name: 'Периферия', description: '', image: null, parent: null, is_active: true, children: [] },
];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  cpu: <Cpu className="w-4 h-4" />,
  motherboards: <CircuitBoard className="w-4 h-4" />,
  ram: <MemoryStick className="w-4 h-4" />,
  gpu: <MonitorPlay className="w-4 h-4" />,
  storage: <HardDrive className="w-4 h-4" />,
  psu: <Zap className="w-4 h-4" />,
  cases: <Box className="w-4 h-4" />,
  coolers: <Fan className="w-4 h-4" />,
  monitors: <Monitor className="w-4 h-4" />,
  peripherals: <Keyboard className="w-4 h-4" />,
};

export default function CatalogPage() {
  const { slug } = useParams<{ slug?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filters, setFilters] = useState<FilterOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryNotFound, setCategoryNotFound] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  const page = parseInt(searchParams.get('page') || '1');
  const ordering = searchParams.get('ordering') || '-created_at';
  const priceMin = searchParams.get('price_min') || '';
  const priceMax = searchParams.get('price_max') || '';

  // Derive active spec filters from URL params
  const activeSpecFilters = useMemo(() => {
    const result: Record<string, string[]> = {};
    searchParams.forEach((value, key) => {
      if (key.startsWith('spec_') && value) {
        result[key] = value.split(',');
      }
    });
    return result;
  }, [searchParams]);

  // Stable string for useCallback dependency
  const paramsKey = searchParams.toString();

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setCategoryNotFound(false);
    try {
      const params: Record<string, string> = {};
      searchParams.forEach((value, key) => {
        params[key] = value;
      });
      if (!params.page) params.page = '1';
      if (!params.ordering) params.ordering = '-created_at';

      const res = slug
        ? await productsApi.getCategoryProducts(slug, params)
        : await productsApi.getProducts(params);

      setProducts(res.results || []);
      setTotalCount(res.count || 0);
    } catch (err: unknown) {
      // 404 means the category doesn't exist in the DB yet (needs seed_data)
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        setCategoryNotFound(true);
      }
      setProducts([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, paramsKey]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Fetch categories once; fetch filters when slug changes
  useEffect(() => {
    productsApi.getCategories().then(res => {
      // Merge API result with static extras (monitors/peripherals),
      // deduplicating by slug so there's no double entry after seeding.
      const merged = [
        ...res,
        ...STATIC_EXTRA_CATS.filter(ec => !res.some(c => c.slug === ec.slug)),
      ];
      setCategories(merged);
    });
  }, []);

  useEffect(() => {
    if (slug) {
      productsApi.getCategoryFilters(slug).then(res => setFilters(res));
    } else {
      setFilters([]);
    }
  }, [slug]);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    if (key !== 'page') params.set('page', '1');
    setSearchParams(params);
  };

  const toggleFilter = (specId: number, value: string) => {
    const key = `spec_${specId}`;
    const current = activeSpecFilters[key] || [];
    const params = new URLSearchParams(searchParams);

    if (current.includes(value)) {
      const next = current.filter(v => v !== value);
      if (next.length === 0) {
        params.delete(key);
      } else {
        params.set(key, next.join(','));
      }
    } else {
      params.set(key, [...current, value].join(','));
    }

    params.set('page', '1');
    setSearchParams(params);
  };

  const isFilterActive = (specId: number, value: string) => {
    return (activeSpecFilters[`spec_${specId}`] || []).includes(value);
  };

  const activeFilterCount = Object.values(activeSpecFilters).reduce(
    (sum, arr) => sum + arr.length, 0
  ) + (priceMin ? 1 : 0) + (priceMax ? 1 : 0);

  const clearAllFilters = () => {
    const params = new URLSearchParams();
    if (ordering !== '-created_at') params.set('ordering', ordering);
    setSearchParams(params);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const breadcrumbs: { label: string; href?: string }[] = [
    { label: 'Главная', href: '/' },
    { label: 'Каталог', href: '/catalog' },
  ];
  if (slug) {
    const cat = categories.find(c => c.slug === slug);
    if (cat) breadcrumbs.push({ label: cat.name });
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Breadcrumbs items={breadcrumbs} />

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {slug ? categories.find(c => c.slug === slug)?.name || 'Каталог' : 'Все товары'}
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-text-secondary text-sm">{totalCount} товаров</span>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="lg:hidden flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Фильтры
            {activeFilterCount > 0 && (
              <span className="bg-primary text-white text-xs w-5 h-5 rounded-full flex items-center justify-center ml-1">
                {activeFilterCount}
              </span>
            )}
          </button>
          <div className="hidden sm:flex items-center gap-1 bg-bg-card-hover rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-primary text-white' : 'text-text-secondary'}`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-primary text-white' : 'text-text-secondary'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar Filters */}
        <aside className={`${showFilters ? 'fixed inset-0 z-50 bg-bg-card p-4 overflow-y-auto' : 'hidden'} lg:block lg:relative lg:w-64 flex-shrink-0`}>
          <div className="flex justify-between items-center lg:hidden mb-4">
            <h3 className="font-bold text-lg">Фильтры</h3>
            <button onClick={() => setShowFilters(false)}><X className="w-5 h-5" /></button>
          </div>

          {/* Categories */}
          {!slug && (
            <div className="bg-bg-card shadow-sm rounded-xl p-4 mb-4">
              <h3 className="font-semibold mb-3">Категории</h3>
              <div className="space-y-1">
                {categories.map(cat => (
                  <Link
                    key={cat.id}
                    to={`/catalog/${cat.slug}`}
                    className={`flex items-center gap-2.5 hover:bg-primary/5 transition-colors text-sm px-2 py-1.5 rounded-lg ${
                      slug === cat.slug ? 'text-primary font-medium bg-primary/5' : 'text-text-secondary hover:text-primary'
                    }`}
                  >
                    <span className="text-text-muted">{CATEGORY_ICONS[cat.slug]}</span>
                    {cat.name}
                  </Link>
                ))}
                <Link
                  to="/presets"
                  className="flex items-center gap-2.5 text-primary hover:bg-primary/5 transition-colors text-sm px-2 py-1.5 rounded-lg font-medium border-t border-border mt-1 pt-2"
                >
                  <Package2 className="w-4 h-4" />
                  Готовые сборки
                </Link>
              </div>
            </div>
          )}

          {/* Price Range */}
          <div className="bg-bg-card shadow-sm rounded-xl p-4 mb-4">
            <h3 className="font-semibold mb-3">Цена (сомони)</h3>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="от"
                value={priceMin}
                onChange={e => updateParam('price_min', e.target.value)}
                className="w-full bg-bg-secondary border border-border rounded px-3 py-1.5 text-sm"
              />
              <input
                type="number"
                placeholder="до"
                value={priceMax}
                onChange={e => updateParam('price_max', e.target.value)}
                className="w-full bg-bg-secondary border border-border rounded px-3 py-1.5 text-sm"
              />
            </div>
          </div>

          {/* Dynamic Spec Filters */}
          {filters.map(filter => (
            <div key={filter.id} className="bg-bg-card shadow-sm rounded-xl p-4 mb-4">
              <h3 className="font-semibold mb-3">
                {filter.name}
                {filter.unit && <span className="text-text-muted font-normal ml-1">({filter.unit})</span>}
              </h3>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {filter.values.map(val => (
                  <label
                    key={val}
                    className={`flex items-center gap-2 text-sm cursor-pointer transition-colors ${
                      isFilterActive(filter.id, val) ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="accent-primary"
                      checked={isFilterActive(filter.id, val)}
                      onChange={() => toggleFilter(filter.id, val)}
                    />
                    {val}
                  </label>
                ))}
              </div>
            </div>
          ))}

          {/* Clear all filters */}
          {activeFilterCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="w-full text-sm text-danger hover:text-red-400 transition-colors py-2"
            >
              Сбросить фильтры ({activeFilterCount})
            </button>
          )}

          {/* Sorting */}
          <div className="bg-bg-card shadow-sm rounded-xl p-4">
            <h3 className="font-semibold mb-3">Сортировка</h3>
            <select
              value={ordering}
              onChange={e => updateParam('ordering', e.target.value)}
              className="w-full bg-bg-secondary border border-border rounded px-3 py-2 text-sm"
            >
              <option value="-created_at">Новинки</option>
              <option value="price">Цена: по возрастанию</option>
              <option value="-price">Цена: по убыванию</option>
              <option value="-views_count">Популярные</option>
              <option value="-discount_percent">По скидке</option>
            </select>
          </div>
        </aside>

        {/* Products Grid */}
        <div className="flex-1">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : categoryNotFound ? (
            <div className="text-center py-20 text-text-secondary">
              <Box className="w-12 h-12 mx-auto mb-4 text-text-muted opacity-40" />
              <p className="font-semibold text-text-primary mb-1">Категория пока пуста</p>
              <p className="text-sm">Товары в этой категории скоро появятся</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 text-text-secondary">
              <p>Товары не найдены</p>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="mt-3 text-primary hover:text-accent transition-colors text-sm"
                >
                  Сбросить фильтры
                </button>
              )}
            </div>
          ) : (
            <>
              <div className={viewMode === 'grid'
                ? 'grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-6'
                : 'space-y-4'
              }>
                {products.map(product => (
                  <ProductCard key={product.id} product={product} layout={viewMode} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-8">
                  <button
                    onClick={() => updateParam('page', String(page - 1))}
                    disabled={page <= 1}
                    className="px-3 h-10 rounded-lg font-medium transition-colors bg-bg-card shadow-sm border border-border text-text-secondary hover:bg-bg-card-hover disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    &laquo;
                  </button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let p: number;
                    if (totalPages <= 7) {
                      p = i + 1;
                    } else if (page <= 4) {
                      p = i + 1;
                    } else if (page >= totalPages - 3) {
                      p = totalPages - 6 + i;
                    } else {
                      p = page - 3 + i;
                    }
                    return (
                      <button
                        key={p}
                        onClick={() => updateParam('page', String(p))}
                        className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                          p === page ? 'bg-primary text-white' : 'bg-bg-card shadow-sm border border-border text-text-secondary hover:bg-bg-card-hover'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => updateParam('page', String(page + 1))}
                    disabled={page >= totalPages}
                    className="px-3 h-10 rounded-lg font-medium transition-colors bg-bg-card shadow-sm border border-border text-text-secondary hover:bg-bg-card-hover disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    &raquo;
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
