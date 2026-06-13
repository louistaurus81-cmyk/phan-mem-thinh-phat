import { useEffect, useRef } from 'react';

export function useBarcodeScanner(onScan: (barcode: string) => void) {
  const barcodeRef = useRef('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow normal form input typing to work without triggering the scanner
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      if (e.key === 'Enter') {
        if (barcodeRef.current.length > 2) {
          onScan(barcodeRef.current);
        }
        barcodeRef.current = '';
        return;
      }

      if (e.key.length === 1) { // Single character
        barcodeRef.current += e.key;
      }

      // Scanner usually types very fast (< 30ms per char)
      timeoutRef.current = setTimeout(() => {
        barcodeRef.current = '';
      }, 50);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [onScan]);
}
