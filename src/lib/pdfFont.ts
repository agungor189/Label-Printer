import type jsPDF from 'jspdf';

/**
 * jsPDF's built-in Helvetica uses WinAnsi encoding which omits Turkish
 * glyphs (ğ, ı, İ, ş). Embedding a TTF that covers Latin Extended-A
 * fixes "Stok Sayısı", "Ürün Ağırlığı", etc. printing as broken chars.
 *
 * We fetch the font binaries once (cached on `window`) and register them
 * on every fresh jsPDF instance.
 */

const REGULAR_PATH = '/fonts/Roboto-Regular.ttf';
const BOLD_PATH = '/fonts/Roboto-Bold.ttf';

export const PDF_FONT_NAME = 'Roboto';
const FONT_FILE_REGULAR = 'Roboto-Regular.ttf';
const FONT_FILE_BOLD = 'Roboto-Bold.ttf';

interface FontCache {
  regular: string | null;
  bold: string | null;
  promise: Promise<void> | null;
}

function cache(): FontCache {
  const g = globalThis as any;
  if (!g.__dsdstFontCache) g.__dsdstFontCache = { regular: null, bold: null, promise: null };
  return g.__dsdstFontCache;
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}

async function loadFontBytes(path: string): Promise<string> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Font yüklenemedi: ${path} (${res.status})`);
  const buf = await res.arrayBuffer();
  return bufferToBase64(buf);
}

/** Fetches and caches font binaries. Safe to call multiple times. */
export async function preloadPdfFonts(): Promise<void> {
  const c = cache();
  if (c.regular && c.bold) return;
  if (c.promise) return c.promise;
  c.promise = (async () => {
    const [reg, bold] = await Promise.all([loadFontBytes(REGULAR_PATH), loadFontBytes(BOLD_PATH)]);
    c.regular = reg;
    c.bold = bold;
  })();
  return c.promise;
}

/**
 * Registers the cached fonts on a jsPDF instance. Call this immediately
 * after `new jsPDF(...)` and before any setFont/text calls.
 *
 * Silently falls back to helvetica if the cache is empty — better to
 * lose Turkish glyphs than to crash the whole export.
 */
export function registerPdfFonts(pdf: jsPDF): void {
  const c = cache();
  if (!c.regular || !c.bold) {
    console.warn('PDF fonts not preloaded; falling back to helvetica (Turkish chars may render incorrectly).');
    return;
  }
  pdf.addFileToVFS(FONT_FILE_REGULAR, c.regular);
  pdf.addFont(FONT_FILE_REGULAR, PDF_FONT_NAME, 'normal');
  pdf.addFileToVFS(FONT_FILE_BOLD, c.bold);
  pdf.addFont(FONT_FILE_BOLD, PDF_FONT_NAME, 'bold');
  pdf.setFont(PDF_FONT_NAME, 'normal');
}

/** Convenience wrapper used inside drawing helpers. */
export function activePdfFont(): string {
  const c = cache();
  return (c.regular && c.bold) ? PDF_FONT_NAME : 'helvetica';
}
