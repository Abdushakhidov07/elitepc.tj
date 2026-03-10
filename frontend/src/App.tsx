import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Eager-load the shell components (tiny, needed immediately)
import Layout from './components/layout/Layout';
import AdminGuard from './components/admin/AdminGuard';
import AdminLayout from './components/admin/AdminLayout';

// Lazy-load all pages — each becomes its own JS chunk
const HomePage         = lazy(() => import('./pages/HomePage'));
const CatalogPage      = lazy(() => import('./pages/CatalogPage'));
const ProductPage      = lazy(() => import('./pages/ProductPage'));
const ConfiguratorPage = lazy(() => import('./pages/ConfiguratorPage'));
const CartPage         = lazy(() => import('./pages/CartPage'));
const CheckoutPage     = lazy(() => import('./pages/CheckoutPage'));
const LoginPage        = lazy(() => import('./pages/LoginPage'));
const RegisterPage     = lazy(() => import('./pages/RegisterPage'));
const ProfilePage      = lazy(() => import('./pages/ProfilePage'));
const OrderTrackPage   = lazy(() => import('./pages/OrderTrackPage'));
const SearchPage       = lazy(() => import('./pages/SearchPage'));
const WishlistPage     = lazy(() => import('./pages/WishlistPage'));
const AboutPage        = lazy(() => import('./pages/AboutPage'));
const ContactsPage     = lazy(() => import('./pages/ContactsPage'));
const DeliveryPage     = lazy(() => import('./pages/DeliveryPage'));
const WarrantyPage     = lazy(() => import('./pages/WarrantyPage'));
const NotFoundPage     = lazy(() => import('./pages/NotFoundPage'));
const PresetsPage      = lazy(() => import('./pages/PresetsPage'));

// Admin pages — only loaded when user navigates to /admin/*
const AdminDashboard   = lazy(() => import('./pages/admin/DashboardPage'));
const AdminOrders      = lazy(() => import('./pages/admin/OrdersPage'));
const AdminProducts    = lazy(() => import('./pages/admin/ProductsPage'));
const AdminCategories  = lazy(() => import('./pages/admin/CategoriesPage'));
const AdminBrands      = lazy(() => import('./pages/admin/BrandsPage'));
const AdminProductForm = lazy(() => import('./pages/admin/ProductFormPage'));
const AdminPresets     = lazy(() => import('./pages/admin/PresetsPage'));
const AdminAnalytics   = lazy(() => import('./pages/admin/AnalyticsPage'));
const AdminHeroSlides  = lazy(() => import('./pages/admin/HeroSlidesPage'));
const AdminTelegram    = lazy(() => import('./pages/admin/TelegramChatsPage'));
const AdminSettings    = lazy(() => import('./pages/admin/SettingsPage'));

function PageLoader() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Customer pages */}
          <Route element={<Layout />}>
            <Route path="/"                   element={<HomePage />} />
            <Route path="/catalog"            element={<CatalogPage />} />
            <Route path="/catalog/:slug"      element={<CatalogPage />} />
            <Route path="/product/:slug"      element={<ProductPage />} />
            <Route path="/configurator"       element={<ConfiguratorPage />} />
            <Route path="/presets"            element={<PresetsPage />} />
            <Route path="/cart"               element={<CartPage />} />
            <Route path="/checkout"           element={<CheckoutPage />} />
            <Route path="/login"              element={<LoginPage />} />
            <Route path="/register"           element={<RegisterPage />} />
            <Route path="/profile"            element={<ProfilePage />} />
            <Route path="/track"              element={<OrderTrackPage />} />
            <Route path="/track/:orderNumber" element={<OrderTrackPage />} />
            <Route path="/search"             element={<SearchPage />} />
            <Route path="/wishlist"           element={<WishlistPage />} />
            <Route path="/about"              element={<AboutPage />} />
            <Route path="/contacts"           element={<ContactsPage />} />
            <Route path="/delivery"           element={<DeliveryPage />} />
            <Route path="/warranty"           element={<WarrantyPage />} />
            <Route path="*"                   element={<NotFoundPage />} />
          </Route>

          {/* Admin panel */}
          <Route path="/admin" element={<AdminGuard><AdminLayout /></AdminGuard>}>
            <Route index                      element={<AdminDashboard />} />
            <Route path="orders"              element={<AdminOrders />} />
            <Route path="products"            element={<AdminProducts />} />
            <Route path="products/new"        element={<AdminProductForm />} />
            <Route path="products/:id/edit"   element={<AdminProductForm />} />
            <Route path="categories"          element={<AdminCategories />} />
            <Route path="brands"              element={<AdminBrands />} />
            <Route path="presets"             element={<AdminPresets />} />
            <Route path="analytics"           element={<AdminAnalytics />} />
            <Route path="hero-slides"         element={<AdminHeroSlides />} />
            <Route path="telegram"            element={<AdminTelegram />} />
            <Route path="settings"            element={<AdminSettings />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
