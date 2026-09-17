import React, { useMemo, useState } from 'react';
import {
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MapPin,
  MinusSquare,
  Printer,
  Search,
  Square,
  X,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { LabelPreviewRenderer } from './preview/LabelPreviewRenderer';
import {
  createLocationSampleProduct,
  generateLocationCodes,
  generateLocationLabelsPdf,
  generateShelfLocationCodes,
  groupLocationCodes,
  LOCATION_SHELVES,
  type LocationLabelSize,
  type LocationShelf,
} from '../lib/locationLabels';
import type { LabelSettings, LabelTemplate } from '../lib/types';

const LOCATIONS = generateLocationCodes();
const AISLES = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;
type SelectionFilter = 'all' | 'selected' | 'unselected';

interface ShelfGroup {
  shelf: LocationShelf;
  allCodes: string[];
  visibleCodes: string[];
}

const LOCATION_PREVIEW_SETTINGS: LabelSettings = {
  qrType: 'sku_only', qrCustomUrl: '', showDsdstHeader: false,
  showLokasyon: true, showNot: false, paperSize: '100x100',
};

export function LocationLabelsView({ template }: { template: LabelTemplate }) {
  const [search, setSearch] = useState('');
  const [aisleFilter, setAisleFilter] = useState('all');
  const [selectionFilter, setSelectionFilter] = useState<SelectionFilter>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<LocationShelf>>(new Set(['A1']));
  const [labelSize, setLabelSize] = useState<LocationLabelSize>('100x100');
  const [previewPage, setPreviewPage] = useState(0);
  const [printingTarget, setPrintingTarget] = useState<string | null>(null);

  const groups = useMemo<ShelfGroup[]>(() => {
    const query = search.trim().toLocaleUpperCase('tr-TR');
    return LOCATION_SHELVES
      .filter(shelf => aisleFilter === 'all' || shelf.startsWith(aisleFilter))
      .map(shelf => {
        const allCodes = generateShelfLocationCodes(shelf);
        const visibleCodes = allCodes.filter(code => {
          const matchesSearch = !query || code.includes(query);
          const matchesSelection = selectionFilter === 'all'
            || (selectionFilter === 'selected' ? selected.has(code) : !selected.has(code));
          return matchesSearch && matchesSelection;
        });
        return { shelf, allCodes, visibleCodes };
      })
      .filter(group => group.visibleCodes.length > 0);
  }, [aisleFilter, search, selected, selectionFilter]);

  const filteredCodes = useMemo(() => groups.flatMap(group => group.visibleCodes), [groups]);
  const selectedCodes = useMemo(() => LOCATIONS.filter(code => selected.has(code)), [selected]);
  const previewPairs = useMemo(() => groupLocationCodes(selectedCodes), [selectedCodes]);
  const safePreviewPage = Math.min(previewPage, Math.max(0, previewPairs.length - 1));
  const activePair = previewPairs[safePreviewPage];
  const allFilteredSelected = filteredCodes.length > 0 && filteredCodes.every(code => selected.has(code));
  const forceGroupsOpen = Boolean(search.trim()) || selectionFilter !== 'all';

  const toggleLocation = (code: string) => {
    setSelected(current => {
      const next = new Set(current);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  };

  const toggleShelf = (codes: string[]) => {
    setSelected(current => {
      const next = new Set(current);
      const allSelected = codes.every(code => next.has(code));
      codes.forEach(code => allSelected ? next.delete(code) : next.add(code));
      return next;
    });
  };

  const toggleFiltered = () => {
    setSelected(current => {
      const next = new Set(current);
      filteredCodes.forEach(code => allFilteredSelected ? next.delete(code) : next.add(code));
      return next;
    });
  };

  const toggleExpanded = (shelf: LocationShelf) => {
    setExpanded(current => {
      const next = new Set(current);
      next.has(shelf) ? next.delete(shelf) : next.add(shelf);
      return next;
    });
  };

  const printCodes = async (codes: string[], target: string) => {
    if (codes.length === 0) return;
    setPrintingTarget(target);
    try {
      const result = await generateLocationLabelsPdf(codes, labelSize, template);
      alert(`${result.locations} lokasyon, ${result.pages} adet ${labelSize.replace('x', '×')} mm etiket olarak hazırlandı.`);
    } catch (error: any) {
      console.error(error);
      alert(error?.message || 'Lokasyon etiketleri oluşturulamadı.');
    } finally {
      setPrintingTarget(null);
    }
  };

  return (
    <div className="flex h-full w-full max-w-[1500px] mx-auto p-6 gap-6">
      <section className="flex-1 min-w-0 bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Lokasyon Listesi</h2>
            <p className="text-xs text-slate-500">14 raf · raf başına 28 · toplam {LOCATIONS.length} lokasyon</p>
          </div>
          <div className="flex-1" />
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Lokasyon ara..."
              className="w-52 pl-9 pr-9 py-2 text-sm border border-slate-300 rounded-md outline-none focus:border-indigo-500"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700" aria-label="Aramayı temizle">
                <X size={15} />
              </button>
            )}
          </div>
          <select value={aisleFilter} onChange={event => setAisleFilter(event.target.value)} className="py-2 px-2.5 text-sm border border-slate-300 rounded-md bg-white text-slate-700 outline-none focus:border-indigo-500" aria-label="Koridor filtresi">
            <option value="all">Tüm koridorlar</option>
            {AISLES.map(aisle => <option key={aisle} value={aisle}>{aisle} koridoru</option>)}
          </select>
          <select value={selectionFilter} onChange={event => setSelectionFilter(event.target.value as SelectionFilter)} className="py-2 px-2.5 text-sm border border-slate-300 rounded-md bg-white text-slate-700 outline-none focus:border-indigo-500" aria-label="Seçim filtresi">
            <option value="all">Tüm lokasyonlar</option>
            <option value="selected">Yalnız seçilenler</option>
            <option value="unselected">Yalnız seçilmeyenler</option>
          </select>
        </div>

        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center gap-3">
          <button onClick={toggleFiltered} disabled={filteredCodes.length === 0} className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-indigo-700 disabled:opacity-40">
            {allFilteredSelected ? <CheckSquare size={17} className="text-indigo-600" /> : <Square size={17} />}
            Görünenleri seç
          </button>
          <span className="text-xs text-slate-500">{groups.length} raf · {filteredCodes.length} lokasyon gösteriliyor</span>
          <div className="flex-1" />
          {selected.size > 0 && <button onClick={() => setSelected(new Set())} className="text-xs font-medium text-slate-500 hover:text-red-600">Seçimi temizle</button>}
          <span className="rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-bold text-indigo-700">{selected.size} seçili</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {groups.length > 0 ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 items-start">
              {groups.map(group => (
                <ShelfCard
                  key={group.shelf}
                  group={group}
                  selected={selected}
                  open={forceGroupsOpen || expanded.has(group.shelf)}
                  printing={printingTarget === group.shelf}
                  disabled={printingTarget !== null}
                  onToggleOpen={() => toggleExpanded(group.shelf)}
                  onToggleShelf={() => toggleShelf(group.allCodes)}
                  onToggleLocation={toggleLocation}
                  onPrint={() => printCodes(group.allCodes, group.shelf)}
                />
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <MapPin size={36} strokeWidth={1.5} />
              <p className="mt-3 text-sm font-medium">Filtrelerle eşleşen lokasyon bulunamadı.</p>
            </div>
          )}
        </div>
      </section>

      <aside className="w-[400px] shrink-0 bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">Önizleme</h2>
              <p className="text-xs text-slate-500">Her etikette iki lokasyon</p>
            </div>
            <div className="flex items-center gap-1 rounded-md bg-slate-100 p-1">
              {(['100x100', '150x100'] as LocationLabelSize[]).map(size => (
                <button key={size} onClick={() => setLabelSize(size)} className={cn('rounded px-2.5 py-1.5 text-xs font-bold transition-colors', labelSize === size ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800')}>
                  {size.replace('x', '×')} mm
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 bg-slate-100 p-5 flex flex-col items-center justify-center overflow-auto">
          {activePair ? (
            <>
              <LocationSheetPreview first={activePair[0]} second={activePair[1]} size={labelSize} template={template} />
              <div className="mt-5 w-full max-w-[360px] flex items-center justify-between rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
                <button onClick={() => setPreviewPage(Math.max(0, safePreviewPage - 1))} disabled={safePreviewPage === 0} className="p-1.5 rounded-full text-slate-600 hover:bg-slate-100 disabled:text-slate-300 disabled:pointer-events-none" aria-label="Önceki etiket"><ChevronLeft size={19} /></button>
                <span className="text-xs font-semibold text-slate-600 tabular-nums">Etiket {safePreviewPage + 1} / {previewPairs.length}</span>
                <button onClick={() => setPreviewPage(Math.min(previewPairs.length - 1, safePreviewPage + 1))} disabled={safePreviewPage >= previewPairs.length - 1} className="p-1.5 rounded-full text-slate-600 hover:bg-slate-100 disabled:text-slate-300 disabled:pointer-events-none" aria-label="Sonraki etiket"><ChevronRight size={19} /></button>
              </div>
            </>
          ) : (
            <div className="text-center text-slate-400 px-8">
              <MapPin size={42} strokeWidth={1.5} className="mx-auto" />
              <p className="mt-3 text-sm font-semibold text-slate-600">Önizlemek için lokasyon seçin</p>
              <p className="mt-1 text-xs leading-relaxed">Tek sayıda seçimde son etiketin alt yarısı boş kalır.</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 bg-white">
          <button onClick={() => printCodes(selectedCodes, 'selected')} disabled={selectedCodes.length === 0 || printingTarget !== null} className="w-full flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed">
            <Printer size={18} />
            {printingTarget === 'selected' ? 'Etiketler hazırlanıyor...' : `Seçilenleri Yazdır (${selectedCodes.length})`}
          </button>
          <p className="mt-2 text-center text-[11px] text-slate-400">{Math.ceil(selectedCodes.length / 2)} adet {labelSize.replace('x', '×')} mm etiket oluşturulur</p>
        </div>
      </aside>
    </div>
  );
}

function ShelfCard({ group, selected, open, printing, disabled, onToggleOpen, onToggleShelf, onToggleLocation, onPrint }: {
  key?: React.Key;
  group: ShelfGroup;
  selected: Set<string>;
  open: boolean;
  printing: boolean;
  disabled: boolean;
  onToggleOpen: () => void;
  onToggleShelf: () => void;
  onToggleLocation: (code: string) => void;
  onPrint: () => void;
}) {
  const selectedCount = group.allCodes.filter(code => selected.has(code)).length;
  const allSelected = selectedCount === group.allCodes.length;

  return (
    <article className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <div className="flex items-center gap-3 bg-slate-50 px-3 py-3">
        <button onClick={onToggleShelf} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-700" aria-label={allSelected ? `${group.shelf} rafının seçimini kaldır` : `${group.shelf} rafının tamamını seç`}>
          {allSelected ? <CheckSquare size={19} className="text-indigo-600" /> : selectedCount > 0 ? <MinusSquare size={19} className="text-indigo-500" /> : <Square size={19} />}
          <span>{allSelected ? 'Seçimi kaldır' : 'Tümünü seç'}</span>
        </button>
        <button onClick={onToggleOpen} className="flex flex-1 items-center gap-2 text-left">
          <ChevronDown size={17} className={cn('text-slate-400 transition-transform', !open && '-rotate-90')} />
          <span className="font-bold text-slate-800">{group.shelf}</span>
          <span className="text-xs text-slate-500">— 28 Lokasyon</span>
          {selectedCount > 0 && <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-700">{selectedCount} seçili</span>}
        </button>
        <button onClick={onPrint} disabled={disabled} className="flex items-center gap-1.5 rounded-md border border-indigo-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-40">
          <Printer size={14} /> {printing ? 'Hazırlanıyor...' : 'Grubu Yazdır'}
        </button>
      </div>
      {open && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 border-t border-slate-200 p-3">
          {group.visibleCodes.map(code => {
            const checked = selected.has(code);
            return (
              <button key={code} onClick={() => onToggleLocation(code)} className={cn('flex items-center gap-1.5 rounded border px-2 py-2 text-left transition-colors', checked ? 'border-indigo-400 bg-indigo-50 text-indigo-800' : 'border-slate-200 text-slate-700 hover:border-indigo-300')}>
                {checked ? <CheckSquare size={15} className="shrink-0 text-indigo-600" /> : <Square size={15} className="shrink-0 text-slate-400" />}
                <span className="font-mono text-xs font-bold">{code}</span>
              </button>
            );
          })}
        </div>
      )}
    </article>
  );
}

function LocationSheetPreview({ first, second, size, template }: { first: string; second?: string; size: LocationLabelSize; template: LabelTemplate }) {
  const wide = size === '150x100';
  return (
    <div className={cn('bg-white border border-slate-300 shadow-md', wide ? 'w-[360px] h-[240px]' : 'w-[300px] h-[300px]')}>
      <LocationHalfPreview code={first} wide={wide} template={template} />
      <LocationHalfPreview code={second} wide={wide} template={template} />
    </div>
  );
}

function LocationHalfPreview({ code, wide, template }: { code?: string; wide: boolean; template: LabelTemplate }) {
  const baseWidth = wide ? 240 : 300;
  return (
    <div className="h-1/2 relative overflow-hidden">
      {code && (
        <LabelPreviewRenderer
          template={template}
          product={createLocationSampleProduct(code)}
          settings={LOCATION_PREVIEW_SETTINGS}
          widthPx={baseWidth}
          style={wide ? { transform: 'scaleX(1.5)', transformOrigin: 'left top' } : undefined}
        />
      )}
    </div>
  );
}
