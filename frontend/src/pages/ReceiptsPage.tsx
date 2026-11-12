import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { SalesOrder } from '../types';
import { ThermalReceiptModal } from '../components/ThermalReceiptModal';
import { Receipt, Search, Printer, Calendar, User as UserIcon } from 'lucide-react';

export const ReceiptsPage: React.FC = () => {
  const { store } = useAuth();
  const currency = store?.currency || 'ETB';

  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [searchReceipt, setSearchReceipt] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const data = await api.getOrders({ receipt: searchReceipt, limit: 50 });
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadOrders();
  };

  const handleViewReceipt = async (orderId: string) => {
    try {
      const full = await api.getOrderReceipt(orderId);
      setSelectedOrder(full);
      setIsReceiptModalOpen(true);
    } catch (err: any) {
      alert(err.message || 'Failed to load receipt');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-emerald-400">
            <Receipt className="w-6 h-6" />
            <h1 className="text-2xl font-bold text-white tracking-tight">Receipts & Sales History</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Browse and reprint thermal sales receipts for {store?.name}.
          </p>
        </div>

        <form onSubmit={handleSearch} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchReceipt}
            onChange={(e) => setSearchReceipt(e.target.value)}
            placeholder="Search receipt # (e.g. RCP-BOLE)..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </form>
      </div>

      {/* Receipts Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-700">
              <tr>
                <th className="py-3 px-4">RECEIPT #</th>
                <th className="py-3 px-4">DATE & TIME</th>
                <th className="py-3 px-4">CASHIER</th>
                <th className="py-3 px-4 text-center">ITEMS</th>
                <th className="py-3 px-4 text-right">TOTAL PAID</th>
                <th className="py-3 px-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      {o.receiptNumber}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      <div className="flex items-center space-x-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>{new Date(o.createdAt).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      <div className="flex items-center space-x-1.5">
                        <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                        <span>{o.cashier?.name || 'Staff'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-slate-300">
                      {o.items?.reduce((sum, it) => sum + it.quantity, 0) || 0} pcs
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                      {o.grandTotal.toFixed(2)} {currency}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleViewReceipt(o.id)}
                        className="flex items-center space-x-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors ml-auto"
                      >
                        <Printer className="w-3.5 h-3.5 text-emerald-400" />
                        <span>View / Print</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ThermalReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        order={selectedOrder}
      />
    </div>
  );
};

