import apiFetch from './apiClient';

export interface CouponValidationResponse {
  code: string;
  discountType: 'PERCENTAGE' | 'FLAT';
  discountValue: number;
  discountAmount: number;
  minOrderValue: number;
  maxDiscountAmount: number | null;
}

export const validateCoupon = async (
  code: string,
  subTotal: number
): Promise<CouponValidationResponse> => {
  return await apiFetch<CouponValidationResponse>(
    `/api/coupons/validate?code=${encodeURIComponent(code)}&subTotal=${subTotal}`
  );
};
