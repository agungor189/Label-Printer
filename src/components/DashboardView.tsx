import React, { useMemo, useState } from 'react';
import { ProductData, LabelTemplate, LabelSettings } from '../lib/types';
import { FileImage, Trash2, Plus, Download, Search, Grid2X2, List as ListIcon, Rows, X, FileText, AlertTriangle, CheckSquare, Square } from 'lucide-react';
import { cn, safeUUID } from '../lib/utils';
import { LabelPreviewRenderer } from './preview/LabelPreviewRenderer';
import { generatePdfFromDesign } from '../lib/pdfGenerator';

interface Props {
  data: ProductData[];
  setData: React.Dispatch<React.SetStateAction<ProductData[]>>;
  printableData: ProductData[];
  handleManualAdd: (product: ProductData) => void;
  loadExample: () => void;
  template: LabelTemplate;
  settings: LabelSettings;
  isGenerating: boolean;
  setIsGenerating: React.Dispatch<React.SetStateAction<boolean>>;
}

type ViewMode = 'compact' | 'labelled' | 'grid';

interface FieldFilters {
  urunAdi: string;
  malzeme: string;
  tip: string;
}

const EMPTY_FILTERS: FieldFilters = {
  urunAdi: '',
  malzeme: '',
  tip: '',
};

interface DecoratedItem {
  item: ProductData;
  key: string;     // stable per occurrence (id-idx) — same product can appear multiple times
  idx: number;     // 1-based index in printable list
  warnings: string[];
}

function decorate(items: ProductData[]): DecoratedItem[] {
  return items.map((item, i) => {
    const warnings: string[] = [];
    if (!item.sku || !item.sku.trim()) warnings.push('SKU eksik');
    if (!item.urunAdi || !item.urunAdi.trim()) warnings.push('Ürün adı eksik');
    return { item, key: `${item.id ?? 'noid'}-${i}`, idx: i + 1, warnings };
  });
}

function uniqueFieldValues(items: DecoratedItem[], getValue: (item: ProductData) => string | undefined): string[] {
  return Array.from(new Set(items.map(({ item }) => (getValue(item) || '').trim()).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, 'tr'));
}

export function DashboardView({ data, setData, printableData, handleManualAdd, loadExample, template, settings, isGenerating, setIsGenerating }: Props) {
  const [activeTab, setActiveTab] = useState<'list' | 'manual'>('list');
  const [viewMode, setViewMode] = useState<ViewMode>('labelled');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<FieldFilters>(EMPTY_FILTERS);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailKey, setDetailKey] = useState<string | null>(null);

  const decorated = useMemo(() => decorate(printableData), [printableData]);

  const filterOptions = useMemo(() => ({
    malzeme: uniqueFieldValues(decorated, item => item.malzeme),
    tip: uniqueFieldValues(decorated, item => item.tip),
  }), [decorated]);

  const hasActiveFilters = Boolean(search.trim() || filters.urunAdi.trim() || filters.malzeme || filters.tip);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const name = filters.urunAdi.trim().toLowerCase();

    return decorated.filter(({ item }) => {
      const matchesSearch = !q || [item.sku, item.urunAdi, item.urunKodu, item.partiLot, item.paketNo, item.malzeme, item.olcu, item.tip]
        .some(f => (f || '').toLowerCase().includes(q));
      const matchesName = !name || (item.urunAdi || '').toLowerCase().includes(name);
      const matchesMaterial = !filters.malzeme || (item.malzeme || '').trim() === filters.malzeme;
      const matchesType = !filters.tip || (item.tip || '').trim() === filters.tip;

      return matchesSearch && matchesName && matchesMaterial && matchesType;
    });
  }, [decorated, search, filters]);

  const uniqueProductCount = useMemo(() => new Set(printableData.map(p => p.sku)).size, [printableData]);

  const allFilteredKeys = useMemo(() => filtered.map(d => d.key), [filtered]);
  const allSelected = allFilteredKeys.length > 0 && allFilteredKeys.every(k => selected.has(k));

  const toggleSelectAll = () => {
    if (allSelected) {
      const next = new Set(selected);
      allFilteredKeys.forEach(k => next.delete(k));
      setSelected(next);
    } else {
      setSelected(new Set([...selected, ...allFilteredKeys]));
    }
  };

  const toggleOne = (key: string) => {
    const next = new Set(selected);
    next.has(key) ? next.delete(key) : next.add(key);
    setSelected(next);
  };

  const clearFilters = () => {
    setSearch('');
    setFilters(EMPTY_FILTERS);
  };

  const clearData = () => {
    if (window.confirm('Listeyi temizlemek istediğinizden emin misiniz?')) {
      setData([]);
      setSelected(new Set());
    }
  };

  const exportSelectedPdf = async () => {
    const sel = decorated.filter(d => selected.has(d.key)).map(d => d.item);
    if (sel.length === 0) return;
    setIsGenerating(true);
    try {
      const res = await generatePdfFromDesign(sel, template, settings, {
        filename: `dsdst_secili_${new Date().toISOString().split('T')[0]}.pdf`,
      });
      alert(`Seçili etiket PDF'i oluşturuldu — ${res.pages} sayfa.`);
    } catch (e: any) {
      alert(e?.message || 'PDF oluşturulamadı.');
    } finally {
      setIsGenerating(false);
    }
  };

  const exportAllPdf = async () => {
    if (printableData.length === 0) return;
    setIsGenerating(true);
    try {
      const res = await generatePdfFromDesign(printableData, template, settings, {
        filename: `dsdst_etiketler_${new Date().toISOString().split('T')[0]}.pdf`,
      });
      alert(`PDF oluşturuldu — ${res.pages} sayfa, ${res.objectsRendered} obje çizildi.`);
    } catch (e: any) {
      alert(e?.message || 'PDF oluşturulamadı.');
    } finally {
      setIsGenerating(false);
    }
  };

  const onSubmitManual = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const newProduct: ProductData = {
      id: safeUUID(),
      sku: formData.get('sku') as string,
      urunKodu: formData.get('urunKodu') as string,
      malzeme: formData.get('malzeme') as string,
      olcu: formData.get('olcu') as string,
      paketNo: formData.get('paketNo') as string,
      toplamPaket: formData.get('toplamPaket') as string,
      urunAdi: formData.get('urunAdi') as string,
      partiLot: formData.get('partiLot') as string,
      paketIciAdet: formData.get('paketIciAdet') as string,
      lokasyon: formData.get('lokasyon') as string,
      not: formData.get('not') as string,
      printQty: parseInt(formData.get('printQty') as string) || 1,
      tip: (formData.get('tip') as string) || '',
      urunAgirligi: (formData.get('urunAgirligi') as string) || '',
      kutuAgirligi: (formData.get('kutuAgirligi') as string) || '',
      stokSayisi: (formData.get('stokSayisi') as string) || '',
    };
    handleManualAdd(newProduct);
    (e.target as HTMLFormElement).reset();
  };

  const detailItem = detailKey ? decorated.find(d => d.key === detailKey) : null;

  return (
    <div className="flex h-full w-full max-w-[1400px] mx-auto p-6 gap-6">
      {/* SIDEBAR — manual add + bulk actions */}
      <aside className="w-80 bg-white border border-slate-200 rounded-lg flex flex-col shadow-sm shrink-0 overflow-hidden">
        <div className="flex border-b border-slate-200 bg-slate-50">
          <button className={cn('flex-1 py-3 text-sm font-semibold border-b-2 transition-colors',
            activeTab === 'list' ? 'border-indigo-600 text-indigo-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700')}
            onClick={() => setActiveTab('list')}>
            Özet
          </button>
          <button className={cn('flex-1 py-3 text-sm font-semibold border-b-2 transition-colors',
            activeTab === 'manual' ? 'border-indigo-600 text-indigo-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700')}
            onClick={() => setActiveTab('manual')}>
            Yeni Etiket Ekle
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'list' && (
            <div className="p-4 flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Ürün" value={uniqueProductCount} />
                <Stat label="Etiket" value={printableData.length} />
                <Stat label="Seçili" value={selected.size} accent={selected.size > 0} />
                <Stat label="Filtreli" value={filtered.length} />
              </div>
              <button onClick={loadExample} className="text-xs text-indigo-600 border border-indigo-200 bg-indigo-50 px-3 py-2 rounded-md hover:bg-indigo-100 flex gap-2 items-center justify-center mt-2">
                <Download size={14} /> Örnek veri indir
              </button>
              <div className="text-[11px] text-slate-500 leading-relaxed mt-2 bg-amber-50 border border-amber-200 rounded p-3">
                Etiket sayısı, ürün sayısından farklıdır: <strong>Toplam_paket</strong> ve <strong>print_qty</strong> değerlerine göre her ürün birden fazla etikete dönüşür.
              </div>
            </div>
          )}

          {activeTab === 'manual' && (
            <form onSubmit={onSubmitManual} className="p-4 flex flex-col gap-3">
              <ManualField name="sku" label="SKU *" required />
              <ManualField name="urunKodu" label="Ürün Kodu" />
              <ManualField name="urunAdi" label="Ürün Adı" />
              <div className="grid grid-cols-2 gap-2">
                <ManualField name="malzeme" label="Malzeme" />
                <ManualField name="tip" label="Tip" />
                <ManualField name="olcu" label="Ölçü" />
                <ManualField name="partiLot" label="Parti / Lot" />
                <ManualField name="paketIciAdet" label="Paket İçi Adet" />
                <ManualField name="printQty" label="Baskı Adedi" type="number" defaultValue="1" />
                <ManualField name="paketNo" label="Paket No" placeholder="1/4" />
                <ManualField name="toplamPaket" label="Toplam Paket" type="number" />
                <ManualField name="urunAgirligi" label="Ürün Ağırlığı" />
                <ManualField name="kutuAgirligi" label="Kutu Ağırlığı" />
                <ManualField name="stokSayisi" label="Stok Sayısı" />
              </div>
              <button type="submit" className="w-full mt-1 flex justify-center items-center gap-2 py-2.5 bg-slate-900 text-white rounded-md font-semibold text-sm hover:bg-slate-800 transition-colors">
                <Plus size={16} /> Listeye Ekle
              </button>
            </form>
          )}
        </div>

        {data.length > 0 && (
          <div className="p-3 border-t border-slate-200 bg-slate-50 shrink-0">
            <button onClick={clearData} className="w-full flex justify-center items-center gap-2 py-2 bg-white border border-red-200 text-red-600 rounded-md font-medium text-sm hover:bg-red-50">
              <Trash2 size={14} /> Listeyi Temizle
            </button>
          </div>
        )}
      </aside>

      {/* MAIN — label list with thumbnails */}
      <section className="flex-1 bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center gap-3">
          <div className="flex flex-col">
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Etiket Listesi ({printableData.length})</h2>
            <p className="text-xs text-slate-500">PDF'e basılacak tüm etiketler — paket ve baskı adedine göre çoğaltılmış.</p>
          </div>
          <div className="flex-1" />

          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="SKU, ürün adı, lot..."
              className="text-sm pl-8 pr-3 py-2 border border-slate-300 rounded-md outline-none focus:border-indigo-500 w-56"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 rounded-md p-1">
            <button onClick={() => setViewMode('compact')} className={cn('px-2 py-1 rounded text-xs flex items-center gap-1', viewMode === 'compact' ? 'bg-white shadow-sm font-semibold text-indigo-700' : 'text-slate-600')} title="Kompakt liste"><Rows size={14} /> Kompakt</button>
            <button onClick={() => setViewMode('labelled')} className={cn('px-2 py-1 rounded text-xs flex items-center gap-1', viewMode === 'labelled' ? 'bg-white shadow-sm font-semibold text-indigo-700' : 'text-slate-600')} title="Etiketli liste"><ListIcon size={14} /> Etiketli</button>
            <button onClick={() => setViewMode('grid')} className={cn('px-2 py-1 rounded text-xs flex items-center gap-1', viewMode === 'grid' ? 'bg-white shadow-sm font-semibold text-indigo-700' : 'text-slate-600')} title="Grid önizleme"><Grid2X2 size={14} /> Grid</button>
          </div>

          <button onClick={exportAllPdf} disabled={printableData.length === 0 || isGenerating} className="text-sm px-3 py-2 bg-indigo-600 text-white rounded-md font-semibold hover:bg-indigo-700 disabled:opacity-40 flex items-center gap-2">
            <FileText size={14} /> {isGenerating ? 'PDF...' : 'Tümü PDF'}
          </button>
        </div>

        {printableData.length > 0 && (
          <div className="px-4 py-3 border-b border-slate-200 bg-white flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Ürün Adı</label>
              <input
                type="text"
                value={filters.urunAdi}
                onChange={e => setFilters({ ...filters, urunAdi: e.target.value })}
                placeholder="İsme göre filtrele"
                className="text-sm px-3 py-2 border border-slate-300 rounded-md outline-none focus:border-indigo-500 w-48"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Malzeme</label>
              <select
                value={filters.malzeme}
                onChange={e => setFilters({ ...filters, malzeme: e.target.value })}
                className="text-sm px-3 py-2 border border-slate-300 rounded-md outline-none focus:border-indigo-500 w-44 bg-white"
              >
                <option value="">Tüm malzemeler</option>
                {filterOptions.malzeme.map(value => <option key={value} value={value}>{value}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Tip</label>
              <select
                value={filters.tip}
                onChange={e => setFilters({ ...filters, tip: e.target.value })}
                className="text-sm px-3 py-2 border border-slate-300 rounded-md outline-none focus:border-indigo-500 w-40 bg-white"
              >
                <option value="">Tüm tipler</option>
                {filterOptions.tip.map(value => <option key={value} value={value}>{value}</option>)}
              </select>
            </div>
            <button
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              className="text-sm px-3 py-2 border border-slate-300 rounded-md text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white flex items-center gap-1.5"
            >
              <X size={14} /> Temizle
            </button>
            <div className="flex-1" />
            <span className="text-xs text-slate-500">{filtered.length} / {printableData.length} etiket gösteriliyor</span>
          </div>
        )}

        {/* Selection bar */}
        {printableData.length > 0 && (
          <div className="px-4 py-2 border-b border-slate-200 bg-slate-50 flex items-center gap-3 text-xs">
            <button onClick={toggleSelectAll} className="flex items-center gap-1.5 text-slate-700 font-medium hover:text-indigo-700">
              {allSelected ? <CheckSquare size={14} /> : <Square size={14} />}
              {allSelected ? 'Tümünü Bırak' : 'Tümünü Seç'}
            </button>
            <span className="text-slate-400">|</span>
            <span className="text-slate-600">{selected.size} etiket seçili</span>
            <div className="flex-1" />
            {selected.size > 0 && (
              <>
                <button onClick={() => setSelected(new Set())} className="text-slate-600 hover:text-slate-900">Temizle</button>
                <button onClick={exportSelectedPdf} disabled={isGenerating} className="px-2.5 py-1 bg-indigo-600 text-white rounded font-semibold hover:bg-indigo-700 disabled:opacity-40 flex items-center gap-1.5">
                  <FileText size={12} /> Seçili PDF
                </button>
              </>
            )}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
          {printableData.length === 0 ? (
            <EmptyState onLoadExample={loadExample} />
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-sm text-slate-500">Seçili filtreler için sonuç yok.</div>
          ) : viewMode === 'compact' ? (
            <CompactList items={filtered} selected={selected} onToggle={toggleOne} onOpen={k => setDetailKey(k)} />
          ) : viewMode === 'labelled' ? (
            <LabelledList items={filtered} selected={selected} onToggle={toggleOne} onOpen={k => setDetailKey(k)} template={template} settings={settings} />
          ) : (
            <GridList items={filtered} selected={selected} onToggle={toggleOne} onOpen={k => setDetailKey(k)} template={template} settings={settings} />
          )}
        </div>
      </section>

      {detailItem && (
        <DetailModal
          item={detailItem.item}
          idx={detailItem.idx}
          template={template}
          settings={settings}
          onClose={() => setDetailKey(null)}
          isGenerating={isGenerating}
          setIsGenerating={setIsGenerating}
        />
      )}
    </div>
  );
}

// ===========================================================
// Small atoms
// ===========================================================
function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={cn('border rounded p-2.5 text-center', accent ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-slate-50')}>
      <div className={cn('text-lg font-bold tabular-nums', accent ? 'text-indigo-700' : 'text-slate-800')}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}

function ManualField({ name, label, required, type, placeholder, defaultValue }: { name: string; label: string; required?: boolean; type?: string; placeholder?: string; defaultValue?: string }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-slate-700 mb-1">{label}</label>
      <input name={name} required={required} type={type} placeholder={placeholder} defaultValue={defaultValue}
        className="w-full text-sm p-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none" />
    </div>
  );
}

function EmptyState({ onLoadExample }: { onLoadExample: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-16">
      <FileImage size={56} className="mb-4 text-slate-300" />
      <p className="text-base font-medium text-slate-600 mb-2">Henüz etiket yok</p>
      <p className="text-xs text-slate-500 mb-6 max-w-sm">CSV/Excel yükleyin veya soldaki "Yeni Etiket Ekle" sekmesinden manuel olarak ekleyin.</p>
      <button onClick={onLoadExample} className="text-xs text-indigo-700 border border-indigo-200 bg-indigo-50 px-4 py-2 rounded-md hover:bg-indigo-100 flex gap-2 items-center">
        <Download size={14} /> Örnek veriyi indir
      </button>
    </div>
  );
}

// ===========================================================
// Compact view
// ===========================================================
function CompactList({ items, selected, onToggle, onOpen }: { items: DecoratedItem[]; selected: Set<string>; onToggle: (k: string) => void; onOpen: (k: string) => void }) {
  return (
    <div className="bg-white border border-slate-200 rounded overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-100 text-slate-600 text-[11px] uppercase tracking-wider">
          <tr>
            <th className="px-2 py-2 w-10"></th>
            <th className="px-2 py-2 w-12">#</th>
            <th className="px-2 py-2 text-left">SKU</th>
            <th className="px-2 py-2 text-left">Ürün Adı</th>
            <th className="px-2 py-2 text-left">Malzeme</th>
            <th className="px-2 py-2 text-left">Tip</th>
            <th className="px-2 py-2 text-left">Paket</th>
            <th className="px-2 py-2 text-left">Lot</th>
            <th className="px-2 py-2 text-left">Adet</th>
          </tr>
        </thead>
        <tbody>
          {items.map(({ item, key, idx, warnings }) => (
            <tr key={key} className={cn('border-t border-slate-100 cursor-pointer hover:bg-indigo-50', selected.has(key) && 'bg-indigo-50/70')}
              onClick={() => onToggle(key)}
              onDoubleClick={() => onOpen(key)}>
              <td className="px-2 py-2"><input type="checkbox" checked={selected.has(key)} onChange={() => onToggle(key)} onClick={e => e.stopPropagation()} /></td>
              <td className="px-2 py-2 text-slate-400 tabular-nums">{idx}</td>
              <td className="px-2 py-2 font-mono font-semibold text-slate-900 truncate max-w-[200px]">{item.sku || '—'}</td>
              <td className="px-2 py-2 text-slate-600 truncate max-w-[260px]">{item.urunAdi || '—'} {warnings.length > 0 && <AlertTriangle size={12} className="inline text-amber-500 ml-1" />}</td>
              <td className="px-2 py-2 text-slate-600 truncate max-w-[120px]">{item.malzeme || '—'}</td>
              <td className="px-2 py-2 text-slate-600 truncate max-w-[110px]">{item.tip || '—'}</td>
              <td className="px-2 py-2 text-slate-600">{item.paketNo || '—'}{item.toplamPaket ? ` / ${item.toplamPaket}` : ''}</td>
              <td className="px-2 py-2 text-slate-600">{item.partiLot || '—'}</td>
              <td className="px-2 py-2 text-slate-600">{item.paketIciAdet || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ===========================================================
// Labelled view — left info, right thumbnail
// ===========================================================
function LabelledList({ items, selected, onToggle, onOpen, template, settings }: { items: DecoratedItem[]; selected: Set<string>; onToggle: (k: string) => void; onOpen: (k: string) => void; template: LabelTemplate; settings: LabelSettings }) {
  return (
    <div className="flex flex-col gap-2">
      {items.map(({ item, key, idx, warnings }) => (
        <div key={key}
          className={cn('bg-white border rounded-md p-3 flex items-center gap-4 cursor-pointer transition-colors',
            selected.has(key) ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-slate-300')}
          onClick={() => onToggle(key)}
          onDoubleClick={() => onOpen(key)}
        >
          <input type="checkbox" checked={selected.has(key)} onChange={() => onToggle(key)} onClick={e => e.stopPropagation()} className="shrink-0" />
          <div className="font-mono bg-slate-100 text-slate-500 px-2 py-1 rounded text-xs shrink-0 border border-slate-200 tabular-nums w-12 text-center">#{idx}</div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-slate-900 truncate font-mono text-sm">{item.sku || '—'}</div>
            <div className="text-xs text-slate-600 truncate mt-0.5">{item.urunAdi || 'İsimsiz ürün'}</div>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              {item.paketNo && (
                <span className="text-[10px] font-medium bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                  Paket {item.paketNo}{item.toplamPaket ? ` / ${item.toplamPaket}` : ''}
                </span>
              )}
              {item.malzeme && <span className="text-[10px] font-medium bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">{item.malzeme}</span>}
              {item.tip && <span className="text-[10px] font-medium bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">{item.tip}</span>}
              {item.partiLot && <span className="text-[10px] font-medium bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">Lot {item.partiLot}</span>}
              {item.paketIciAdet && <span className="text-[10px] font-medium bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">{item.paketIciAdet} adet</span>}
              {warnings.length > 0 && <span className="text-[10px] font-medium bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200 flex items-center gap-1"><AlertTriangle size={10} /> {warnings.join(' · ')}</span>}
            </div>
          </div>
          <div className="shrink-0 border border-slate-200 rounded bg-white p-1 pointer-events-none">
            <LabelPreviewRenderer template={template} product={item} settings={settings} widthPx={120} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ===========================================================
// Grid view — many thumbnails
// ===========================================================
function GridList({ items, selected, onToggle, onOpen, template, settings }: { items: DecoratedItem[]; selected: Set<string>; onToggle: (k: string) => void; onOpen: (k: string) => void; template: LabelTemplate; settings: LabelSettings }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {items.map(({ item, key, idx }) => (
        <div key={key}
          className={cn('bg-white border rounded-md p-2 flex flex-col items-center cursor-pointer transition-colors',
            selected.has(key) ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-slate-300')}
          onClick={() => onToggle(key)}
          onDoubleClick={() => onOpen(key)}
        >
          <div className="w-full flex items-center justify-between mb-1.5 text-[10px] text-slate-500">
            <span className="font-mono">#{idx}</span>
            <input type="checkbox" checked={selected.has(key)} onChange={() => onToggle(key)} onClick={e => e.stopPropagation()} />
          </div>
          <div className="border border-slate-200 rounded bg-white p-1 pointer-events-none">
            <LabelPreviewRenderer template={template} product={item} settings={settings} widthPx={140} />
          </div>
          <div className="mt-2 w-full text-center">
            <div className="text-[11px] font-mono font-semibold text-slate-900 truncate">{item.sku || '—'}</div>
            <div className="text-[10px] text-slate-500 mt-0.5 truncate">{item.urunAdi || 'İsimsiz ürün'}</div>
            <div className="text-[10px] text-slate-500 truncate">{[item.malzeme, item.tip].filter(Boolean).join(' / ') || '—'}</div>
            <div className="text-[10px] text-slate-500 truncate">{item.paketNo ? `Paket ${item.paketNo}${item.toplamPaket ? ` / ${item.toplamPaket}` : ''}` : '—'}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ===========================================================
// Detail modal
// ===========================================================
function DetailModal({ item, idx, template, settings, onClose, isGenerating, setIsGenerating }: {
  item: ProductData; idx: number; template: LabelTemplate; settings: LabelSettings; onClose: () => void;
  isGenerating: boolean; setIsGenerating: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const singlePdf = async () => {
    setIsGenerating(true);
    try {
      await generatePdfFromDesign([item], template, settings, { filename: `etiket_${item.sku || idx}.pdf` });
    } catch (e: any) {
      alert(e?.message || 'PDF oluşturulamadı.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800">#{idx} — {item.sku}</h3>
            <p className="text-xs text-slate-500">{item.urunAdi}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-6 items-start">
          <div className="border border-slate-300 bg-white shadow-sm rounded p-2">
            <LabelPreviewRenderer template={template} product={item} settings={settings} widthPx={380} />
          </div>
          <dl className="flex-1 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <FieldRow label="SKU" value={item.sku} />
            <FieldRow label="Ürün Kodu" value={item.urunKodu} />
            <FieldRow label="Ürün Adı" value={item.urunAdi} colSpan />
            <FieldRow label="Malzeme" value={item.malzeme} />
            <FieldRow label="Tip" value={item.tip} />
            <FieldRow label="Ölçü" value={item.olcu} />
            <FieldRow label="Parti / Lot" value={item.partiLot} />
            <FieldRow label="Paket" value={`${item.paketNo || '—'}${item.toplamPaket ? ` / ${item.toplamPaket}` : ''}`} />
            <FieldRow label="Paket İçi Adet" value={item.paketIciAdet} />
            <FieldRow label="Ürün Ağırlığı" value={item.urunAgirligi} />
            <FieldRow label="Kutu Ağırlığı" value={item.kutuAgirligi} />
            <FieldRow label="Stok Sayısı" value={item.stokSayisi} />
            <FieldRow label="Lokasyon" value={item.lokasyon} />
            <FieldRow label="Not" value={item.not} colSpan />
          </dl>
        </div>
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 text-sm bg-white border border-slate-300 rounded hover:bg-slate-50">Kapat</button>
          <button onClick={singlePdf} disabled={isGenerating} className="px-3 py-2 text-sm bg-indigo-600 text-white rounded font-semibold hover:bg-indigo-700 disabled:opacity-40 flex items-center gap-1.5">
            <FileText size={14} /> Tek Etiketi PDF
          </button>
        </div>
      </div>
    </div>
  );
}

function FieldRow({ label, value, colSpan }: { label: string; value?: string; colSpan?: boolean }) {
  return (
    <div className={colSpan ? 'col-span-2' : ''}>
      <dt className="text-[10px] uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="text-slate-800 font-medium truncate">{value || '—'}</dd>
    </div>
  );
}
