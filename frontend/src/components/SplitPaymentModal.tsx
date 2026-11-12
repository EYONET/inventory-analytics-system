import React, { useState } from 'react';
import { PaymentMethod, PaymentItem } from '../types';
import { X, DollarSign, Smartphone, CreditCard, CheckCircle2, AlertCircle } from 'lucide-react';

interface SplitPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  currency: string;
  onConfirm: (payments: PaymentItem[]) => Promise<void>;
  isProcessing: boolean;
}

export const SplitPaymentModal: React.FC<SplitPaymentModalProps> = ({
  isOpen,
  onClose,
  totalAmount,
  currency,
  onConfirm,
  isProcessing,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('CASH');
  const [cashTendered, setCashTendered] = useState<string>(totalAmount.toString());
  const [telebirrAmount, setTelebirrAmount] = useState<string>('');
  const [telebirrRef, setTelebirrRef] = useState<string>('');
  const [cbeAmount, setCbeAmount] = useState<string>('');
  const [cbeRef, setCbeRef] = useState<string>('');
  const [splitMode, setSplitMode] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Quick cash denomination presets in ETB
  const quickCashPresets = [50, 100, 200, 500, 1000];

  const handleQuickCash = (preset: number) => {
    setCashTendered(preset.toString());
  };

  const cashVal = parseFloat(cashTendered) || 0;
  const telebirrVal = parseFloat(telebirrAmount) || 0;
  const cbeVal = parseFloat(cbeAmount) || 0;

  let totalAllocated = 0;
  let changeDue = 0;

  if (!splitMode) {
    if (selectedMethod === 'CASH') {
      totalAllocated = totalAmount;
      changeDue = Math.max(0, cashVal - totalAmount);
    } else if (selectedMethod === 'TELEBIRR') {
      totalAllocated = totalAmount;
      changeDue = 0;
    } else if (selectedMethod === 'CBE_BIRR') {
      totalAllocated = totalAmount;
      changeDue = 0;
    }
  } else {
    // Split Mode
    totalAllocated = cashVal + telebirrVal + cbeVal;
    changeDue = 0;
  }

  const remainingBalance = Math.max(0, totalAmount - totalAllocated);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payments: PaymentItem[] = [];

    if (!splitMode) {
      if (selectedMethod === 'CASH') {
        if (cashVal < totalAmount) {
          setError(`Cash tendered (${cashVal} ${currency}) is less than total (${totalAmount} ${currency})`);
          return;
        }
        payments.push({
          paymentMethod: 'CASH',
          amount: totalAmount,
          tendered: cashVal,
          changeGiven: changeDue,
        });
      } else if (selectedMethod === 'TELEBIRR') {
        payments.push({
          paymentMethod: 'TELEBIRR',
          amount: totalAmount,
          tendered: totalAmount,
          changeGiven: 0,
          referenceCode: telebirrRef || undefined,
        });
      } else if (selectedMethod === 'CBE_BIRR') {
        payments.push({
          paymentMethod: 'CBE_BIRR',
          amount: totalAmount,
          tendered: totalAmount,
          changeGiven: 0,
          referenceCode: cbeRef || undefined,
        });
      }
    } else {
      // Split payments validation
      if (Math.abs(totalAllocated - totalAmount) > 0.05) {
        setError(`Allocated payments (${totalAllocated} ${currency}) must equal total (${totalAmount} ${currency})`);
        return;
      }

      if (cashVal > 0) {
        payments.push({
          paymentMethod: 'CASH',
          amount: cashVal,
          tendered: cashVal,
          changeGiven: 0,
        });
      }
      if (telebirrVal > 0) {
        payments.push({
          paymentMethod: 'TELEBIRR',
          amount: telebirrVal,
          tendered: telebirrVal,
          changeGiven: 0,
          referenceCode: telebirrRef || undefined,
        });
      }
      if (cbeVal > 0) {
        payments.push({
          paymentMethod: 'CBE_BIRR',
          amount: cbeVal,
          tendered: cbeVal,
          changeGiven: 0,
          referenceCode: cbeRef || undefined,
        });
      }
    }

    try {
      await onConfirm(payments);
    } catch (err: any) {
      setError(err.message || 'Payment processing failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-white">Payment & Checkout</h3>
            <p className="text-xs text-slate-400">Select payment method or split payment</p>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Total Grand Banner */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-950/60 to-slate-900 border-b border-slate-800 flex items-baseline justify-between">
          <span className="text-sm font-medium text-slate-300">Grand Total Due:</span>
          <span className="text-3xl font-black text-emerald-400 font-mono">
            {totalAmount.toFixed(2)}{' '}
            <span className="text-sm font-sans font-bold text-slate-300">{currency}</span>
          </span>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-300 text-sm flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Toggle Split Payment */}
          <div className="flex items-center justify-between p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
            <span className="text-sm font-medium text-slate-200">Split Payment (Multi-Tender)</span>
            <button
              type="button"
              onClick={() => setSplitMode(!splitMode)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                splitMode
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {splitMode ? 'ON (Split)' : 'OFF (Single)'}
            </button>
          </div>

          {!splitMode ? (
            /* Single Tender Mode */
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedMethod('CASH')}
                  className={`p-3 rounded-xl border flex flex-col items-center space-y-1 transition-all ${
                    selectedMethod === 'CASH'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-md'
                      : 'border-slate-700 bg-slate-800/40 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <DollarSign className="w-5 h-5" />
                  <span className="text-xs font-bold">Cash</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMethod('TELEBIRR')}
                  className={`p-3 rounded-xl border flex flex-col items-center space-y-1 transition-all ${
                    selectedMethod === 'TELEBIRR'
                      ? 'border-blue-500 bg-blue-500/10 text-blue-400 shadow-md'
                      : 'border-slate-700 bg-slate-800/40 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Smartphone className="w-5 h-5" />
                  <span className="text-xs font-bold">Telebirr</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMethod('CBE_BIRR')}
                  className={`p-3 rounded-xl border flex flex-col items-center space-y-1 transition-all ${
                    selectedMethod === 'CBE_BIRR'
                      ? 'border-purple-500 bg-purple-500/10 text-purple-400 shadow-md'
                      : 'border-slate-700 bg-slate-800/40 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <CreditCard className="w-5 h-5" />
                  <span className="text-xs font-bold">CBE Birr</span>
                </button>
              </div>

              {selectedMethod === 'CASH' && (
                <div className="space-y-3 pt-2">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Cash Tendered
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-lg font-mono text-white focus:outline-none focus:border-emerald-500"
                      placeholder="0.00"
                    />
                    <span className="absolute right-4 top-3.5 text-sm text-slate-400 font-bold">
                      {currency}
                    </span>
                  </div>

                  {/* Preset Buttons */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {quickCashPresets.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleQuickCash(preset)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-mono font-semibold text-slate-200 transition-colors"
                      >
                        +{preset} {currency}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setCashTendered(totalAmount.toString())}
                      className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-lg text-xs font-semibold text-emerald-300 transition-colors"
                    >
                      Exact Amount
                    </button>
                  </div>

                  {/* Change Due Box */}
                  <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 flex items-center justify-between">
                    <span className="text-sm text-slate-300 font-medium">Change to Return:</span>
                    <span className="text-xl font-bold font-mono text-emerald-400">
                      {changeDue.toFixed(2)} {currency}
                    </span>
                  </div>
                </div>
              )}

              {selectedMethod === 'TELEBIRR' && (
                <div className="space-y-3 pt-2">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Telebirr Transaction Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={telebirrRef}
                    onChange={(e) => setTelebirrRef(e.target.value)}
                    placeholder="e.g. TB-982104"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <p className="text-xs text-slate-400">
                    Verify the customer SMS confirmation before handing over the receipt.
                  </p>
                </div>
              )}

              {selectedMethod === 'CBE_BIRR' && (
                <div className="space-y-3 pt-2">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    CBE Birr Reference Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={cbeRef}
                    onChange={(e) => setCbeRef(e.target.value)}
                    placeholder="e.g. CBE-441029"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
              )}
            </div>
          ) : (
            /* Split Tender Inputs */
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Cash Amount ({currency})
                </label>
                <input
                  type="number"
                  step="any"
                  value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Telebirr Amount ({currency}) & Ref Code
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="any"
                    value={telebirrAmount}
                    onChange={(e) => setTelebirrAmount(e.target.value)}
                    placeholder="Amount"
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono"
                  />
                  <input
                    type="text"
                    value={telebirrRef}
                    onChange={(e) => setTelebirrRef(e.target.value)}
                    placeholder="Ref Code"
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  CBE Birr Amount ({currency}) & Ref Code
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="any"
                    value={cbeAmount}
                    onChange={(e) => setCbeAmount(e.target.value)}
                    placeholder="Amount"
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono"
                  />
                  <input
                    type="text"
                    value={cbeRef}
                    onChange={(e) => setCbeRef(e.target.value)}
                    placeholder="Ref Code"
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 flex justify-between text-xs font-medium">
                <span className="text-slate-400">Total Allocated: {totalAllocated.toFixed(2)} {currency}</span>
                <span className={remainingBalance > 0 ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                  {remainingBalance > 0
                    ? `Remaining: ${remainingBalance.toFixed(2)} ${currency}`
                    : 'Fully Allocated ✓'}
                </span>
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/30 flex items-center justify-center space-x-2 transition-all text-base"
            >
              {isProcessing ? (
                <span>Processing Transaction...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Confirm Payment & Print Receipt</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

