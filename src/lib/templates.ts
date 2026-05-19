import { LabelTemplate } from './types';

export const DEFAULT_TEMPLATE: LabelTemplate = {
  id: 'default_dsdst',
  name: 'Varsayılan DSDST',
  width: 100,
  height: 100,
  elements: [
    { id: 'box_outer', type: 'box', x: 3, y: 3, width: 94, height: 94, value: '', borderWidth: 0.5 },
    { id: 'logo_text', type: 'text', x: 5, y: 5, width: 60, height: 8, value: 'DSDST PAKET ETİKETİ', fontSize: 5, fontWeight: 'black' },
    { id: 'desc_text', type: 'text', x: 5, y: 11, width: 60, height: 4, value: 'Depo kabul / stok yerleştirme / paket tanımlama', fontSize: 2.5 },
    { id: 'qr_code', type: 'qr', x: 77, y: 4, width: 18, height: 18, value: '{ALL_INFO}' },
    
    // Row 1
    { id: 'box_sku', type: 'box', x: 5, y: 24, width: 50, height: 14, value: '', borderWidth: 0.5 },
    { id: 'sku_label', type: 'text', x: 6, y: 25, width: 48, height: 4, value: 'SKU', fontSize: 2.5, fontWeight: 'bold' },
    { id: 'sku_val', type: 'text', x: 6, y: 29, width: 48, height: 6, value: '{SKU}', fontSize: 4, fontWeight: 'normal' },
    
    { id: 'box_ukodu', type: 'box', x: 57, y: 24, width: 38, height: 14, value: '', borderWidth: 0.5 },
    { id: 'ukodu_label', type: 'text', x: 58, y: 25, width: 36, height: 4, value: 'ÜRÜN KODU', fontSize: 2.5, fontWeight: 'bold' },
    { id: 'ukodu_val', type: 'text', x: 58, y: 29, width: 36, height: 6, value: '{Urun_kodu}', fontSize: 3.5, fontWeight: 'normal' },

    // Row 2
    { id: 'box_malz', type: 'box', x: 5, y: 40, width: 50, height: 14, value: '', borderWidth: 0.5 },
    { id: 'malz_label', type: 'text', x: 6, y: 41, width: 48, height: 4, value: 'MALZEME', fontSize: 2.5, fontWeight: 'bold' },
    { id: 'malz_val', type: 'text', x: 6, y: 45, width: 48, height: 6, value: '{Malzeme}', fontSize: 3.5 },
    
    { id: 'box_olcu', type: 'box', x: 57, y: 40, width: 38, height: 14, value: '', borderWidth: 0.5 },
    { id: 'olcu_label', type: 'text', x: 58, y: 41, width: 36, height: 4, value: 'ÖLÇÜ', fontSize: 2.5, fontWeight: 'bold' },
    { id: 'olcu_val', type: 'text', x: 58, y: 45, width: 36, height: 6, value: '{Olcu}', fontSize: 3.5 },

    // Row 3
    { id: 'box_adi', type: 'box', x: 5, y: 56, width: 90, height: 14, value: '', borderWidth: 0.5 },
    { id: 'adi_label', type: 'text', x: 6, y: 57, width: 88, height: 4, value: 'ÜRÜN ADI', fontSize: 2.5, fontWeight: 'bold' },
    { id: 'adi_val', type: 'text', x: 6, y: 61, width: 88, height: 8, value: '{Urun_adi}', fontSize: 3 },

    // Row 4
    { id: 'box_lot', type: 'box', x: 5, y: 72, width: 44, height: 10, value: '', borderWidth: 0.5 },
    { id: 'lot_label', type: 'text', x: 6, y: 73, width: 42, height: 3, value: 'PARTİ / LOT', fontSize: 2, fontWeight: 'bold' },
    { id: 'lot_val', type: 'text', x: 6, y: 76.5, width: 42, height: 5, value: '{Parti_Lot}', fontSize: 3 },

    { id: 'box_adet', type: 'box', x: 51, y: 72, width: 20, height: 10, value: '', borderWidth: 0.5 },
    { id: 'adet_label', type: 'text', x: 52, y: 73, width: 18, height: 3, value: 'ADET', fontSize: 2, fontWeight: 'bold' },
    { id: 'adet_val', type: 'text', x: 52, y: 76.5, width: 18, height: 5, value: '{Paket_ici_adet}', fontSize: 3 },

    { id: 'box_paket', type: 'box', x: 73, y: 72, width: 22, height: 10, value: '', borderWidth: 0.5 },
    { id: 'paket_label', type: 'text', x: 74, y: 73, width: 20, height: 3, value: 'PAKET NO', fontSize: 2, fontWeight: 'bold' },
    { id: 'paket_val', type: 'text', x: 74, y: 76.5, width: 20, height: 5, value: '{Paket_no}', fontSize: 3 },

    // Barcode Row
    { id: 'box_barkod', type: 'box', x: 5, y: 84, width: 90, height: 11, value: '', borderWidth: 0 },
    { id: 'barkod_val', type: 'barcode', x: 5, y: 84, width: 90, height: 12, value: '{SKU}' }
  ]
};

export const MINIMAL_TEMPLATE: LabelTemplate = {
  id: 'minimal',
  name: 'Minimal Etiket',
  width: 100,
  height: 100,
  elements: [
    { id: 'adi', type: 'text', x: 5, y: 10, width: 90, height: 15, value: '{Urun_adi}', fontSize: 5, fontWeight: 'bold', textAlign: 'center' },
    { id: 'barkod', type: 'barcode', x: 5, y: 35, width: 90, height: 40, value: '{SKU}' },
    { id: 'skutext', type: 'text', x: 5, y: 85, width: 90, height: 5, value: 'SKU: {SKU}', fontSize: 4, textAlign: 'center' },
    { id: 'olcu', type: 'text', x: 5, y: 25, width: 90, height: 6, value: '{Olcu}  |  {Malzeme}', fontSize: 3, textAlign: 'center' }
  ]
};

export const LARGE_BARCODE_TEMPLATE: LabelTemplate = {
  id: 'large_barcode',
  name: 'Büyük Barkodlu Depo Etiketi',
  width: 100,
  height: 100,
  elements: [
    { id: 'head', type: 'text', x: 5, y: 5, width: 60, height: 5, value: 'DEPO YERLEŞTİRME ETİKETİ', fontSize: 3.5, fontWeight: 'bold' },
    { id: 'lok', type: 'text', x: 65, y: 5, width: 30, height: 5, value: 'LOK: {Lokasyon}', fontSize: 3.5, fontWeight: 'black', textAlign: 'right' },
    { id: 'line1', type: 'line', x: 5, y: 12, width: 90, height: 0, value: '', borderWidth: 1 },
    
    { id: 'skutx', type: 'text', x: 5, y: 15, width: 90, height: 12, value: '{SKU}', fontSize: 7, fontWeight: 'black', textAlign: 'center' },
    
    { id: 'barkod', type: 'barcode', x: 5, y: 30, width: 90, height: 40, value: '{SKU}' },
    
    { id: 'line2', type: 'line', x: 5, y: 73, width: 90, height: 0, value: '', borderWidth: 1 },
    { id: 'namex', type: 'text', x: 5, y: 76, width: 70, height: 10, value: '{Urun_adi}', fontSize: 3 },
    { id: 'qr_s', type: 'qr', x: 77, y: 76, width: 18, height: 18, value: '{ALL_INFO}' }
  ]
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
    
    { id: 'ln1', type: 'line', x: 5, y: 54, width: 90, height: 0, value: '', borderWidth: 0.5 },
    { id: 'name', type: 'text', x: 5, y: 58, width: 90, height: 12, value: '{Urun_adi}', fontSize: 3.5, fontWeight: 'normal' },
    { id: 'bc', type: 'barcode', x: 5, y: 75, width: 90, height: 18, value: '{SKU}' }
  ]
};

export const RECEIVING_INSPECTION_TEMPLATE: LabelTemplate = {
  id: 'receiving_inspection',
  name: 'Gelen Ürün Kontrol Etiketi',
  width: 100,
  height: 100,
  elements: [
    { id: 't1', type: 'text', x: 5, y: 5, width: 90, height: 8, value: 'KALİTE KONTROL / KABUL', fontSize: 5, fontWeight: 'black', textAlign: 'center' },
    { id: 'b0', type: 'box', x: 5, y: 15, width: 90, height: 45, value: '', borderWidth: 0.5 },
    
    { id: 't2', type: 'text', x: 7, y: 17, width: 25, height: 5, value: 'Tarih:', fontSize: 3, fontWeight: 'bold' },
    { id: 'l1', type: 'line', x: 32, y: 21, width: 60, height: 0, value: '', borderWidth: 0.5 },
    
    { id: 't3', type: 'text', x: 7, y: 25, width: 25, height: 5, value: 'Kontrol Eden:', fontSize: 3, fontWeight: 'bold' },
    { id: 'l2', type: 'line', x: 32, y: 29, width: 60, height: 0, value: '', borderWidth: 0.5 },
    
    { id: 't4', type: 'text', x: 7, y: 33, width: 25, height: 5, value: 'Durum:', fontSize: 3, fontWeight: 'bold' },
    { id: 'boxKabul', type: 'box', x: 32, y: 32, width: 8, height: 8, value: '', borderWidth: 0.5 },
    { id: 'tKabul', type: 'text', x: 42, y: 34, width: 15, height: 5, value: 'Kabul', fontSize: 3 },
    { id: 'boxRet', type: 'box', x: 60, y: 32, width: 8, height: 8, value: '', borderWidth: 0.5 },
    { id: 'tRet', type: 'text', x: 70, y: 34, width: 15, height: 5, value: 'Ret', fontSize: 3 },
    
    { id: 't5', type: 'text', x: 7, y: 43, width: 25, height: 5, value: 'Notlar:', fontSize: 3, fontWeight: 'bold' },
    { id: 'l3', type: 'line', x: 32, y: 47, width: 60, height: 0, value: '', borderWidth: 0.5 },
    { id: 'l4', type: 'line', x: 32, y: 55, width: 60, height: 0, value: '', borderWidth: 0.5 },

    { id: 't6', type: 'text', x: 5, y: 64, width: 90, height: 6, value: 'SKU: {SKU}  |  Adet: {Paket_ici_adet}', fontSize: 3.5, fontWeight: 'bold' },
    { id: 'b', type: 'barcode', x: 5, y: 72, width: 90, height: 23, value: '{SKU}' }
  ]
};

export const TEMPLATES = [
  DEFAULT_TEMPLATE, 
  MINIMAL_TEMPLATE, 
  LARGE_BARCODE_TEMPLATE, 
  QR_TECHNICAL_TEMPLATE, 
  RECEIVING_INSPECTION_TEMPLATE
];
