import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createWarehouseRendererApp, PACKAGE_LABEL_TEMPLATE, renderWarehouseLabelPdf, replaceWarehouseVariables } from './warehouse-renderer.mjs';
import { readTemplateState, writeTemplateState } from './template-store.mjs';

test('paket değişkenlerini aynı şablon modeliyle doldurur', () => {
  assert.equal(replaceWarehouseVariables('{Package_code} · {SKU} · {Supplier_no} · {Paket_no}/{Toplam_paket}', {
    packageCode: 'PKG-2609-000001', sku: 'SKU-1', supplierNo: 'SUP-1', paketNo: '1', toplamPaket: '4',
  }), 'PKG-2609-000001 · SKU-1 · SUP-1 · 1/4');
});

test('Warehouse snake/capital alanlarını doğrudan dinamik alanlara map eder', () => {
  assert.equal(replaceWarehouseVariables('{SKU}|{Malzeme}|{Paket_no}|{Kutu_agirligi}', {
    SKU: 'PCI-R100-ELB', Malzeme: 'Alüminyum', Paket_no: '1 / 4', Kutu_agirligi: '9.55 kg',
  }), 'PCI-R100-ELB|Alüminyum|1 / 4|9.55 kg');
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

test('purpose API diskteki son kaydedilmiş varsayılan şablonu deploy gerektirmeden kullanır', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'label-printer-test-'));
  const stateFile = path.join(directory, 'state.json');
  await writeFile(stateFile, JSON.stringify({
    version: 2,
    templates: [{ ...PACKAGE_LABEL_TEMPLATE, id: 'live-receipt', name: 'Canlı Mal Kabul', isDefault: true }],
  }));
  const server = createWarehouseRendererApp({ stateFile, apiKey: 'test-key' }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    const address = server.address();
    const base = `http://127.0.0.1:${address.port}`;
    const templateResponse = await fetch(`${base}/api/v1/templates/default?purpose=goods_receipt`, { headers: { 'x-api-key': 'test-key' } });
    assert.equal(templateResponse.status, 200);
    assert.equal((await templateResponse.json()).id, 'live-receipt');
    const pdfResponse = await fetch(`${base}/api/v1/render`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': 'test-key' },
      body: JSON.stringify({ purpose: 'goods_receipt', data: { SKU: 'SKU-1' } }),
    });
    assert.equal(pdfResponse.status, 200);
    assert.equal(pdfResponse.headers.get('x-label-template-id'), 'live-receipt');
    assert.equal(Buffer.from(await pdfResponse.arrayBuffer()).subarray(0, 4).toString(), '%PDF');
  } finally {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
    await rm(directory, { recursive: true, force: true });
  }
});

test('v1 state migration ürünleri silmeden template ve locationTemplate alanlarını purpose kayıtlarına taşır', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'label-printer-migration-'));
  const stateFile = path.join(directory, 'state.json');
  const locationTemplate = { id: 'legacy-location', name: 'Eski Raf', width: 100, height: 50, elements: [{ id: 'l', type: 'text', x: 0, y: 0, width: 10, height: 5, value: '{Lokasyon}' }] };
  await writeFile(stateFile, JSON.stringify({ version: 1, products: [{ sku: 'KEEP-ME' }], template: PACKAGE_LABEL_TEMPLATE, locationTemplate }));
  try {
    const migrated = await writeTemplateState(stateFile, await readTemplateState(stateFile));
    assert.equal(migrated.version, 2);
    assert.equal(migrated.products[0].sku, 'KEEP-ME');
    assert.equal(migrated.templates.find((item) => item.id === PACKAGE_LABEL_TEMPLATE.id).purpose, 'goods_receipt');
    assert.equal(migrated.templates.find((item) => item.id === 'legacy-location').purpose, 'location');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
