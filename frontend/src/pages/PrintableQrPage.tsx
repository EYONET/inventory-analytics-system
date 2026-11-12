import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Product } from '../types';
import { Printer, QrCode, CheckSquare, Square } from 'lucide-react';

export const PrintableQrPage: React.FC = () => {
  const { store } = useAuth();
  const currency = store?.currency || 'ETB';

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [copiesPerItem, setCopiesPerItem] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.getProducts({ activeOnly: true });
        setProducts(data);
        // Default select first 12 items
        setSelectedIds(new Set(data.slice(0, 12).map((p) => p.id)));
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(products.map((p) => p.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handlePrint = () => {
    window.print();
  };

  // Compile sticker items based on copies requested
  const printableList: Product[] = [];
  products.forEach((p) => {
    if (selectedIds.has(p.id)) {
      for (let i = 0; i < copiesPerItem; i++) {
        printableList.push(p);
      }
    }
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900 p-5 rounded-3xl border border-slate-800">
        <div>
          <div className="flex items-center space-x-2 text-emerald-400">
            <QrCode className="w-6 h-6" />
            <h1 className="text-xl font-bold text-white">Printable QR Sticker Sheets</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Generate and print adhesive label sheets formatted for retail merchandise.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400 font-medium">Copies / item:</span>
            <input
              type="number"
              min="1"
              max="20"
              value={copiesPerItem}
              onChange={(e) => setCopiesPerItem(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-14 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-white focus:outline-none"
            />
          </div>

          <div className="flex items-center space-x-1.5 text-xs">
            <button
              onClick={selectAll}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
            >
              Select All
            </button>
            <button
              onClick={deselectAll}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
            >
              Clear
            </button>
          </div>

          <button
            onClick={handlePrint}
            disabled={printableList.length === 0}
            className="flex items-center space-x-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-950/40 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print {printableList.length} Stickers</span>
          </button>
        </div>
      </div>

      {/* Catalog Selector Checklist */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Select Items to Print ({selectedIds.size} of {products.length} selected)
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-48 overflow-y-auto">
          {products.map((prod) => {
            const isSelected = selectedIds.has(prod.id);
            return (
              <button
                key={prod.id}
                onClick={() => toggleSelect(prod.id)}
                className={`p-2 rounded-xl border text-left flex items-start space-x-2 transition-all text-xs ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                    : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:text-white'
                }`}
              >
                {isSelected ? (
                  <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <Square className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                )}
                <span className="truncate">{prod.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Printable Sheet Preview (Screen View & @media print View) */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
        <h3 className="text-sm font-bold text-white mb-4">Print Preview Layout (A4 3x8 Grid)</h3>

        <div
          id="printable-sticker-sheet"
          className="bg-white text-black p-6 rounded-2xl shadow-xl grid grid-cols-2 sm:grid-cols-3 gap-4"
        >
          {printableList.map((prod, index) => {
            // Generates a crisp QR code SVG using the barcode content
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
              prod.barcode
            )}`;

            return (
              <div
                key={`${prod.id}-${index}`}
                className="border border-dashed border-gray-400 p-3 rounded-lg flex items-center justify-between space-x-2 bg-white"
              >
                <div className="flex-1 pr-1 overflow-hidden">
                  <div className="text-[9px] uppercase tracking-wider text-gray-500 font-bold truncate">
                    {store?.name}
                  </div>
                  <h5 className="font-bold text-xs leading-tight text-gray-900 truncate">
                    {prod.name}
                  </h5>
                  <div className="text-[10px] font-mono text-gray-600 mt-0.5">
                    SKU: {prod.sku}
                  </div>
                  <div className="text-xs font-black font-mono text-gray-900 mt-1">
                    {prod.sellingPrice.toFixed(2)} {currency}
                  </div>
                </div>

                <div className="shrink-0 flex flex-col items-center">
                  <img
                    src={qrUrl}
                    alt={prod.barcode}
                    className="w-14 h-14 object-contain"
                  />
                  <span className="text-[8px] font-mono font-semibold text-gray-700 mt-0.5">
                    {prod.barcode}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

