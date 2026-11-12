import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Product } from '../types';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertCircle,
  Eye,
  EyeOff,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

export const ProductMasterPage: React.FC = () => {
  const { store } = useAuth();
  const currency = store?.currency || 'ETB';

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showCostPrice, setShowCostPrice] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState(true);

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);

  // Create Form State
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState('Groceries');
  const [sellingPrice, setSellingPrice] = useState('');
  const [currentCostPrice, setCurrentCostPrice] = useState('');
  const [initialStock, setInitialStock] = useState('10');
  const [lowStockThreshold, setLowStockThreshold] = useState('5');
  const [formError, setFormError] = useState<string | null>(null);

  // Adjust Stock Form State
  const [adjustDelta, setAdjustDelta] = useState('10');
  const [adjustType, setAdjustType] = useState<'PURCHASE' | 'DAMAGE' | 'RETURN' | 'ADJUSTMENT'>('PURCHASE');
  const [adjustUnitCost, setAdjustUnitCost] = useState('');
  const [adjustNotes, setAdjustNotes] = useState('');

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const data = await api.getProducts({ activeOnly: false });
      setProducts(data);
      const unique = Array.from(new Set(data.map((p) => p.category))) as string[];
      setCategories(['All', ...unique]);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      await api.createProduct({
        name,
        sku,
        barcode,
        category,
        sellingPrice: parseFloat(sellingPrice),
        currentCostPrice: parseFloat(currentCostPrice),
        initialStock: parseInt(initialStock, 10),
        lowStockThreshold: parseInt(lowStockThreshold, 10),
      });
      setIsCreateOpen(false);
      resetForm();
      loadProducts();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create product');
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;
    try {
      const delta = parseInt(adjustDelta, 10);
      const signedDelta = adjustType === 'DAMAGE' ? -Math.abs(delta) : delta;

      await api.adjustStock(adjustingProduct.id, {
        quantityDelta: signedDelta,
        movementType: adjustType,
        unitCost: adjustUnitCost ? parseFloat(adjustUnitCost) : undefined,
        notes: adjustNotes || `Stock adjusted via ${adjustType}`,
      });
      setAdjustingProduct(null);
      loadProducts();
    } catch (err: any) {
      alert(err.message || 'Adjustment failed');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this product?')) return;
    try {
      await api.deleteProduct(id);
      loadProducts();
    } catch (err: any) {
      alert(err.message || 'Deactivation failed');
    }
  };

  const resetForm = () => {
    setName('');
    setSku('');
    setBarcode('');
    setCategory('Groceries');
    setSellingPrice('');
    setCurrentCostPrice('');
    setInitialStock('10');
    setLowStockThreshold('5');
    setFormError(null);
  };

  const filtered = products.filter((p) => {
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.includes(searchQuery);
    return matchesCat && matchesSearch;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Product Master & Inventory</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage your store catalog, set confidential cost prices, and track live stock quantities.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowCostPrice(!showCostPrice)}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 rounded-xl border border-slate-700 transition-colors"
          >
            {showCostPrice ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span>{showCostPrice ? 'Hide Cost Prices' : 'Show Cost Prices'}</span>
          </button>
          <button
            onClick={() => {
              resetForm();
              setIsCreateOpen(true);
            }}
            className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white rounded-xl shadow-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 p-3.5 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products, SKU, barcode..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto w-full sm:w-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Catalog Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-700">
              <tr>
                <th className="py-3 px-4">PRODUCT / SKU</th>
                <th className="py-3 px-4">CATEGORY</th>
                <th className="py-3 px-4">BARCODE</th>
                <th className="py-3 px-4 text-right">SELLING PRICE</th>
                {showCostPrice && <th className="py-3 px-4 text-right text-blue-400">COST PRICE</th>}
                <th className="py-3 px-4 text-center">CURRENT STOCK</th>
                <th className="py-3 px-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map((prod) => {
                const isLow = prod.currentStock <= prod.lowStockThreshold;
                const margin =
                  prod.currentCostPrice && prod.sellingPrice > 0
                    ? Math.round(
                        ((prod.sellingPrice - prod.currentCostPrice) / prod.sellingPrice) * 100
                      )
                    : 0;

                return (
                  <tr key={prod.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white text-sm">{prod.name}</div>
                      <div className="text-[11px] font-mono text-slate-400">{prod.sku}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium text-[11px]">
                        {prod.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">{prod.barcode}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400 text-sm">
                      {prod.sellingPrice.toFixed(2)} {currency}
                    </td>
                    {showCostPrice && (
                      <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                        {prod.currentCostPrice !== undefined ? (
                          <>
                            <span>{prod.currentCostPrice.toFixed(2)} {currency}</span>
                            <div className="text-[10px] text-emerald-400 font-semibold">{margin}% margin</div>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                    )}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-mono font-bold text-xs ${
                          isLow
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-emerald-500/20 text-emerald-400'
                        }`}
                      >
                        {prod.currentStock} units
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1">
                      <button
                        onClick={() => {
                          setAdjustingProduct(prod);
                          setAdjustUnitCost(prod.currentCostPrice?.toString() || '');
                        }}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors"
                      >
                        Adjust Stock
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(prod.id)}
                        className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Product Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Add New Product to Store Catalog</h3>
            {formError && (
              <div className="p-3 bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}
            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Anchor Milk Powder 400g"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">SKU Code</label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="MILK-001"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Barcode / QR</label>
                  <input
                    type="text"
                    required
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="6001001"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Selling Price ({currency})
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    placeholder="450.00"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Purchase Cost ({currency}) - <span className="text-blue-400">Private</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={currentCostPrice}
                    onChange={(e) => setCurrentCostPrice(e.target.value)}
                    placeholder="330.00"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Dairy"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Initial Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={initialStock}
                    onChange={(e) => setInitialStock(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Low Reorder Pt</label>
                  <input
                    type="number"
                    min="1"
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {adjustingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">
              Stock Adjustment: {adjustingProduct.name}
            </h3>
            <form onSubmit={handleAdjustSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Adjustment Type</label>
                <select
                  value={adjustType}
                  onChange={(e: any) => setAdjustType(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="PURCHASE">Stock Inward / Restock (+)</option>
                  <option value="DAMAGE">Damaged / Shrinkage (-)</option>
                  <option value="RETURN">Customer Return (+)</option>
                  <option value="ADJUSTMENT">Inventory Count Correction (±)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Quantity Delta</label>
                <input
                  type="number"
                  required
                  value={adjustDelta}
                  onChange={(e) => setAdjustDelta(e.target.value)}
                  placeholder="e.g. 20"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              {adjustType === 'PURCHASE' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Updated Purchase Cost ({currency})
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={adjustUnitCost}
                    onChange={(e) => setAdjustUnitCost(e.target.value)}
                    placeholder={adjustingProduct.currentCostPrice?.toString()}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Notes / Reason</label>
                <input
                  type="text"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  placeholder="e.g. Supplier delivery invoice #940"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustingProduct(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md"
                >
                  Apply Movement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

