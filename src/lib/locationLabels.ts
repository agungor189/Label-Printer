import jsPDF from 'jspdf';
import { preloadPdfFonts, registerPdfFonts } from './pdfFont';
import { renderLabelObjectToPdf } from './pdfGenerator';
import { sanitizeLabelTemplate } from './templateSafety';
import { DEFAULT_LOCATION_TEMPLATE } from './templates';
import type { LabelSettings, LabelTemplate, ProductData } from './types';

export const LOCATION_LABEL_HEIGHT_MM = 100;
export const LOCATIONS_PER_LABEL = 2;
export const LOCATION_SHELVES = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2', 'E1', 'E2', 'F1', 'F2', 'G1', 'G2'] as const;

export type LocationShelf = typeof LOCATION_SHELVES[number];
export type LocationLabelSize = '100x100' | '150x100';

export const LOCATION_LABEL_WIDTHS: Record<LocationLabelSize, number> = {
  '100x100': 100,
  '150x100': 150,
};

export function generateShelfLocationCodes(shelf: LocationShelf): string[] {
  const locations: string[] = [];
  for (let level = 1; level <= 4; level++) {
    for (let position = 1; position <= 7; position++) {
      locations.push(`${shelf}-K${level}-P${position}`);
    }
  }
  return locations;
}

export function generateLocationCodes(): string[] {
  return LOCATION_SHELVES.flatMap(generateShelfLocationCodes);
}

export function groupLocationCodes(codes: string[]): Array<[string, string?]> {
  const groups: Array<[string, string?]> = [];
  for (let index = 0; index < codes.length; index += LOCATIONS_PER_LABEL) {
    groups.push([codes[index], codes[index + 1]]);
  }
  return groups;
}

export function sanitizeLocationLabelTemplate(template: LabelTemplate): LabelTemplate {
  const safe = sanitizeLabelTemplate(template, DEFAULT_LOCATION_TEMPLATE);
  return {
    ...safe,
    width: 100,
    height: 50,
    elements: safe.elements
      .filter(element => element.type === 'text' || element.type === 'barcode')
      .map(element => element.type === 'barcode' ? { ...element, showBarcodeText: false } : element),
  };
}

export function createLocationSampleProduct(code: string): ProductData {
  return {
    sku: code,
    urunKodu: '',
    malzeme: '',
    olcu: '',
    paketNo: '',
    toplamPaket: '',
    urunAdi: '',
    partiLot: '',
    paketIciAdet: '',
    lokasyon: code,
    not: '',
    printQty: 1,
  };
}

const LOCATION_RENDER_SETTINGS: LabelSettings = {
  qrType: 'sku_only',
  qrCustomUrl: '',
  showDsdstHeader: false,
  showLokasyon: true,
  showNot: false,
  paperSize: '100x100',
};

async function drawLocationHalf(pdf: jsPDF, code: string, topMm: number, widthMm: number, template: LabelTemplate) {
  const xScale = widthMm / template.width;
  const yScale = 50 / template.height;
  const product = createLocationSampleProduct(code);

  for (const element of template.elements) {
    await renderLabelObjectToPdf(pdf, {
      ...element,
      x: element.x * xScale,
      y: topMm + element.y * yScale,
      width: element.width * xScale,
      height: element.height * yScale,
      fontSize: element.fontSize ? element.fontSize * yScale : element.fontSize,
      showBarcodeText: false,
    }, product, LOCATION_RENDER_SETTINGS);
  }
}

export async function generateLocationLabelsPdf(
  codes: string[],
  size: LocationLabelSize = '100x100',
  design: LabelTemplate = DEFAULT_LOCATION_TEMPLATE,
  filename = `lokasyon_etiketleri_${new Date().toISOString().split('T')[0]}.pdf`,
): Promise<{ pages: number; locations: number }> {
  if (codes.length === 0) {
    throw new Error('Yazdırmak için en az bir lokasyon seçin.');
  }

  await preloadPdfFonts();

  const pages = groupLocationCodes(codes);
  const widthMm = LOCATION_LABEL_WIDTHS[size];
  const template = sanitizeLocationLabelTemplate(design);
  const orientation = widthMm > LOCATION_LABEL_HEIGHT_MM ? 'landscape' : 'portrait';
  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: [widthMm, LOCATION_LABEL_HEIGHT_MM],
    compress: true,
  });
  registerPdfFonts(pdf);

  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const [first, second] = pages[pageIndex];
    if (pageIndex > 0) {
      pdf.addPage([widthMm, LOCATION_LABEL_HEIGHT_MM], orientation);
    }
    await drawLocationHalf(pdf, first, 0, widthMm, template);
    if (second) await drawLocationHalf(pdf, second, 50, widthMm, template);
  }

  pdf.save(filename);
  return { pages: pages.length, locations: codes.length };
}
