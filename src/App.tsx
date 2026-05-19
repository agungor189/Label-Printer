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
import { cn } from './lib/utils';
import { DashboardView } from './components/DashboardView';
import { DesignEditor } from './components/DesignEditor';
import { PreviewExportView } from './components/PreviewExportView';
import { SettingsView } from './components/SettingsView';

const DEFAULT_SETTINGS: LabelSettings = {
  qrType: 'all_info',
  qrCustomUrl: 'https://panel.dsdstserver.online/products/{SKU}',
  showDsdstHeader: true,
  showLokasyon: true,
  showNot: true,
  paperSize: '100x100'
};

const DEFAULT_PRODUCT: ProductData = {
  id: crypto.randomUUID(),
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
  tip: "Dirsek",
  urunAgirligi: "12 g",
  kutuAgirligi: "2.4 kg"
};

export type AppView = 'dashboard' | 'mapping' | 'validation' | 'design' | 'preview' | 'settings';

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('dashboard');
  
  const [data, setData] = useState<ProductData[]>([]);
  const [settings, setSettings] = useState<LabelSettings>(DEFAULT_SETTINGS);
  
  const [activeTemplate, setActiveTemplate] = useState<LabelTemplate>(() => {
    try {
      const saved = localStorage.getItem('dsdst_label_template');
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
    const csvSettings = Papa.unparse({
      fields: Object.keys(DEFAULT_PRODUCT).filter(k => k !== 'id'),
      data: [
        [
          DEFAULT_PRODUCT.sku,
          DEFAULT_PRODUCT.urunKodu,
          DEFAULT_PRODUCT.malzeme,
          DEFAULT_PRODUCT.olcu,
          "Boru Dirsek Eki (Kısa)",
          DEFAULT_PRODUCT.partiLot,
          DEFAULT_PRODUCT.paketIciAdet,
          "",
          "1",
          DEFAULT_PRODUCT.lokasyon,
          "Kısa örnek adı",
          "1"
        ],
        [
          "DSDST-LONG-SKU-992-XYZ",
          "XX-12",
          "Çelik",
          "2 İnç",
          "Çok Çok Uzun Bir Ürün Adı İçeren Örnek Satır - Bu etiket dışına taşmamalı ve sığdırılmalı 2 satıra göre",
          "LOT-TEST",
          "10",
          "",
          "4",
          "C-2",
          "Büyük paketler",
          "1"
        ],
        [
          "DSDST-MULTI-PRINT",
          "ZZ-1",
          "Plastik",
          "50mm",
          "Çoklu Baskı Denemesi",
          "LOT-99",
          "100",
          "1 / 1",
          "1",
          "D-1",
          "printQty = 3 olacak",
          "3"
        ]
      ]
    });
    
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
          <DashboardView data={data} setData={setData} printableData={printableData} handleManualAdd={handleManualAdd} loadExample={loadExample} />
        )}

        {activeView === 'design' && (
          <DesignEditor 
             template={activeTemplate} 
             onSave={(t) => {
               setActiveTemplate(t);
               try { localStorage.setItem('dsdst_label_template', JSON.stringify(t)); } catch(e) { console.warn('localStorage write failed', e); }
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
