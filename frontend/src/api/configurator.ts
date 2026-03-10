import apiClient from './client';
import type {
  PCConfiguration,
  ConfigurationItem,
  CompatibilityResult,
  AIEvaluation,
  Product,
  PaginatedResponse,
} from '../types';

export interface CreateConfigurationData {
  name?: string;
}

export interface AddComponentData {
  product_id: number;
  component_type: string;
  quantity?: number;
}

export interface AddConfigToCartData {
  with_assembly: boolean;
}

export const createConfiguration = async (
  data?: CreateConfigurationData
): Promise<PCConfiguration> => {
  const response = await apiClient.post<PCConfiguration>(
    '/configurator/',
    data || {}
  );
  return response.data;
};

export const getConfiguration = async (
  id: number
): Promise<PCConfiguration> => {
  const response = await apiClient.get<PCConfiguration>(
    `/configurator/${id}/`
  );
  return response.data;
};

export const addComponent = async (
  configId: number,
  data: AddComponentData
): Promise<ConfigurationItem> => {
  const response = await apiClient.post<ConfigurationItem>(
    `/configurator/${configId}/add-component/`,
    data
  );
  return response.data;
};

export const removeComponent = async (
  configId: number,
  componentType: string
): Promise<void> => {
  await apiClient.delete(
    `/configurator/${configId}/remove-component/${componentType}/`
  );
};

export const getCompatibleProducts = async (
  configId: number,
  componentType: string,
  params?: { page?: number; page_size?: number; search?: string }
): Promise<PaginatedResponse<Product>> => {
  const response = await apiClient.get<PaginatedResponse<Product>>(
    `/configurator/${configId}/compatible-products/${componentType}/`,
    { params }
  );
  return response.data;
};

export const checkCompatibility = async (
  configId: number
): Promise<CompatibilityResult> => {
  const response = await apiClient.get<CompatibilityResult>(
    `/configurator/${configId}/check-compatibility/`
  );
  return response.data;
};

export const aiEvaluate = async (
  configId: number
): Promise<AIEvaluation> => {
  const response = await apiClient.post<AIEvaluation>(
    `/configurator/${configId}/ai-evaluate/`
  );
  return response.data;
};

export const addConfigToCart = async (
  configId: number,
  data: AddConfigToCartData
): Promise<{ detail: string }> => {
  const response = await apiClient.post<{ detail: string }>(
    `/configurator/${configId}/add-to-cart/`,
    data
  );
  return response.data;
};

export const getPresets = async (): Promise<PCConfiguration[]> => {
  const response = await apiClient.get<PCConfiguration[]>(
    '/configurator/presets/'
  );
  return response.data;
};
