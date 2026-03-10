import apiClient from './client';
import type {
  Product,
  Category,
  Brand,
  FilterOption,
  PaginatedResponse,
} from '../types';

export interface ProductsParams {
  page?: number;
  page_size?: number;
  ordering?: string;
  search?: string;
  category?: string;
  brand?: string;
  price_min?: number;
  price_max?: number;
  in_stock?: boolean;
  is_featured?: boolean;
  [key: string]: string | number | boolean | undefined;
}

export const getProducts = async (
  params?: ProductsParams
): Promise<PaginatedResponse<Product>> => {
  const response = await apiClient.get<PaginatedResponse<Product>>('/products/', {
    params,
  });
  return response.data;
};

export const getProduct = async (slug: string): Promise<Product> => {
  const response = await apiClient.get<Product>(`/products/${slug}/`);
  return response.data;
};

export const getSimilarProducts = async (slug: string): Promise<Product[]> => {
  const response = await apiClient.get<Product[]>(`/products/${slug}/similar/`);
  return response.data;
};

export const getCategories = async (): Promise<Category[]> => {
  const response = await apiClient.get<Category[]>('/categories/');
  return response.data;
};

export const getCategoryProducts = async (
  slug: string,
  params?: ProductsParams
): Promise<PaginatedResponse<Product>> => {
  const response = await apiClient.get<PaginatedResponse<Product>>(
    `/categories/${slug}/products/`,
    { params }
  );
  return response.data;
};

export const getCategoryFilters = async (
  slug: string
): Promise<FilterOption[]> => {
  const response = await apiClient.get<FilterOption[]>(
    `/categories/${slug}/filters/`
  );
  return response.data;
};

export const getBrands = async (): Promise<Brand[]> => {
  const response = await apiClient.get<Brand[]>('/brands/');
  return response.data;
};

export const searchProducts = async (
  query: string,
  params?: ProductsParams
): Promise<PaginatedResponse<Product>> => {
  const response = await apiClient.get<PaginatedResponse<Product>>('/search/', {
    params: { q: query, ...params },
  });
  return response.data;
};

export const getHeroSlides = async (): Promise<import('../types').HeroSlide[]> => {
  const response = await apiClient.get<import('../types').HeroSlide[]>('/hero-slides/');
  return response.data;
};

export const getPresets = async (): Promise<import('../types').PCConfiguration[]> => {
  const response = await apiClient.get<import('../types').PCConfiguration[]>('/configurator/presets/');
  return response.data;
};

// Module-level cache — all public pages share one network request per session
let _siteSettingsCache: Promise<import('../types').SiteSettings> | null = null;

export const getSiteSettings = (): Promise<import('../types').SiteSettings> => {
  if (!_siteSettingsCache) {
    _siteSettingsCache = apiClient
      .get<import('../types').SiteSettings>('/site-settings/')
      .then(r => r.data)
      .catch(() => {
        _siteSettingsCache = null; // allow retry on error
        return {} as import('../types').SiteSettings;
      });
  }
  return _siteSettingsCache;
};
