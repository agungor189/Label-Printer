import assert from 'node:assert/strict';
import test from 'node:test';
import { replaceVariables, resolveBarcodeValue } from './labelRenderer';
import type { ProductData } from './types';
import { PACKAGE_IDENTITY_TEMPLATE } from '../../package-identity-template.mjs';

test('editor/export and renderer share the 100x150 package barcode and source fields', () => {
  const product = { sku: 'SKU-1', packageCode: 'PKG-1', purchaseNumber: 'PO-1', sourceCarton: 'CARTON-1' } as ProductData;
  assert.equal(resolveBarcodeValue('{Package_code}', product), 'PKG-1');
  assert.equal(resolveBarcodeValue('{Package_code}', { ...product, packageCode: '' }), '');
  assert.equal(resolveBarcodeValue('{SKU}', product), 'SKU-1');
  assert.equal(replaceVariables('{Satin_alma_no}|{Kaynak_koli}', product), 'PO-1|CARTON-1');
  assert.deepEqual([PACKAGE_IDENTITY_TEMPLATE.width, PACKAGE_IDENTITY_TEMPLATE.height], [100,150]);
  assert.equal(PACKAGE_IDENTITY_TEMPLATE.elements.find(e => e.type === 'barcode')!.value, '{Package_code}');
});
