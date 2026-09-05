export type UserRole = 'CUSTOMER' | 'DELIVERY_PARTNER' | 'ADMIN';

export interface User {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  role: UserRole;
  profilePictureUrl?: string | null;
  loyaltyPoints?: number;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  refreshToken?: string;
  expiresIn?: number;
  user: User;
}

export interface Category {
  id: number;
  name: string;
  imageUrl: string | null;
  parentCategoryId: number | null;
}

export interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  mrp: number;
  sku: string;
  stockQty: number;
  unit: string;
  isActive: boolean;
  imageUrl: string | null;
  images?: string[];
  categoryId: number;
  categoryName?: string;
  brandId: number;
  brandName?: string;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  last: boolean;
}

export interface ProductFilterParams {
  page?: number;
  size?: number;
  categoryId?: number;
  brandId?: number;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sortBy?: string;
  sortDir?: string;
  addressId?: number;
}

export interface CartItem {
  productId: number;
  name: string;
  image: string | null;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface CartResponse {
  items: CartItem[];
  total: number;
}

export interface UserAddress {
  id: number;
  addressLine: string;
  city: string;
  pincode: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
}

export interface ServiceabilityResponse {
  pincode: string;
  serviceable: boolean;
  deliveryCharge: number;
}

export interface OrderItemResponse {
  productId: number;
  productName: string;
  quantity: number;
  priceAtPurchase: number;
}

export interface OrderResponse {
  id: number;
  createdAt: string;
  status: 'PLACED' | 'CONFIRMED' | 'PACKED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
  totalAmount: number;
  discount: number;
  deliveryCharge: number;
  paymentStatus: string;
  paymentMode: string;
  deliveryAddress: UserAddress;
  items: OrderItemResponse[];
  warehouseId?: number | null;
  estimatedDeliveryMinutes?: number | null;
  couponCode?: string | null;
  loyaltyPointsEarned?: number;
  loyaltyPointsDeducted?: number;
}

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  Signup: undefined;
  MainTabs: undefined;
  Home: undefined;
  ProductList: { categoryId?: number; categoryName?: string; search?: string; addressId?: number };
  ProductDetail: { productId: number; productName: string };
  Search: undefined;
  Cart: undefined;
  Checkout: { selectedAddress?: UserAddress } | undefined;
  AddressList: { selectMode: boolean };
  AddressForm: { editAddress?: UserAddress; fromCheckout?: boolean };
  OrderSuccess: { orderId: number };
  OrderDetail: { orderId: number };
  Notifications: undefined;
  NotificationSettings: undefined;
  Profile: undefined;
  OrderList: undefined;
  ReviewForm: { productId: number; productName: string };
  Calculator: undefined;
  BookService: undefined;
  BookingsList: undefined;
  TrackPlumber: { bookingId: string };
};
