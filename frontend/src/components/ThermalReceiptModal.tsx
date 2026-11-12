import React from 'react';
import { SalesOrder } from '../types';
import { Printer, X, CheckCircle } from 'lucide-react';

interface ThermalReceiptModalProps {
  order: SalesOrder | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({
  order,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const currency = order.store?.currency || 'ETB';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Controls Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-850">
          <div className="flex items-center space-x-2 text-emerald-400">
            <CheckCircle className="w-5 h-5" />
            <span className="font-bold text-sm">Sale Completed!</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print Receipt</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Thermal Receipt Container */}
        <div className="p-6 overflow-y-auto bg-slate-950 flex justify-center">
          <div
            id="printable-receipt"
            className="w-[300px] bg-white text-black p-4 font-mono text-xs rounded shadow-md border border-slate-300"
          >
            {/* Header */}
            <div className="text-center pb-2 border-b border-dashed border-gray-400">
              <h2 className="font-bold text-sm uppercase tracking-wide">
                {order.store?.name || 'RETAIL STORE'}
              </h2>
              {order.store?.address && (
                <p className="text-[10px] text-gray-700">{order.store.address}</p>
              )}
              {order.store?.phone && (
                <p className="text-[10px] text-gray-700">Tel: {order.store.phone}</p>
              )}
            </div>

            {/* Receipt Metadata */}
            <div className="py-2 text-[10px] border-b border-dashed border-gray-400 space-y-0.5">
              <div className="flex justify-between">
                <span>Receipt #:</span>
                <span className="font-bold">{order.receiptNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{new Date(order.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Cashier:</span>
                <span>{order.cashier?.name || 'Staff'}</span>
              </div>
            </div>

            {/* Itemized Table */}
            <div className="py-2 border-b border-dashed border-gray-400">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="border-b border-gray-300 text-[10px] font-bold">
                    <th className="py-1">ITEM</th>
                    <th className="text-center py-1">QTY</th>
                    <th className="text-right py-1">PRICE</th>
                    <th className="text-right py-1">TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100">
                      <td className="py-1 pr-1 truncate max-w-[120px]">
                        {item.productName}
                      </td>
                      <td className="text-center py-1">{item.quantity}</td>
                      <td className="text-right py-1">{item.unitPrice.toFixed(2)}</td>
                      <td className="text-right py-1 font-semibold">{item.lineTotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="py-2 space-y-1 text-xs border-b border-dashed border-gray-400">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{order.subtotal.toFixed(2)} {currency}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>Discount:</span>
                  <span>-{order.discountAmount.toFixed(2)} {currency}</span>
                </div>
              )}
              {order.taxAmount > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>Tax:</span>
                  <span>{order.taxAmount.toFixed(2)} {currency}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm pt-1 border-t border-gray-300">
                <span>GRAND TOTAL:</span>
                <span>{order.grandTotal.toFixed(2)} {currency}</span>
              </div>
            </div>

            {/* Payment Details */}
            <div className="py-2 space-y-0.5 text-[10px] border-b border-dashed border-gray-400">
              {order.payments.map((p) => (
                <div key={p.id} className="space-y-0.5">
                  <div className="flex justify-between">
                    <span>Payment ({p.paymentMethod}):</span>
                    <span>{p.amount.toFixed(2)} {currency}</span>
                  </div>
                  {p.paymentMethod === 'CASH' && p.tendered > 0 && (
                    <>
                      <div className="flex justify-between text-gray-600">
                        <span>Tendered:</span>
                        <span>{p.tendered.toFixed(2)} {currency}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Change:</span>
                        <span>{p.changeGiven.toFixed(2)} {currency}</span>
                      </div>
                    </>
                  )}
                  {p.referenceCode && (
                    <div className="flex justify-between text-gray-600">
                      <span>Ref Code:</span>
                      <span>{p.referenceCode}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="text-center pt-3 text-[10px] text-gray-600 space-y-1">
              <p className="font-semibold">Thank you for shopping with us!</p>
              <p>Goods once sold cannot be returned without receipt.</p>
              <p className="text-[9px] text-gray-400">Powered by Retail SaaS Engine</p>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Start Next Sale (Esc)
          </button>
        </div>
      </div>
    </div>
  );
};

