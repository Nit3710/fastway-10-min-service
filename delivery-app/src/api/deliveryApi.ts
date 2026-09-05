import apiFetch from './apiClient';
import { DeliveryAssignment, DeliveryAssignmentStatus, PaginatedResponse } from '../types';

export const getAssignments = async (
  status?: DeliveryAssignmentStatus,
  page = 0,
  size = 10
): Promise<PaginatedResponse<DeliveryAssignment>> => {
  const query = [];
  if (status) query.push(`status=${status}`);
  query.push(`page=${page}`);
  query.push(`size=${size}`);
  
  const queryString = query.length > 0 ? `?${query.join('&')}` : '';
  return await apiFetch<PaginatedResponse<DeliveryAssignment>>(`/api/delivery/assignments${queryString}`);
};

export const getAssignmentDetails = async (id: number): Promise<DeliveryAssignment> => {
  return await apiFetch<DeliveryAssignment>(`/api/delivery/assignments/${id}`);
};

export const updateAssignmentStatus = async (
  id: number,
  status: DeliveryAssignmentStatus
): Promise<DeliveryAssignment> => {
  return await apiFetch<DeliveryAssignment>(`/api/delivery/assignments/${id}/status`, {
    method: 'PUT',
    body: { status },
  });
};

export const updateDeliveryLocation = async (lat: number, lng: number): Promise<void> => {
  await apiFetch<void>('/api/delivery/location', {
    method: 'PUT',
    body: { lat, lng },
  });
};
