import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export const TEMPLATE_PURPOSES = ['goods_receipt', 'location', 'custom'];
export const isTemplatePurpose = (value) => TEMPLATE_PURPOSES.includes(String(value || ''));

const clone = (value) => JSON.parse(JSON.stringify(value));
const writes = new Map();
const stateError = (message, code = 'LABEL_STATE_INVALID', statusCode = 409, cause) => Object.assign(new Error(message, { cause }), {
  code, statusCode, publicMessage: message,
});
const stableJson = (value) => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
};
const templateContent = (template) => ({
  id: String(template.id), name: String(template.name), purpose: String(template.purpose),
  width: Number(template.width), height: Number(template.height), elements: clone(template.elements),
});
export const templateContentHash = (template) => createHash('sha256').update(stableJson(templateContent(template))).digest('hex');

export function assertWarehouseTemplateContract(template) {
  const purpose = String(template?.purpose || '');
  if (!['goods_receipt', 'location'].includes(purpose)) return;
  const expected = purpose === 'goods_receipt'
    ? { width: 100, height: 150, barcode: '{SKU}' }
    : { width: 100, height: 50, barcode: '{Lokasyon}' };
  const barcodes = Array.isArray(template?.elements) ? template.elements.filter((element) => element?.type === 'barcode') : [];
  if (Number(template?.width) !== expected.width || Number(template?.height) !== expected.height
    || barcodes.length !== 1 || !(purpose === 'goods_receipt' ? ['{SKU}', '{Package_code}'] : [expected.barcode]).includes(barcodes[0]?.value)) {
    throw stateError(`${purpose} template must be ${expected.width}x${expected.height} mm with one Code128 ${expected.barcode} barcode.`, 'TEMPLATE_CONTRACT_MISMATCH', 400);
  }
}

export function normalizeStoredTemplate(template, fallbackPurpose = 'custom') {
  if (!template || typeof template !== 'object' || !Array.isArray(template.elements)) return null;
  const purpose = isTemplatePurpose(template.purpose) ? template.purpose : fallbackPurpose;
  if (!isTemplatePurpose(purpose)) return null;
  const normalized = {
    ...clone(template), id: String(template.id || `${purpose}-template`).slice(0, 100),
    name: String(template.name || 'Etiket Şablonu').slice(0, 160), purpose,
    isDefault: template.isDefault !== false, version: Math.max(1, Math.trunc(Number(template.version) || 1)),
  };
  normalized.contentHash = templateContentHash(normalized);
  return normalized;
}

function mergeTemplates(parsed, fallbacks = []) {
  const byId = new Map();
  const add = (template, purpose) => {
    const normalized = normalizeStoredTemplate(template, purpose);
    if (!normalized) return;
    if (normalized.isDefault) for (const [id, existing] of byId) {
      if (existing.purpose === normalized.purpose && id !== normalized.id) byId.set(id, { ...existing, isDefault: false });
    }
    byId.set(normalized.id, normalized);
  };
  for (const fallback of fallbacks) add(fallback, fallback?.purpose);
  for (const template of Array.isArray(parsed?.templates) ? parsed.templates : []) add(template, template?.purpose);
  add(parsed?.template, 'goods_receipt');
  add(parsed?.locationTemplate, 'location');
  const templates = [...byId.values()];
  for (const purpose of TEMPLATE_PURPOSES) {
    const matching = templates.filter((template) => template.purpose === purpose);
    if (!matching.length) continue;
    const selected = matching.find((template) => template.isDefault) || matching[0];
    for (const template of matching) template.isDefault = template.id === selected.id;
  }
  return templates;
}

export function normalizeState(parsed = {}, fallbacks = []) {
  const sourceVersion = Number(parsed?.version);
  if (![1, 2, 3].includes(sourceVersion)) throw stateError(`Unsupported label state version: ${String(parsed?.version ?? 'missing')}`);
  const templates = mergeTemplates(parsed, fallbacks);
  const versions = new Map();
  for (const item of Array.isArray(parsed?.templateVersions) ? parsed.templateVersions : []) {
    const normalized = normalizeStoredTemplate(item, item?.purpose);
    if (normalized) versions.set(`${normalized.id}:${normalized.version}`, normalized);
  }
  for (const template of templates) versions.set(`${template.id}:${template.version}`, clone(template));
  const defaultFor = (purpose) => templates.find((template) => template.purpose === purpose && template.isDefault) || null;
  return {
    version: 3, revision: sourceVersion === 3 ? Math.max(0, Math.trunc(Number(parsed.revision) || 0)) : 0,
    products: Array.isArray(parsed.products) ? parsed.products : [],
    settings: parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : null,
    template: defaultFor('goods_receipt'), locationTemplate: defaultFor('location'), templates,
    templateVersions: [...versions.values()].sort((a, b) => a.id.localeCompare(b.id) || a.version - b.version),
    updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
  };
}

export async function readTemplateState(stateFile, fallbacks = []) {
  try {
    const raw = await fs.readFile(stateFile, 'utf8');
    try { return normalizeState(JSON.parse(raw), fallbacks); }
    catch (error) {
      if (error?.code === 'LABEL_STATE_INVALID') throw error;
      throw stateError('Malformed label state JSON.', 'LABEL_STATE_INVALID', 409, error);
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    return normalizeState({ version: 3, revision: 0 }, fallbacks);
  }
}

async function commitTemplateState(stateFile, nextState, fallbacks, expectedRevision) {
  const current = await readTemplateState(stateFile, fallbacks);
  if (expectedRevision !== undefined && expectedRevision !== current.revision) {
    throw stateError(`Template state revision conflict: expected ${expectedRevision}, current ${current.revision}.`, 'TEMPLATE_REVISION_CONFLICT', 409);
  }
  const incomingDefaults = [normalizeStoredTemplate(nextState?.template, 'goods_receipt'), normalizeStoredTemplate(nextState?.locationTemplate, 'location')]
    .filter(Boolean).map((template) => ({ ...template, isDefault: true }));
  const requested = Array.isArray(nextState?.templates) ? nextState.templates : current.templates;
  for (const template of [...requested, ...incomingDefaults]) assertWarehouseTemplateContract(template);
  const incoming = mergeTemplates({ templates: [...requested, ...incomingDefaults] }, fallbacks);
  const currentById = new Map(current.templates.map((template) => [template.id, template]));
  const templates = incoming.map((template) => {
    const prior = currentById.get(template.id);
    const version = prior && prior.contentHash === template.contentHash ? prior.version : (prior?.version || 0) + 1;
    return { ...template, version };
  });
  const templateVersions = new Map(current.templateVersions.map((item) => [`${item.id}:${item.version}`, item]));
  for (const template of templates) templateVersions.set(`${template.id}:${template.version}`, clone(template));
  const defaultFor = (purpose) => templates.find((template) => template.purpose === purpose && template.isDefault) || null;
  const merged = {
    version: 3, revision: current.revision + 1,
    products: Array.isArray(nextState?.products) ? nextState.products : current.products,
    settings: nextState?.settings && typeof nextState.settings === 'object' ? nextState.settings : current.settings,
    template: defaultFor('goods_receipt'), locationTemplate: defaultFor('location'), templates,
    templateVersions: [...templateVersions.values()].sort((a, b) => a.id.localeCompare(b.id) || a.version - b.version),
    updatedAt: new Date().toISOString(),
  };
  await fs.mkdir(path.dirname(stateFile), { recursive: true });
  const tmpFile = `${stateFile}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmpFile, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
  await fs.rename(tmpFile, stateFile);
  return merged;
}

export function writeTemplateState(stateFile, nextState, fallbacks = [], options = {}) {
  const previous = writes.get(stateFile) || Promise.resolve();
  const pending = previous.then(() => commitTemplateState(stateFile, nextState, fallbacks, options.expectedRevision));
  writes.set(stateFile, pending.catch(() => undefined));
  return pending;
}

export function listTemplates(state, purpose) { return state.templates.filter((template) => !purpose || template.purpose === purpose); }
export function findDefaultTemplate(state, purpose) {
  return state.templates.find((template) => template.purpose === purpose && template.isDefault)
    || state.templates.find((template) => template.purpose === purpose) || null;
}
export function findTemplateVersion(state, id, version, contentHash) {
  return state.templateVersions.find((template) => template.id === id && template.version === Number(version) && template.contentHash === contentHash) || null;
}
