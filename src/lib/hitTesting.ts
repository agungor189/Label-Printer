import { LabelElement } from './types';

export interface Point { x: number; y: number; } // mm

export function pointInRect(p: Point, r: LabelElement): boolean {
  return p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height;
}

export function pointNearRectBorder(p: Point, r: LabelElement, tolerance = 1.5): boolean {
  if (!pointInRect(p, { ...r, x: r.x - tolerance, y: r.y - tolerance, width: r.width + 2 * tolerance, height: r.height + 2 * tolerance } as LabelElement)) {
    return false;
  }
  const innerLeft   = p.x > r.x + tolerance;
  const innerRight  = p.x < r.x + r.width - tolerance;
  const innerTop    = p.y > r.y + tolerance;
  const innerBottom = p.y < r.y + r.height - tolerance;
  // If point is strictly inside on all sides, it's in the hollow interior, not on the border
  return !(innerLeft && innerRight && innerTop && innerBottom);
}

export function pointNearLine(p: Point, el: LabelElement, tolerance = 1): boolean {
  // Lines are stored as thin rects. Use bounding box expanded by tolerance.
  const horizontal = el.width >= el.height;
  if (horizontal) {
    return p.x >= el.x - tolerance && p.x <= el.x + el.width + tolerance
        && p.y >= el.y - tolerance && p.y <= el.y + el.height + tolerance;
  }
  return p.x >= el.x - tolerance && p.x <= el.x + el.width + tolerance
      && p.y >= el.y - tolerance && p.y <= el.y + el.height + tolerance;
}

/**
 * Strict hit test — respects element type semantics.
 * - text / qr / barcode / logo : entire bbox
 * - line : near the line, tolerance ~1 mm
 * - box  : interior only if fill (or fillColor) set; otherwise border only
 * - selectable === false : never hits
 */
export function hitTestElement(el: LabelElement, p: Point, strict: boolean): boolean {
  if (el.visible === false) return false;
  if (el.selectable === false) return false;

  if (!strict) {
    return pointInRect(p, el);
  }

  switch (el.type) {
    case 'text':
    case 'logo':
    case 'qr':
    case 'barcode':
      return pointInRect(p, el);
    case 'line':
      return pointNearLine(p, el, 1);
    case 'box':
      if (el.fill === true || !!el.fillColor) return pointInRect(p, el);
      return pointNearRectBorder(p, el, 1.5);
    default:
      return pointInRect(p, el);
  }
}

/**
 * Topmost element under the point. Elements later in the array are drawn
 * on top, so we iterate in reverse.
 */
export function findElementAtPoint(elements: LabelElement[], p: Point, strict: boolean): LabelElement | null {
  for (let i = elements.length - 1; i >= 0; i--) {
    if (hitTestElement(elements[i], p, strict)) return elements[i];
  }
  return null;
}

/** Rect-vs-rect intersection used by marquee selection. */
export function rectsIntersect(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }): boolean {
  return a.x + a.width >= b.x && a.x <= b.x + b.width && a.y + a.height >= b.y && a.y <= b.y + b.height;
}
