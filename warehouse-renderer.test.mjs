import { PACKAGE_IDENTITY_TEMPLATE } from './package-identity-template.mjs';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createWarehouseRendererApp, LOCATION_LABEL_TEMPLATE, PACKAGE_LABEL_TEMPLATE, renderWarehouseLabelPdf, replaceWarehouseVariables } from './warehouse-renderer.mjs';
import { readTemplateState, writeTemplateState } from './template-store.mjs';

test('V2-14 locked label contracts use 100x150 SKU Code128 and 100x50 canonical location Code128', () => {
  assert.deepEqual([PACKAGE_LABEL_TEMPLATE.width, PACKAGE_LABEL_TEMPLATE.height], [100, 150]);
  assert.equal(PACKAGE_LABEL_TEMPLATE.purpose, 'goods_receipt');
  assert.equal(PACKAGE_LABEL_TEMPLATE.elements.find((item) => item.type === 'barcode')?.value, '{SKU}');
  assert.deepEqual([LOCATION_LABEL_TEMPLATE.width, LOCATION_LABEL_TEMPLATE.height], [100, 50]);
  assert.equal(LOCATION_LABEL_TEMPLATE.elements.find((item) => item.type === 'barcode')?.value, '{Lokasyon}');
});

test('renderer rejects KIT, product-package, and redesigned shipping labels', async () => {
  const server = createWarehouseRendererApp({ nodeEnv: 'test' }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  try {
    for (const purpose of ['kit', 'product_package', 'shipping']) {
      const response = await fetch(`http://127.0.0.1:${port}/api/v1/render`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ purpose, data: { SKU: 'SKU-1' } }),
      });
      assert.equal(response.status, 400);
    }
  } finally {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }
});

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

test('production renderer boş API key ile başlamayı reddeder', () => {
  assert.throws(
    () => createWarehouseRendererApp({ apiKey: '', nodeEnv: 'production' }),
    /LABEL_RENDERER_API_KEY is required/,
  );
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
  const locationTemplate = { id: 'legacy-location', name: 'Eski Raf', width: 100, height: 50, elements: [{ id: 'l', type: 'barcode', x: 0, y: 0, width: 90, height: 20, value: '{Lokasyon}' }] };
  await writeFile(stateFile, JSON.stringify({ version: 1, products: [{ sku: 'KEEP-ME' }], template: PACKAGE_LABEL_TEMPLATE, locationTemplate }));
  try {
    const migrated = await writeTemplateState(stateFile, await readTemplateState(stateFile));
    assert.equal(migrated.version, 3);
    assert.equal(migrated.products[0].sku, 'KEEP-ME');
    assert.equal(migrated.templates.find((item) => item.id === PACKAGE_LABEL_TEMPLATE.id).purpose, 'goods_receipt');
    assert.equal(migrated.templates.find((item) => item.id === 'legacy-location').purpose, 'location');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});


test('new 100x150 package identity contract renders before receipt and preserves legacy/location versions', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'label-identity-test-'));
  const stateFile = path.join(directory, 'state.json');
  await writeFile(stateFile, JSON.stringify({ version: 3, revision: 0, templates: [PACKAGE_LABEL_TEMPLATE, LOCATION_LABEL_TEMPLATE] }));
  const before = await readTemplateState(stateFile);
  const server = createWarehouseRendererApp({ stateFile, apiKey: 'fixture', nodeEnv: 'test' }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const response = await fetch(`${base}/api/v1/templates/default?purpose=goods_receipt&contract=package_identity`, { headers: { 'x-api-key': 'fixture' } });
    assert.equal(response.status, 200);
    const template = await response.json();
    assert.equal(template.id, PACKAGE_IDENTITY_TEMPLATE.id);
    assert.deepEqual([template.width, template.height], [100,150]);
    assert.equal(template.elements.find(e => e.type === 'barcode').value, '{Package_code}');
    const data = { Package_code: 'PKG-SYNTHETIC-0001', SKU: 'SKU-1', Supplier_no: 'SUP-1', Urun_adi: 'Fixture', Olcu: '25 mm', Parti_Lot: 'LOT-1', Paket_ici_adet: '29', Satin_alma_no: 'PO-1', Kaynak_koli: 'CARTON-1' };
    assert.equal(replaceWarehouseVariables('{Package_code}|{SKU}|{Supplier_no}|{Paket_ici_adet}|{Parti_Lot}|{Satin_alma_no}|{Kaynak_koli}', data), 'PKG-SYNTHETIC-0001|SKU-1|SUP-1|29|LOT-1|PO-1|CARTON-1');
    await assert.rejects(() => renderWarehouseLabelPdf({ template, data: { SKU: 'SKU-NOT-PACKAGE-ID' } }), /Barkod değeri boş/);
    const first = await renderWarehouseLabelPdf({ template, data });
    const second = await renderWarehouseLabelPdf({ template, data });
    assert.deepEqual(first, second);
    assert.match(first.toString('latin1'), /283\.464.*425\.196/);
    const rendered = await fetch(`${base}/api/v1/render`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': 'fixture' }, body: JSON.stringify({ purpose: 'goods_receipt', contract: 'package_identity', data }) });
    assert.equal(rendered.status, 200);
    assert.equal(rendered.headers.get('x-label-template-id'), template.id);
    assert.deepEqual(await readTemplateState(stateFile), before);
    const saved = await writeTemplateState(stateFile, { ...before, templates: [...before.templates, template] }, [], { expectedRevision: 0 });
    assert.equal(saved.templates.find(t => t.id === PACKAGE_LABEL_TEMPLATE.id).contentHash, before.templates.find(t => t.id === PACKAGE_LABEL_TEMPLATE.id).contentHash);
    assert.equal(saved.templates.find(t => t.id === LOCATION_LABEL_TEMPLATE.id).contentHash, before.templates.find(t => t.id === LOCATION_LABEL_TEMPLATE.id).contentHash);
    const outcomes = await Promise.allSettled([1,2].map(n => writeTemplateState(stateFile, { ...saved, templates: saved.templates.map(t => t.id === template.id ? { ...t, name: `Changed ${n}` } : t) }, [], { expectedRevision: saved.revision })));
    assert.equal(outcomes.filter(o => o.status === 'fulfilled').length, 1);
    assert.equal(outcomes.filter(o => o.status === 'rejected').length, 1);
  } finally { server.closeAllConnections?.(); await new Promise(resolve => server.close(resolve)); await rm(directory, { recursive: true, force: true }); }
});
