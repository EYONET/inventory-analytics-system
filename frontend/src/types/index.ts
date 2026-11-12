export type UserRole = 'SUPER_ADMIN' | 'STORE_ADMIN' | 'CASHIER';
export type PaymentMethod = 'CASH' | 'TELEBIRR' | 'CBE_BIRR' | 'MPESA' | 'CARD' | 'STORE_CREDIT';
export type StoreStatus = 'ACTIVE' | 'TRIAL' | 'SUSPENDED';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  storeId?: string | null;
  store?: Store | null;
}

export interface Store {
  id: string;
  name: string;
  slug?: string;
  phone?: string | null;
  address?: string | null;
  currency: string;
  status: StoreStatus;
  trialEndsAt?: string | null;
  subscriptionExpiresAt?: string | null;
}

export interface Product {
  id: string;
  storeId: string;
  sku: string;
  barcode: string;
  name: string;
  category: string;
  description?: string | null;
  sellingPrice: number;
  currentCostPrice?: number; // Only present for STORE_ADMIN / SUPER_ADMIN!
  currentStock: number;
  lowStockThreshold: number;
  isActive: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
  lineDiscount: number;
}

export interface PaymentItem {
  paymentMethod: PaymentMethod;
  amount: number;
  tendered: number;
  changeGiven: number;
  referenceCode?: string;
}

export interface SalesOrder {
  id: string;
  storeId: string;
  receiptNumber: string;
  cashierId: string;
  cashier?: { name: string; email?: string };
  store?: { name: string; phone?: string; address?: string; currency: string };
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  grandTotal: number;
  notes?: string;
  createdAt: string;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    unitCost?: number;
    lineDiscount: number;
    lineTotal: number;
  }>;
  payments: Array<{
    id: string;
    paymentMethod: PaymentMethod;
    amount: number;
    tendered: number;
    changeGiven: number;
    referenceCode?: string;
  }>;
}

export interface DashboardKPIs {
  todayGrossSales: number;
  todayCOGS: number;
  todayNetProfit: number;
  profitMargin: number;
  todayOrdersCount: number;
  averageOrderValue: number;
  lowStockCount: number;
  deadStockCount: number;
}

export interface PlatformStats {
  totalStores: number;
  activeStores: number;
  trialStores: number;
  suspendedStores: number;
  totalCashiers: number;
  platformGMV: number;
  totalOrdersProcessed: number;
  subscriptionRevenueETB: number;
}

