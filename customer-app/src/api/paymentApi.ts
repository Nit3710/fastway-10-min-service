import apiFetch from './apiClient';

export interface CreatePaymentResponse {
  razorpayOrderId: string;
  amount: number;
  currency: string;
  razorpayKeyId: string;
}

export interface RazorpayPaymentResult {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export const createRazorpayOrder = async (orderId: number): Promise<CreatePaymentResponse> => {
  return await apiFetch<CreatePaymentResponse>('/api/payments/create-order', {
    method: 'POST',
    body: { order_id: orderId },
  });
};

export const verifyRazorpayPayment = async (
  orderId: number,
  payment: RazorpayPaymentResult
): Promise<void> => {
  await apiFetch<void>('/api/payments/verify', {
    method: 'POST',
    body: {
      order_id: orderId,
      razorpay_order_id: payment.razorpay_order_id,
      razorpay_payment_id: payment.razorpay_payment_id,
      razorpay_signature: payment.razorpay_signature,
    },
  });
};
