import 'dotenv/config';
import express from 'express';
import { jsPDF } from 'jspdf';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findDefaultTemplate, isTemplatePurpose, listTemplates, readTemplateState } from './template-store.mjs';

const MAX_BODY_BYTES = '2mb';
const MAX_ELEMENTS = 100;

export const PACKAGE_LABEL_TEMPLATE = {
  id: 'warehouse-package-150x100-v1',
  name: 'DSDST Depo Paket Etiketi',
  purpose: 'goods_receipt',
  isDefault: true,
  width: 150,
  height: 100,
  elements: [
    { id: 'border', type: 'box', x: 2, y: 2, width: 146, height: 96, borderWidth: 0.6 },
    { id: 'brand', type: 'text', x: 7, y: 6, width: 48, height: 8, value: 'DSDST WAREHOUSE', fontSize: 5, fontWeight: 'black' },
    { id: 'package-code', type: 'text', x: 58, y: 5, width: 84, height: 11, value: '{Package_code}', fontSize: 7, fontWeight: 'black', textAlign: 'right' },
    { id: 'product-name', type: 'text', x: 7, y: 20, width: 135, height: 15, value: '{Urun_adi}', fontSize: 6, fontWeight: 'bold' },
    { id: 'sku-label', type: 'text', x: 7, y: 39, width: 55, height: 7, value: 'SKU: {SKU}', fontSize: 4, fontWeight: 'bold' },
    { id: 'lot', type: 'text', x: 66, y: 39, width: 76, height: 7, value: 'LOT: {Parti_Lot}', fontSize: 4, textAlign: 'right' },
    { id: 'supplier', type: 'text', x: 7, y: 46, width: 70, height: 6, value: 'TEDARIK: {Supplier_no}', fontSize: 3.5, fontWeight: 'bold' },
    { id: 'size-weight', type: 'text', x: 79, y: 46, width: 63, height: 6, value: '{Olcu} · {Kutu_agirligi} kg', fontSize: 3.5, textAlign: 'right' },
    { id: 'count', type: 'text', x: 7, y: 53, width: 60, height: 8, value: 'ADET: {Paket_ici_adet}', fontSize: 5, fontWeight: 'black' },
    { id: 'ordinal', type: 'text', x: 76, y: 53, width: 66, height: 8, value: 'PAKET {Paket_no}', fontSize: 5, fontWeight: 'black', textAlign: 'right' },
    { id: 'package-barcode', type: 'barcode', x: 7, y: 64, width: 96, height: 27, value: '{Package_code}', showBarcodeText: true },
    { id: 'package-qr', type: 'qr', x: 113, y: 64, width: 27, height: 27, value: '{Package_code}' },
  ],
};

export const LOCATION_LABEL_TEMPLATE = {
  id: 'location_default',
  name: 'Lokasyon Etiketi',
  purpose: 'location',
  isDefault: true,
  width: 100,
  height: 50,
  elements: [
    { id: 'location_name', type: 'text', x: 5, y: 5, width: 90, height: 12, value: '{Lokasyon}', fontSize: 10, fontWeight: 'black', textAlign: 'center' },
    { id: 'location_barcode', type: 'barcode', x: 8, y: 23, width: 84, height: 21, value: '{Lokasyon}', showBarcodeText: false },
  ],
};

const FALLBACK_TEMPLATES = [PACKAGE_LABEL_TEMPLATE, LOCATION_LABEL_TEMPLATE];

const text = (value, max = 500) => String(value ?? '').trim().slice(0, max);
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

export function normalizeLabelData(input = {}) {
  const value = (...keys) => {
    for (const key of keys) {
      if (input[key] !== undefined && input[key] !== null) return input[key];
    }
    return '';
  };
  return {
    packageCode: value('packageCode', 'Package_code', 'package_code'),
    sku: value('sku', 'SKU'),
    urunKodu: value('urunKodu', 'Urun_kodu', 'urun_kodu'),
    supplierNo: value('supplierNo', 'Supplier_no', 'supplier_no'),
    malzeme: value('malzeme', 'Malzeme'),
    tip: value('tip', 'Tip'),
    olcu: value('olcu', 'Olcu', 'Ölçü'),
    urunAdi: value('urunAdi', 'Urun_adi', 'urun_adi'),
    partiLot: value('partiLot', 'Parti_Lot', 'Parti_lot', 'parti_lot'),
    paketIciAdet: value('paketIciAdet', 'Paket_ici_adet', 'paket_ici_adet'),
    paketNo: value('paketNo', 'Paket_no', 'paket_no'),
    toplamPaket: value('toplamPaket', 'Toplam_paket', 'toplam_paket'),
    lokasyon: value('lokasyon', 'Lokasyon', 'location'),
    not: value('not', 'Not'),
    urunAgirligi: value('urunAgirligi', 'Urun_agirligi', 'urun_agirligi'),
    kutuAgirligi: value('kutuAgirligi', 'Kutu_agirligi', 'kutu_agirligi'),
    stokSayisi: value('stokSayisi', 'Stok_sayisi', 'stok_sayisi'),
  };
}

export function replaceWarehouseVariables(value, productInput) {
  const product = normalizeLabelData(productInput);
  const values = {
    Package_code: product.packageCode,
    SKU: product.sku,
    Urun_kodu: product.urunKodu,
    Supplier_no: product.supplierNo,
    Malzeme: product.malzeme,
    Tip: product.tip,
    Olcu: product.olcu,
    Urun_adi: product.urunAdi,
    Parti_Lot: product.partiLot,
    Parti_lot: product.partiLot,
    Paket_ici_adet: product.paketIciAdet,
    Paket_no: product.paketNo,
    Toplam_paket: product.toplamPaket,
    Lokasyon: product.lokasyon,
    Not: product.not,
    Urun_agirligi: product.urunAgirligi,
    Kutu_agirligi: product.kutuAgirligi,
    Stok_sayisi: product.stokSayisi,
  };
  let result = String(value || '');
  for (const [key, replacement] of Object.entries(values)) {
    result = result.replaceAll(`{${key}}`, text(replacement));
  }
  if (result.includes('{ALL_INFO}')) {
    result = result.replaceAll('{ALL_INFO}', [
      `PACKAGE_CODE: ${text(product.packageCode)}`,
      `SKU: ${text(product.sku)}`,
      `URUN_ADI: ${text(product.urunAdi)}`,
      `LOT: ${text(product.partiLot)}`,
      `PAKET: ${text(product.paketNo)}/${text(product.toplamPaket)}`,
      `PAKET_ICI_ADET: ${text(product.paketIciAdet)}`,
    ].join('\n'));
  }
  return result;
}

export function normalizeTemplate(input) {
  const source = input && typeof input === 'object' ? input : PACKAGE_LABEL_TEMPLATE;
  const width = Math.min(300, Math.max(20, finite(source.width, 150)));
  const height = Math.min(300, Math.max(20, finite(source.height, 100)));
  const elements = Array.isArray(source.elements) ? source.elements.slice(0, MAX_ELEMENTS) : [];
  if (!elements.length) throw new Error('Şablonda yazdırılabilir öğe yok.');
  return {
    id: text(source.id, 100) || 'warehouse-package',
    name: text(source.name, 160) || 'Warehouse package label',
    width,
    height,
    elements: elements.map((element, index) => ({
      ...element,
      id: text(element?.id, 100) || `element-${index + 1}`,
      type: ['text', 'barcode', 'qr', 'line', 'box', 'logo'].includes(element?.type) ? element.type : 'text',
      x: Math.max(0, finite(element?.x)),
      y: Math.max(0, finite(element?.y)),
      width: Math.max(0.1, finite(element?.width, 10)),
      height: Math.max(0.1, finite(element?.height, 5)),
      value: text(element?.value, 2000),
    })),
  };
}

function drawText(pdf, element, product) {
  const value = replaceWarehouseVariables(element.value, product);
  if (!value) return;
  const size = Math.max(5, finite(element.fontSize, 3.5) * 2.83465);
  pdf.setFont('helvetica', element.fontWeight === 'bold' || element.fontWeight === 'black' ? 'bold' : 'normal');
  pdf.setFontSize(size);
  const lines = pdf.splitTextToSize(value, Math.max(1, element.width));
  const align = ['left', 'center', 'right'].includes(element.textAlign) ? element.textAlign : 'left';
  const x = align === 'center' ? element.x + element.width / 2 : align === 'right' ? element.x + element.width : element.x;
  pdf.text(lines, x, element.y + Math.max(2, finite(element.fontSize, 3.5)), { align, maxWidth: element.width });
}

function drawBarcode(pdf, element, product) {
  const value = replaceWarehouseVariables(element.value, product) || text(product.packageCode) || text(product.sku);
  if (!value) throw new Error('Barkod değeri boş olamaz.');
  const target = {};
  JsBarcode(target, value, { format: 'CODE128', displayValue: false, margin: 0 });
  const bits = (target.encodings || []).map((encoding) => encoding.data).join('');
  if (!bits) throw new Error('Barkod üretilemedi.');
  const showText = element.showBarcodeText !== false;
  const barsHeight = Math.max(2, element.height - (showText ? 4 : 0));
  const moduleWidth = element.width / bits.length;
  pdf.setFillColor(0, 0, 0);
  let runStart = -1;
  for (let index = 0; index <= bits.length; index += 1) {
    if (bits[index] === '1' && runStart < 0) runStart = index;
    if (runStart >= 0 && bits[index] !== '1') {
      pdf.rect(element.x + runStart * moduleWidth, element.y, (index - runStart) * moduleWidth, barsHeight, 'F');
      runStart = -1;
    }
  }
  if (showText) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.text(value, element.x + element.width / 2, element.y + element.height - 0.7, { align: 'center', maxWidth: element.width });
  }
}

async function drawQr(pdf, element, product) {
  const value = replaceWarehouseVariables(element.value || '{Package_code}', product) || text(product.packageCode);
  const dataUrl = await QRCode.toDataURL(value || 'N/A', { errorCorrectionLevel: 'M', margin: 4, width: 360 });
  const side = Math.min(element.width, element.height);
  pdf.addImage(dataUrl, 'PNG', element.x + (element.width - side) / 2, element.y + (element.height - side) / 2, side, side, undefined, 'FAST');
}

export async function renderWarehouseLabelPdf(payload) {
  const template = normalizeTemplate(payload?.template);
  const sourceData = payload?.data && typeof payload.data === 'object' ? payload.data : payload?.product;
  const product = normalizeLabelData(sourceData && typeof sourceData === 'object' ? sourceData : {});
  if (!text(product.packageCode) && !text(product.sku) && !text(product.lokasyon)) {
    throw new Error('Etiket verisinde Package_code, SKU veya Lokasyon alanlarından biri zorunludur.');
  }
  const orientation = template.width > template.height ? 'landscape' : 'portrait';
  const pdf = new jsPDF({ orientation, unit: 'mm', format: [template.width, template.height], compress: true });
  const ordered = [
    ...template.elements.filter((element) => element.visible !== false && ['box', 'line'].includes(element.type)),
    ...template.elements.filter((element) => element.visible !== false && !['box', 'line'].includes(element.type)),
  ];
  for (const element of ordered) {
    if (element.type === 'box') {
      pdf.setLineWidth(Math.max(0.05, finite(element.borderWidth, 0.3)));
      pdf.rect(element.x, element.y, element.width, element.height, 'S');
    } else if (element.type === 'line') {
      pdf.setLineWidth(Math.max(0.05, finite(element.borderWidth, 0.3)));
      pdf.line(element.x, element.y, element.x + element.width, element.y + element.height);
    } else if (element.type === 'barcode') {
      drawBarcode(pdf, element, product);
    } else if (element.type === 'qr') {
      await drawQr(pdf, element, product);
    } else {
      drawText(pdf, element, product);
    }
  }
  return Buffer.from(pdf.output('arraybuffer'));
}

export function createWarehouseRendererApp(options = {}) {
  const app = express();
  const apiKey = options.apiKey ?? process.env.LABEL_RENDERER_API_KEY ?? '';
  const stateFile = path.resolve(options.stateFile || process.env.LABEL_TEMPLATE_STATE_FILE || path.join(process.env.DATA_DIR || 'data', process.env.STATE_FILE || 'app-state.json'));
  const authorized = (req, res) => {
    if (!apiKey || req.headers['x-api-key'] === apiKey) return true;
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  };
  const loadState = async () => readTemplateState(stateFile, FALLBACK_TEMPLATES);
  app.disable('x-powered-by');
  app.use(express.json({ limit: MAX_BODY_BYTES }));
  app.get('/health', (_req, res) => res.json({ ok: true, service: 'dsdst-label-renderer', stateFile }));
  app.get('/api/v1/templates', async (req, res) => {
    if (!authorized(req, res)) return;
    const purpose = String(req.query.purpose || '');
    if (purpose && !isTemplatePurpose(purpose)) return res.status(400).json({ error: 'Geçersiz template purpose.' });
    return res.json({ templates: listTemplates(await loadState(), purpose || undefined) });
  });
  app.get('/api/v1/templates/default', async (req, res) => {
    if (!authorized(req, res)) return;
    const purpose = String(req.query.purpose || 'goods_receipt');
    if (!isTemplatePurpose(purpose)) return res.status(400).json({ error: 'Geçersiz template purpose.' });
    const template = findDefaultTemplate(await loadState(), purpose);
    return template ? res.json(template) : res.status(404).json({ error: 'Varsayılan şablon bulunamadı.' });
  });
  app.get('/api/v1/templates/:id', async (req, res) => {
    if (!authorized(req, res)) return;
    const template = (await loadState()).templates.find((item) => item.id === req.params.id);
    return template ? res.json(template) : res.status(404).json({ error: 'Şablon bulunamadı.' });
  });
  app.get('/api/v1/package-label/default-template', async (req, res) => {
    if (!authorized(req, res)) return;
    return res.json(findDefaultTemplate(await loadState(), 'goods_receipt') || PACKAGE_LABEL_TEMPLATE);
  });
  app.post('/api/v1/package-label/render', async (req, res) => {
    if (!authorized(req, res)) return;
    try {
      const template = req.body?.template || findDefaultTemplate(await loadState(), 'goods_receipt');
      const pdf = await renderWarehouseLabelPdf({ ...req.body, template });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', String(pdf.length));
      return res.send(pdf);
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'PDF oluşturulamadı.' });
    }
  });
  app.post('/api/v1/render', async (req, res) => {
    if (!authorized(req, res)) return;
    try {
      const purpose = String(req.body?.purpose || 'custom');
      if (!isTemplatePurpose(purpose)) return res.status(400).json({ error: 'Geçersiz template purpose.' });
      const state = await loadState();
      const requestedId = text(req.body?.templateId, 100);
      const template = requestedId
        ? state.templates.find((item) => item.id === requestedId && item.purpose === purpose)
        : findDefaultTemplate(state, purpose);
      if (!template) return res.status(404).json({ error: `${purpose} için şablon bulunamadı.` });
      const pdf = await renderWarehouseLabelPdf({ template, data: req.body?.data });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${purpose}-label.pdf"`);
      res.setHeader('X-Label-Template-Id', template.id);
      res.setHeader('X-Label-Template-Purpose', template.purpose);
      return res.send(pdf);
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'PDF oluşturulamadı.' });
    }
  });
  return app;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const port = Number(process.env.LABEL_RENDERER_PORT || 3010);
  createWarehouseRendererApp().listen(port, '0.0.0.0', () => {
    console.log(`Label renderer listening on http://0.0.0.0:${port}`);
  });
}
