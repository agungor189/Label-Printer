import React from 'react';
import Barcode from 'react-barcode';
import QRCode from 'react-qr-code';
import { LabelElement, LabelTemplate, ProductData, LabelSettings } from '../../lib/types';
import { QR_PREVIEW_QUIET_ZONE_RATIO, replaceVariables, resolveQrValue } from '../../lib/labelRenderer';
import { sanitizeLabelTemplate } from '../../lib/templateSafety';

interface Props {
  template: LabelTemplate;
  product: ProductData;
  settings: LabelSettings;
  /** Render width in CSS px. Height derives from template aspect ratio. */
  widthPx?: number;
  /** If true, render at exact 100x100mm using CSS mm units (for print-friendly use). */
  printMm?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Unified renderer used by:
 *   - the designer's right-panel live preview
 *   - the Preview & Export page
 *
 * It walks `template.elements` and positions each visible object with
 * absolute px coordinates derived from mm × scale. The same JSON that
 * drives the canvas and the PDF drives this view — no hard-coded layout.
 */
function LabelPreviewRendererBase({ template, product, settings, widthPx = 300, printMm = false, className, style }: Props) {
  const safeTemplate = sanitizeLabelTemplate(template);
  const scale = printMm ? 1 : widthPx / safeTemplate.width;
  const containerStyle: React.CSSProperties = printMm
    ? { width: `${safeTemplate.width}mm`, height: `${safeTemplate.height}mm`, position: 'relative', background: 'white', overflow: 'hidden', boxSizing: 'border-box' }
    : { width: `${safeTemplate.width * scale}px`, height: `${safeTemplate.height * scale}px`, position: 'relative', background: 'white', overflow: 'hidden', boxSizing: 'border-box' };

  return (
    <div className={className} style={{ ...containerStyle, ...style }}>
      {safeTemplate.elements.map(el => (
        <ObjectRenderer
          key={el.id}
          el={el}
          product={product}
          settings={settings}
          scale={scale}
          printMm={printMm}
        />
      ))}
    </div>
  );
}

interface ObjectProps {
  el: LabelElement;
  product: ProductData;
  settings: LabelSettings;
  scale: number;
  printMm: boolean;
  key?: React.Key;
}

/**
 * Renders a single label object. Coordinates are mm in the model;
 * we convert to px (or pass through as mm when printMm).
 */
function ObjectRenderer({ el, product, settings, scale, printMm }: ObjectProps) {
  if (el.visible === false) return null;

  const unit = (mm: number) => (printMm ? `${mm}mm` : `${mm * scale}px`);

  const base: React.CSSProperties = {
    position: 'absolute',
    left: unit(el.x),
    top: unit(el.y),
    width: unit(el.width),
    height: unit(el.height),
    overflow: 'hidden',
    boxSizing: 'border-box',
  };

  if (el.type === 'box') {
    const bw = Math.max(printMm ? 0.05 : 1, (el.borderWidth || 0.4) * (printMm ? 1 : scale));
    const filled = el.fill === true || !!el.fillColor;
    return <div style={{
      ...base,
      border: `${bw}${printMm ? 'mm' : 'px'} solid #000`,
      background: filled ? (el.fillColor || '#0f172a') : 'transparent',
    }} />;
  }

  if (el.type === 'line') {
    const horizontal = el.width >= el.height;
    const thick = Math.max(printMm ? 0.1 : 1, (el.borderWidth || 0.4) * (printMm ? 1 : scale));
    return (
      <div style={{ ...base, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={horizontal
          ? { width: '100%', height: `${thick}${printMm ? 'mm' : 'px'}`, background: '#000' }
          : { width: `${thick}${printMm ? 'mm' : 'px'}`, height: '100%', background: '#000' }} />
      </div>
    );
  }

  if (el.type === 'text' || el.type === 'logo') {
    const text = replaceVariables(el.value || '', product, settings);
    const fontMm = el.fontSize || 3;
    const fontPx = printMm ? `${fontMm}mm` : `${fontMm * scale}px`;
    const weight = el.fontWeight === 'bold' || el.fontWeight === 'black' ? (el.fontWeight === 'black' ? 900 : 'bold') : 'normal';
    const justify = el.textAlign === 'center' ? 'center' : el.textAlign === 'right' ? 'flex-end' : 'flex-start';
    return (
      <div style={{
        ...base,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: justify,
        color: el.textColor || '#0f172a',
      }}>
        <div style={{
          fontSize: fontPx,
          fontWeight: weight as any,
          lineHeight: 1.15,
          textAlign: el.textAlign || 'left',
          width: '100%',
          height: '100%',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          overflow: 'hidden',
          fontFamily: 'Helvetica, Arial, sans-serif',
        }}>
          {text}
        </div>
      </div>
    );
  }

  if (el.type === 'barcode') {
    const value = replaceVariables(el.value || '', product, settings) || product.sku || ' ';
    const showText = el.showBarcodeText !== false;
    // react-barcode wants px dimensions; estimate width per bar so it fills the box
    const heightPx = Math.max(20, (printMm ? el.height * 3.78 : el.height * scale) - (showText ? 14 : 0));
    return (
      <div style={{ ...base, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <BarcodeSafe value={value} heightPx={heightPx} showText={showText} />
      </div>
    );
  }

  if (el.type === 'qr') {
    const value = resolveQrValue(el.value || '{ALL_INFO}', product, settings) || product.sku || ' ';
    // QR must remain square; fit to min dimension
    const side = Math.min(
      printMm ? el.width : el.width * scale,
      printMm ? el.height : el.height * scale,
    );
    const offsetX = ((printMm ? el.width : el.width * scale) - side) / 2;
    const offsetY = ((printMm ? el.height : el.height * scale) - side) / 2;
    const quietZone = Math.max(printMm ? 1 : 2, side * QR_PREVIEW_QUIET_ZONE_RATIO);
    const sizeUnit = (value: number) => `${value}${printMm ? 'mm' : 'px'}`;
    return (
      <div style={{ ...base }}>
        <div style={{
          position: 'absolute',
          left: sizeUnit(offsetX),
          top: sizeUnit(offsetY),
          width: sizeUnit(side),
          height: sizeUnit(side),
          padding: sizeUnit(quietZone),
          background: 'white',
          boxSizing: 'border-box',
        }}>
          <QRCode
            value={value}
            size={256}
            style={{ width: '100%', height: '100%' }}
            viewBox="0 0 256 256"
            level="M"
          />
        </div>
      </div>
    );
  }

  return null;
}

/**
 * react-barcode throws synchronously on invalid input (empty, etc.).
 * Wrap it so the whole preview doesn't blow up on a single bad value.
 */
function BarcodeSafe({ value, heightPx, showText }: { value: string; heightPx: number; showText: boolean }) {
  try {
    return (
      <Barcode
        value={value || ' '}
        width={1.5}
        height={heightPx}
        fontSize={Math.max(8, heightPx * 0.18)}
        font="monospace"
        margin={0}
        displayValue={showText}
        textAlign="center"
        textMargin={1}
      />
    );
  } catch (e) {
    return <div style={{ fontSize: 10, color: '#888' }}>BARCODE: {value}</div>;
  }
}

/**
 * Memoised so list views with many thumbnails don't re-render every card
 * on unrelated parent state changes (search input, selection toggles, etc.).
 */
export const LabelPreviewRenderer = React.memo(LabelPreviewRendererBase);
