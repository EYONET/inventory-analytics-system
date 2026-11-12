import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { api } from '../services/api';
import { Product, PaymentItem, SalesOrder } from '../types';
import { useBarcodeScanner, playScanBeep } from '../hooks/useBarcodeScanner';
import { CameraScannerModal } from '../components/CameraScannerModal';
import { SplitPaymentModal } from '../components/SplitPaymentModal';
import { ThermalReceiptModal } from '../components/ThermalReceiptModal';
import {
  Search,
  Camera,
  Trash2,
  Plus,
  Minus,
  Percent,
  CheckCircle2,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';

export const PosPage: React.FC = () => {
  const { store, user } = useAuth();
  const {
    items,
    orderDiscount,
    addItem,
    updateQuantity,
    removeItem,
    setLineDiscount,
    setOrderDiscount,
    clearCart,
    subtotal,
    discountTotal,
    grandTotal,
    itemCount,
  } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<SalesOrder | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [discountModalProduct, setDiscountModalProduct] = useState<Product | null>(null);
  const [lineDiscountInput, setLineDiscountInput] = useState<string>('');

  const searchInputRef = useRef<HTMLInputElement>(null);
  const currency = store?.currency || 'ETB';

  // Load products
  const loadProducts = async () => {
    try {
      const data = await api.getProducts({ activeOnly: true });
      setProducts(data);
      const uniqueCats = Array.from(new Set(data.map((p) => p.category))) as string[];
      setCategories(['All', ...uniqueCats]);
    } catch (err) {
      console.error('Failed to load products:', err);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Hardware Scanner Integration (Keyboard Wedge)
  const handleBarcodeScan = async (scannedCode: string) => {
    try {
      const product = await api.getProductByBarcode(scannedCode);
      if (product) {
        if (product.currentStock <= 0) {
          playScanBeep('error');
          alert(`Product "${product.name}" is out of stock!`);
          return;
        }
        addItem(product, 1);
      }
    } catch (err: any) {
      playScanBeep('error');
      console.warn('Barcode not found:', scannedCode);
    }
  };

  useBarcodeScanner({
    onScan: handleBarcodeScan,
    enabled: !isPaymentOpen && !isCameraOpen && !isReceiptOpen,
  });

  // Global Hotkeys (F2: search, Space: checkout, Esc: clear/close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.code === 'Space' && (e.target as HTMLElement).tagName !== 'INPUT' && items.length > 0) {
        e.preventDefault();
        setIsPaymentOpen(true);
      } else if (e.key === 'Escape') {
        if (isPaymentOpen) setIsPaymentOpen(false);
        if (isCameraOpen) setIsCameraOpen(false);
        if (isReceiptOpen) setIsReceiptOpen(false);
        if (discountModalProduct) setDiscountModalProduct(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items.length, isPaymentOpen, isCameraOpen, isReceiptOpen, discountModalProduct]);

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.includes(searchQuery);
    return matchesCat && matchesSearch;
  });

  const handleCheckoutConfirm = async (payments: PaymentItem[]) => {
    setIsProcessingOrder(true);
    try {
      const orderPayload = {
        items: items.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
          lineDiscount: i.lineDiscount,
        })),
        discountAmount: orderDiscount,
        taxAmount: 0,
        payments: payments.map((p) => ({
          paymentMethod: p.paymentMethod,
          amount: p.amount,
          tendered: p.tendered,
          changeGiven: p.changeGiven,
          referenceCode: p.referenceCode,
        })),
      };

      const completed = await api.checkout(orderPayload);
      setCompletedOrder(completed);
      clearCart();
      setIsPaymentOpen(false);
      setIsReceiptOpen(true);
      // Refresh catalog stock
      loadProducts();
    } finally {
      setIsProcessingOrder(false);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col lg:flex-row overflow-hidden bg-slate-950">
      {/* LEFT: Product Catalog & Fast Search Grid */}
      <div className="flex-1 flex flex-col border-r border-slate-800 overflow-hidden">
        {/* Top Controls: Search + Scanner Trigger */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex items-center space-x-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by product name, SKU, or barcode (F2)..."
              className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 placeholder-slate-400 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-xs text-slate-400 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          <button
            onClick={() => setIsCameraOpen(true)}
            title="Scan Barcode via Camera"
            className="flex items-center space-x-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-200 text-sm font-semibold transition-colors shrink-0"
          >
            <Camera className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Camera Scan</span>
          </button>
        </div>

        {/* Category Filter Chips */}
        <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-900/40 flex items-center space-x-2 overflow-x-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Cards Grid */}
        <div className="flex-1 p-4 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {filteredProducts.map((prod) => {
            const isOutOfStock = prod.currentStock <= 0;
            const isLowStock = prod.currentStock > 0 && prod.currentStock <= prod.lowStockThreshold;

            return (
              <button
                key={prod.id}
                disabled={isOutOfStock}
                onClick={() => {
                  addItem(prod, 1);
                  playScanBeep('success');
                }}
                className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all group select-none relative ${
                  isOutOfStock
                    ? 'border-slate-800 bg-slate-900/30 opacity-50 cursor-not-allowed'
                    : 'border-slate-800 bg-slate-900/80 hover:bg-slate-800/80 hover:border-slate-700 active:scale-[0.98]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      {prod.category}
                    </span>
                    {isOutOfStock ? (
                      <span className="text-[10px] font-bold text-rose-400">Out of Stock</span>
                    ) : isLowStock ? (
                      <span className="text-[10px] font-bold text-amber-400">
                        {prod.currentStock} left
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-mono">
                        {prod.currentStock} in stock
                      </span>
                    )}
                  </div>
                  <h4 className="font-semibold text-sm text-slate-100 group-hover:text-emerald-400 transition-colors line-clamp-2">
                    {prod.name}
                  </h4>
                  <p className="text-[11px] font-mono text-slate-400 mt-0.5">{prod.sku}</p>
                </div>

                <div className="mt-4 pt-2 border-t border-slate-800/80 flex items-baseline justify-between">
                  <span className="text-base font-bold font-mono text-emerald-400">
                    {prod.sellingPrice.toFixed(2)}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">{currency}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT: Active Shopping Cart Panel */}
      <div className="w-full lg:w-96 xl:w-[420px] flex flex-col bg-slate-900 border-l border-slate-800 shrink-0">
        {/* Cart Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShoppingBag className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-base text-white">Current Cart</h3>
            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-xs font-bold rounded-full">
              {itemCount}
            </span>
          </div>
          {items.length > 0 && (
            <button
              onClick={clearCart}
              title="Clear entire cart"
              className="text-xs text-slate-400 hover:text-rose-400 flex items-center space-x-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>

        {/* Cart Item List */}
        <div className="flex-1 p-4 overflow-y-auto space-y-2.5">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-3">
              <ShoppingBag className="w-12 h-12 text-slate-700" />
              <p className="text-sm font-medium">Cart is empty</p>
              <p className="text-xs text-slate-600 max-w-[240px]">
                Scan an item barcode or click items in the catalog to begin selling.
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.product.id}
                className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 flex flex-col space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="pr-2">
                    <h5 className="text-sm font-semibold text-white leading-tight">
                      {item.product.name}
                    </h5>
                    <div className="flex items-center space-x-2 text-xs font-mono text-slate-400 mt-0.5">
                      <span>{item.product.sellingPrice.toFixed(2)} {currency}</span>
                      {item.lineDiscount > 0 && (
                        <span className="text-amber-400">
                          (-{item.lineDiscount.toFixed(2)} off)
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => removeItem(item.product.id)}
                    className="text-slate-400 hover:text-rose-400 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1">
                  {/* Stepper */}
                  <div className="flex items-center space-x-1 bg-slate-900 border border-slate-700 rounded-lg p-0.5">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        updateQuantity(item.product.id, parseInt(e.target.value, 10) || 1)
                      }
                      className="w-10 text-center bg-transparent text-xs font-mono font-bold text-white focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        if (item.quantity >= item.product.currentStock) {
                          alert(`Cannot add more than available stock (${item.product.currentStock})`);
                          return;
                        }
                        updateQuantity(item.product.id, item.quantity + 1);
                      }}
                      className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Line Total */}
                  <div className="text-right">
                    <span className="text-sm font-bold font-mono text-emerald-400">
                      {(item.product.sellingPrice * item.quantity - item.lineDiscount).toFixed(2)} {currency}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Sticky Totals Footer */}
        <div className="p-5 border-t border-slate-800 bg-slate-900 space-y-3">
          <div className="space-y-1.5 text-xs text-slate-300">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-mono">{subtotal.toFixed(2)} {currency}</span>
            </div>
            {discountTotal > 0 && (
              <div className="flex justify-between text-amber-400">
                <span>Discounts Applied:</span>
                <span className="font-mono">-{discountTotal.toFixed(2)} {currency}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-slate-800">
              <span>Grand Total:</span>
              <span className="text-xl font-mono text-emerald-400">
                {grandTotal.toFixed(2)} {currency}
              </span>
            </div>
          </div>

          {/* Checkout Trigger */}
          <button
            disabled={items.length === 0}
            onClick={() => setIsPaymentOpen(true)}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-950/40 flex items-center justify-center space-x-2 transition-all text-base"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Pay & Print (Spacebar)</span>
          </button>
        </div>
      </div>

      {/* Modals */}
      <CameraScannerModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onScan={handleBarcodeScan}
      />

      <SplitPaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        totalAmount={grandTotal}
        currency={currency}
        onConfirm={handleCheckoutConfirm}
        isProcessing={isProcessingOrder}
      />

      <ThermalReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        order={completedOrder}
      />
    </div>
  );
};

