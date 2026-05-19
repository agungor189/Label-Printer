import React, { useState } from 'react';
import { EXPECTED_COLUMNS } from '../lib/dataProcessor';
import { cn } from '../lib/utils';
import { ArrowRight, Check, AlertCircle } from 'lucide-react';

interface Props {
  headers: string[];
  initialMapping: Record<string, string>;
  onComplete: (mapping: Record<string, string>) => void;
  onCancel: () => void;
}

export function ColumnMapper({ headers, initialMapping, onComplete, onCancel }: Props) {
  const [mapping, setMapping] = useState<Record<string, string>>(initialMapping);

  const missingRequired = EXPECTED_COLUMNS
    .filter(c => c.required && !mapping[c.key]);

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="p-6 border-b border-slate-200 shrink-0">
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Kolonları Eşleştir</h2>
        <p className="text-sm text-slate-500 mt-1">Yüklediğiniz dosyadaki sütunları uygulamanın alanlarıyla eşleştirin.</p>
        
        {missingRequired.length > 0 && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm flex items-center gap-2 text-red-700 font-medium">
             <AlertCircle size={16} /> 
             SKU alanı zorunludur! Lütfen dosyanızdan SKU'ya denk gelen kolonu seçin.
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto p-6 bg-slate-50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
          {EXPECTED_COLUMNS.map((col) => {
             const isMapped = !!mapping[col.key];
             return (
               <div key={col.key} className={cn("p-4 rounded-lg border bg-white flex flex-col gap-2 transition-all", isMapped ? 'border-green-200 ring-1 ring-green-100 shadow-sm' : 'border-slate-200')}>
                 <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                     <span className="font-semibold text-sm text-slate-700">{col.label} {col.required && <span className="text-red-500">*</span>}</span>
                     {isMapped && <Check size={14} className="text-green-500" />}
                   </div>
                   <ArrowRight size={14} className="text-slate-300" />
                 </div>
                 <select 
                   value={mapping[col.key] || ''}
                   onChange={(e) => setMapping({ ...mapping, [col.key]: e.target.value })}
                   className={cn("w-full text-sm p-2 border rounded focus:ring-2 focus:outline-none", isMapped ? "border-green-300 focus:ring-green-500 bg-green-50/30" : "border-slate-300 focus:ring-indigo-500")}
                 >
                   <option value="">-- Alan Seçilmedi --</option>
                   {headers.map((h, i) => (
                     <option key={i} value={h}>{h}</option>
                   ))}
                 </select>
               </div>
             )
          })}
        </div>
      </div>

      <div className="p-6 border-t border-slate-200 bg-white flex justify-end gap-3 shrink-0">
        <button 
          onClick={onCancel}
          className="px-6 py-2 border border-slate-300 text-slate-600 rounded-md font-medium text-sm hover:bg-slate-50"
        >
          İptal
        </button>
        <button 
          onClick={() => onComplete(mapping)}
          disabled={missingRequired.length > 0}
          className="px-6 py-2 bg-indigo-600 text-white rounded-md font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
        >
          <Check size={16} /> Eşleştirmeyi Tamamla ve Veriyi Oku
        </button>
      </div>
    </div>
  );
}
