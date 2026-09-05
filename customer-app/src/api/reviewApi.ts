import apiFetch from './apiClient';

export interface ReviewResponse {
  id: number;
  userId: number;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface ProductRatingStats {
  averageRating: number;
  totalReviews: number;
}

export const getReviews = async (productId: number): Promise<ReviewResponse[]> => {
  return await apiFetch<ReviewResponse[]>(`/api/products/${productId}/reviews`);
};

export const getRatingStats = async (productId: number): Promise<ProductRatingStats> => {
  return await apiFetch<ProductRatingStats>(`/api/products/${productId}/reviews/stats`);
};

export const addReview = async (
  productId: number,
  rating: number,
  comment?: string
): Promise<ReviewResponse> => {
  return await apiFetch<ReviewResponse>(`/api/products/${productId}/reviews`, {
    method: 'POST',
    body: { rating, comment },
  });
};
