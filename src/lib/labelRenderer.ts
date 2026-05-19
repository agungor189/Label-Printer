import { ProductData, LabelSettings } from './types';

export const QR_QUIET_ZONE_MODULES = 4;
export const QR_PREVIEW_QUIET_ZONE_RATIO = 0.08;

export function replaceVariables(text: string, product: ProductData, settings?: LabelSettings): string {
  if (!text) return '';
  let result = text;

  // ALL_INFO: full block (used for QR by default)
  if (result.includes('{ALL_INFO}')) {
    const allInfo = [
      `SKU: ${product.sku || ''}`,
      `URUN_KODU: ${product.urunKodu || ''}`,
      `MALZEME: ${product.malzeme || ''}`,
      `TIP: ${product.tip || ''}`,
      `OLCU: ${product.olcu || ''}`,
      `URUN_ADI: ${product.urunAdi || ''}`,
      `LOT: ${product.partiLot || ''}`,
      `PAKET_ICI_ADET: ${product.paketIciAdet || ''}`,
      `PAKET_NO: ${product.paketNo || ''}`,
      `URUN_AGIRLIGI: ${product.urunAgirligi || ''}`,
      `KUTU_AGIRLIGI: ${product.kutuAgirligi || ''}`,
      `STOK_SAYISI: ${product.stokSayisi || ''}`,
    ].join('\n');
    result = result.replace(/{ALL_INFO}/g, allInfo);
  }

  result = result.replace(/{SKU}/g, product.sku || '');
  result = result.replace(/{Urun_kodu}/g, product.urunKodu || '');
  result = result.replace(/{Malzeme}/g, product.malzeme || '');
  result = result.replace(/{Tip}/g, product.tip || '');
  result = result.replace(/{Olcu}/g, product.olcu || '');
  result = result.replace(/{Urun_adi}/g, product.urunAdi || '');
  result = result.replace(/{Parti_Lot}/g, product.partiLot || '');
  result = result.replace(/{Parti_lot}/g, product.partiLot || '');
  result = result.replace(/{Paket_ici_adet}/g, product.paketIciAdet || '');
  result = result.replace(/{Paket_no}/g, product.paketNo || '');
  result = result.replace(/{Toplam_paket}/g, product.toplamPaket || '');
  result = result.replace(/{Lokasyon}/g, product.lokasyon || '');
  result = result.replace(/{Not}/g, product.not || '');
  result = result.replace(/{Urun_agirligi}/g, product.urunAgirligi || '');
  result = result.replace(/{Kutu_agirligi}/g, product.kutuAgirligi || '');
  result = result.replace(/{Stok_sayisi}/g, product.stokSayisi || '');

  return result;
}

function normalizeQrValue(value: string, fallback: string): string {
  const normalized = value.replace(/\r\n/g, '\n').trim();
  return normalized || fallback.trim() || 'N/A';
}

function replaceQrUrlVariables(template: string, product: ProductData): string {
  const sku = encodeURIComponent(product.sku || '');
  const urunKodu = encodeURIComponent(product.urunKodu || '');
  return template.replace(/{SKU}/g, sku).replace(/{Urun_kodu}/g, urunKodu);
}

/** QR value resolution centralized (preview, designer and PDF share this) */
export function resolveQrValue(rawValue: string, product: ProductData, settings: LabelSettings): string {
  const fallback = product.sku || product.urunKodu || '';

  if (settings.qrType === 'custom_url') {
    return normalizeQrValue(replaceQrUrlVariables(settings.qrCustomUrl || '', product), fallback);
  }
  if (settings.qrType === 'sku_only') {
    return normalizeQrValue(product.sku || '', fallback);
  }
  // all_info — use the raw value (which often is {ALL_INFO})
  return normalizeQrValue(replaceVariables(rawValue || '{ALL_INFO}', product, settings), fallback);
}
