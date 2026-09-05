import apiFetch from './apiClient';

export interface NotificationResponse {
  id: number;
  title: string;
  body: string;
  isRead: boolean;
  relatedType: string | null;
  relatedId: number | null;
  sentAt: string;
}

export interface PaginatedNotifications {
  content: NotificationResponse[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export const registerFcmToken = async (fcmToken: string, deviceType: 'ANDROID' | 'IOS'): Promise<void> => {
  await apiFetch<void>('/api/notifications/register-token', {
    method: 'POST',
    body: { fcmToken, deviceType },
  });
};

export const getNotificationsList = async (page = 0, size = 15): Promise<PaginatedNotifications> => {
  return await apiFetch<PaginatedNotifications>(`/api/notifications?page=${page}&size=${size}`);
};

export const markNotificationRead = async (id: number): Promise<void> => {
  await apiFetch<void>(`/api/notifications/${id}/read`, {
    method: 'PUT',
  });
};
