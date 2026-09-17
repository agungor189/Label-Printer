import assert from 'node:assert/strict';
import test from 'node:test';
import { generateLocationCodes, generateShelfLocationCodes, groupLocationCodes, LOCATION_LABEL_WIDTHS, LOCATION_SHELVES, sanitizeLocationLabelTemplate } from './locationLabels';
import { DEFAULT_LOCATION_TEMPLATE } from './templates';

test('14 raf, 4 kat ve 7 pozisyon için 392 lokasyon üretir', () => {
  const codes = generateLocationCodes();

  assert.equal(codes.length, 392);
  assert.deepEqual(LOCATION_SHELVES, ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2', 'E1', 'E2', 'F1', 'F2', 'G1', 'G2']);
  assert.equal(codes[0], 'A1-K1-P1');
  assert.equal(codes[27], 'A1-K4-P7');
  assert.equal(codes[28], 'A2-K1-P1');
  assert.equal(codes.at(-1), 'G2-K4-P7');
  assert.equal(new Set(codes).size, codes.length);
});

test('her raf için K1-P1 ile K4-P7 arasında 28 lokasyon üretir', () => {
  for (const shelf of LOCATION_SHELVES) {
    const codes = generateShelfLocationCodes(shelf);
    assert.equal(codes.length, 28);
    assert.equal(codes[0], `${shelf}-K1-P1`);
    assert.equal(codes.at(-1), `${shelf}-K4-P7`);
  }
});

test('lokasyonları iki yarımlı fiziksel etiketlere böler', () => {
  assert.deepEqual(
    groupLocationCodes(['A1-K1-P1', 'A1-K1-P2', 'A1-K1-P3']),
    [
      ['A1-K1-P1', 'A1-K1-P2'],
      ['A1-K1-P3', undefined],
    ],
  );
});

test('desteklenen fiziksel etiket genişliklerini milimetre olarak tanımlar', () => {
  assert.equal(LOCATION_LABEL_WIDTHS['100x100'], 100);
  assert.equal(LOCATION_LABEL_WIDTHS['150x100'], 150);
});

test('lokasyon tasarımını ürün etiketi özelliklerinden ayrı tutar', () => {
  const mixedTemplate = {
    ...DEFAULT_LOCATION_TEMPLATE,
    elements: [
      ...DEFAULT_LOCATION_TEMPLATE.elements,
      { id: 'qr', type: 'qr' as const, x: 1, y: 1, width: 10, height: 10, value: '{ALL_INFO}' },
      { id: 'extra', type: 'barcode' as const, x: 8, y: 20, width: 84, height: 20, value: '{Lokasyon}', showBarcodeText: true },
    ],
  };

  const safe = sanitizeLocationLabelTemplate(mixedTemplate);
  assert.equal(safe.width, 100);
  assert.equal(safe.height, 50);
  assert.equal(safe.elements.some(element => element.type === 'qr'), false);
  assert.equal(safe.elements.filter(element => element.type === 'barcode').every(element => element.showBarcodeText === false), true);
});
