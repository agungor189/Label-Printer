import { ProductData } from './types';
import { safeUUID } from './utils';

export const EXPECTED_COLUMNS = [
  { key: 'sku', label: 'SKU', required: true, aliases: ['sku', 'stok kodu', 'stokkodu', 'ürün sku', 'urun sku', 'barkod degeri'] },
  { key: 'urunKodu', label: 'Ürün Kodu', required: false, aliases: ['urun_kodu', 'ürün kodu', 'urun kodu', 'product code', 'tedarikci kodu', 'tedarikçi kodu', 'supplier code'] },
  { key: 'malzeme', label: 'Malzeme', required: false, aliases: ['malzeme', 'material'] },
  { key: 'urunAdi', label: 'Ürün Adı', required: false, aliases: ['urun_adi', 'ürün adı', 'urun adi', 'product name', 'name', 'açıklama', 'aciklama'] },
  { key: 'olcu', label: 'Ölçü', required: false, aliases: ['olcu', 'ölçü', 'size', 'dimension', 'ebat'] },
  { key: 'partiLot', label: 'Parti/Lot', required: false, aliases: ['parti_lot', 'lot', 'parti', 'parti no', 'lot no'] },
  { key: 'paketIciAdet', label: 'Paket İçi Adet', required: false, aliases: ['paket_ici_adet', 'paket içi adet', 'paket ici adet', 'adet', 'qty', 'quantity', 'miktar'] },
  { key: 'paketNo', label: 'Paket No', required: false, aliases: ['paket_no', 'paket no', 'package no'] },
  { key: 'toplamPaket', label: 'Toplam Paket', required: false, aliases: ['toplam_paket', 'toplam paket', 'paket sayısı', 'paket sayisi', 'total package'] },
  { key: 'lokasyon', label: 'Lokasyon', required: false, aliases: ['lokasyon', 'depo lokasyon', 'raf', 'location'] },
  { key: 'not', label: 'Not', required: false, aliases: ['not', 'note'] },
  { key: 'printQty', label: 'Baskı Adedi (print_qty)', required: false, aliases: ['print_qty', 'baskı adedi', 'baski adedi', 'kaç adet basılacak', 'kac adet basilacak'] },
  { key: 'tip', label: 'Tip', required: false, aliases: ['tip', 'type', 'ürün tipi', 'urun tipi'] },
  { key: 'urunAgirligi', label: 'Ürün Ağırlığı', required: false, aliases: ['urun_agirligi', 'ürün ağırlığı', 'urun agirligi', 'product weight', 'agirlik', 'ağırlık'] },
  { key: 'kutuAgirligi', label: 'Kutu Ağırlığı', required: false, aliases: ['kutu_agirligi', 'kutu ağırlığı', 'kutu agirligi', 'box weight', 'paket ağırlığı', 'paket agirligi'] },
  { key: 'stokSayisi', label: 'Stok Sayısı', required: false, aliases: ['stok_sayisi', 'stok sayısı', 'stok sayisi', 'stock count', 'toplam stok'] }
];

export function autoMapColumns(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  
  for (const expected of EXPECTED_COLUMNS) {
    const match = headers.find(h => 
      expected.aliases.includes(h.toLowerCase().trim()) || 
      h.toLowerCase().trim() === expected.key.toLowerCase()
    );
    mapping[expected.key] = match || '';
  }
  
  return mapping;
}

export interface ProcessedRow {
  product: ProductData;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function processMappedData(rawRows: any[], mapping: Record<string, string>): ProcessedRow[] {
  return rawRows.map((row, index) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    const sku = String(row[mapping.sku] || '').trim();
    if (!sku) {
      errors.push(`${index + 1}. satırda SKU boş.`);
    }

    const urunAdi = String(row[mapping.urunAdi] || '').trim();
    if (urunAdi.length > 80) {
      warnings.push(`Ürün adı çok uzun, etikette kesilebilir.`);
    }

    let printQty = parseInt(String(row[mapping.printQty] || '1'), 10);
    if (isNaN(printQty) || printQty < 1) {
      printQty = 1;
      if (row[mapping.printQty]) {
         warnings.push(`print_qty geçersiz (${row[mapping.printQty]}), 1 kabul edildi.`);
      }
    }

    let toplamPaket = parseInt(String(row[mapping.toplamPaket] || ''), 10);
    if (isNaN(toplamPaket) || toplamPaket < 1) {
       toplamPaket = 1;
    }

    const product: ProductData = {
      id: safeUUID(),
      sku,
      urunKodu: String(row[mapping.urunKodu] || '').trim(),
      malzeme: String(row[mapping.malzeme] || '').trim(),
      urunAdi,
      olcu: String(row[mapping.olcu] || '').trim(),
      partiLot: String(row[mapping.partiLot] || '').trim(),
      paketIciAdet: String(row[mapping.paketIciAdet] || '').trim(),
      paketNo: String(row[mapping.paketNo] || '').trim(),
      toplamPaket: toplamPaket.toString(),
      lokasyon: String(row[mapping.lokasyon] || '').trim(),
      not: String(row[mapping.not] || '').trim(),
      printQty,
      tip: String(row[mapping.tip] || '').trim(),
      urunAgirligi: String(row[mapping.urunAgirligi] || '').trim(),
      kutuAgirligi: String(row[mapping.kutuAgirligi] || '').trim(),
      stokSayisi: String(row[mapping.stokSayisi] || '').trim(),
    };

    return {
      product,
      isValid: errors.length === 0,
      errors,
      warnings
    };
  });
}

export function generatePrintableList(validProducts: ProductData[]): ProductData[] {
  const result: ProductData[] = [];
  
  for (const item of validProducts) {
    const targetPrintQty = item.printQty || 1;
    const targetTotal = parseInt(item.toplamPaket) || 1;
    
    if (!item.paketNo && targetTotal > 1) {
      for (let paket = 1; paket <= targetTotal; paket++) {
        for (let p = 0; p < targetPrintQty; p++) {
          result.push({
            ...item,
            id: safeUUID(),
            paketNo: `${paket} / ${targetTotal}`
          });
        }
      }
    } else {
      for (let p = 0; p < targetPrintQty; p++) {
        result.push({
          ...item,
          id: safeUUID(),
          paketNo: item.paketNo || (targetTotal > 1 ? `1 / ${targetTotal}` : '')
        });
      }
    }
  }
  
  return result;
}
