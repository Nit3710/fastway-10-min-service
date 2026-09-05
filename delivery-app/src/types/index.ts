export type UserRole = 'CUSTOMER' | 'DELIVERY_PARTNER' | 'ADMIN';

export interface User {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  role: UserRole;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  refreshToken?: string;
  expiresIn?: number;
  user: User;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  last: boolean;
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

export interface OrderItemResponse {
  productId: number;
  productName: string;
  productImage?: string | null;
  quantity: number;
  priceAtPurchase: number;
}

export type DeliveryAssignmentStatus =
  | 'ASSIGNED'
  | 'PICKED_UP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export interface DeliveryAssignment {
  id: number;
  orderId: number;
  deliveryPartnerId: number;
  status: DeliveryAssignmentStatus;
  assignedAt: string;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  customerName: string;
  customerPhone: string;
  deliveryAddress: UserAddress;
  orderItems: OrderItemResponse[];
}

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  AssignmentList: undefined;
  AssignmentDetail: { assignmentId: number };
};
