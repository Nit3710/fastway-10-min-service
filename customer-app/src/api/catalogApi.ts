import apiFetch from './apiClient';
import { Category, PaginatedResponse, Product, ProductFilterParams } from '../types';

export const getCategories = async (): Promise<Category[]> => {
  return await apiFetch<Category[]>('/api/categories');
};

export const getProducts = async (
  params: ProductFilterParams = {}
): Promise<PaginatedResponse<Product>> => {
  const query = new URLSearchParams();
  if (params.page !== undefined) query.append('page', String(params.page));
  if (params.size !== undefined) query.append('size', String(params.size));
  if (params.categoryId) query.append('category_id', String(params.categoryId));
  if (params.brandId) query.append('brand_id', String(params.brandId));
  if (params.minPrice !== undefined) query.append('min_price', String(params.minPrice));
  if (params.maxPrice !== undefined) query.append('max_price', String(params.maxPrice));
  if (params.search) query.append('search', params.search);
  if (params.sortBy) query.append('sort_by', params.sortBy);
  if (params.sortDir) query.append('sort_dir', params.sortDir);
  if (params.addressId) query.append('address_id', String(params.addressId));

  const qs = query.toString();
  return await apiFetch<PaginatedResponse<Product>>(`/api/products${qs ? `?${qs}` : ''}`);
};

export const getProductById = async (id: number): Promise<Product> => {
  return await apiFetch<Product>(`/api/products/${id}`);
};
