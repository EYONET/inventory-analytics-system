import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { Navbar } from './components/Navbar';
import { LoginPage } from './pages/LoginPage';
import { PosPage } from './pages/PosPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { ProductMasterPage } from './pages/ProductMasterPage';
import { PrintableQrPage } from './pages/PrintableQrPage';
import { StaffPage } from './pages/StaffPage';
import { ReceiptsPage } from './pages/ReceiptsPage';
import { SuperAdminPage } from './pages/SuperAdminPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const MainLayout: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('pos');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
          <span className="font-semibold text-sm">Initializing Retail SaaS POS Engine...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <LoginPage />;
  }

  // Set default tab on role
  const isSuperAdmin = user.role === 'SUPER_ADMIN';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar
        activeTab={isSuperAdmin ? 'super-admin' : activeTab}
        setActiveTab={setActiveTab}
      />

      <main className="flex-1">
        {isSuperAdmin ? (
          <SuperAdminPage />
        ) : (
          <>
            {activeTab === 'pos' && <PosPage />}
            {activeTab === 'dashboard' && <AdminDashboardPage />}
            {activeTab === 'products' && <ProductMasterPage />}
            {activeTab === 'qr' && <PrintableQrPage />}
            {activeTab === 'staff' && <StaffPage />}
            {activeTab === 'receipts' && <ReceiptsPage />}
          </>
        )}
      </main>
    </div>
  );
};

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <MainLayout />
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

