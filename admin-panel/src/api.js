import axios from 'axios';
import { showToast, apiErrorMessage } from './toast';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      showToast('Your session expired. Please sign in again.');
      window.location.href = '/login';
    } else if (err.response?.status !== 403) {
      showToast(apiErrorMessage(err));
    } else {
      showToast('You do not have permission to perform this action.');
    }
    return Promise.reject(err);
  }
);

export default api;
