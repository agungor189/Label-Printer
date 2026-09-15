import assert from 'node:assert/strict';
import test from 'node:test';
import { PACKAGE_LABEL_TEMPLATE, renderWarehouseLabelPdf, replaceWarehouseVariables } from './warehouse-renderer.mjs';

test('paket değişkenlerini aynı şablon modeliyle doldurur', () => {
  assert.equal(replaceWarehouseVariables('{Package_code} · {SKU} · {Supplier_no} · {Paket_no}/{Toplam_paket}', {
    packageCode: 'PKG-2609-000001', sku: 'SKU-1', supplierNo: 'SUP-1', paketNo: '1', toplamPaket: '4',
  }), 'PKG-2609-000001 · SKU-1 · SUP-1 · 1/4');
});

test('headless renderer geçerli PDF üretir', async () => {
  const result = await renderWarehouseLabelPdf({
    template: PACKAGE_LABEL_TEMPLATE,
    product: {
      packageCode: 'PKG-2609-000001', sku: 'SKU-1', urunAdi: 'Test ürün',
      supplierNo: 'SUP-1', olcu: '25 mm', kutuAgirligi: '10', partiLot: 'LOT-9', paketIciAdet: '20', paketNo: '1', toplamPaket: '4',
    },
  });
  assert.ok(result.length > 1000);
  assert.equal(result.subarray(0, 4).toString(), '%PDF');
});
