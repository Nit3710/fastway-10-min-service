declare module 'react-native-razorpay' {
  export interface CheckoutOptions {
    description?: string;
    image?: string;
    key: string;
    amount: number;
    currency: string;
    name: string;
    order_id: string;
    prefill?: {
      contact?: string;
      email?: string;
      name?: string;
      method?: string;
    };
    theme?: {
      color?: string;
    };
  }

  export interface RazorpayPaymentResult {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }

  export default class RazorpayCheckout {
    static open(options: CheckoutOptions): Promise<RazorpayPaymentResult>;
  }
}
