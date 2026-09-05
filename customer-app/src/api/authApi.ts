import apiFetch, { CONFIG } from './apiClient';
import { AuthResponse, User } from '../types';
import useAuthStore from '../store/authStore';

export const apiSignup = async (payload: any): Promise<AuthResponse> => {
  return await apiFetch<AuthResponse>('/api/auth/signup', {
    method: 'POST',
    body: payload,
  });
};

export const apiLogin = async (payload: any): Promise<AuthResponse> => {
  return await apiFetch<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: payload,
  });
};

export const apiGoogleLogin = async (idToken: string): Promise<AuthResponse> => {
  return await apiFetch<AuthResponse>('/api/auth/google', {
    method: 'POST',
    body: { idToken },
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

export const apiUploadProfilePicture = async (formData: FormData): Promise<User> => {
  const token = useAuthStore.getState().token;
  const response = await fetch(`${CONFIG.API_BASE_URL}/api/users/profile-picture`, {
    method: 'POST',
    body: formData,
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    const errText = await response.text();
    let errMsg = 'Failed to upload image';
    try {
      const errJson = JSON.parse(errText);
      errMsg = errJson.message || errMsg;
    } catch (e) {}
    throw new Error(errMsg);
  }
  
  const json = await response.json();
  return json.data as User;
};

export const apiUpdateProfile = async (name: string, email: string): Promise<User> => {
  return await apiFetch<User>('/api/users/profile', {
    method: 'PUT',
    body: { name, email },
  });
};

export const apiSendOtp = async (phone: string): Promise<void> => {
  await apiFetch<void>('/api/auth/otp/send', {
    method: 'POST',
    body: { phone },
  });
};

export const apiVerifyOtp = async (phone: string, code: string): Promise<AuthResponse> => {
  return await apiFetch<AuthResponse>('/api/auth/otp/verify', {
    method: 'POST',
    body: { phone, code },
  });
};
