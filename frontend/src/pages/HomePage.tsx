import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cpu, CircuitBoard, MemoryStick, MonitorPlay, HardDrive, Database,
  Zap, Box, Fan, Truck, Shield, Headphones, ChevronRight, ChevronLeft,
  Monitor, Keyboard, Package2,
} from 'lucide-react';
import { Product, Category, HeroSlide } from '../types';
import { productsApi } from '../api';
import ProductCard from '../components/ui/ProductCard';
import SkeletonCard from '../components/ui/SkeletonCard';
import AnimatedSection from '../components/ui/AnimatedSection';

// These categories always show even before seed_data is run.
// After seeding, they come from the API and won't be duplicated.
const STATIC_EXTRA_CATS = [
  { slug: 'monitors',    name: 'Мониторы' },
  { slug: 'peripherals', name: 'Периферия' },
];

const categoryIcons: Record<string, React.ReactNode> = {
  processors: <Cpu className="w-7 h-7" />,
  cpu: <Cpu className="w-7 h-7" />,
  gpus: <MonitorPlay className="w-7 h-7" />,
  gpu: <MonitorPlay className="w-7 h-7" />,
  motherboards: <CircuitBoard className="w-7 h-7" />,
  ram: <MemoryStick className="w-7 h-7" />,
  'ssd-hdd': <HardDrive className="w-7 h-7" />,
  storage: <HardDrive className="w-7 h-7" />,
  ssd: <HardDrive className="w-7 h-7" />,
  hdd: <Database className="w-7 h-7" />,
  psus: <Zap className="w-7 h-7" />,
  psu: <Zap className="w-7 h-7" />,
  cases: <Box className="w-7 h-7" />,
  coolers: <Fan className="w-7 h-7" />,
  monitors: <Monitor className="w-7 h-7" />,
  peripherals: <Keyboard className="w-7 h-7" />,
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const SLIDE_INTERVAL = 5000;

export default function HomePage() {
  const [featured, setFeatured] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      productsApi.getProducts({ is_featured: true, page_size: 8 }),
      productsApi.getCategories(),
      productsApi.getHeroSlides().catch(() => []),
    ]).then(([productsRes, categoriesRes, slidesRes]) => {
      setFeatured(productsRes.results || []);
      setCategories(categoriesRes);
      setSlides(slidesRes);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* Hero */}
      {slides.length > 0 ? (
        <HeroSlider slides={slides} />
      ) : (
        <StaticHero />
      )}

      {/* Categories */}
      <AnimatedSection className="max-w-7xl mx-auto px-4 py-10 sm:py-16">
        <h2 className="text-xl sm:text-2xl font-bold mb-6 sm:mb-8">Категории</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
          {/* API categories + static extras (monitors/peripherals) deduplicated */}
          {[
            ...categories,
            ...STATIC_EXTRA_CATS
              .filter(ec => !categories.some(c => c.slug === ec.slug))
              .map(ec => ({ id: -(ec.slug === 'monitors' ? 1 : 2), slug: ec.slug, name: ec.name, description: '', image: null, parent: null, is_active: true, children: [] } as Category)),
          ].map((cat, i) => (
            <motion.div
              key={cat.id}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
            >
              <Link
                to={`/catalog/${cat.slug}`}
                className="flex flex-col items-center gap-2 sm:gap-3 bg-bg-card rounded-2xl shadow-sm p-4 sm:p-8 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group border border-transparent hover:border-primary/20"
              >
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-white group-hover:shadow-md group-hover:shadow-primary/20">
                  {categoryIcons[cat.slug] || <Box className="w-7 h-7" />}
                </div>
                <span className="font-medium text-center text-text-primary text-xs sm:text-sm">{cat.name}</span>
              </Link>
            </motion.div>
          ))}

          {/* Special card — Готовые сборки */}
          <motion.div
            custom={categories.length}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
          >
            <Link
              to="/presets"
              className="flex flex-col items-center gap-2 sm:gap-3 rounded-2xl shadow-sm p-4 sm:p-8 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group border border-primary/30 bg-gradient-to-br from-primary/10 to-accent/10 hover:border-primary/60"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center text-white transition-all duration-300 group-hover:shadow-md group-hover:shadow-primary/30">
                <Package2 className="w-7 h-7" />
              </div>
              <span className="font-semibold text-center text-primary text-xs sm:text-sm">Готовые сборки</span>
            </Link>
          </motion.div>
        </div>
      </AnimatedSection>

      {/* Featured Products */}
      <AnimatedSection className="max-w-7xl mx-auto px-4 py-10 sm:py-16">
        <div className="flex justify-between items-center mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold">Хиты продаж</h2>
          <Link to="/catalog" className="text-primary hover:text-primary-dark flex items-center gap-1 transition-colors font-medium">
            Все товары <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {featured.map((product, i) => (
              <motion.div
                key={product.id}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </div>
        )}
      </AnimatedSection>

      {/* Configurator CTA */}
      <AnimatedSection className="max-w-7xl mx-auto px-4 py-10 sm:py-16">
        <div className="bg-gradient-to-r from-primary to-accent rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

          <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 text-white relative z-10">Конфигуратор ПК</h2>
          <p className="text-white/80 mb-4 sm:mb-6 max-w-2xl mx-auto text-sm sm:text-lg relative z-10">
            Соберите свой идеальный компьютер с проверкой совместимости компонентов
            и AI-оценкой вашей сборки
          </p>
          <Link
            to="/configurator"
            className="relative z-10 inline-block bg-white text-primary px-8 py-3.5 rounded-xl font-semibold transition-all hover:shadow-lg hover:-translate-y-0.5"
          >
            Начать сборку
          </Link>
        </div>
      </AnimatedSection>

      {/* Advantages */}
      <AnimatedSection className="max-w-7xl mx-auto px-4 py-10 sm:py-16">
        <h2 className="text-xl sm:text-2xl font-bold mb-6 sm:mb-8 text-center">Почему Elite PC?</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
          {[
            { icon: <Shield className="w-7 h-7" />, title: 'Гарантия', desc: 'Официальная гарантия на всю продукцию' },
            { icon: <Truck className="w-7 h-7" />, title: 'Доставка', desc: 'Доставка по Душанбе и всему Таджикистану' },
            { icon: <Headphones className="w-7 h-7" />, title: 'Поддержка', desc: 'Консультация специалистов' },
            { icon: <Cpu className="w-7 h-7" />, title: 'Сборка ПК', desc: 'Профессиональная сборка компьютеров' },
          ].map((item, i) => (
            <motion.div
              key={i}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="bg-bg-card rounded-2xl shadow-sm p-4 sm:p-6 text-center border border-transparent hover:border-primary/10 hover:shadow-md transition-all duration-300"
            >
              <div className="w-14 h-14 bg-accent/10 rounded-xl flex items-center justify-center text-accent mx-auto mb-4">
                {item.icon}
              </div>
              <h3 className="font-semibold mb-2">{item.title}</h3>
              <p className="text-text-secondary text-sm">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </AnimatedSection>
    </div>
  );
}

/* ====================================================================
   Hero Slider
   ==================================================================== */

function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (slides.length <= 1) return;
    timerRef.current = setInterval(() => {
      setDirection(1);
      setCurrent(prev => (prev + 1) % slides.length);
    }, SLIDE_INTERVAL);
  }, [slides.length]);

  useEffect(() => {
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [startTimer]);

  const goTo = (idx: number) => {
    setDirection(idx > current ? 1 : -1);
    setCurrent(idx);
    startTimer();
  };

  const goNext = () => {
    setDirection(1);
    setCurrent(prev => (prev + 1) % slides.length);
    startTimer();
  };

  const goPrev = () => {
    setDirection(-1);
    setCurrent(prev => (prev - 1 + slides.length) % slides.length);
    startTimer();
  };

  const slide = slides[current];

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? '-100%' : '100%', opacity: 0 }),
  };

  return (
    <section className="relative w-full h-[320px] sm:h-[420px] md:h-[520px] overflow-hidden bg-bg-dark">
      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={slide.id}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          {/* Background image */}
          <img
            src={slide.image}
            alt={slide.title}
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />

          {/* Content */}
          <div className="relative z-10 h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center">
            <div className="max-w-xl">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="text-xl sm:text-3xl md:text-5xl font-bold text-white mb-2 sm:mb-3 leading-tight"
              >
                {slide.title}
              </motion.h2>

              {slide.subtitle && (
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="text-sm sm:text-lg md:text-xl text-white/80 mb-2"
                >
                  {slide.subtitle}
                </motion.p>
              )}

              {slide.description && (
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  className="text-white/60 mb-4 sm:mb-6 text-xs sm:text-base"
                >
                  {slide.description}
                </motion.p>
              )}

              {slide.button_text && slide.button_link && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                >
                  <Link
                    to={slide.button_link}
                    className="inline-block bg-primary hover:bg-primary-dark text-white px-6 sm:px-8 py-2.5 sm:py-3.5 rounded-xl font-semibold transition-all text-sm sm:text-lg shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5"
                  >
                    {slide.button_text}
                  </Link>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation arrows */}
      {slides.length > 1 && (
        <>
          <button
            onClick={goPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/25 text-white flex items-center justify-center transition-all"
            aria-label="Предыдущий слайд"
          >
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
          </button>
          <button
            onClick={goNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/25 text-white flex items-center justify-center transition-all"
            aria-label="Следующий слайд"
          >
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </>
      )}

      {/* Dots indicator */}
      {slides.length > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => goTo(idx)}
              aria-label={`Слайд ${idx + 1}`}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === current
                  ? 'w-8 bg-primary'
                  : 'w-2 bg-white/40 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      )}

      {/* Progress bar */}
      {slides.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 z-20 h-0.5 bg-white/10">
          <motion.div
            key={current}
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: SLIDE_INTERVAL / 1000, ease: 'linear' }}
            className="h-full bg-primary"
          />
        </div>
      )}
    </section>
  );
}

/* ====================================================================
   Static Hero (fallback when no slides)
   ==================================================================== */

function StaticHero() {
  return (
    <section className="relative bg-gradient-to-br from-bg-dark via-primary/5 to-bg-card overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />

      <div className="max-w-7xl mx-auto px-4 py-20 md:py-32 relative z-10">
        <div className="max-w-2xl">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="text-4xl md:text-6xl font-bold mb-6"
          >
            <span className="text-gradient">Elite PC</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="text-xl md:text-2xl text-text-secondary mb-4"
          >
            Компьютеры и комплектующие в Таджикистане
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="text-text-muted mb-8 text-lg"
          >
            Собери свой идеальный ПК с помощью нашего конфигуратора с AI-оценкой совместимости
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-wrap gap-4"
          >
            <Link
              to="/configurator"
              className="bg-gradient-to-r from-primary to-primary-dark text-white px-8 py-3.5 rounded-xl font-semibold transition-all text-lg shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
            >
              Собрать ПК
            </Link>
            <Link
              to="/catalog"
              className="bg-bg-card border border-border text-text-primary px-8 py-3.5 rounded-xl font-semibold transition-all text-lg hover:border-primary hover:text-primary hover:shadow-md"
            >
              Каталог
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
