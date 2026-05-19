import jsPDF from 'jspdf';
// @ts-ignore - jsbarcode is a transitive dep with no bundled types
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { LabelElement, LabelTemplate, ProductData, LabelSettings } from './types';
import { replaceVariables, resolveQrValue } from './labelRenderer';

// mm <-> pt conversion (1mm = 2.83465pt). jsPDF default fontSize is pt.
const MM_TO_PT = 2.83464567;

function setTextStyle(pdf: jsPDF, el: LabelElement) {
  const weight = el.fontWeight === 'bold' || el.fontWeight === 'black' ? 'bold' : 'normal';
  pdf.setFont('helvetica', weight);
  const ptSize = Math.max(4, (el.fontSize || 3) * MM_TO_PT);
  pdf.setFontSize(ptSize);
  pdf.setTextColor(0, 0, 0);
}

function drawText(pdf: jsPDF, el: LabelElement, product: ProductData, settings: LabelSettings) {
  const text = replaceVariables(el.value || '', product, settings);
  if (!text.trim()) return;

  setTextStyle(pdf, el);
  const align = el.textAlign || 'left';

  // Wrap into the box width
  const lines = pdf.splitTextToSize(text, Math.max(1, el.width));
  const fontMm = el.fontSize || 3;
  const lineHeight = fontMm * 1.15;
  const maxLines = Math.max(1, Math.floor(el.height / lineHeight));
  const visibleLines: string[] = lines.slice(0, maxLines);

  // Ascent baseline correction so the first line top aligns with el.y
  const ascent = fontMm * 0.85;

  let xStart = el.x;
  let optAlign: 'left' | 'center' | 'right' = 'left';
  if (align === 'center') {
    xStart = el.x + el.width / 2;
    optAlign = 'center';
  } else if (align === 'right') {
    xStart = el.x + el.width;
    optAlign = 'right';
  }

  visibleLines.forEach((line: string, i: number) => {
    const y = el.y + ascent + i * lineHeight;
    pdf.text(line, xStart, y, { align: optAlign, baseline: 'alphabetic' });
  });
}

function drawBox(pdf: jsPDF, el: LabelElement) {
  const lw = Math.max(0.05, el.borderWidth ?? 0.3);
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(lw);
  pdf.rect(el.x, el.y, el.width, el.height, 'S');
}

function drawLine(pdf: jsPDF, el: LabelElement) {
  const lw = Math.max(0.1, el.borderWidth ?? 0.3);
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(lw);
  // If width >> height treat as horizontal line, else vertical
  if (el.width >= el.height) {
    const y = el.y + el.height / 2;
    pdf.line(el.x, y, el.x + el.width, y);
  } else {
    const x = el.x + el.width / 2;
    pdf.line(x, el.y, x, el.y + el.height);
  }
}

function drawBarcode(pdf: jsPDF, el: LabelElement, product: ProductData, settings: LabelSettings) {
  const value = replaceVariables(el.value || '', product, settings) || product.sku || ' ';
  // Render JsBarcode onto an offscreen canvas
  const canvas = document.createElement('canvas');
  const showText = el.showBarcodeText !== false;
  try {
    JsBarcode(canvas, value, {
      format: 'CODE128',
      width: 2,
      height: Math.max(40, el.height * 8),
      displayValue: showText,
      fontSize: 18,
      margin: 0,
      textMargin: 2,
      font: 'monospace',
    });
  } catch (e) {
    console.warn('Barcode render failed for value:', value, e);
    return;
  }
  const dataUrl = canvas.toDataURL('image/png');
  pdf.addImage(dataUrl, 'PNG', el.x, el.y, el.width, el.height, undefined, 'FAST');
}

async function drawQr(pdf: jsPDF, el: LabelElement, product: ProductData, settings: LabelSettings) {
  const value = resolveQrValue(el.value || '{ALL_INFO}', product, settings) || ' ';
  // Use a side length proportional to the larger of width/height in mm; rasterize at ~10px/mm
  const sidePx = Math.max(128, Math.round(Math.min(el.width, el.height) * 12));
  const dataUrl = await QRCode.toDataURL(value, {
    errorCorrectionLevel: 'M',
    margin: 0,
    width: sidePx,
    color: { dark: '#000000', light: '#ffffff' },
  });
  // Force square: use min of width/height to keep QR readable
  const side = Math.min(el.width, el.height);
  const offsetX = el.x + (el.width - side) / 2;
  const offsetY = el.y + (el.height - side) / 2;
  pdf.addImage(dataUrl, 'PNG', offsetX, offsetY, side, side, undefined, 'FAST');
}

export async function renderLabelObjectToPdf(
  pdf: jsPDF,
  el: LabelElement,
  product: ProductData,
  settings: LabelSettings
) {
  if (el.visible === false) return;
  switch (el.type) {
    case 'text':
      drawText(pdf, el, product, settings);
      break;
    case 'box':
      drawBox(pdf, el);
      break;
    case 'line':
      drawLine(pdf, el);
      break;
    case 'barcode':
      drawBarcode(pdf, el, product, settings);
      break;
    case 'qr':
      await drawQr(pdf, el, product, settings);
      break;
    case 'logo':
      // Treat logo as bold text for now
      drawText(pdf, { ...el, fontWeight: 'black' }, product, settings);
      break;
  }
}

export function validateDesignBeforePdf(template: LabelTemplate): { ok: boolean; reason?: string } {
  if (!template) return { ok: false, reason: 'Tasarım yok.' };
  if (!template.elements || template.elements.length === 0) {
    return { ok: false, reason: 'Etikette hiç obje yok. PDF oluşturmak için önce tasarım ekleyin.' };
  }
  const visible = template.elements.filter(e => e.visible !== false);
  if (visible.length === 0) {
    return { ok: false, reason: 'Tüm objeler gizli. PDF oluşturmak için en az bir görünür obje gerekli.' };
  }
  return { ok: true };
}

export interface GeneratePdfOptions {
  filename?: string;
}

export async function generatePdfFromDesign(
  products: ProductData[],
  template: LabelTemplate,
  settings: LabelSettings,
  options: GeneratePdfOptions = {}
): Promise<{ pages: number; objectsRendered: number }> {
  const validation = validateDesignBeforePdf(template);
  if (!validation.ok) {
    throw new Error(validation.reason);
  }
  if (!products || products.length === 0) {
    throw new Error('Yazdırılacak ürün yok. Önce veri yükleyin veya örnek veriyi seçin.');
  }

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [template.width, template.height],
    compress: true,
  });

  const visibleElements = template.elements.filter(e => e.visible !== false);
  let totalRendered = 0;

  for (let i = 0; i < products.length; i++) {
    if (i > 0) {
      pdf.addPage([template.width, template.height], 'portrait');
    }
    const product = products[i];
    // Draw in stable order (boxes/lines first, then content)
    const orderedElements = [
      ...visibleElements.filter(e => e.type === 'box' || e.type === 'line'),
      ...visibleElements.filter(e => e.type !== 'box' && e.type !== 'line'),
    ];
    for (const el of orderedElements) {
      await renderLabelObjectToPdf(pdf, el, product, settings);
      totalRendered++;
    }
  }

  console.log(`PDF export: ${totalRendered} object rendered across ${products.length} page(s)`);

  const filename = options.filename || `dsdst_etiketler_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(filename);

  return { pages: products.length, objectsRendered: totalRendered };
}

/**
 * Compatibility shim — old DOM-screenshot generator is replaced by the JSON renderer.
 * Kept as a no-op wrapper so older calls don't crash silently.
 */
export async function generateLabelsPDF(_containerId: string, _filename?: string) {
  throw new Error('generateLabelsPDF deprecated. Use generatePdfFromDesign(products, template, settings).');
}
