import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { PlatformStats } from '../types';
import {
  ShieldCheck,
  Building2,
  Users,
  DollarSign,
  CheckCircle2,
  AlertOctagon,
  Search,
  Sparkles,
} from 'lucide-react';

export const SuperAdminPage: React.FC = () => {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [tenants, setTenants] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [statsData, tenantsData] = await Promise.all([
        api.getPlatformStats(),
        api.getAllTenants({ search, status: statusFilter }),
      ]);
      setStats(statsData);
      setTenants(tenantsData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleActivateTenant = async (id: string, name: string) => {
    if (!confirm(`Approve Telebirr/CBE payment and activate "${name}" for 30 days?`)) return;
    try {
      await api.activateTenant(id, { days: 30, notes: 'Payment confirmed via Telebirr' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Activation failed');
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await api.toggleTenantStatus(id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Toggle failed');
    }
  };

  if (isLoading && !stats) {
    return (
      <div className="p-8 text-center text-slate-400 flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mr-3" />
        <span>Loading Platform Telemetry...</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-purple-400">
            <ShieldCheck className="w-6 h-6" />
            <h1 className="text-2xl font-black text-white tracking-tight">Super Admin Platform Hub</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Global management portal for 2,000+ independent retail store tenants across Ethiopia.
          </p>
        </div>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-xl border border-slate-700 transition-colors self-start sm:self-auto"
        >
          Refresh Platform Data
        </button>
      </div>

      {/* Platform KPIs */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Store Tenants
            </span>
            <div className="text-3xl font-black font-mono text-white mt-2">
              {stats.totalStores}
            </div>
            <div className="text-xs text-slate-400 mt-2 flex items-center gap-2">
              <span className="text-emerald-400 font-bold">{stats.activeStores} active</span>
              <span>•</span>
              <span className="text-amber-400 font-bold">{stats.trialStores} on trial</span>
            </div>
          </div>

          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Subscription Revenue (ETB)
            </span>
            <div className="text-3xl font-black font-mono text-emerald-400 mt-2">
              {stats.subscriptionRevenueETB.toFixed(2)}{' '}
              <span className="text-xs font-sans text-slate-400">ETB</span>
            </div>
            <div className="text-xs text-slate-400 mt-2">
              Collected via Telebirr / CBE Birr
            </div>
          </div>

          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Platform Gross Merchandise (GMV)
            </span>
            <div className="text-3xl font-black font-mono text-purple-400 mt-2">
              {stats.platformGMV.toFixed(2)}{' '}
              <span className="text-xs font-sans text-slate-400">ETB</span>
            </div>
            <div className="text-xs text-slate-400 mt-2">
              Total goods sold across all stores
            </div>
          </div>

          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Active Counter Cashiers
            </span>
            <div className="text-3xl font-black font-mono text-teal-400 mt-2">
              {stats.totalCashiers}
            </div>
            <div className="text-xs text-slate-400 mt-2">
              {stats.totalOrdersProcessed} orders completed
            </div>
          </div>
        </div>
      )}

      {/* Tenant Directory Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        {/* Table Filter Header */}
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search store name, phone, slug..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
            />
          </form>

          <div className="flex items-center space-x-2 text-xs">
            {['ALL', 'ACTIVE', 'TRIAL', 'SUSPENDED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  statusFilter === st
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Tenants List */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-700">
              <tr>
                <th className="py-3 px-4">STORE NAME</th>
                <th className="py-3 px-4">LOCATION / PHONE</th>
                <th className="py-3 px-4">STATUS</th>
                <th className="py-3 px-4 text-center">METRICS</th>
                <th className="py-3 px-4">SUBSCRIPTION EXPIRES</th>
                <th className="py-3 px-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {tenants.map((store) => (
                <tr key={store.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-white text-sm flex items-center space-x-1.5">
                      <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{store.name}</span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 mt-0.5">{store.slug}</div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">
                    <div>{store.address || 'Addis Ababa'}</div>
                    <div className="text-slate-400 font-mono text-[11px]">{store.phone || '—'}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                        store.status === 'ACTIVE'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : store.status === 'TRIAL'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {store.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center text-slate-300 font-mono">
                    <span>{store._count?.products || 0} items</span>
                    <span className="mx-1.5 text-slate-600">•</span>
                    <span>{store._count?.salesOrders || 0} sales</span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 font-mono text-[11px]">
                    {store.subscriptionExpiresAt
                      ? new Date(store.subscriptionExpiresAt).toLocaleDateString()
                      : store.trialEndsAt
                      ? `Trial until ${new Date(store.trialEndsAt).toLocaleDateString()}`
                      : '—'}
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-2">
                    <button
                      onClick={() => handleActivateTenant(store.id, store.name)}
                      className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold transition-colors"
                    >
                      +30 Days Active
                    </button>
                    <button
                      onClick={() => handleToggleStatus(store.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                        store.status === 'ACTIVE'
                          ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      {store.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

