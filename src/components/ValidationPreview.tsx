import React from 'react';
import { ProcessedRow } from '../lib/dataProcessor';
import { AlertTriangle, CheckCircle2, ChevronRight, Ban } from 'lucide-react';
import { cn } from '../lib/utils';

interface Props {
  processedData: ProcessedRow[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function ValidationPreview({ processedData, onConfirm, onCancel }: Props) {
  const validCount = processedData.filter(r => r.isValid).length;
  const invalidCount = processedData.length - validCount;

  return (
    <div className="flex flex-col h-full bg-white relative">
       <div className="p-6 border-b border-slate-200 shrink-0 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Veri Önizleme & Kontrol</h2>
            <p className="text-sm text-slate-500 mt-1">
              Dosyadaki toplam <span className="font-bold text-slate-700">{processedData.length}</span> satır incelendi. (Sadece ilk 20 satır gösterilmektedir)
            </p>
          </div>
          <div className="flex gap-4">
             <div className="flex flex-col items-end">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Geçerli</span>
                <span className="text-green-600 font-bold flex items-center gap-1.5"><CheckCircle2 size={16}/> {validCount}</span>
             </div>
             <div className="w-px h-10 bg-slate-200"></div>
             <div className="flex flex-col items-end">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Hatalı</span>
                <span className={cn("font-bold flex items-center gap-1.5", invalidCount > 0 ? "text-red-600" : "text-slate-400")}><Ban size={16}/> {invalidCount}</span>
             </div>
          </div>
       </div>

       <div className="flex-1 overflow-auto bg-slate-50 p-6">
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                 <thead className="bg-slate-100 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
                    <tr>
                       <th className="p-3 w-12 text-center">Durum</th>
                       <th className="p-3">SKU</th>
                       <th className="p-3">Ürün Adı</th>
                       <th className="p-3">Toplam/Paket</th>
                       <th className="p-3">Kopya (print_qty)</th>
                       <th className="p-3">Durum Özeti</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {processedData.slice(0, 20).map((row, i) => (
                      <tr key={i} className={cn("hover:bg-slate-50 transition-colors", !row.isValid && "bg-red-50/50")}>
                         <td className="p-3 text-center">
                           {row.isValid 
                             ? (row.warnings.length > 0 ? <AlertTriangle size={16} className="text-amber-500 mx-auto" /> : <CheckCircle2 size={16} className="text-green-500 mx-auto" />)
                             : <Ban size={16} className="text-red-500 mx-auto" />
                           }
                         </td>
                         <td className="p-3 font-semibold text-slate-800">{row.product.sku || '-'}</td>
                         <td className="p-3 truncate max-w-[200px]" title={row.product.urunAdi}>{row.product.urunAdi || '-'}</td>
                         <td className="p-3">
                           {row.product.paketNo ? row.product.paketNo : (row.product.toplamPaket && parseInt(row.product.toplamPaket) > 1 ? `1 / ${row.product.toplamPaket} (+oto)` : 'Tek Paket')}
                         </td>
                         <td className="p-3">{row.product.printQty}</td>
                         <td className="p-3">
                            <ul className="text-xs space-y-1">
                               {row.errors.map((e, j) => <li key={`e-${j}`} className="text-red-600 font-medium">{e}</li>)}
                               {row.warnings.map((w, j) => <li key={`w-${j}`} className="text-amber-600">{w}</li>)}
                               {row.isValid && row.warnings.length === 0 && <li className="text-slate-400">Pürüzsüz</li>}
                            </ul>
                         </td>
                      </tr>
                    ))}
                 </tbody>
              </table>
              {processedData.length > 20 && (
                <div className="p-3 text-center text-xs font-semibold text-slate-500 bg-slate-50 border-t border-slate-200">
                   {processedData.length - 20} satır daha var...
                </div>
              )}
            </div>
          </div>
       </div>

       <div className="p-6 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
          <button 
            onClick={onCancel}
            className="px-6 py-2 border border-slate-300 text-slate-600 rounded-md font-medium text-sm hover:bg-slate-50"
          >
            İptal Et
          </button>
          
          <div className="flex items-center gap-3">
            {invalidCount > 0 && <span className="text-sm font-medium text-red-600 mr-2">{invalidCount} hatalı satır atlanacak.</span>}
            <button 
              onClick={onConfirm}
              disabled={validCount === 0}
              className="px-6 py-2 bg-indigo-600 text-white rounded-md font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 shadow-sm"
            >
              Devam Et ve Etiketleri Oluştur <ChevronRight size={16} />
            </button>
          </div>
       </div>
    </div>
  );
}
