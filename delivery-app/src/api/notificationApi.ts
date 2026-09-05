import apiFetch from './apiClient';

export const registerFcmToken = async (fcmToken: string, deviceType: 'ANDROID' | 'IOS'): Promise<void> => {
  await apiFetch<void>('/api/notifications/register-token', {
    method: 'POST',
    body: { fcmToken, deviceType },
  });
};
