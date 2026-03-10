// ── Analytics Report ─────────────────────────────────────────────────────────

export interface AnalyticsTopProduct {
  id: number;
  name: string;
  sku: string;
  quantity_sold: number;
  revenue: number;
}

export interface AnalyticsDailyRow {
  date: string;
  orders: number;
  revenue: number;
  cancelled: number;
}

export interface AnalyticsCancelledOrder {
  id: number;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  total_price: string;
  delivery_method: string;
  created_at: string;
}

export interface AnalyticsReport {
  period: { start: string; end: string; days: number };
  summary: {
    total_orders: number;
    revenue_total: number;
    revenue_orders_count: number;
    avg_order_value: number;
    cancelled_count: number;
    cancelled_revenue_lost: number;
    cancellation_rate: number;
  };
  status_distribution: Record<string, number>;
  delivery_breakdown: Record<string, { count: number; revenue: number }>;
  daily_breakdown: AnalyticsDailyRow[];
  top_by_revenue: AnalyticsTopProduct[];
  top_by_quantity: AnalyticsTopProduct[];
  recent_cancelled: AnalyticsCancelledOrder[];
}

// ── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardData {
  orders_today: number;
  revenue_today: number;
  new_customers: number;
  total_products: number;
  daily_sales: DailySale[];
  status_distribution: Record<string, number>;
  recent_orders: RecentOrder[];
  low_stock_products: LowStockProduct[];
}

export interface DailySale {
  date: string;
  orders: number;
  revenue: number;
}

export interface RecentOrder {
  id: number;
  order_number: string;
  status: string;
  customer_name: string;
  customer_phone: string;
  total_price: string;
  created_at: string;
}

export interface ManagerDashboardData {
  orders_today: number;
  orders_new: number;
  total_products: number;
  status_distribution: Record<string, number>;
  recent_orders: Array<{
    id: number;
    order_number: string;
    status: string;
    customer_name: string;
    customer_phone: string;
    created_at: string;
  }>;
  low_stock_products: LowStockProduct[];
}

export interface LowStockProduct {
  id: number;
  name: string;
  sku: string;
  stock_quantity: number;
}

export interface AdminOrder {
  id: number;
  order_number: string;
  status: string;
  status_display: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  delivery_method: string;
  total_price: string;
  is_guest_order: boolean;
  created_at: string;
  items_count: number;
}

export interface AdminOrderItem {
  id: number;
  product: number | null;
  product_name: string | null;
  product_slug: string | null;
  product_image: string | null;
  product_sku: string | null;
  configuration: number | null;
  configuration_name: string | null;
  quantity: number;
  price_at_purchase: string;
  is_assembled: boolean;
  assembly_fee: string;
  line_total: string;
}

export interface AdminOrderStatusHistory {
  id: number;
  old_status: string;
  new_status: string;
  changed_by_name: string | null;
  comment: string;
  created_at: string;
}

export interface AdminOrderDetail {
  id: number;
  order_number: string;
  status: string;
  status_display: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  customer_city: string;
  customer_address: string;
  delivery_method: string;
  delivery_method_display: string;
  comment: string;
  total_price: string;
  discount_amount: string;
  is_guest_order: boolean;
  created_at: string;
  updated_at: string;
  items: AdminOrderItem[];
  status_history: AdminOrderStatusHistory[];
}

export interface AdminProduct {
  id: number;
  name: string;
  slug: string;
  sku: string;
  category_name: string;
  brand_name: string | null;
  price: string;
  discount_price: string | null;
  stock_quantity: number;
  is_active: boolean;
  is_featured: boolean;
  main_image: string | null;
  created_at: string;
}

export interface TelegramChat {
  id: number;
  chat_id: number;
  chat_type: string;
  title: string;
  username: string;
  status: 'pending' | 'approved' | 'rejected';
  status_display: string;
  registered_at: string;
  updated_at: string;
}

export interface NotificationSettings {
  telegram_bot_token: string;
  telegram_channel_id: string;
  is_active: boolean;
  notify_on_new_order: boolean;
  notify_on_status_change: boolean;
  notify_on_low_stock: boolean;
  low_stock_threshold: number;
  daily_report_time: string;
}

// ── Company / Site Settings ──────────────────────────────
export type { SiteSettings } from './index';

// ── Categories ──────────────────────────────────────────

export interface AdminCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  image: string | null;
  parent: number | null;
  parent_name: string | null;
  is_active: boolean;
  order: number;
  meta_title: string;
  meta_description: string;
  children_count: number;
  products_count: number;
}

export interface AdminCategoryTreeItem {
  id: number;
  name: string;
  level: number;
}

// ── Brands ──────────────────────────────────────────────

export interface AdminBrand {
  id: number;
  name: string;
  slug: string;
  logo: string | null;
  description: string;
}

// ── Specification Names ─────────────────────────────────

export interface AdminSpecName {
  id: number;
  name: string;
  category: number;
  unit: string;
  filter_type: 'checkbox' | 'range' | 'select';
  is_filterable: boolean;
  is_comparable: boolean;
  order: number;
}

// ── Products Detail ─────────────────────────────────────

export interface AdminProductImage {
  id: number;
  product: number;
  image: string;
  alt_text: string;
  order: number;
  is_main: boolean;
}

export interface AdminProductSpec {
  id: number;
  spec_name: number;
  spec_name_display: string;
  unit: string;
  value: string;
}

export interface AdminProductDetail {
  id: number;
  name: string;
  slug: string;
  sku: string;
  description: string;
  short_description: string;
  category: number;
  category_name: string;
  brand: number | null;
  brand_name: string | null;
  price: string;
  discount_price: string | null;
  discount_percent: number;
  stock_quantity: number;
  is_active: boolean;
  is_featured: boolean;
  main_image: string | null;
  images: AdminProductImage[];
  specifications: AdminProductSpec[];
  created_at: string;
}

// ── Presets ──────────────────────────────────────────────

export interface AdminPresetItem {
  id: number;
  component_type: string;
  product: number;
  product_name: string;
  product_image: string | null;
  product_price: string;
  quantity: number;
  price_at_addition: string;
}

export interface AdminPreset {
  id: number;
  name: string;
  preset_label: string;
  assembly_fee: string;
  total_price: string;
  status: string;
  image: string | null;
  items: AdminPresetItem[];
  items_count: number;
  created_at: string;
}

// ── Hero Slides ──────────────────────────────────────────

export interface AdminHeroSlide {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  button_text: string;
  button_link: string;
  order: number;
  is_active: boolean;
  created_at: string;
}
