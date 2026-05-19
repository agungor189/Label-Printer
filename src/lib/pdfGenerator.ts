import jsPDF from 'jspdf';
// @ts-ignore - jsbarcode is a transitive dep with no bundled types
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { LabelElement, LabelTemplate, ProductData, LabelSettings } from './types';
import { replaceVariables, resolveQrValue } from './labelRenderer';
import { drawTextInBox } from './pdfText';

function drawText(pdf: jsPDF, el: LabelElement, product: ProductData, settings: LabelSettings) {
  const text = replaceVariables(el.value || '', product, settings);
  if (!text.trim()) return;
  drawTextInBox(pdf, {
    text,
    x: el.x,
    y: el.y,
    width: el.width,
    height: el.height,
    fontMm: el.fontSize || 3,
    bold: el.fontWeight === 'bold' || el.fontWeight === 'black',
    align: el.textAlign || 'left',
    autoShrink: true,
    vAlign: 'top',
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
  const showText = el.showBarcodeText !== false;

  // Reserve a small strip at the bottom for the readable value so the bitmap
  // bars don't have to share their rect with text. Drawing the text natively
  // (instead of baking it into the PNG) prevents horizontal stretching when
  // the canvas aspect ratio differs from the label rect aspect ratio.
  const textHeightMm = showText ? Math.min(3.4, Math.max(2.4, el.height * 0.22)) : 0;
  const textGapMm = showText ? 0.4 : 0;
  const barsHeightMm = Math.max(2, el.height - textHeightMm - textGapMm);

  const canvas = document.createElement('canvas');
  try {
    JsBarcode(canvas, value, {
      format: 'CODE128',
      width: 2,
      height: Math.max(40, barsHeightMm * 8),
      displayValue: false,
      margin: 0,
    });
  } catch (e) {
    console.warn('Barcode render failed for value:', value, e);
    return;
  }
  const dataUrl = canvas.toDataURL('image/png');
  pdf.addImage(dataUrl, 'PNG', el.x, el.y, el.width, barsHeightMm, undefined, 'FAST');

  if (showText) {
    drawTextInBox(pdf, {
      text: value,
      x: el.x,
      y: el.y + barsHeightMm + textGapMm,
      width: el.width,
      height: textHeightMm,
      fontMm: Math.min(3, textHeightMm * 0.95),
      bold: false,
      align: 'center',
      autoShrink: true,
      minFontMm: 1.8,
      vAlign: 'middle',
    });
  }
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
