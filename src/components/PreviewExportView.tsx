import React, { useState } from 'react';
import { ProductData, LabelSettings, LabelTemplate } from '../lib/types';
import { DynamicThermalLabel } from './DynamicThermalLabel';
import { FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

interface Props {
  printableData: ProductData[];
  template: LabelTemplate;
  settings: LabelSettings;
  printPdf: () => void;
  isGenerating: boolean;
}

export function PreviewExportView({ printableData, template, settings, printPdf, isGenerating }: Props) {
  const [previewIndex, setPreviewIndex] = useState<number>(0);
  
  const activeProduct = printableData.length > 0 
      ? printableData[Math.min(previewIndex, printableData.length - 1)] 
      : null;

  return (
    <div className="flex h-full w-full">
      <section className="flex-1 bg-slate-100/50 flex flex-col relative items-center justify-center overflow-auto p-8 z-0">
          <div className="absolute top-6 left-6 right-6 flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-slate-800">Önizleme ve PDF Dışa Aktar</h2>
            <div className="flex items-center gap-4">
              <div className="text-sm text-slate-500 font-medium bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-200">
                 100 x 100 mm Termal Etiket Formatı
              </div>
              <button 
                onClick={printPdf}
                disabled={printableData.length === 0 || isGenerating}
                className={cn("flex items-center gap-2 px-6 py-2 rounded-md font-semibold text-sm transition-all shadow-sm",
                  printableData.length === 0 ? "bg-slate-300 text-slate-500 cursor-not-allowed" 
                  : "bg-indigo-600 text-white hover:bg-indigo-700 ring-2 ring-transparent focus:ring-indigo-300"
                )}
             >
               {isGenerating ? (
                 <span className="animate-pulse">PDF Oluşturuluyor...</span>
               ) : (
                 <>
                   <FileText size={18} />
                   Tümünü PDF Yap ({printableData.length} Sayfa)
                 </>
               )}
             </button>
            </div>
          </div>

          {activeProduct ? (
            <div className="flex flex-col items-center mt-12">
              <div className="bg-white p-0 shadow border border-slate-300">
                <DynamicThermalLabel product={activeProduct} settings={settings} template={template} />
              </div>
              
              <div className="mt-8 flex items-center justify-between w-[380px] bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm">
                <button 
                  className={cn("p-2 rounded-full flex items-center justify-center transition-colors", previewIndex <= 0 ? "text-slate-300 pointer-events-none" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900")}
                  disabled={previewIndex <= 0}
                  onClick={() => setPreviewIndex(previewIndex - 1)}
                  title="Önceki Etiket"
                >
                  <ChevronLeft size={20} />
                </button>
                <span className="text-sm font-semibold text-slate-700 tabular-nums">Sayfa {previewIndex + 1} / {printableData.length}</span>
                <button 
                  className={cn("p-2 rounded-full flex items-center justify-center transition-colors", previewIndex >= printableData.length - 1 ? "text-slate-300 pointer-events-none" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900")}
                  disabled={previewIndex >= printableData.length - 1}
                  onClick={() => setPreviewIndex(previewIndex + 1)}
                  title="Sonraki Etiket"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          ) : (
            <div className="text-slate-400 font-medium">Önizlenecek veri bulunamadı. Lütfen önce veri yükleyin.</div>
          )}
      </section>
    </div>
  );
}
