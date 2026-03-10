// Product types
export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  image: string | null;
  parent: number | null;
  is_active: boolean;
  children: Category[];
}

export interface Brand {
  id: number;
  name: string;
  slug: string;
  logo: string | null;
  description: string;
}

export interface ProductImage {
  id: number;
  image: string;
  alt_text: string;
  order: number;
  is_main: boolean;
}

export interface ProductSpecification {
  id: number;
  spec_name_display: string;
  unit: string;
  value: string;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  sku: string;
  description: string;
  short_description: string;
  category_name: string;
  category_slug: string;
  brand_name: string | null;
  brand_slug: string | null;
  price: string;
  discount_price: string | null;
  discount_percent: number;
  current_price: string;
  stock_quantity: number;
  in_stock: boolean;
  is_featured: boolean;
  main_image: string | null;
  views_count: number;
  created_at: string;
  updated_at: string;
  images: ProductImage[];
  specifications: ProductSpecification[];
}

// Cart types
export interface CartItem {
  id: number;
  product: Product | null;
  configuration: PCConfiguration | null;
  quantity: number;
  with_assembly: boolean;
  item_total: string;
}

export interface CartResponse {
  items: CartItem[];
  total: number;
  count: number;
}

// Order types
export interface OrderItem {
  id: number;
  product_detail: Product | null;
  configuration: number | null;
  quantity: number;
  price_at_purchase: string;
  is_assembled: boolean;
  assembly_fee: string;
  line_total: string;
}

export interface OrderStatusHistory {
  old_status: string;
  new_status: string;
  changed_by_name: string;
  comment: string;
  created_at: string;
}

export interface Order {
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
  items: OrderItem[];
  items_count: number;
  status_history: OrderStatusHistory[];
  created_at: string;
  updated_at: string;
}

// Configurator types
export interface ConfigurationItem {
  id: number;
  component_type: string;
  product: Product;
  product_detail: Product;
  quantity: number;
  price_at_addition: string;
}

export interface PCConfiguration {
  id: number;
  name: string;
  status: string;
  items: ConfigurationItem[];
  total_price: string;
  total_with_assembly: string;
  assembly_fee: string;
  ai_rating: number | null;
  ai_comment: string;
  is_preset: boolean;
  preset_label: string;
  image: string | null;
  created_at: string;
}

export interface HeroSlide {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  button_text: string;
  button_link: string;
}

export interface SiteSettings {
  phone_primary: string;
  phone_secondary: string;
  email_primary: string;
  email_support: string;
  telegram_handle: string;
  telegram_url: string;
  address_line1: string;
  address_line2: string;
  address_line3: string;
  working_hours: string;
  about_text: string;
  about_mission: string;
  delivery_city_price: string;
  delivery_free_threshold: string;
  delivery_city_days: string;
  delivery_country_days: string;
  site_name: string;
  meta_description: string;
}

export interface CompatibilityResult {
  is_compatible: boolean;
  warnings: string[];
  errors: string[];
}

export interface AIEvaluation {
  rating: number;
  comment: string;
  balance_score: number | null;
  recommendations: string[];
  suitable_for: string[];
  estimated_fps: Record<string, number>;
}

// User types
export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  city: string;
  address: string;
  is_staff: boolean;
  is_superuser: boolean;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

// Filter types
export interface FilterOption {
  id: number;
  name: string;
  unit: string;
  filter_type: 'checkbox' | 'range' | 'select';
  values: string[];
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Breadcrumb types
export interface BreadcrumbItem {
  label: string;
  href?: string;
}
