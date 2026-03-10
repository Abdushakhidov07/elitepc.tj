import apiClient from './client';
import type { CartItem, CartResponse } from '../types';

export interface AddToCartData {
  product_id?: number;
  configuration_id?: number;
  quantity?: number;
  with_assembly?: boolean;
  // For guest cart: pass product data so it can be stored in localStorage
  _product?: import('../types').Product;
}

export interface UpdateCartItemData {
  quantity: number;
}

export const getCart = async (): Promise<CartResponse> => {
  const response = await apiClient.get<CartResponse>('/cart/');
  return response.data;
};

export const addToCart = async (
  data: AddToCartData
): Promise<CartItem> => {
  const response = await apiClient.post<CartItem>('/cart/add/', data);
  return response.data;
};

export const updateCartItem = async (
  itemId: number,
  data: UpdateCartItemData
): Promise<CartItem> => {
  const response = await apiClient.put<CartItem>(`/cart/${itemId}/`, data);
  return response.data;
};

export const removeCartItem = async (itemId: number): Promise<void> => {
  await apiClient.delete(`/cart/${itemId}/`);
};

export const clearCart = async (): Promise<void> => {
  await apiClient.post('/cart/clear/');
};
