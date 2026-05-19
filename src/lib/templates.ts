import { LabelTemplate } from './types';

// Default DSDST DEPO KABUL label — 100x100 mm
// Layout per spec:
//   - Top-left: "DSDST DEPO KABUL" + "Bağlantı Elemanları"
//   - Top-right: QR (no caption)
//   - Body: SKU, Ürün Kodu, Malzeme, Tip, Ölçü, Ürün Adı, Parti/Lot, Paket içi adet, Paket no, Ürün ağırlığı, Kutu ağırlığı
//   - Bottom: Barcode (value = SKU) with readable SKU underneath
export const DEFAULT_TEMPLATE: LabelTemplate = {
  id: 'dsdst_depo_kabul',
  name: 'DSDST Depo Kabul',
  width: 100,
  height: 100,
  elements: [
    // Outer border — visual frame only, never selectable from the canvas
    { id: 'border', type: 'box', x: 2, y: 2, width: 96, height: 96, value: '', borderWidth: 0.4, selectable: false, locked: true },

    // Header
    { id: 'h_title', type: 'text', x: 4, y: 4, width: 68, height: 7, value: 'DSDST DEPO KABUL', fontSize: 5, fontWeight: 'black' },
    { id: 'h_sub',   type: 'text', x: 4, y: 11, width: 68, height: 5, value: 'Bağlantı Elemanları', fontSize: 3.5, fontWeight: 'normal' },

    // QR top-right (no caption underneath per spec)
    { id: 'qr', type: 'qr', x: 76, y: 4, width: 20, height: 20, value: '{ALL_INFO}' },

    // Divider under header
    { id: 'div_top', type: 'line', x: 4, y: 25, width: 92, height: 0.3, value: '', borderWidth: 0.3 },

    // Row 1: SKU (large)
    { id: 'sku_lbl', type: 'text', x: 4, y: 27, width: 50, height: 3.5, value: 'SKU', fontSize: 2.6, fontWeight: 'bold' },
    { id: 'sku_val', type: 'text', x: 4, y: 30.5, width: 50, height: 6, value: '{SKU}', fontSize: 4.5, fontWeight: 'bold' },

    // Row 1 right: Ürün Kodu
    { id: 'kod_lbl', type: 'text', x: 56, y: 27, width: 40, height: 3.5, value: 'ÜRÜN KODU', fontSize: 2.6, fontWeight: 'bold' },
    { id: 'kod_val', type: 'text', x: 56, y: 30.5, width: 40, height: 6, value: '{Urun_kodu}', fontSize: 3.6 },

    // Row 2: Malzeme | Tip | Ölçü
    { id: 'malz_lbl', type: 'text', x: 4, y: 38, width: 30, height: 3, value: 'MALZEME', fontSize: 2.4, fontWeight: 'bold' },
    { id: 'malz_val', type: 'text', x: 4, y: 41, width: 30, height: 5, value: '{Malzeme}', fontSize: 3 },

    { id: 'tip_lbl', type: 'text', x: 36, y: 38, width: 24, height: 3, value: 'TİP', fontSize: 2.4, fontWeight: 'bold' },
    { id: 'tip_val', type: 'text', x: 36, y: 41, width: 24, height: 5, value: '{Tip}', fontSize: 3 },

    { id: 'olcu_lbl', type: 'text', x: 62, y: 38, width: 34, height: 3, value: 'ÖLÇÜ', fontSize: 2.4, fontWeight: 'bold' },
    { id: 'olcu_val', type: 'text', x: 62, y: 41, width: 34, height: 5, value: '{Olcu}', fontSize: 3 },

    // Row 3: Ürün Adı (full width)
    { id: 'adi_lbl', type: 'text', x: 4, y: 48, width: 92, height: 3, value: 'ÜRÜN ADI', fontSize: 2.4, fontWeight: 'bold' },
    { id: 'adi_val', type: 'text', x: 4, y: 51, width: 92, height: 7, value: '{Urun_adi}', fontSize: 3.2 },

    // Row 4: Parti/Lot | Paket içi adet | Paket no
    { id: 'lot_lbl', type: 'text', x: 4, y: 60, width: 30, height: 3, value: 'PARTİ / LOT', fontSize: 2.4, fontWeight: 'bold' },
    { id: 'lot_val', type: 'text', x: 4, y: 63, width: 30, height: 5, value: '{Parti_Lot}', fontSize: 3.2, fontWeight: 'bold' },

    { id: 'adt_lbl', type: 'text', x: 36, y: 60, width: 24, height: 3, value: 'PAKET İÇİ ADET', fontSize: 2.4, fontWeight: 'bold' },
    { id: 'adt_val', type: 'text', x: 36, y: 63, width: 24, height: 5, value: '{Paket_ici_adet}', fontSize: 3.2, fontWeight: 'bold' },

    { id: 'pno_lbl', type: 'text', x: 62, y: 60, width: 34, height: 3, value: 'PAKET NO', fontSize: 2.4, fontWeight: 'bold' },
    { id: 'pno_val', type: 'text', x: 62, y: 63, width: 34, height: 5, value: '{Paket_no} / {Toplam_paket}', fontSize: 3.2, fontWeight: 'bold' },

    // Row 5: Ürün ağırlığı | Kutu ağırlığı
    { id: 'urag_lbl', type: 'text', x: 4, y: 70, width: 44, height: 3, value: 'ÜRÜN AĞIRLIĞI', fontSize: 2.4, fontWeight: 'bold' },
    { id: 'urag_val', type: 'text', x: 4, y: 73, width: 44, height: 5, value: '{Urun_agirligi}', fontSize: 3 },

    { id: 'ktag_lbl', type: 'text', x: 52, y: 70, width: 44, height: 3, value: 'KUTU AĞIRLIĞI', fontSize: 2.4, fontWeight: 'bold' },
    { id: 'ktag_val', type: 'text', x: 52, y: 73, width: 44, height: 5, value: '{Kutu_agirligi}', fontSize: 3 },

    // Divider above barcode
    { id: 'div_bot', type: 'line', x: 4, y: 80, width: 92, height: 0.3, value: '', borderWidth: 0.3 },

    // Barcode: value = SKU, with readable text below (built-in by JsBarcode)
    { id: 'bc', type: 'barcode', x: 8, y: 82, width: 84, height: 14, value: '{SKU}', showBarcodeText: true },
  ],
};

export const MINIMAL_TEMPLATE: LabelTemplate = {
  id: 'minimal',
  name: 'Minimal Etiket',
  width: 100,
  height: 100,
  elements: [
    { id: 'adi', type: 'text', x: 5, y: 10, width: 90, height: 12, value: '{Urun_adi}', fontSize: 4.5, fontWeight: 'bold', textAlign: 'center' },
    { id: 'olcu', type: 'text', x: 5, y: 23, width: 90, height: 5, value: '{Olcu}  |  {Malzeme}', fontSize: 3, textAlign: 'center' },
    { id: 'barkod', type: 'barcode', x: 8, y: 35, width: 84, height: 40, value: '{SKU}', showBarcodeText: true },
    { id: 'skutext', type: 'text', x: 5, y: 80, width: 90, height: 6, value: 'SKU: {SKU}', fontSize: 3.5, textAlign: 'center', fontWeight: 'bold' },
  ],
};

export const LARGE_BARCODE_TEMPLATE: LabelTemplate = {
  id: 'large_barcode',
  name: 'Büyük Barkod Etiketi',
  width: 100,
  height: 100,
  elements: [
    { id: 'head', type: 'text', x: 5, y: 5, width: 60, height: 5, value: 'DEPO YERLEŞTİRME', fontSize: 3.5, fontWeight: 'bold' },
    { id: 'lok', type: 'text', x: 65, y: 5, width: 30, height: 5, value: 'LOK: {Lokasyon}', fontSize: 3.5, fontWeight: 'black', textAlign: 'right' },
    { id: 'line1', type: 'line', x: 5, y: 12, width: 90, height: 0.3, value: '', borderWidth: 0.5 },
    { id: 'skutx', type: 'text', x: 5, y: 15, width: 90, height: 10, value: '{SKU}', fontSize: 7, fontWeight: 'black', textAlign: 'center' },
    { id: 'barkod', type: 'barcode', x: 8, y: 30, width: 84, height: 38, value: '{SKU}', showBarcodeText: true },
    { id: 'line2', type: 'line', x: 5, y: 73, width: 90, height: 0.3, value: '', borderWidth: 0.5 },
    { id: 'namex', type: 'text', x: 5, y: 76, width: 70, height: 10, value: '{Urun_adi}', fontSize: 3 },
    { id: 'qr_s', type: 'qr', x: 77, y: 76, width: 18, height: 18, value: '{ALL_INFO}' },
  ],
};

export const QR_TECHNICAL_TEMPLATE: LabelTemplate = {
  id: 'qr_technical',
  name: 'QR Ağırlıklı Teknik Etiket',
  width: 100,
  height: 100,
  elements: [
    { id: 'qr_big', type: 'qr', x: 5, y: 5, width: 45, height: 45, value: '{ALL_INFO}' },
    { id: 'sk', type: 'text', x: 55, y: 5, width: 40, height: 6, value: 'SKU: {SKU}', fontSize: 4, fontWeight: 'black' },
    { id: 'urkd', type: 'text', x: 55, y: 13, width: 40, height: 5, value: 'KOD: {Urun_kodu}', fontSize: 3, fontWeight: 'bold' },
    { id: 'mlz', type: 'text', x: 55, y: 20, width: 40, height: 5, value: 'MLZ: {Malzeme}', fontSize: 3 },
    { id: 'olc', type: 'text', x: 55, y: 27, width: 40, height: 5, value: 'ÖLÇÜ: {Olcu}', fontSize: 3 },
    { id: 'lot', type: 'text', x: 55, y: 34, width: 40, height: 5, value: 'LOT: {Parti_Lot}', fontSize: 3 },
    { id: 'adet', type: 'text', x: 55, y: 41, width: 40, height: 5, value: 'ADET: {Paket_ici_adet}', fontSize: 3, fontWeight: 'bold' },
    { id: 'ln1', type: 'line', x: 5, y: 54, width: 90, height: 0.3, value: '', borderWidth: 0.5 },
    { id: 'name', type: 'text', x: 5, y: 58, width: 90, height: 12, value: '{Urun_adi}', fontSize: 3.5 },
    { id: 'bc', type: 'barcode', x: 8, y: 75, width: 84, height: 18, value: '{SKU}', showBarcodeText: true },
  ],
};

export const TEMPLATES = [
  DEFAULT_TEMPLATE,
  MINIMAL_TEMPLATE,
  LARGE_BARCODE_TEMPLATE,
  QR_TECHNICAL_TEMPLATE,
];
