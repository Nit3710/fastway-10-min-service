import axios, { AxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';

export const CONFIG = {
  API_BASE_URL: 'http://10.131.176.36:8080',
};

const http = axios.create({ baseURL: CONFIG.API_BASE_URL, headers: { 'Content-Type': 'application/json' } });
let refreshInFlight: Promise<string> | null = null;

http.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use((response) => response, async (error) => {
  const original = error.config as (AxiosRequestConfig & { _retry?: boolean });
  const refreshToken = useAuthStore.getState().refreshToken;
  if (error.response?.status !== 401 || original?._retry || !refreshToken || original?.url?.includes('/api/auth/refresh')) {
    return Promise.reject(error);
  }
  original._retry = true;
  if (!refreshInFlight) {
    refreshInFlight = http.post('/api/auth/refresh', { refreshToken })
      .then(async (response) => {
        const auth = response.data.data;
        await useAuthStore.getState().setAuth(auth.token, auth.user, auth.refreshToken);
        return auth.token as string;
      })
      .catch(async (refreshError) => {
        await useAuthStore.getState().clearAuth();
        throw refreshError;
      })
      .finally(() => { refreshInFlight = null; });
  }
  const token = await refreshInFlight;
  original.headers = { ...(original.headers || {}), Authorization: `Bearer ${token}` };
  return http.request(original);
});

export const apiFetch = async <T>(
  endpoint: string,
  options: { method?: string; body?: any; headers?: Record<string, string> } = {}
): Promise<T> => {
  const response = await http.request({ url: endpoint, method: options.method || 'GET', data: options.body, headers: options.headers });
  return response.data.data as T;
};

export default apiFetch;
