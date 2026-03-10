import apiClient from './client';
import type { Order, PaginatedResponse } from '../types';

export interface GuestCartItem {
  product_id?: number;
  configuration_id?: number;
  quantity: number;
  with_assembly?: boolean;
}

export interface CreateOrderData {
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  customer_city: string;
  customer_address: string;
  delivery_method: 'pickup' | 'delivery';
  comment?: string;
  items?: GuestCartItem[];
}

export const createOrder = async (
  data: CreateOrderData
): Promise<Order> => {
  const response = await apiClient.post<Order>('/orders/', data);
  return response.data;
};

export const getOrder = async (orderNumber: string): Promise<Order> => {
  const response = await apiClient.get<Order>(`/orders/${orderNumber}/`);
  return response.data;
};

export const getMyOrders = async (): Promise<Order[]> => {
  const response = await apiClient.get<Order[]>('/orders/my/');
  return response.data;
};
