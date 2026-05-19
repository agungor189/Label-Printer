import React from 'react';
import { LabelSettings } from '../lib/types';

interface Props {
  settings: LabelSettings;
  setSettings: React.Dispatch<React.SetStateAction<LabelSettings>>;
}

export function SettingsView({ settings, setSettings }: Props) {
  return (
    <div className="flex-1 overflow-auto p-12 bg-slate-50 flex justify-center">
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-lg shadow-sm p-8 h-fit">
        <h2 className="text-xl font-bold text-slate-800 mb-6 pb-4 border-b border-slate-100">Genel Uygulama Ayarları</h2>
        
        <div className="flex flex-col gap-8">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 mb-4">QR Kod İçeriği Ayarları</h3>
            <div className="bg-slate-50 p-4 border border-slate-200 rounded-md space-y-4">
              <label className="flex items-center gap-3 text-sm text-slate-700 cursor-pointer">
                <input 
                  type="radio" 
                  name="qrType"
                  value="all_info"
                  checked={settings.qrType === 'all_info'}
                  onChange={() => setSettings({...settings, qrType: 'all_info'})}
                  className="text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span className="font-medium">Tam Ürün Bilgisi (Önerilen)</span>
              </label>
              <p className="text-xs text-slate-500 ml-7 -mt-2">QR kod okuttuğunda ürünün tüm verileri (SKU, İsim, Lokasyon, vb.) okunur.</p>

              <label className="flex items-center gap-3 text-sm text-slate-700 cursor-pointer">
                <input 
                  type="radio" 
                  name="qrType"
                  value="sku_only"
                  checked={settings.qrType === 'sku_only'}
                  onChange={() => setSettings({...settings, qrType: 'sku_only'})}
                  className="text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span className="font-medium">Sadece SKU (Stok Kodu)</span>
              </label>
              
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-3 text-sm text-slate-700 cursor-pointer">
                  <input 
                    type="radio" 
                    name="qrType"
                    value="custom_url"
                    checked={settings.qrType === 'custom_url'}
                    onChange={() => setSettings({...settings, qrType: 'custom_url'})}
                    className="text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <span className="font-medium">Özel URL Şablonu</span>
                </label>
                {settings.qrType === 'custom_url' && (
                  <div className="ml-7 mt-2">
                     <input 
                       type="text"
                       value={settings.qrCustomUrl}
                       onChange={(e) => setSettings({...settings, qrCustomUrl: e.target.value})}
                       className="w-full text-sm p-2.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                       placeholder="https://example.com/item/{SKU}"
                     />
                     <p className="text-xs text-slate-500 mt-2">URL içinde süslü parantez ile dinamik değer kullanabilirsiniz. Örn: <code className="bg-slate-200 px-1 rounded">{'{SKU}'}</code>, <code className="bg-slate-200 px-1 rounded">{'{Urun_kodu}'}</code></p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
