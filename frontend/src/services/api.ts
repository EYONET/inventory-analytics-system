const BASE_URL = '/api';

export const getAuthToken = (): string | null => {
  return localStorage.getItem('token');
};

export const setAuthToken = (token: string): void => {
  localStorage.setItem('token', token);
};

export const removeAuthToken = (): void => {
  localStorage.removeItem('token');
};

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const json = await response.json().catch(() => ({ success: false, error: 'Network response was not JSON' }));

  if (!response.ok || !json.success) {
    throw new Error(json.error || `Request failed with status ${response.status}`);
  }

  return json.data;
}

export const api = {
  // Auth
  login: (credentials: { email: string; password: string }) =>
    request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  registerStore: (data: any) =>
    request<{ token: string; store: any; user: any }>('/auth/register-store', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMe: () => request<any>('/auth/me'),

  // Products
  getProducts: (params?: { category?: string; search?: string; activeOnly?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.category) query.append('category', params.category);
    if (params?.search) query.append('search', params.search);
    if (params?.activeOnly !== undefined) query.append('activeOnly', String(params.activeOnly));
    return request<any[]>(`/products?${query.toString()}`);
  },

  getProductByBarcode: (barcode: string) =>
    request<any>(`/products/barcode/${encodeURIComponent(barcode)}`),

  createProduct: (data: any) =>
    request<any>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateProduct: (id: string, data: any) =>
    request<any>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  adjustStock: (id: string, data: any) =>
    request<any>(`/products/${id}/adjust-stock`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteProduct: (id: string) =>
    request<any>(`/products/${id}`, {
      method: 'DELETE',
    }),

  // Orders & POS Checkout
  checkout: (data: any) =>
    request<any>('/orders/checkout', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getOrders: (params?: { receipt?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.receipt) query.append('receipt', params.receipt);
    if (params?.limit) query.append('limit', String(params.limit));
    return request<any[]>(`/orders?${query.toString()}`);
  },

  getOrderReceipt: (id: string) =>
    request<any>(`/orders/${id}/receipt`),

  // Analytics (Store Admin)
  getDashboardKPIs: () => request<any>('/analytics/dashboard'),
  getSalesTrends: (days = 7) => request<any[]>(`/analytics/trends?days=${days}`),
  getLowStockItems: () => request<any[]>('/analytics/low-stock'),
  getDeadStockItems: (days = 30) => request<any[]>(`/analytics/dead-stock?days=${days}`),
  getStaffPerformance: () => request<any[]>('/analytics/staff'),

  // Staff Management (Store Admin)
  getStaff: () => request<any[]>('/staff'),
  createStaff: (data: any) =>
    request<any>('/staff', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  toggleStaffActive: (id: string) =>
    request<any>(`/staff/${id}/toggle`, {
      method: 'PUT',
    }),

  // Super Admin
  getPlatformStats: () => request<any>('/super-admin/stats'),
  getAllTenants: (params?: { search?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);
    return request<any[]>(`/super-admin/tenants?${query.toString()}`);
  },
  activateTenant: (id: string, data?: { days?: number; notes?: string }) =>
    request<any>(`/super-admin/tenants/${id}/activate`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }),
  toggleTenantStatus: (id: string) =>
    request<any>(`/super-admin/tenants/${id}/toggle-status`, {
      method: 'POST',
    }),
};

