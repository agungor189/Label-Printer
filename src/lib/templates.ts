import { LabelTemplate } from './types';

// Default DSDST DEPO KABUL label — 150 × 100 mm (landscape)
// Layout matches the production mockup:
//   - Header: "DSDST DEPO KABUL" + "Bağlantı Elemanları"; QR top-right
//   - SKU row with bold "SKU" tab + large value
//   - Row: Tedarik NO | Malzeme | TİP | Ölçü
//   - Row: Ürün Adı (full width, large)
//   - Row: Stok Sayısı | Kutu Adedi | Kutu İçi Adet
//   - Row: Ürün Ağırlığı | Kutu Ağırlığı | Parti / Lot | Paket No
//   - Bottom: Barcode + readable SKU
export const DEFAULT_TEMPLATE: LabelTemplate = {
  id: 'dsdst_depo_kabul',
  name: 'DSDST Depo Kabul (150×100)',
  width: 150,
  height: 100,
  elements: [
    // Outer frame — non-selectable visual guide, won't steal clicks
    { id: 'border', type: 'box', x: 2, y: 2, width: 146, height: 96, value: '', borderWidth: 0.5, selectable: false, locked: true },

    // ===== Header =====
    { id: 'h_title', type: 'text', x: 4, y: 4, width: 115, height: 10, value: 'DSDST DEPO KABUL', fontSize: 8, fontWeight: 'black' },
    { id: 'h_sub',   type: 'text', x: 4, y: 14, width: 115, height: 5,  value: 'Bağlantı Elemanları', fontSize: 3.5 },

    // QR top-right (no caption)
    { id: 'qr', type: 'qr', x: 122, y: 4, width: 24, height: 24, value: '{ALL_INFO}' },

    // ===== SKU row =====
    { id: 'sku_box', type: 'box',  x: 4, y: 22, width: 114, height: 12, borderWidth: 0.4, value: '' },
    { id: 'sku_tab', type: 'box',  x: 4, y: 22, width: 12,  height: 4,  borderWidth: 0.4, value: '', fill: true, fillColor: '#0f172a' },
    { id: 'sku_lbl', type: 'text', x: 4, y: 22.5, width: 12, height: 3.5, value: 'SKU', fontSize: 2.4, fontWeight: 'bold', textAlign: 'center', textColor: '#ffffff' },
    { id: 'sku_val', type: 'text', x: 18, y: 24, width: 96, height: 9, value: '{SKU}', fontSize: 6.5, fontWeight: 'bold' },

    // ===== Row 1: Tedarik NO | Malzeme | TİP | Ölçü =====
    { id: 'kod_box', type: 'box',  x: 4,  y: 36, width: 36, height: 12, borderWidth: 0.35, value: '' },
    { id: 'kod_lbl', type: 'text', x: 5,  y: 37, width: 34, height: 3,  value: 'Tedarik NO', fontSize: 2.4 },
    { id: 'kod_val', type: 'text', x: 5,  y: 41, width: 34, height: 6,  value: '{Urun_kodu}', fontSize: 4, fontWeight: 'bold' },

    { id: 'mlz_box', type: 'box',  x: 40, y: 36, width: 46, height: 12, borderWidth: 0.35, value: '' },
    { id: 'mlz_lbl', type: 'text', x: 41, y: 37, width: 44, height: 3,  value: 'Malzeme', fontSize: 2.4 },
    { id: 'mlz_val', type: 'text', x: 41, y: 41, width: 44, height: 6,  value: '{Malzeme}', fontSize: 4, fontWeight: 'bold' },

    { id: 'tip_box', type: 'box',  x: 86, y: 36, width: 22, height: 12, borderWidth: 0.35, value: '' },
    { id: 'tip_lbl', type: 'text', x: 87, y: 37, width: 20, height: 3,  value: 'TİP', fontSize: 2.4 },
    { id: 'tip_val', type: 'text', x: 87, y: 41, width: 20, height: 6,  value: '{Tip}', fontSize: 4, fontWeight: 'bold' },

    { id: 'olcu_box', type: 'box',  x: 108, y: 36, width: 38, height: 12, borderWidth: 0.35, value: '' },
    { id: 'olcu_lbl', type: 'text', x: 109, y: 37, width: 36, height: 3,  value: 'Ölçü', fontSize: 2.4 },
    { id: 'olcu_val', type: 'text', x: 109, y: 41, width: 36, height: 6,  value: '{Olcu}', fontSize: 4, fontWeight: 'bold' },

    // ===== Row 2: Ürün Adı (full width) =====
    { id: 'adi_box', type: 'box',  x: 4, y: 48, width: 142, height: 14, borderWidth: 0.35, value: '' },
    { id: 'adi_lbl', type: 'text', x: 5, y: 49, width: 140, height: 3,  value: 'Ürün Adı', fontSize: 2.4 },
    { id: 'adi_val', type: 'text', x: 5, y: 53, width: 140, height: 9,  value: '{Urun_adi}', fontSize: 6, fontWeight: 'bold' },

    // ===== Row 3: Stok Sayısı | Kutu Adedi | Kutu İçi Adet =====
    { id: 'sts_box', type: 'box',  x: 4, y: 62, width: 46, height: 12, borderWidth: 0.35, value: '' },
    { id: 'sts_lbl', type: 'text', x: 5, y: 63, width: 44, height: 3,  value: 'Stok Sayısı', fontSize: 2.4 },
    { id: 'sts_val', type: 'text', x: 5, y: 67, width: 44, height: 6,  value: '{Stok_sayisi}', fontSize: 5.5, fontWeight: 'bold', textAlign: 'center' },

    { id: 'kad_box', type: 'box',  x: 50, y: 62, width: 46, height: 12, borderWidth: 0.35, value: '' },
    { id: 'kad_lbl', type: 'text', x: 51, y: 63, width: 44, height: 3,  value: 'Kutu Adedi', fontSize: 2.4 },
    { id: 'kad_val', type: 'text', x: 51, y: 67, width: 44, height: 6,  value: '{Toplam_paket}', fontSize: 5.5, fontWeight: 'bold', textAlign: 'center' },

    { id: 'kia_box', type: 'box',  x: 96, y: 62, width: 50, height: 12, borderWidth: 0.35, value: '' },
    { id: 'kia_lbl', type: 'text', x: 97, y: 63, width: 48, height: 3,  value: 'Kutu İçi Adet', fontSize: 2.4 },
    { id: 'kia_val', type: 'text', x: 97, y: 67, width: 48, height: 6,  value: '{Paket_ici_adet}', fontSize: 5.5, fontWeight: 'bold', textAlign: 'center' },

    // ===== Row 4: Ürün Ağırlığı | Kutu Ağırlığı | Parti/Lot | Paket No =====
    { id: 'uag_box', type: 'box',  x: 4,  y: 74, width: 36, height: 12, borderWidth: 0.35, value: '' },
    { id: 'uag_lbl', type: 'text', x: 5,  y: 75, width: 34, height: 3,  value: 'Ürün Ağırlığı (gr)', fontSize: 2.2 },
    { id: 'uag_val', type: 'text', x: 5,  y: 79, width: 34, height: 6,  value: '{Urun_agirligi}', fontSize: 5, fontWeight: 'bold', textAlign: 'center' },

    { id: 'kag_box', type: 'box',  x: 40, y: 74, width: 36, height: 12, borderWidth: 0.35, value: '' },
    { id: 'kag_lbl', type: 'text', x: 41, y: 75, width: 34, height: 3,  value: 'Kutu Ağırlığı (KG)', fontSize: 2.2 },
    { id: 'kag_val', type: 'text', x: 41, y: 79, width: 34, height: 6,  value: '{Kutu_agirligi}', fontSize: 5, fontWeight: 'bold', textAlign: 'center' },

    { id: 'lot_box', type: 'box',  x: 76, y: 74, width: 36, height: 12, borderWidth: 0.35, value: '' },
    { id: 'lot_lbl', type: 'text', x: 77, y: 75, width: 34, height: 3,  value: 'Parti / Lot', fontSize: 2.2 },
    { id: 'lot_val', type: 'text', x: 77, y: 79, width: 34, height: 6,  value: '{Parti_Lot}', fontSize: 5, fontWeight: 'bold', textAlign: 'center' },

    { id: 'pno_box', type: 'box',  x: 112, y: 74, width: 34, height: 12, borderWidth: 0.35, value: '' },
    { id: 'pno_lbl', type: 'text', x: 113, y: 75, width: 32, height: 3,  value: 'Paket No', fontSize: 2.2 },
    { id: 'pno_val', type: 'text', x: 113, y: 79, width: 32, height: 6,  value: '{Paket_no}', fontSize: 5, fontWeight: 'bold', textAlign: 'center' },

    // ===== Bottom: Barcode + readable SKU =====
    { id: 'bc', type: 'barcode', x: 18, y: 87, width: 114, height: 9, value: '{SKU}', showBarcodeText: true },
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
