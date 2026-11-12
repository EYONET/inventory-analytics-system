import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShoppingBag,
  LayoutDashboard,
  Package,
  QrCode,
  Users,
  Receipt,
  LogOut,
  Building2,
  ShieldCheck,
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { user, store, logout } = useAuth();

  if (!user) return null;

  const isSuperAdmin = user.role === 'SUPER_ADMIN';
  const isStoreAdmin = user.role === 'STORE_ADMIN';
  const isCashier = user.role === 'CASHIER';

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Store Badge */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-950/40">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-base text-white tracking-tight">
                  {store?.name || 'Retail SaaS Engine'}
                </span>
                {store?.status === 'TRIAL' && (
                  <span className="px-2 py-0.5 text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full">
                    Trial
                  </span>
                )}
                {isSuperAdmin && (
                  <span className="px-2 py-0.5 text-xs font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Super Admin
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400 flex items-center space-x-2">
                <span>{user.name}</span>
                <span>•</span>
                <span className="text-emerald-400 font-mono font-medium">
                  {store?.currency || 'ETB'}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            {/* Cashier & Store Admin can access POS Counter */}
            {!isSuperAdmin && (
              <button
                onClick={() => setActiveTab('pos')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'pos'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span className="hidden md:inline">Counter POS</span>
              </button>
            )}

            {/* Store Admin Links */}
            {isStoreAdmin && (
              <>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'dashboard'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden md:inline">Analytics</span>
                </button>

                <button
                  onClick={() => setActiveTab('products')}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'products'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  <span className="hidden md:inline">Catalog</span>
                </button>

                <button
                  onClick={() => setActiveTab('qr')}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'qr'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span className="hidden md:inline">QR Stickers</span>
                </button>

                <button
                  onClick={() => setActiveTab('staff')}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'staff'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span className="hidden md:inline">Staff</span>
                </button>
              </>
            )}

            {/* Super Admin Tab */}
            {isSuperAdmin && (
              <button
                onClick={() => setActiveTab('super-admin')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'super-admin'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Super Admin Portal</span>
              </button>
            )}

            {/* Receipts Lookup */}
            {!isSuperAdmin && (
              <button
                onClick={() => setActiveTab('receipts')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'receipts'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Receipt className="w-4 h-4" />
                <span className="hidden md:inline">Receipts</span>
              </button>
            )}

            {/* Logout */}
            <button
              onClick={logout}
              title="Sign Out"
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors ml-2"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};

