import apiFetch from './apiClient';
import { UserAddress, ServiceabilityResponse } from '../types';

export const getAddresses = async (): Promise<UserAddress[]> => {
  return await apiFetch<UserAddress[]>('/api/addresses');
};

export const createAddress = async (address: Omit<UserAddress, 'id'>): Promise<UserAddress> => {
  return await apiFetch<UserAddress>('/api/addresses', {
    method: 'POST',
    body: address,
  });
};

export const updateAddress = async (
  id: number,
  address: Omit<UserAddress, 'id'>
): Promise<UserAddress> => {
  return await apiFetch<UserAddress>(`/api/addresses/${id}`, {
    method: 'PUT',
    body: address,
  });
};

export const setDefaultAddress = async (id: number): Promise<UserAddress> => {
  return await apiFetch<UserAddress>(`/api/addresses/${id}/default`, {
    method: 'PUT',
  });
};

export const deleteAddress = async (id: number): Promise<void> => {
  await apiFetch<void>(`/api/addresses/${id}`, {
    method: 'DELETE',
  });
};

export const checkServiceability = async (pincode: string): Promise<ServiceabilityResponse> => {
  return await apiFetch<ServiceabilityResponse>(
    `/api/addresses/check-serviceability?pincode=${pincode}`
  );
};
