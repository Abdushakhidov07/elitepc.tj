import apiClient from './client';
import type {
  AnalyticsReport,
  DashboardData,
  ManagerDashboardData,
  AdminOrder,
  AdminOrderDetail,
  AdminProduct,
  AdminCategory,
  AdminCategoryTreeItem,
  AdminBrand,
  AdminSpecName,
  AdminProductDetail,
  AdminProductImage,
  AdminPreset,
  AdminPresetItem,
  AdminHeroSlide,
  TelegramChat,
  NotificationSettings,
} from '../types/admin';
import type { SiteSettings } from '../types';

export const getDashboard = async (): Promise<DashboardData> => {
  const response = await apiClient.get<DashboardData>('/admin/dashboard/');
  return response.data;
};

export const getManagerDashboard = async (): Promise<ManagerDashboardData> => {
  const response = await apiClient.get<ManagerDashboardData>('/admin/manager-dashboard/');
  return response.data;
};

export const getAnalyticsReport = async (
  period: 'today' | 'week' | 'month' | 'year' | 'custom',
  start?: string,
  end?: string,
): Promise<AnalyticsReport> => {
  const params: Record<string, string> = { period };
  if (period === 'custom' && start && end) {
    params.start = start;
    params.end = end;
  }
  const response = await apiClient.get<AnalyticsReport>('/admin/analytics/', { params });
  return response.data;
};

export const getAdminOrders = async (params?: {
  status?: string;
  search?: string;
}): Promise<AdminOrder[]> => {
  const response = await apiClient.get<AdminOrder[]>('/admin/orders/', { params });
  return response.data;
};

export const getAdminOrderDetail = async (id: number): Promise<AdminOrderDetail> => {
  const response = await apiClient.get<AdminOrderDetail>(`/admin/orders/${id}/`);
  return response.data;
};

export const updateOrderStatus = async (
  id: number,
  data: { status: string; comment?: string }
): Promise<unknown> => {
  const response = await apiClient.patch(`/orders/${id}/status/`, data);
  return response.data;
};

export const getAdminProducts = async (params?: {
  search?: string;
  category?: number;
  category_slug?: string;
}): Promise<AdminProduct[]> => {
  const response = await apiClient.get<AdminProduct[]>('/admin/products/', { params });
  return response.data;
};

export const updateAdminProduct = async (
  id: number,
  data: Partial<Pick<AdminProduct, 'price' | 'discount_price' | 'stock_quantity' | 'is_active' | 'is_featured'>>
): Promise<AdminProduct> => {
  const response = await apiClient.patch<AdminProduct>(`/admin/products/${id}/`, data);
  return response.data;
};

export const getTelegramChats = async (): Promise<TelegramChat[]> => {
  const response = await apiClient.get<TelegramChat[]>('/admin/telegram-chats/');
  return response.data;
};

export const updateTelegramChat = async (
  id: number,
  data: { status: 'approved' | 'rejected' }
): Promise<TelegramChat> => {
  const response = await apiClient.patch<TelegramChat>(`/admin/telegram-chats/${id}/`, data);
  return response.data;
};

export const deleteTelegramChat = async (id: number): Promise<void> => {
  await apiClient.delete(`/admin/telegram-chats/${id}/`);
};

export const getSettings = async (): Promise<NotificationSettings> => {
  const response = await apiClient.get<NotificationSettings>('/admin/settings/');
  return response.data;
};

export const updateSettings = async (
  data: Partial<NotificationSettings>
): Promise<NotificationSettings> => {
  const response = await apiClient.put<NotificationSettings>('/admin/settings/', data);
  return response.data;
};

// ── Company Settings ─────────────────────────────────────

export const getCompanySettings = async (): Promise<SiteSettings> => {
  const response = await apiClient.get<SiteSettings>('/admin/company-settings/');
  return response.data;
};

export const updateCompanySettings = async (
  data: Partial<SiteSettings>
): Promise<SiteSettings> => {
  const response = await apiClient.patch<SiteSettings>('/admin/company-settings/', data);
  return response.data;
};

// ── Categories ──────────────────────────────────────────

export const getAdminCategories = async (): Promise<AdminCategory[]> => {
  const response = await apiClient.get<AdminCategory[]>('/admin/categories/');
  return response.data;
};

export const getAdminCategoryTree = async (): Promise<AdminCategoryTreeItem[]> => {
  const response = await apiClient.get<AdminCategoryTreeItem[]>('/admin/categories/tree/');
  return response.data;
};

export const createAdminCategory = async (data: FormData): Promise<AdminCategory> => {
  const response = await apiClient.post<AdminCategory>('/admin/categories/', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const updateAdminCategory = async (id: number, data: FormData): Promise<AdminCategory> => {
  const response = await apiClient.patch<AdminCategory>(`/admin/categories/${id}/`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const deleteAdminCategory = async (id: number): Promise<void> => {
  await apiClient.delete(`/admin/categories/${id}/`);
};

// ── Brands CRUD ─────────────────────────────────────────

export const getAdminBrands = async (): Promise<AdminBrand[]> => {
  const response = await apiClient.get<AdminBrand[]>('/admin/brands/');
  return response.data;
};

export const createAdminBrand = async (data: FormData): Promise<AdminBrand> => {
  const response = await apiClient.post<AdminBrand>('/admin/brands/', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const updateAdminBrand = async (id: number, data: FormData): Promise<AdminBrand> => {
  const response = await apiClient.patch<AdminBrand>(`/admin/brands/${id}/`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const deleteAdminBrand = async (id: number): Promise<void> => {
  await apiClient.delete(`/admin/brands/${id}/`);
};

// ── Specification Names ─────────────────────────────────

export const getAdminSpecNames = async (categoryId: number): Promise<AdminSpecName[]> => {
  const response = await apiClient.get<AdminSpecName[]>('/admin/spec-names/', {
    params: { category: categoryId },
  });
  return response.data;
};

export const createAdminSpecName = async (data: Omit<AdminSpecName, 'id'>): Promise<AdminSpecName> => {
  const response = await apiClient.post<AdminSpecName>('/admin/spec-names/', data);
  return response.data;
};

export const updateAdminSpecName = async (id: number, data: Partial<AdminSpecName>): Promise<AdminSpecName> => {
  const response = await apiClient.patch<AdminSpecName>(`/admin/spec-names/${id}/`, data);
  return response.data;
};

export const deleteAdminSpecName = async (id: number): Promise<void> => {
  await apiClient.delete(`/admin/spec-names/${id}/`);
};

// ── Products Full CRUD ──────────────────────────────────

export const getAdminProductDetail = async (id: number): Promise<AdminProductDetail> => {
  const response = await apiClient.get<AdminProductDetail>(`/admin/products/${id}/detail/`);
  return response.data;
};

export const createAdminProduct = async (data: FormData): Promise<AdminProductDetail> => {
  const response = await apiClient.post<AdminProductDetail>('/admin/products/create/', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const updateAdminProductFull = async (id: number, data: FormData): Promise<AdminProductDetail> => {
  const response = await apiClient.patch<AdminProductDetail>(`/admin/products/${id}/detail/`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const deleteAdminProduct = async (id: number): Promise<void> => {
  await apiClient.delete(`/admin/products/${id}/detail/`);
};

// ── Product Images ──────────────────────────────────────

export const uploadProductImage = async (productId: number, data: FormData): Promise<AdminProductImage> => {
  const response = await apiClient.post<AdminProductImage>(`/admin/products/${productId}/images/`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const deleteProductImage = async (imageId: number): Promise<void> => {
  await apiClient.delete(`/admin/products/images/${imageId}/`);
};

// ── Product Specifications (bulk) ───────────────────────

export const setProductSpecs = async (
  productId: number,
  specs: { spec_name: number; value: string }[]
): Promise<void> => {
  await apiClient.put(`/admin/products/${productId}/specs/`, { specs });
};

// ── Presets ──────────────────────────────────────────────

export const getAdminPresets = async (): Promise<AdminPreset[]> => {
  const response = await apiClient.get<AdminPreset[]>('/admin/presets/');
  return response.data;
};

export const createAdminPreset = async (data: {
  name: string;
  preset_label: string;
  assembly_fee: string;
  image?: File | null;
}): Promise<AdminPreset> => {
  const fd = new FormData();
  fd.append('name', data.name);
  fd.append('preset_label', data.preset_label);
  fd.append('assembly_fee', data.assembly_fee);
  if (data.image) fd.append('image', data.image);
  const response = await apiClient.post<AdminPreset>('/admin/presets/', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const updateAdminPreset = async (id: number, data: {
  name?: string;
  preset_label?: string;
  assembly_fee?: string;
  image?: File | null;
}): Promise<AdminPreset> => {
  const fd = new FormData();
  if (data.name !== undefined) fd.append('name', data.name);
  if (data.preset_label !== undefined) fd.append('preset_label', data.preset_label);
  if (data.assembly_fee !== undefined) fd.append('assembly_fee', data.assembly_fee);
  if (data.image) fd.append('image', data.image);
  const response = await apiClient.patch<AdminPreset>(`/admin/presets/${id}/`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const deleteAdminPreset = async (id: number): Promise<void> => {
  await apiClient.delete(`/admin/presets/${id}/`);
};

export const addPresetItem = async (presetId: number, data: {
  product_id: number;
  component_type: string;
  quantity?: number;
}): Promise<AdminPresetItem> => {
  const response = await apiClient.post<AdminPresetItem>(`/admin/presets/${presetId}/items/`, data);
  return response.data;
};

export const removePresetItem = async (presetId: number, itemId: number): Promise<void> => {
  await apiClient.delete(`/admin/presets/${presetId}/items/${itemId}/`);
};

// ── Hero Slides ────────────────────────────────────────────

export const getAdminHeroSlides = async (): Promise<AdminHeroSlide[]> => {
  const response = await apiClient.get<AdminHeroSlide[]>('/admin/hero-slides/');
  return response.data;
};

export const createAdminHeroSlide = async (data: FormData): Promise<AdminHeroSlide> => {
  const response = await apiClient.post<AdminHeroSlide>('/admin/hero-slides/', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const updateAdminHeroSlide = async (id: number, data: FormData): Promise<AdminHeroSlide> => {
  const response = await apiClient.patch<AdminHeroSlide>(`/admin/hero-slides/${id}/`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const deleteAdminHeroSlide = async (id: number): Promise<void> => {
  await apiClient.delete(`/admin/hero-slides/${id}/`);
};
