import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { readTemplateState, writeTemplateState } from './template-store.mjs';

test('fresh template store is an exact empty v3 baseline with immutable template versions', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'label-schema-baseline-'));
  const stateFile = path.join(directory, 'app-state.json');
  try {
    assert.deepEqual(await readTemplateState(stateFile), {
      version: 3,
      revision: 0,
      products: [],
      settings: null,
      template: null,
      locationTemplate: null,
      templates: [],
      templateVersions: [],
      updatedAt: null,
    });
    const first = await writeTemplateState(stateFile, {});
    const second = await writeTemplateState(stateFile, first);
    assert.equal(first.version, 3);
    assert.equal(second.version, 3);
    assert.deepEqual(second.products, []);
    assert.deepEqual(second.templates, []);
    assert.equal(second.template, null);
    assert.equal(second.locationTemplate, null);
    assert.deepEqual(Object.keys(JSON.parse(await readFile(stateFile, 'utf8'))).sort(), [
      'locationTemplate', 'products', 'revision', 'settings', 'template', 'templateVersions', 'templates', 'updatedAt', 'version',
    ]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('existing corrupt or unsupported state fails closed while a missing file bootstraps empty', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'label-state-invalid-'));
  const stateFile = path.join(directory, 'app-state.json');
  try {
    assert.equal((await readTemplateState(stateFile)).version, 3);

    await writeFile(stateFile, '{not-json', 'utf8');
    await assert.rejects(() => readTemplateState(stateFile), /malformed|JSON/i);

    for (const version of [0, 999]) {
      await writeFile(stateFile, JSON.stringify({ version, products: [{ sku: 'MUST-NOT-DROP' }] }), 'utf8');
      await assert.rejects(() => readTemplateState(stateFile), new RegExp(`unsupported.*${version}`, 'i'));
      await assert.rejects(() => writeTemplateState(stateFile, { version: 3 }), new RegExp(`unsupported.*${version}`, 'i'));
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('template edits create new immutable versions while historical content stays unchanged', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'label-template-versions-'));
  const stateFile = path.join(directory, 'app-state.json');
  const v1 = { id: 'receipt', name: 'Receipt v1', purpose: 'goods_receipt', isDefault: true, width: 100, height: 150,
    elements: [{ id: 'barcode', type: 'barcode', value: '{SKU}', x: 5, y: 100, width: 90, height: 30 }] };
  try {
    const first = await writeTemplateState(stateFile, { templates: [v1], template: v1 }, [], { expectedRevision: 0 });
    const v2 = { ...v1, name: 'Receipt v2' };
    const second = await writeTemplateState(stateFile, { ...first, templates: [v2], template: v2 }, [], { expectedRevision: first.revision });
    assert.equal(second.templates[0].version, 2);
    assert.equal(second.templateVersions.length, 2);
    assert.equal(second.templateVersions.find((item) => item.version === 1).name, 'Receipt v1');
    assert.equal(second.templateVersions.find((item) => item.version === 2).name, 'Receipt v2');
    await assert.rejects(() => writeTemplateState(stateFile, { ...second, templates: [{ ...v2, height: 100 }] }, [], { expectedRevision: second.revision }),
      /100x150.*Code128.*\{SKU\}/i);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
