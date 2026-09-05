import apiFetch from './apiClient';
import { AuthResponse, User } from '../types';

export const apiLogin = async (payload: any): Promise<AuthResponse> => {
  return await apiFetch<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: payload,
  });
};

export const apiGetMe = async (): Promise<User> => {
  return await apiFetch<User>('/api/auth/me', {
    method: 'GET',
  });
};

export const apiLogout = async (refreshToken: string | null): Promise<void> => {
  await apiFetch<void>('/api/auth/logout', { method: 'POST', body: { refreshToken } });
};
