import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import Papa from 'papaparse';
import { Upload, Printer, List, LayoutTemplate, Settings, Eye, MapPin, LogOut, LockKeyhole } from 'lucide-react';
import { ColumnMapper } from './components/ColumnMapper';
import { ValidationPreview } from './components/ValidationPreview';
import { parseFile } from './lib/fileParser';
import { autoMapColumns, processMappedData, generatePrintableList, ProcessedRow } from './lib/dataProcessor';
import { ProductData, LabelSettings, LabelTemplate } from './lib/types';
import { DEFAULT_LOCATION_TEMPLATE, DEFAULT_TEMPLATE } from './lib/templates';
import { generatePdfFromDesign } from './lib/pdfGenerator';
import { cn, safeUUID } from './lib/utils';
import { DashboardView } from './components/DashboardView';
import { DesignEditor } from './components/DesignEditor';
import { PreviewExportView } from './components/PreviewExportView';
import { SettingsView } from './components/SettingsView';
import { LocationLabelsView } from './components/LocationLabelsView';
import { loadPersistentState, saveLocalSnapshot, savePersistentState, type SaveStatus } from './lib/persistence';
import { sanitizeLabelTemplate } from './lib/templateSafety';
import { createLocationSampleProduct, sanitizeLocationLabelTemplate } from './lib/locationLabels';

const DEFAULT_SETTINGS: LabelSettings = {
  qrType: 'all_info',
  qrCustomUrl: '',
  showDsdstHeader: true,
  showLokasyon: true,
  showNot: true,
  paperSize: '100x100'
};

const DEFAULT_PRODUCT: ProductData = {
  id: safeUUID(),
  sku: "DSDST-AL-RD-1IN-90D",
  urunKodu: "AL-125-B",
  malzeme: "Alüminyum Alaşım",
  olcu: "1 İnç / 33.7 mm",
  paketNo: "",
  toplamPaket: "4",
  urunAdi: "Yuvarlak Boru 90° Dirsek Modüler Bağlantı Elemanı",
  partiLot: "2026-5",
  paketIciAdet: "200",
  lokasyon: "A-1-P3",
  not: "Gelen ürün ana paket",
  printQty: 1,
  tip: "Boru",
  urunAgirligi: "185",
  kutuAgirligi: "38.2",
  stokSayisi: "128"
};

export type AppView = 'dashboard' | 'mapping' | 'validation' | 'design' | 'preview' | 'locations' | 'settings';

type AuthUser = {
  id: string;
  username: string;
  role: string;
  capabilities: { canView: boolean; canEdit: boolean; canAdmin: boolean };
};

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me', { headers: { Accept: 'application/json' }, cache: 'no-store' })
      .then(async (response) => response.ok ? (await response.json()).user as AuthUser : null)
      .then((nextUser) => { if (!cancelled) setUser(nextUser); })
      .catch(() => { if (!cancelled) setUser(null); })
      .finally(() => { if (!cancelled) setAuthLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (authLoading) return <AuthShell><p className="text-sm text-slate-500">Oturum doğrulanıyor…</p></AuthShell>;
  if (!user) return <LoginScreen onAuthenticated={setUser} />;
  return <LabelWorkspace user={user} onLogout={async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    setUser(null);
  }} />;
}

function AuthShell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6"><div className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 shadow-xl p-8"><div className="mb-6 flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center"><LockKeyhole size={20}/></div><div><h1 className="font-bold text-slate-900">DSDST Label Printer</h1><p className="text-xs text-slate-500">Panel kullanıcı hesabı</p></div></div>{children}</div></div>;
}

function LoginScreen({ onAuthenticated }: { onAuthenticated: (user: AuthUser) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  return <AuthShell><form className="space-y-4" onSubmit={async (event) => {
    event.preventDefault(); setLoading(true); setError('');
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.user) throw new Error(response.status === 429 ? 'Çok fazla deneme. Bir süre sonra tekrar deneyin.' : response.status === 403 ? 'Bu hesapta Label Printer erişim izni yok.' : 'Kullanıcı adı veya parola hatalı.');
      onAuthenticated(body.user as AuthUser);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Giriş yapılamadı.'); }
    finally { setLoading(false); }
  }}><label className="block text-sm font-semibold text-slate-700">Kullanıcı adı<input autoFocus autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-indigo-500" /></label><label className="block text-sm font-semibold text-slate-700">Parola<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-indigo-500" /></label>{error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}<button disabled={loading} className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white hover:bg-indigo-500 disabled:opacity-60">{loading ? 'Giriş yapılıyor…' : 'Giriş yap'}</button></form></AuthShell>;
}

function LabelWorkspace({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const canEdit = user.capabilities.canEdit;
  const [activeView, setActiveView] = useState<AppView>(canEdit ? 'dashboard' : 'preview');
  const [designEditorType, setDesignEditorType] = useState<'product' | 'location'>('product');
  
  const [data, setData] = useState<ProductData[]>([]);
  const [settings, setSettings] = useState<LabelSettings>(DEFAULT_SETTINGS);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('loading');
  const hasLoadedPersistentState = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const [activeTemplate, setActiveTemplate] = useState<LabelTemplate>(() => {
    try {
      const saved = localStorage.getItem('dsdst_label_template_v2');
      if (saved) return sanitizeLabelTemplate(JSON.parse(saved));
    } catch(e) {}
    return DEFAULT_TEMPLATE;
  });
  const [locationTemplate, setLocationTemplate] = useState<LabelTemplate>(() => {
    try {
      const saved = localStorage.getItem('dsdst_location_label_template_v1');
      if (saved) return sanitizeLocationLabelTemplate(JSON.parse(saved));
    } catch(e) {}
    return DEFAULT_LOCATION_TEMPLATE;
  });

  // Export State
  const [isGenerating, setIsGenerating] = useState(false);

  // File parsing states
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [mappingObj, setMappingObj] = useState<Record<string, string>>({});
  const [processedRows, setProcessedRows] = useState<ProcessedRow[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const printableData = useMemo(() => generatePrintableList(data), [data]);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      const persisted = await loadPersistentState();
      if (cancelled) return;

      if (persisted) {
        setData(persisted.products);
        if (persisted.settings) {
          setSettings({ ...DEFAULT_SETTINGS, ...persisted.settings });
        }
        if (persisted.template) {
          const template = sanitizeLabelTemplate(persisted.template);
          setActiveTemplate(template);
          try {
            localStorage.setItem('dsdst_label_template_v2', JSON.stringify(template));
          } catch (e) {
            console.warn('localStorage write failed', e);
          }
        }
        if (persisted.locationTemplate) {
          const template = sanitizeLocationLabelTemplate(persisted.locationTemplate);
          setLocationTemplate(template);
          try {
            localStorage.setItem('dsdst_location_label_template_v1', JSON.stringify(template));
          } catch (e) {
            console.warn('localStorage write failed', e);
          }
        }
        setSaveStatus(persisted.source === 'local' ? 'offline' : 'saved');
      } else {
        setSaveStatus('offline');
      }

      hasLoadedPersistentState.current = true;
    };

    hydrate();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedPersistentState.current || !canEdit) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);

    setSaveStatus('saving');
    saveLocalSnapshot({
      products: data,
      settings,
      template: activeTemplate,
      locationTemplate,
    });

    saveTimer.current = setTimeout(async () => {
      const status = await savePersistentState({
        products: data,
        settings,
        template: activeTemplate,
        locationTemplate,
      });
      setSaveStatus(status);
    }, 700);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [data, settings, activeTemplate, locationTemplate, canEdit]);

  const loadExample = () => {
    const fields = ['sku','urunKodu','urunAdi','malzeme','tip','olcu','partiLot','paketIciAdet','paketNo','toplamPaket','urunAgirligi','kutuAgirligi','stokSayisi','lokasyon','not','printQty'];
    const rows = [
      {
        sku: DEFAULT_PRODUCT.sku, urunKodu: DEFAULT_PRODUCT.urunKodu, urunAdi: '90° Dirsek',
        malzeme: DEFAULT_PRODUCT.malzeme, tip: 'Boru', olcu: DEFAULT_PRODUCT.olcu,
        partiLot: '2026-5', paketIciAdet: '200', paketNo: '', toplamPaket: '4',
        urunAgirligi: '185', kutuAgirligi: '38.2', stokSayisi: '128',
        lokasyon: 'A-1-P3', not: 'Örnek depo kabul', printQty: 1
      },
      {
        sku: 'DSDST-CL-90D-2IN', urunKodu: 'CL-220-X', urunAdi: 'Çelik Dirsek 90°',
        malzeme: 'Çelik', tip: 'Boru', olcu: '2 İnç / 60.3 mm',
        partiLot: '2026-5', paketIciAdet: '50', paketNo: '', toplamPaket: '2',
        urunAgirligi: '420', kutuAgirligi: '22.5', stokSayisi: '100',
        lokasyon: 'B-2', not: '', printQty: 1
      },
      {
        sku: 'DSDST-PL-T-25MM', urunKodu: 'PL-T-25', urunAdi: 'Plastik T Bağlantı 25mm',
        malzeme: 'Plastik', tip: 'T Bağlantı', olcu: '25 mm',
        partiLot: '2026-5', paketIciAdet: '500', paketNo: '1 / 1', toplamPaket: '1',
        urunAgirligi: '12', kutuAgirligi: '6.5', stokSayisi: '500',
        lokasyon: 'D-1', not: '3 kopya basılır', printQty: 3
      }
    ];
    const csvSettings = Papa.unparse({ fields, data: rows });
    
    const blob = new Blob(["\ufeff" + csvSettings], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "dsdst_etiket_ornekler.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
       const parsed = await parseFile(file);
       setRawHeaders(parsed.headers);
       setRawRows(parsed.rawRows);
       setMappingObj(autoMapColumns(parsed.headers));
       setActiveView('mapping');
    } catch (e: any) {
       alert(e.message);
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleMappingComplete = (mapping: Record<string, string>) => {
     setMappingObj(mapping);
     const processed = processMappedData(rawRows, mapping);
     setProcessedRows(processed);
     setActiveView('validation');
  };

  const handleValidationComplete = () => {
     const validProducts = processedRows.filter(r => r.isValid).map(r => r.product);
     setData(prev => [...prev, ...validProducts]);
     setActiveView('dashboard');
     alert(`İşlem tamamlandı! Toplam ${validProducts.length} ürün listeye eklendi.`);
  };

  const handleManualAdd = (newProduct: ProductData) => {
    setData(prev => [newProduct, ...prev]);
  };

  const handleTemplateSave = useCallback((template: LabelTemplate) => {
    const safeTemplate = sanitizeLabelTemplate(template);
    setActiveTemplate(safeTemplate);
    try {
      localStorage.setItem('dsdst_label_template_v2', JSON.stringify(safeTemplate));
    } catch(e) {
      console.warn('localStorage write failed', e);
    }
  }, []);

  const handleLocationTemplateSave = useCallback((template: LabelTemplate) => {
    const safeTemplate = sanitizeLocationLabelTemplate(template);
    setLocationTemplate(safeTemplate);
    try {
      localStorage.setItem('dsdst_location_label_template_v1', JSON.stringify(safeTemplate));
    } catch(e) {
      console.warn('localStorage write failed', e);
    }
  }, []);

  const printPdf = async () => {
    if (printableData.length === 0) {
      alert('PDF oluşturmak için önce listeye ürün ekleyin.');
      return;
    }
    setIsGenerating(true);
    try {
      const result = await generatePdfFromDesign(printableData, activeTemplate, settings, {
        filename: `dsdst_etiketler_${new Date().toISOString().split('T')[0]}.pdf`,
      });
      alert(`PDF oluşturuldu — ${result.pages} sayfa, ${result.objectsRendered} obje çizildi.`);
    } catch (error: any) {
      console.error(error);
      alert(error?.message || 'PDF oluşturulurken bir hata oluştu.');
    } finally {
      setIsGenerating(false);
    }
  };

  const activeProduct = printableData.length > 0 ? printableData[0] : DEFAULT_PRODUCT;

  // View Routing wrapper
  return (
    <div className="h-screen w-screen flex flex-col font-sans bg-slate-100 overflow-hidden">
      
      {/* Universal Top Nav */}
      <header className="h-16 bg-slate-900 flex items-center justify-between px-6 shrink-0 z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-indigo-500 rounded flex items-center justify-center text-white">
               <Printer size={16} />
             </div>
             <h1 className="text-lg font-bold text-white tracking-tight">DSDST Label Generator</h1>
          </div>

          <nav className="flex items-center gap-1 ml-4 bg-slate-800 rounded-md p-1">
             {canEdit && <button onClick={() => setActiveView('dashboard')} className={cn("px-4 py-1.5 text-sm font-medium rounded-sm flex items-center gap-2 transition-colors", activeView === 'dashboard' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-700')}>
                <List size={16} /> Veri Yükle
             </button>}
             {canEdit && <button onClick={() => setActiveView('design')} className={cn("px-4 py-1.5 text-sm font-medium rounded-sm flex items-center gap-2 transition-colors", activeView === 'design' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-700')}>
                <LayoutTemplate size={16} /> Etiket Tasarla
             </button>}
             <button onClick={() => setActiveView('preview')} className={cn("px-4 py-1.5 text-sm font-medium rounded-sm flex items-center gap-2 transition-colors", activeView === 'preview' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-700')}>
                <Eye size={16} /> Önizleme & PDF
             </button>
             <button onClick={() => setActiveView('locations')} className={cn("px-4 py-1.5 text-sm font-medium rounded-sm flex items-center gap-2 transition-colors", activeView === 'locations' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-700')}>
                <MapPin size={16} /> Lokasyon Etiketi
             </button>
             {canEdit && <button onClick={() => setActiveView('settings')} className={cn("px-4 py-1.5 text-sm font-medium rounded-sm flex items-center gap-2 transition-colors", activeView === 'settings' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-700')}>
                <Settings size={16} /> Ayarlar
             </button>}
          </nav>
        </div>

        <div className="flex items-center gap-3">
           <SaveStatusBadge status={saveStatus} />
           {canEdit && <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-500 transition-colors shadow-sm">
             <Upload size={16} /> Yeni Liste Yükle
           </button>}
           <input type="file" accept=".csv, .xlsx, .xls" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
           <span className="hidden xl:inline text-xs text-slate-300">{user.username}</span>
           <button onClick={onLogout} title="Çıkış yap" className="p-2 text-slate-300 hover:text-white"><LogOut size={17}/></button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        {activeView === 'mapping' && (
          <ColumnMapper headers={rawHeaders} initialMapping={mappingObj} onComplete={handleMappingComplete} onCancel={() => setActiveView('dashboard')} />
        )}

        {activeView === 'validation' && (
          <ValidationPreview processedData={processedRows} onConfirm={handleValidationComplete} onCancel={() => setActiveView('dashboard')} />
        )}

        {activeView === 'dashboard' && (
          <DashboardView
            data={data}
            setData={setData}
            printableData={printableData}
            handleManualAdd={handleManualAdd}
            loadExample={loadExample}
            template={activeTemplate}
            settings={settings}
            isGenerating={isGenerating}
            setIsGenerating={setIsGenerating}
          />
        )}

        {activeView === 'design' && (
          <DesignEditor
            key={designEditorType}
            template={designEditorType === 'product' ? activeTemplate : locationTemplate}
            onSave={designEditorType === 'product' ? handleTemplateSave : handleLocationTemplateSave}
            sampleProduct={designEditorType === 'product' ? activeProduct : createLocationSampleProduct('A1-K1-P1')}
            settings={settings}
            onBack={() => setActiveView('dashboard')}
            editorType={designEditorType}
            onEditorTypeChange={setDesignEditorType}
          />
        )}

        {activeView === 'preview' && (
          <PreviewExportView 
            printableData={printableData} 
            template={activeTemplate} 
            settings={settings}
            printPdf={printPdf}
            isGenerating={isGenerating}
          />
        )}

        {activeView === 'settings' && (
          <SettingsView settings={settings} setSettings={setSettings} />
        )}

        {activeView === 'locations' && <LocationLabelsView template={locationTemplate} />}
      </main>

    </div>
  );
}

function SaveStatusBadge({ status }: { status: SaveStatus }) {
  const labels: Record<SaveStatus, string> = {
    loading: 'Kayıt yükleniyor',
    saving: 'Kaydediliyor',
    saved: 'Kaydedildi',
    offline: 'Tarayıcıda kayıtlı',
    error: 'Kayıt hatası',
  };
  const colors: Record<SaveStatus, string> = {
    loading: 'bg-slate-800 text-slate-300 border-slate-700',
    saving: 'bg-amber-500/15 text-amber-100 border-amber-400/30',
    saved: 'bg-emerald-500/15 text-emerald-100 border-emerald-400/30',
    offline: 'bg-slate-800 text-slate-300 border-slate-700',
    error: 'bg-red-500/15 text-red-100 border-red-400/30',
  };

  return (
    <span className={cn('hidden md:inline-flex items-center rounded border px-2.5 py-1 text-xs font-semibold', colors[status])}>
      {labels[status]}
    </span>
  );
}
