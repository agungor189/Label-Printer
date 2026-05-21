import { DEFAULT_TEMPLATE } from './templates';
import { ElementType, LabelElement, LabelTemplate } from './types';

const ELEMENT_TYPES: ElementType[] = ['text', 'barcode', 'qr', 'line', 'box', 'logo'];

function cloneTemplate(template: LabelTemplate): LabelTemplate {
  return {
    ...template,
    elements: template.elements.map(element => ({ ...element })),
  };
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function sanitizeElement(element: unknown, index: number): LabelElement | null {
  if (!element || typeof element !== 'object') return null;

  const raw = element as Partial<LabelElement>;
  if (!raw.type || !ELEMENT_TYPES.includes(raw.type)) return null;

  return {
    ...raw,
    id: stringOr(raw.id, `element-${index + 1}`),
    type: raw.type,
    x: numberOr(raw.x, 0),
    y: numberOr(raw.y, 0),
    width: Math.max(raw.type === 'line' ? 0.1 : 1, numberOr(raw.width, raw.type === 'qr' ? 20 : 40)),
    height: Math.max(raw.type === 'line' ? 0.1 : 1, numberOr(raw.height, raw.type === 'qr' ? 20 : 8)),
    value: stringOr(raw.value, ''),
  };
}

export function sanitizeLabelTemplate(template: unknown, fallback: LabelTemplate = DEFAULT_TEMPLATE): LabelTemplate {
  if (!template || typeof template !== 'object') {
    return cloneTemplate(fallback);
  }

  const raw = template as Partial<LabelTemplate>;
  const fallbackTemplate = cloneTemplate(fallback);
  const sourceElements = Array.isArray(raw.elements) ? raw.elements : fallbackTemplate.elements;
  const elements = sourceElements
    .map((element, index) => sanitizeElement(element, index))
    .filter((element): element is LabelElement => Boolean(element));

  return {
    id: stringOr(raw.id, fallbackTemplate.id),
    name: stringOr(raw.name, fallbackTemplate.name),
    width: Math.max(10, numberOr(raw.width, fallbackTemplate.width)),
    height: Math.max(10, numberOr(raw.height, fallbackTemplate.height)),
    elements,
  };
}
