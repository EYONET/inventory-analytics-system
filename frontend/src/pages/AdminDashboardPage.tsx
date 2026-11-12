import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { DashboardKPIs, Product } from '../types';
import {
  DollarSign,
  TrendingUp,
  Package,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  Plus,
  Users,
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const { store } = useAuth();
  const currency = store?.currency || 'ETB';

  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [deadStock, setDeadStock] = useState<Product[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Quick Restock Modal state
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState('20');
  const [restockCost, setRestockCost] = useState('');

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [kpisData, trendsData, lowStockData, deadStockData, staffData] = await Promise.all([
        api.getDashboardKPIs(),
        api.getSalesTrends(7),
        api.getLowStockItems(),
        api.getDeadStockItems(30),
        api.getStaffPerformance(),
      ]);
      setKpis(kpisData);
      setTrends(trendsData);
      setLowStock(lowStockData);
      setDeadStock(deadStockData);
      setStaff(staffData);
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockProduct) return;
    const qty = parseInt(restockQty, 10);
    const cost = restockCost ? parseFloat(restockCost) : undefined;

    try {
      await api.adjustStock(restockProduct.id, {
        quantityDelta: qty,
        movementType: 'PURCHASE',
        unitCost: cost,
        notes: `Quick restock from low-stock alert dashboard`,
      });
      setRestockProduct(null);
      loadDashboardData();
    } catch (err: any) {
      alert(err.message || 'Restock failed');
    }
  };

  if (isLoading || !kpis) {
    return (
      <div className="p-8 text-center text-slate-400 flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mr-3" />
        <span>Loading Real-Time Analytics Engine...</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Financial & Inventory Analytics
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time True Net Profit, COGS calculations, and inventory velocity for {store?.name}.
          </p>
        </div>
        <button
          onClick={loadDashboardData}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-xl border border-slate-700 transition-colors self-start sm:self-auto"
        >
          Refresh Data
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Revenue */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Today's Gross Sales</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-white">
            {kpis.todayGrossSales.toFixed(2)}{' '}
            <span className="text-xs font-sans font-bold text-slate-400">{currency}</span>
          </div>
          <div className="text-xs text-slate-400 mt-2 flex items-center gap-1">
            <span className="text-emerald-400 font-semibold">{kpis.todayOrdersCount} orders</span>
            <span>processed today</span>
          </div>
        </div>

        {/* Cost of Goods Sold (COGS) */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Cost of Goods (COGS)</span>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-slate-200">
            {kpis.todayCOGS.toFixed(2)}{' '}
            <span className="text-xs font-sans font-bold text-slate-400">{currency}</span>
          </div>
          <div className="text-xs text-slate-400 mt-2">
            <span>Supplier purchase cost of goods sold</span>
          </div>
        </div>

        {/* True Net Profit */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">True Net Profit</span>
            <div className="p-2 bg-emerald-500/20 text-emerald-300 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-emerald-400">
            {kpis.todayNetProfit.toFixed(2)}{' '}
            <span className="text-xs font-sans font-bold text-slate-400">{currency}</span>
          </div>
          <div className="text-xs text-emerald-400 mt-2 font-semibold">
            <span>{kpis.profitMargin}% Net Margin</span>
          </div>
        </div>

        {/* Average Order Value (AOV) */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Average Basket Size</span>
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-white">
            {kpis.averageOrderValue.toFixed(2)}{' '}
            <span className="text-xs font-sans font-bold text-slate-400">{currency}</span>
          </div>
          <div className="text-xs text-slate-400 mt-2">
            <span>Average revenue per checkout</span>
          </div>
        </div>
      </div>

      {/* 7-Day Revenue vs Profit Timeline */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
        <h3 className="font-bold text-base text-white">7-Day Financial Performance</h3>
        <div className="grid grid-cols-7 gap-2 pt-2">
          {trends.map((day) => {
            const dateLabel = new Date(day.date).toLocaleDateString(undefined, {
              weekday: 'short',
              day: 'numeric',
            });
            return (
              <div
                key={day.date}
                className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 flex flex-col justify-between space-y-2 text-center"
              >
                <span className="text-[11px] font-bold text-slate-400">{dateLabel}</span>
                <div className="space-y-1">
                  <div className="text-xs font-mono font-bold text-white">
                    {day.revenue.toFixed(0)} <span className="text-[10px] text-slate-400">{currency}</span>
                  </div>
                  <div className="text-[11px] font-mono font-semibold text-emerald-400">
                    +{day.profit.toFixed(0)}
                  </div>
                </div>
                <span className="text-[10px] text-slate-400">{day.orders} sales</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Alert Columns: Low-Stock Center vs Dead-Stock Clearance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Red Alert: Low Stock Warning */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-bold text-base text-white">Low Stock Alerts</h3>
            </div>
            <span className="px-2.5 py-1 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-full text-xs font-bold">
              {lowStock.length} items critical
            </span>
          </div>

          <div className="divide-y divide-slate-800 max-h-72 overflow-y-auto">
            {lowStock.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                All items are above their reorder thresholds.
              </p>
            ) : (
              lowStock.map((prod) => (
                <div key={prod.id} className="py-3 flex items-center justify-between">
                  <div>
                    <h5 className="text-sm font-semibold text-white">{prod.name}</h5>
                    <div className="flex items-center space-x-2 text-xs text-slate-400 font-mono mt-0.5">
                      <span className="text-rose-400 font-bold">
                        {prod.currentStock} remaining
                      </span>
                      <span>•</span>
                      <span>Reorder at: {prod.lowStockThreshold}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setRestockProduct(prod);
                      setRestockCost(prod.currentCostPrice?.toString() || '');
                    }}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs font-semibold transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Top Up</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Orange Alert: Dead Stock Clearance */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-amber-400">
              <Clock className="w-5 h-5" />
              <h3 className="font-bold text-base text-white">Dead Stock Detector (30+ Days)</h3>
            </div>
            <span className="px-2.5 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full text-xs font-bold">
              {deadStock.length} slow items
            </span>
          </div>

          <div className="divide-y divide-slate-800 max-h-72 overflow-y-auto">
            {deadStock.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                No dead stock detected in the past 30 days. Excellent velocity!
              </p>
            ) : (
              deadStock.map((prod) => (
                <div key={prod.id} className="py-3 flex items-center justify-between">
                  <div>
                    <h5 className="text-sm font-semibold text-white">{prod.name}</h5>
                    <div className="flex items-center space-x-2 text-xs text-slate-400 font-mono mt-0.5">
                      <span>{prod.currentStock} units tied up</span>
                      <span>•</span>
                      <span>Price: {prod.sellingPrice.toFixed(2)} {currency}</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-1 rounded">
                    0 sales / 30d
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Staff Leaderboard */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
        <div className="flex items-center space-x-2">
          <Users className="w-5 h-5 text-emerald-400" />
          <h3 className="font-bold text-base text-white">Staff Sales Volume</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {staff.map((member) => (
            <div
              key={member.id}
              className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/60 flex items-center justify-between"
            >
              <div>
                <h5 className="text-sm font-bold text-white">{member.name}</h5>
                <p className="text-xs text-slate-400 capitalize">{member.role.toLowerCase()}</p>
                <p className="text-xs font-mono text-emerald-400 mt-1">
                  {member.totalRevenue.toFixed(2)} {currency}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-300">{member.ordersCount} sales</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Restock Modal */}
      {restockProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">
              Restock: {restockProduct.name}
            </h3>
            <form onSubmit={handleRestockSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Add Quantity
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Unit Purchase Cost ({currency})
                </label>
                <input
                  type="number"
                  step="any"
                  value={restockCost}
                  onChange={(e) => setRestockCost(e.target.value)}
                  placeholder={restockProduct.currentCostPrice?.toString()}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRestockProduct(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors"
                >
                  Confirm Restock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

