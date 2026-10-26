export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: 'CUSTOMER' | 'ADMIN' | 'RESTAURANT_OWNER';
  created_at?: string;
  updated_at?: string;
}

export interface Address {
  id: number;
  user_id: number;
  address_line: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  created_at?: string;
}

export interface Restaurant {
  id: number;
  name: string;
  description: string;
  cuisine: string;
  address: string;
  area: string;
  city: string;
  rating: number | string;
  delivery_time: string;
  price_for_two: number | string;
  image_url: string;
  is_open: number;
  created_at?: string;
}

export interface MenuItem {
  id: number;
  restaurant_id: number;
  name: string;
  description: string;
  category: string;
  price: number | string;
  image_url: string;
  is_veg: number;
  is_available: number;
  created_at?: string;
}

export interface CartItem {
  menuItemId: number;
  restaurantId: number;
  restaurantName: string;
  name: string;
  price: number;
  quantity: number;
  isVeg: boolean;
  imageUrl?: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  menu_item_id: number;
  quantity: number;
  price: number | string;
  subtotal: number | string;
  name?: string;
  image_url?: string;
  is_veg?: number;
  category?: string;
}

export interface Order {
  id: number;
  user_id: number;
  restaurant_id: number;
  restaurant_name?: string;
  restaurant_image?: string;
  restaurant_address?: string;
  total_amount: number | string;
  delivery_address_id: number;
  address_line?: string;
  area?: string;
  city?: string;
  pincode?: string;
  customer_name?: string;
  customer_phone?: string;
  status: 'PLACED' | 'CONFIRMED' | 'PREPARING' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
  payment_status: 'PENDING' | 'PAID' | 'FAILED' | 'COD';
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
  item_count?: number;
}

export interface LiveRequestEvent {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  targetService: string;
  statusCode: number;
  latencyMs: number;
  jwtStatus: 'PUBLIC' | 'VALID' | 'INVALID' | 'MISSING';
  rateLimitStatus: 'ALLOWED' | 'BLOCKED';
  userId?: number;
}

export interface GatewaySnapshot {
  totalRequests: number;
  requestsPerSecond: number;
  successRequests: number;
  errorRequests: number;
  rateLimitedRequests: number;
  averageLatencyMs: number;
  activeRequests: number;
  serviceCounts: {
    auth: number;
    user: number;
    restaurant: number;
    order: number;
    gateway: number;
  };
  statusCounts: { [code: string]: number };
  recentRequests: LiveRequestEvent[];
}
