// New identity contract; legacy template IDs/versions remain unchanged.
export const PACKAGE_IDENTITY_TEMPLATE = {
  id: 'dsdst-package-identity-100x150-v1', name: 'DSDST Paket Kimliği (100×150)',
  purpose: 'goods_receipt', isDefault: false, width: 100, height: 150,
  elements: [
    { id: 'title', type: 'text', x: 5, y: 5, width: 90, height: 8, value: 'DSDST PAKET', fontSize: 5, fontWeight: 'bold', textAlign: 'center' },
    { id: 'name', type: 'text', x: 5, y: 16, width: 90, height: 16, value: '{Urun_adi}', fontSize: 4, fontWeight: 'bold' },
    { id: 'sku', type: 'text', x: 5, y: 34, width: 90, height: 8, value: 'SKU: {SKU}', fontSize: 4, fontWeight: 'bold' },
    { id: 'supplier', type: 'text', x: 5, y: 44, width: 90, height: 7, value: 'Tedarik: {Supplier_no}', fontSize: 3 },
    { id: 'size', type: 'text', x: 5, y: 53, width: 90, height: 8, value: '{Olcu} · {Malzeme} · {Tip}', fontSize: 3 },
    { id: 'count', type: 'text', x: 5, y: 63, width: 90, height: 8, value: 'Adet: {Paket_ici_adet} · Lot: {Parti_Lot}', fontSize: 3.5, fontWeight: 'bold' },
    { id: 'purchase', type: 'text', x: 5, y: 74, width: 90, height: 8, value: 'Satın alma: {Satin_alma_no}', fontSize: 3 },
    { id: 'source', type: 'text', x: 5, y: 84, width: 90, height: 12, value: 'Kaynak koli: {Kaynak_koli}', fontSize: 2.5 },
    { id: 'barcode', type: 'barcode', x: 5, y: 104, width: 90, height: 29, value: '{Package_code}', showBarcodeText: false },
    { id: 'identity', type: 'text', x: 5, y: 136, width: 90, height: 9, value: '{Package_code}', fontSize: 2.5, textAlign: 'center' },
  ],
};
