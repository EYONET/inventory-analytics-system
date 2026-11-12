import { useEffect, useRef } from 'react';

// Plays a quick audio beep using browser Web Audio API
export const playScanBeep = (type: 'success' | 'error' = 'success') => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    if (type === 'success') {
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else {
      osc.frequency.setValueAtTime(350, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    }
  } catch (e) {
    // Audio autoplay restrictions or unsupported
  }
};

interface BarcodeScannerOptions {
  onScan: (barcode: string) => void;
  minChars?: number;
  maxIntervalMs?: number;
  enabled?: boolean;
}

export const useBarcodeScanner = ({
  onScan,
  minChars = 4,
  maxIntervalMs = 70, // Scanners type characters in <30ms intervals
  enabled = true,
}: BarcodeScannerOptions) => {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is intentionally typing into a standard text input or textarea
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      const currentTime = Date.now();
      const timeSinceLastKey = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      // Handle barcode termination (Enter key)
      if (e.key === 'Enter') {
        if (bufferRef.current.length >= minChars) {
          const barcode = bufferRef.current.trim();
          bufferRef.current = '';
          e.preventDefault();
          playScanBeep('success');
          onScan(barcode);
          return;
        }
        bufferRef.current = '';
        return;
      }

      // If time interval between keystrokes is too large, reset buffer (user manual typing)
      if (timeSinceLastKey > maxIntervalMs && bufferRef.current.length > 0) {
        bufferRef.current = '';
      }

      // Only buffer printable characters
      if (e.key.length === 1) {
        // If user is focused on a text input, only allow wedge capture if it's rapid scanning
        if (isInput && timeSinceLastKey > maxIntervalMs) {
          return;
        }
        bufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onScan, minChars, maxIntervalMs, enabled]);
};

