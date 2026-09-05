import apiFetch from './apiClient';
import { CartResponse } from '../types';

export const getCart = async (): Promise<CartResponse> => {
  return await apiFetch<CartResponse>('/api/cart');
};

export const addToCart = async (
  productId: number,
  quantity: number = 1
): Promise<CartResponse> => {
  return await apiFetch<CartResponse>('/api/cart/items', {
    method: 'POST',
    body: { product_id: productId, quantity },
  });
};

export const updateCartItem = async (
  productId: number,
  quantity: number
): Promise<CartResponse> => {
  return await apiFetch<CartResponse>(`/api/cart/items/${productId}`, {
    method: 'PUT',
    body: { quantity },
  });
};

export const removeCartItem = async (productId: number): Promise<void> => {
  await apiFetch<void>(`/api/cart/items/${productId}`, { method: 'DELETE' });
};

export const clearCartApi = async (): Promise<void> => {
  await apiFetch<void>('/api/cart', { method: 'DELETE' });
};
