import apiFetch from './apiClient';

export interface NotificationSettingsResponse {
  inAppEnabled: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
  whatsappEnabled: boolean;
}

export const getNotificationSettings = async (): Promise<NotificationSettingsResponse> => {
  return await apiFetch<NotificationSettingsResponse>('/api/users/notification-settings');
};

export const updateNotificationSettings = async (
  payload: Partial<NotificationSettingsResponse>
): Promise<NotificationSettingsResponse> => {
  return await apiFetch<NotificationSettingsResponse>('/api/users/notification-settings', {
    method: 'PUT',
    body: payload,
  });
};
