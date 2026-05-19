export interface ProductData {
  id?: string;
  sku: string;
  urunKodu: string;
  malzeme: string;
  olcu: string;
  paketNo: string;
  toplamPaket: string;
  urunAdi: string;
  partiLot: string;
  paketIciAdet: string;
  lokasyon: string;
  not: string;
  printQty: number;
  tip?: string;
  urunAgirligi?: string;
  kutuAgirligi?: string;
}

export type QRConfigType = 'all_info' | 'sku_only' | 'custom_url';

export interface LabelSettings {
  qrType: QRConfigType;
  qrCustomUrl: string;
  showDsdstHeader: boolean;
  showLokasyon: boolean;
  showNot: boolean;
  paperSize: string;
}

export type ElementType = 'text' | 'barcode' | 'qr' | 'line' | 'box' | 'logo';

export interface LabelElement {
  id: string;
  type: ElementType;
  x: number; // in mm
  y: number; // in mm
  width: number; // in mm
  height: number; // in mm
  value: string;
  fontSize?: number;       // in mm
  fontWeight?: 'normal' | 'bold' | 'black';
  textAlign?: 'left' | 'center' | 'right';
  borderWidth?: number;    // mm for box/line
  showLabel?: boolean;
  label?: string;
  visible?: boolean;       // default true
  locked?: boolean;        // default false
  showBarcodeText?: boolean; // for barcode: render value below
}

export interface LabelTemplate {
  id: string;
  name: string;
  width: number;  // mm (typically 100)
  height: number; // mm (typically 100)
  elements: LabelElement[];
}
