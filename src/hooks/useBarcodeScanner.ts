import { useEffect, useRef } from 'react';

/**
 * Web Audio API Beep Sound Generator for physical barcode scanners
 */
export function playScanSound(type: 'success' | 'error' = 'success') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1600, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.setValueAtTime(150, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch {}
}

/**
 * Reverse character map to fix Vietnamese Telex/VNI IME input errors (Unikey/EVKey)
 * when physical barcode scanners emulate fast keyboard input.
 */
const VIETNAMESE_IME_CHAR_MAP: Record<string, string> = {
  'á': 'a', 'à': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
  'ă': 'a', 'ắ': 'a', 'ằ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
  'â': 'a', 'ấ': 'a', 'ầ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
  'đ': 'd',
  'é': 'e', 'è': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
  'ê': 'e', 'ế': 'e', 'ề': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
  'í': 'i', 'ì': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
  'ó': 'o', 'ò': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
  'ô': 'o', 'ố': 'o', 'ồ': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
  'ơ': 'o', 'ớ': 'o', 'ờ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
  'ú': 'u', 'ù': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u',
  'ư': 'u', 'ứ': 'u', 'ừ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
  'ý': 'y', 'ỳ': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
};

/**
 * Converts keyboard event code (e.code) to raw un-mangled character
 */
function getCharFromEventCode(e: KeyboardEvent): string | null {
  const code = e.code;

  if (code.startsWith('Digit')) {
    return code.replace('Digit', '');
  }
  if (code.startsWith('Numpad') && code.length === 7) {
    return code.replace('Numpad', '');
  }
  if (code.startsWith('Key')) {
    const char = code.replace('Key', '');
    return e.shiftKey ? char.toUpperCase() : char.toLowerCase();
  }
  if (code === 'Minus' || code === 'NumpadSubtract') return '-';
  if (code === 'Period' || code === 'NumpadDecimal') return '.';

  if (e.key && e.key.length === 1) {
    const lowerKey = e.key.toLowerCase();
    if (VIETNAMESE_IME_CHAR_MAP[lowerKey]) {
      const mapped = VIETNAMESE_IME_CHAR_MAP[lowerKey];
      return e.key === lowerKey ? mapped : mapped.toUpperCase();
    }
    return e.key;
  }

  return null;
}

export function useBarcodeScanner(onScan: (barcode: string) => void) {
  const barcodeRef = useRef('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow typing inside active input/textarea fields without firing scanner
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') {
        return;
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      if (e.key === 'Enter') {
        const codeToScan = barcodeRef.current.trim();
        if (codeToScan.length >= 3) {
          playScanSound('success');
          onScan(codeToScan);
        } else if (codeToScan.length > 0) {
          playScanSound('error');
        }
        barcodeRef.current = '';
        return;
      }

      const rawChar = getCharFromEventCode(e);
      if (rawChar) {
        barcodeRef.current += rawChar;
      }

      timeoutRef.current = setTimeout(() => {
        barcodeRef.current = '';
      }, 60);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [onScan]);
}

export default useBarcodeScanner;
