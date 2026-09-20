import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { readTemplateState, writeTemplateState } from './template-store.mjs';

test('fresh template store is an exact empty v2 baseline and repeat writes create no business rows', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'label-schema-baseline-'));
  const stateFile = path.join(directory, 'app-state.json');
  try {
    assert.deepEqual(await readTemplateState(stateFile), {
      version: 2,
      products: [],
      settings: null,
      template: null,
      locationTemplate: null,
      templates: [],
      updatedAt: null,
    });
    const first = await writeTemplateState(stateFile, {});
    const second = await writeTemplateState(stateFile, first);
    assert.equal(first.version, 2);
    assert.equal(second.version, 2);
    assert.deepEqual(second.products, []);
    assert.deepEqual(second.templates, []);
    assert.equal(second.template, null);
    assert.equal(second.locationTemplate, null);
    assert.deepEqual(Object.keys(JSON.parse(await readFile(stateFile, 'utf8'))).sort(), [
      'locationTemplate', 'products', 'settings', 'template', 'templates', 'updatedAt', 'version',
    ]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('existing corrupt or unsupported state fails closed while a missing file bootstraps empty', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'label-state-invalid-'));
  const stateFile = path.join(directory, 'app-state.json');
  try {
    assert.equal((await readTemplateState(stateFile)).version, 2);

    await writeFile(stateFile, '{not-json', 'utf8');
    await assert.rejects(() => readTemplateState(stateFile), /malformed|JSON/i);

    for (const version of [0, 3, 999]) {
      await writeFile(stateFile, JSON.stringify({ version, products: [{ sku: 'MUST-NOT-DROP' }] }), 'utf8');
      await assert.rejects(() => readTemplateState(stateFile), new RegExp(`unsupported.*${version}`, 'i'));
      await assert.rejects(() => writeTemplateState(stateFile, { version: 2 }), new RegExp(`unsupported.*${version}`, 'i'));
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
