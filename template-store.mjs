import fs from 'node:fs/promises';
import path from 'node:path';

export const TEMPLATE_PURPOSES = [
  'goods_receipt',
  'location',
  'product_package',
  'kit',
  'shipping',
  'custom',
];

export const isTemplatePurpose = (value) => TEMPLATE_PURPOSES.includes(String(value || ''));

const clone = (value) => JSON.parse(JSON.stringify(value));

export function normalizeStoredTemplate(template, fallbackPurpose = 'custom') {
  if (!template || typeof template !== 'object' || !Array.isArray(template.elements)) return null;
  const purpose = isTemplatePurpose(template.purpose) ? template.purpose : fallbackPurpose;
  return {
    ...clone(template),
    id: String(template.id || `${purpose}-template`).slice(0, 100),
    name: String(template.name || 'Etiket Şablonu').slice(0, 160),
    purpose,
    isDefault: template.isDefault !== false,
  };
}

function mergeTemplates(parsed, fallbacks = []) {
  const byId = new Map();
  const add = (template, purpose) => {
    const normalized = normalizeStoredTemplate(template, purpose);
    if (!normalized) return;
    if (normalized.isDefault) {
      for (const [id, existing] of byId) {
        if (existing.purpose === normalized.purpose && id !== normalized.id) {
          byId.set(id, { ...existing, isDefault: false });
        }
      }
    }
    byId.set(normalized.id, normalized);
  };

  for (const fallback of fallbacks) add(fallback, fallback?.purpose);
  for (const template of Array.isArray(parsed?.templates) ? parsed.templates : []) add(template, template?.purpose);

  // Safe v1 migration: the old single active designs become the defaults for
  // their purposes. Nothing is deleted and unknown template records survive.
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
  const templates = mergeTemplates(parsed, fallbacks);
  const defaultFor = (purpose) => templates.find((template) => template.purpose === purpose && template.isDefault) || null;
  return {
    version: 2,
    products: Array.isArray(parsed.products) ? parsed.products : [],
    settings: parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : null,
    template: defaultFor('goods_receipt'),
    locationTemplate: defaultFor('location'),
    templates,
    updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
  };
}

export async function readTemplateState(stateFile, fallbacks = []) {
  try {
    const parsed = JSON.parse(await fs.readFile(stateFile, 'utf8'));
    return normalizeState(parsed, fallbacks);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    return normalizeState({}, fallbacks);
  }
}

export async function writeTemplateState(stateFile, nextState, fallbacks = []) {
  const current = await readTemplateState(stateFile, fallbacks);
  const incomingDefaults = [
    normalizeStoredTemplate(nextState?.template, 'goods_receipt'),
    normalizeStoredTemplate(nextState?.locationTemplate, 'location'),
  ].filter(Boolean).map((template) => ({ ...template, isDefault: true }));
  const incomingPurposes = new Set(incomingDefaults.map((template) => template.purpose));
  const merged = normalizeState({
    ...current,
    ...nextState,
    templates: [
      ...current.templates.map((template) => incomingPurposes.has(template.purpose) ? { ...template, isDefault: false } : template),
      ...(Array.isArray(nextState?.templates) ? nextState.templates : []),
      ...incomingDefaults,
    ],
    updatedAt: new Date().toISOString(),
  }, fallbacks);
  await fs.mkdir(path.dirname(stateFile), { recursive: true });
  const tmpFile = `${stateFile}.tmp`;
  await fs.writeFile(tmpFile, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
  await fs.rename(tmpFile, stateFile);
  return merged;
}

export function listTemplates(state, purpose) {
  return state.templates.filter((template) => !purpose || template.purpose === purpose);
}

export function findDefaultTemplate(state, purpose) {
  return state.templates.find((template) => template.purpose === purpose && template.isDefault)
    || state.templates.find((template) => template.purpose === purpose)
    || null;
}
