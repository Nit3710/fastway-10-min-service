import apiFetch from './apiClient';

export const getFirebaseCustomToken = async (): Promise<string> => {
  const data = await apiFetch<{ token: string }>('/api/firebase/token');
  return data.token;
};
