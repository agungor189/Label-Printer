import React, { useState } from 'react';
import { ProductData } from '../lib/types';
import { FileImage, Trash2, Plus, Download } from 'lucide-react';
import { cn, safeUUID } from '../lib/utils';

interface Props {
  data: ProductData[];
  setData: React.Dispatch<React.SetStateAction<ProductData[]>>;
  printableData: ProductData[];
  handleManualAdd: (product: ProductData) => void;
  loadExample: () => void;
}

export function DashboardView({ data, setData, printableData, handleManualAdd, loadExample }: Props) {
  const [activeTab, setActiveTab] = useState<'upload' | 'manual'>('upload');
  
  const clearData = () => {
    if(window.confirm('Listeyi temizlemek istediğinizden emin misiniz?')) {
      setData([]);
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
      printQty: parseInt(formData.get('printQty') as string) || 1
    };
    handleManualAdd(newProduct);
    (e.target as HTMLFormElement).reset();
  };

  return (
    <div className="flex h-full max-w-7xl mx-auto w-full p-6 gap-6">
       
      {/* Left Sidebar */}
      <aside className="w-96 bg-white border border-slate-200 rounded-lg flex flex-col shadow-sm shrink-0 overflow-hidden">
        <div className="flex border-b border-slate-200 bg-slate-50">
          <button 
            className={cn("flex-1 py-3 text-sm font-semibold border-b-2 transition-colors", activeTab === 'upload' ? 'border-indigo-600 text-indigo-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700')}
            onClick={() => setActiveTab('upload')}
          >
            Liste ({printableData.length})
          </button>
          <button 
            className={cn("flex-1 py-3 text-sm font-semibold border-b-2 transition-colors", activeTab === 'manual' ? 'border-indigo-600 text-indigo-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700')}
            onClick={() => setActiveTab('manual')}
          >
            Yeni Ekle
          </button>
        </div>

        <div className="flex-1 overflow-y-auto w-full relative">
            {activeTab === 'upload' && (
              <div className="flex flex-col h-full inset-0 absolute">
                {printableData.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
                    <FileImage size={48} className="mb-4 text-slate-300" />
                    <p className="text-sm font-medium text-slate-600 mb-2">Henüz etiket verisi yok</p>
                    <p className="text-xs text-slate-500 mb-6 px-4">Etiket yazdırmak için veri yükleyin ya da örnek veriyi deneyin.</p>
                    <button onClick={loadExample} className="text-xs text-indigo-600 border border-indigo-200 bg-indigo-50 px-3 py-1.5 rounded-md hover:bg-indigo-100 flex gap-2 items-center">
                       <Download size={14} /> Örnek veriyi yükle
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 p-4 h-full overflow-y-auto">
                    {printableData.map((item, idx) => (
                      <div key={`${item.id}-${idx}`} className="text-left p-3 rounded-md border text-sm transition-all flex gap-3 border-slate-200 bg-white shadow-sm hover:border-slate-300">
                        <div className="font-mono bg-slate-100 text-slate-500 py-1 px-2 rounded text-xs shrink-0 h-fit border border-slate-200">
                          #{idx + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 truncate tracking-tight">{item.sku}</div>
                          <div className="text-xs text-slate-500 mt-1 truncate">{item.urunAdi || 'İsimsiz Ürün'}</div>
                          {item.paketNo && (
                            <div className="text-[10px] font-medium bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded inline-block mt-1">
                              Paket: {item.paketNo}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'manual' && (
              <form onSubmit={onSubmitManual} className="p-4 flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">SKU *</label>
                    <input name="sku" required className="w-full text-sm p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Ürün Kodu</label>
                    <input name="urunKodu" className="w-full text-sm p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Malzeme</label>
                    <input name="malzeme" className="w-full text-sm p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Ürün Adı</label>
                    <input name="urunAdi" className="w-full text-sm p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Ölçü</label>
                    <input name="olcu" className="w-full text-sm p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Parti / Lot</label>
                    <input name="partiLot" className="w-full text-sm p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Paket İçi Adet</label>
                    <input name="paketIciAdet" className="w-full text-sm p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Baskı Adedi (Kopya)</label>
                    <input name="printQty" type="number" min="1" defaultValue="1" className="w-full text-sm p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Paket No</label>
                    <input name="paketNo" placeholder="Örn: 1/4" className="w-full text-sm p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Toplam Paket</label>
                    <input name="toplamPaket" type="number" min="1" className="w-full text-sm p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Lokasyon</label>
                    <input name="lokasyon" className="w-full text-sm p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Not</label>
                    <input name="not" className="w-full text-sm p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                </div>
                <button type="submit" className="w-full mt-2 flex justify-center items-center gap-2 py-2.5 bg-slate-900 text-white rounded-md font-semibold text-sm hover:bg-slate-800 transition-colors">
                  <Plus size={16} /> Listeye Ekle
                </button>
              </form>
            )}
        </div>

        {data.length > 0 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 shrink-0">
             <button 
                onClick={clearData}
                className="w-full flex justify-center items-center gap-2 py-2 bg-white border border-red-200 text-red-600 rounded-md font-medium text-sm hover:bg-red-50 transition-colors"
             >
               <Trash2 size={16} /> Listeyi Temizle
             </button>
          </div>
        )}
      </aside>

      {/* Placeholder main info */}
      <section className="flex-1 bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col justify-center items-center p-12 text-center text-slate-500">
         <FileImage size={64} className="mb-6 opacity-20 text-slate-900" />
         <h2 className="text-2xl font-bold text-slate-800 mb-3 tracking-tight">Veri Yükleme Ekranı</h2>
         <p className="max-w-md text-sm leading-relaxed mb-6">
           Dosyanızı üst menüden yükleyebilirsiniz. Verileriniz listelendiğinde <strong>Önizleme &amp; PDF</strong> sayfasına giderek 
           etiketlerin çıktılarını kontrol edebilir ve yazdırabilirsiniz. 
           Etiketin tasarımını değiştirmek için <strong>Etiket Tasarla</strong> menüsüne tıklayın.
         </p>
         
         <div className="grid grid-cols-3 gap-6 w-full max-w-2xl mt-8">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 text-left">
              <h3 className="font-semibold text-slate-800 mb-2">1. Veri Yükle</h3>
              <p className="text-xs">Excel veya CSV dosyanızı yükleyin ve sistem sütunları otomatik eşleştirsin.</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 text-left">
              <h3 className="font-semibold text-slate-800 mb-2">2. Tasarla</h3>
              <p className="text-xs">Etiketin görsel şablonunu dilediğiniz gibi düzenleyin veya hazır şablon kullanın.</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 text-left">
              <h3 className="font-semibold text-slate-800 mb-2">3. Yazdır</h3>
              <p className="text-xs">Uyumlu PDF dosyasını oluşturup 100x100mm etiket yazıcısına gönderin.</p>
            </div>
         </div>
      </section>

    </div>
  );
}
