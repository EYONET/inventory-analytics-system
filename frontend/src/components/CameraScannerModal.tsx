import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { X, Camera, AlertCircle } from 'lucide-react';
import { playScanBeep } from '../hooks/useBarcodeScanner';

interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export const CameraScannerModal: React.FC<CameraScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
}) => {
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (!isOpen) {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
      return;
    }

    const timer = setTimeout(() => {
      try {
        const scanner = new Html5QrcodeScanner(
          'qr-camera-reader',
          {
            fps: 15,
            qrbox: { width: 250, height: 250 },
            supportedScanTypes: [
              Html5QrcodeScanType.SCAN_TYPE_CAMERA,
            ],
            rememberLastUsedCamera: true,
          },
          false
        );

        scanner.render(
          (decodedText) => {
            playScanBeep('success');
            onScan(decodedText);
            onClose();
          },
          (errorMessage) => {
            // Scanner scanning frame, ignore continuous non-detections
          }
        );

        scannerRef.current = scanner;
      } catch (err: any) {
        setError(err.message || 'Unable to access camera. Please check camera permissions.');
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
    };
  }, [isOpen, onScan, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Scan Barcode / QR</h3>
              <p className="text-xs text-slate-400">Position barcode inside viewfinder</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder */}
        <div className="p-4 flex flex-col items-center">
          {error ? (
            <div className="p-4 bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-300 text-sm flex items-start space-x-3 w-full">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Camera Access Failed</p>
                <p className="text-xs mt-1 text-rose-400">{error}</p>
              </div>
            </div>
          ) : (
            <div
              id="qr-camera-reader"
              className="w-full rounded-xl overflow-hidden bg-black text-slate-100"
            />
          )}

          <div className="mt-4 text-center">
            <span className="text-xs text-slate-400">
              💡 Tip: Dedicated USB laser scanners are 10x faster and scan automatically without this window.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

