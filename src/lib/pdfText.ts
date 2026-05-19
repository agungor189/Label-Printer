import type jsPDF from 'jspdf';

export const MM_TO_PT = 2.83464567;

/**
 * Word-wrap that uses pdf.getTextWidth directly. Bypasses
 * pdf.splitTextToSize, which on jsPDF v4 sometimes mismeasures lines
 * containing extended Latin / Turkish glyphs and triggers the engine's
 * justify path — that's the source of the "A l ü m i n y u m" artefact.
 */
export function wrapTextToWidth(pdf: jsPDF, text: string, maxWidth: number): string[] {
  if (!text) return [];
  const paragraphs = text.split(/\n/);
  const out: string[] = [];
  for (const para of paragraphs) {
    const words = para.split(/\s+/).filter(Boolean);
    if (words.length === 0) { out.push(''); continue; }
    let current = '';
    for (const w of words) {
      const trial = current ? current + ' ' + w : w;
      if (pdf.getTextWidth(trial) <= maxWidth) {
        current = trial;
      } else {
        if (current) out.push(current);
        if (pdf.getTextWidth(w) > maxWidth) {
          // Word itself overflows — break by characters as a last resort
          let buf = '';
          for (const ch of w) {
            if (pdf.getTextWidth(buf + ch) <= maxWidth) buf += ch;
            else { if (buf) out.push(buf); buf = ch; }
          }
          current = buf;
        } else {
          current = w;
        }
      }
    }
    if (current) out.push(current);
  }
  return out;
}

export interface FitResult {
  lines: string[];
  fontMm: number;
}

/**
 * Word-wrap a string and, if it still overflows vertically, shrink the
 * font size until it fits or hits minFontMm. As a last resort, truncates
 * with an ellipsis on the final visible line.
 */
export function fitTextToBox(
  pdf: jsPDF,
  text: string,
  maxWidthMm: number,
  maxHeightMm: number,
  baseFontMm: number,
  opts: { minFontMm?: number; lineHeightFactor?: number; ellipsis?: boolean } = {}
): FitResult {
  const minFontMm = opts.minFontMm ?? Math.max(1.6, baseFontMm * 0.55);
  const lineHeightFactor = opts.lineHeightFactor ?? 1.15;
  const ellipsis = opts.ellipsis !== false;

  let fontMm = baseFontMm;
  while (fontMm >= minFontMm - 1e-6) {
    pdf.setFontSize(fontMm * MM_TO_PT);
    const lines = wrapTextToWidth(pdf, text, maxWidthMm);
    const total = lines.length * fontMm * lineHeightFactor;
    if (total <= maxHeightMm + 1e-6) return { lines, fontMm };
    fontMm -= 0.2;
  }

  // Couldn't fit even at min size — truncate visible line count
  pdf.setFontSize(minFontMm * MM_TO_PT);
  const lines = wrapTextToWidth(pdf, text, maxWidthMm);
  const maxLines = Math.max(1, Math.floor(maxHeightMm / (minFontMm * lineHeightFactor)));
  let visible = lines.slice(0, maxLines);
  if (ellipsis && lines.length > maxLines && visible.length > 0) {
    let last = visible[visible.length - 1];
    while (last.length > 1 && pdf.getTextWidth(last + '…') > maxWidthMm) {
      last = last.slice(0, -1);
    }
    visible[visible.length - 1] = last + '…';
  }
  return { lines: visible, fontMm: minFontMm };
}

export interface DrawTextOpts {
  text: string;
  x: number;          // mm
  y: number;          // mm
  width: number;      // mm
  height: number;     // mm
  fontMm: number;     // base / max size
  bold?: boolean;
  align?: 'left' | 'center' | 'right';
  autoShrink?: boolean;
  minFontMm?: number;
  lineHeightFactor?: number;
  /** vertical alignment within the box */
  vAlign?: 'top' | 'middle' | 'bottom';
  padding?: number;   // mm
}

/**
 * The single text-drawing primitive used for every label text and the
 * SKU underneath barcodes. Crucially we never call pdf.splitTextToSize
 * and never set charSpace/wordSpace, so jsPDF can't synthesise the
 * letter-spread we were seeing.
 */
export function drawTextInBox(pdf: jsPDF, o: DrawTextOpts): { fontMm: number; lines: string[] } {
  if (!o.text || !o.text.trim()) return { fontMm: o.fontMm, lines: [] };
  const padding = o.padding ?? 0;
  const w = Math.max(0.1, o.width - 2 * padding);
  const h = Math.max(0.1, o.height - 2 * padding);

  pdf.setFont('helvetica', o.bold ? 'bold' : 'normal');
  // Defensive: reset any leftover spacing modes that might leak between draws
  try { pdf.setCharSpace(0); } catch {}

  const fit = o.autoShrink === false
    ? (() => {
        pdf.setFontSize(o.fontMm * MM_TO_PT);
        return { lines: wrapTextToWidth(pdf, o.text, w), fontMm: o.fontMm };
      })()
    : fitTextToBox(pdf, o.text, w, h, o.fontMm, {
        minFontMm: o.minFontMm,
        lineHeightFactor: o.lineHeightFactor,
        ellipsis: true,
      });

  pdf.setFontSize(fit.fontMm * MM_TO_PT);
  pdf.setTextColor(0, 0, 0);

  const lineHeight = fit.fontMm * (o.lineHeightFactor ?? 1.15);
  const totalHeight = fit.lines.length * lineHeight;
  const ascent = fit.fontMm * 0.82;
  const align = o.align || 'left';
  const vAlign = o.vAlign || 'top';

  let blockY = o.y + padding;
  if (vAlign === 'middle') blockY = o.y + padding + (h - totalHeight) / 2;
  else if (vAlign === 'bottom') blockY = o.y + padding + (h - totalHeight);

  fit.lines.forEach((line, i) => {
    const baseY = blockY + ascent + i * lineHeight;
    let x = o.x + padding;
    let optAlign: 'left' | 'center' | 'right' = 'left';
    if (align === 'center') { x = o.x + padding + w / 2; optAlign = 'center'; }
    else if (align === 'right') { x = o.x + padding + w; optAlign = 'right'; }
    pdf.text(line, x, baseY, { align: optAlign, baseline: 'alphabetic' });
  });

  return fit;
}
