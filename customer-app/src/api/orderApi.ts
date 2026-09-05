import apiFetch from './apiClient';
import { OrderResponse } from '../types';

export type PaymentMode = 'COD' | 'ONLINE';

export const placeOrder = async (
  addressId: number,
  paymentMode: PaymentMode,
  idempotencyKey?: string,
  couponCode?: string,
  usePoints?: boolean
): Promise<OrderResponse> => {
  return await apiFetch<OrderResponse>('/api/orders', {
    method: 'POST',
    body: { addressId, paymentMode, couponCode, usePoints },
    headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
  });
};

export const getOrderDetails = async (id: number): Promise<OrderResponse> => {
  return await apiFetch<OrderResponse>(`/api/orders/${id}`);
};

export const getMyOrders = async (page = 0, size = 10): Promise<{ content: OrderResponse[] }> => {
  return await apiFetch<{ content: OrderResponse[] }>(`/api/orders?page=${page}&size=${size}`);
};

export const cancelOrder = async (id: number): Promise<OrderResponse> => {
  return await apiFetch<OrderResponse>(`/api/orders/${id}/cancel`, {
    method: 'PUT',
  });
};
