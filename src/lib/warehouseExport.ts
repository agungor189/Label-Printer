import { ProductData } from './types';

export interface WarehousePackage {
  packageId: string;
  labelIndex: number;
  status: 'unplaced';
  placement: null;
  sku: string;
  productCode: string;
  productName: string;
  material: string;
  type: string;
  dimensionsLabel: string;
  lot: string;
  packageNo: string;
  totalPackages: string;
  quantityPerPackage: string;
  productWeight: string;
  boxWeight: string;
  stockCount: string;
  locationHint: string;
  note: string;
  printQty: number;
  sourceProductId: string | null;
  searchText: string;
}

export interface WarehousePackagesExport {
  schemaVersion: 'label-printer.packages.v1';
  exportedAt: string;
  exportMode: 'all' | 'selected' | 'filtered';
  source: {
    app: 'label-printer';
    fileName: 'packages-export.json';
  };
  summary: {
    packageCount: number;
    productCount: number;
    skuCount: number;
  };
  packages: WarehousePackage[];
}

function value(input: unknown): string {
  return String(input ?? '').trim();
}

function slug(input: string): string {
  return value(input)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'package';
}

function makePackageId(product: ProductData, index: number): string {
  const ordinal = String(index + 1).padStart(5, '0');
  return `pkg-${ordinal}-${slug(product.sku)}-${slug(product.paketNo || 'single')}`;
}

function buildSearchText(product: ProductData): string {
  return [
    product.sku,
    product.urunKodu,
    product.urunAdi,
    product.malzeme,
    product.tip,
    product.olcu,
    product.partiLot,
    product.paketNo,
    product.lokasyon,
    product.not,
  ].map(value).filter(Boolean).join(' ').toLowerCase();
}

export function buildWarehousePackagesExport(
  products: ProductData[],
  exportMode: WarehousePackagesExport['exportMode'] = 'all'
): WarehousePackagesExport {
  const packages = products.map((product, index): WarehousePackage => ({
    packageId: makePackageId(product, index),
    labelIndex: index + 1,
    status: 'unplaced',
    placement: null,
    sku: value(product.sku),
    productCode: value(product.urunKodu),
    productName: value(product.urunAdi),
    material: value(product.malzeme),
    type: value(product.tip),
    dimensionsLabel: value(product.olcu),
    lot: value(product.partiLot),
    packageNo: value(product.paketNo),
    totalPackages: value(product.toplamPaket),
    quantityPerPackage: value(product.paketIciAdet),
    productWeight: value(product.urunAgirligi),
    boxWeight: value(product.kutuAgirligi),
    stockCount: value(product.stokSayisi),
    locationHint: value(product.lokasyon),
    note: value(product.not),
    printQty: Number.isFinite(product.printQty) ? product.printQty : 1,
    sourceProductId: product.id || null,
    searchText: buildSearchText(product),
  }));

  return {
    schemaVersion: 'label-printer.packages.v1',
    exportedAt: new Date().toISOString(),
    exportMode,
    source: {
      app: 'label-printer',
      fileName: 'packages-export.json',
    },
    summary: {
      packageCount: packages.length,
      productCount: new Set(packages.map(pkg => `${pkg.sku}|${pkg.productCode}|${pkg.productName}`)).size,
      skuCount: new Set(packages.map(pkg => pkg.sku).filter(Boolean)).size,
    },
    packages,
  };
}

export function downloadWarehousePackagesExport(
  products: ProductData[],
  exportMode: WarehousePackagesExport['exportMode'] = 'all'
) {
  const payload = buildWarehousePackagesExport(products, exportMode);
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'packages-export.json';
  link.click();
  URL.revokeObjectURL(url);
  return payload;
}
