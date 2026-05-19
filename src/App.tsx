import React, { useState, useRef, useMemo } from 'react';
import Papa from 'papaparse';
import { Download, Upload, Printer, List, LayoutTemplate, Settings, Eye, FileText } from 'lucide-react';
import { ColumnMapper } from './components/ColumnMapper';
import { ValidationPreview } from './components/ValidationPreview';
import { parseFile } from './lib/fileParser';
import { autoMapColumns, processMappedData, generatePrintableList, ProcessedRow } from './lib/dataProcessor';
import { ProductData, LabelSettings, LabelTemplate } from './lib/types';
import { DEFAULT_TEMPLATE } from './lib/templates';
import { generatePdfFromDesign } from './lib/pdfGenerator';
import { cn, safeUUID } from './lib/utils';
import { DashboardView } from './components/DashboardView';
import { DesignEditor } from './components/DesignEditor';
import { PreviewExportView } from './components/PreviewExportView';
import { SettingsView } from './components/SettingsView';

const DEFAULT_SETTINGS: LabelSettings = {
  qrType: 'custom_url',
  qrCustomUrl: 'https://panel.dsdstserver.online/products/{SKU}',
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

export type AppView = 'dashboard' | 'mapping' | 'validation' | 'design' | 'preview' | 'settings';

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('dashboard');
  
  const [data, setData] = useState<ProductData[]>([]);
  const [settings, setSettings] = useState<LabelSettings>(DEFAULT_SETTINGS);
  
  const [activeTemplate, setActiveTemplate] = useState<LabelTemplate>(() => {
    try {
      const saved = localStorage.getItem('dsdst_label_template_v2');
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return DEFAULT_TEMPLATE;
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
             <button onClick={() => setActiveView('dashboard')} className={cn("px-4 py-1.5 text-sm font-medium rounded-sm flex items-center gap-2 transition-colors", activeView === 'dashboard' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-700')}>
                <List size={16} /> Veri Yükle
             </button>
             <button onClick={() => setActiveView('design')} className={cn("px-4 py-1.5 text-sm font-medium rounded-sm flex items-center gap-2 transition-colors", activeView === 'design' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-700')}>
                <LayoutTemplate size={16} /> Etiket Tasarla
             </button>
             <button onClick={() => setActiveView('preview')} className={cn("px-4 py-1.5 text-sm font-medium rounded-sm flex items-center gap-2 transition-colors", activeView === 'preview' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-700')}>
                <Eye size={16} /> Önizleme & PDF
             </button>
             <button onClick={() => setActiveView('settings')} className={cn("px-4 py-1.5 text-sm font-medium rounded-sm flex items-center gap-2 transition-colors", activeView === 'settings' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-700')}>
                <Settings size={16} /> Ayarlar
             </button>
          </nav>
        </div>

        <div className="flex items-center gap-3">
           <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-500 transition-colors shadow-sm">
             <Upload size={16} /> Yeni Liste Yükle
           </button>
           <input type="file" accept=".csv, .xlsx, .xls" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
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
             template={activeTemplate} 
             onSave={(t) => {
               setActiveTemplate(t);
               try { localStorage.setItem('dsdst_label_template_v2', JSON.stringify(t)); } catch(e) { console.warn('localStorage write failed', e); }
             }}
             sampleProduct={activeProduct}
             settings={settings}
             onBack={() => setActiveView('dashboard')}
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
      </main>

    </div>
  );
}
