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
  value: string; // text content or Dynamic placeholders
  fontSize?: number; // in mm
  fontWeight?: 'normal' | 'bold' | 'black';
  textAlign?: 'left' | 'center' | 'right';
  borderWidth?: number; // in mm for box/line
  showLabel?: boolean; // If text element displays its title like "SKU:"
  label?: string; // e.g. "SKU"
}

export interface LabelTemplate {
  id: string;
  name: string;
  width: number; // usually 100
  height: number; // usually 100
  elements: LabelElement[];
}

