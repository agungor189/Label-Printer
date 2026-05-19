import React, { useState, useEffect, useCallback } from 'react';
import { Rnd } from 'react-rnd';
import { LabelTemplate, LabelElement, ProductData, LabelSettings } from '../lib/types';
import { DynamicThermalLabel } from './DynamicThermalLabel';
import { 
  Save, Trash2, Layout, Type, QrCode, Baseline as Barcode, Square, 
  ArrowLeft, ZoomIn, ZoomOut, Maximize, Copy, AlignLeft, 
  AlignCenter, AlignRight, AlignVerticalJustifyCenter, AlignVerticalSpaceAround, FileText
} from 'lucide-react';
import { cn } from '../lib/utils';
import { TEMPLATES } from '../lib/templates';

interface Props {
  template: LabelTemplate;
  onSave: (template: LabelTemplate) => void;
  sampleProduct: ProductData;
  settings: LabelSettings;
  onBack: () => void;
}

const SAFE_MARGIN = 3;

export function DesignEditor({ template: initialTemplate, onSave, sampleProduct, settings, onBack }: Props) {
  const [template, setTemplate] = useState<LabelTemplate>(initialTemplate);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(4); // 1mm = 4px
  const [rightTab, setRightTab] = useState<'properties' | 'preview'>('properties');
  
  // Undo/Redo stack
  const [history, setHistory] = useState<LabelTemplate[]>([initialTemplate]);
  const [historyPointer, setHistoryPointer] = useState<number>(0);

  const saveState = (newTemplate: LabelTemplate) => {
    const newHistory = history.slice(0, historyPointer + 1);
    newHistory.push(newTemplate);
    if(newHistory.length > 30) newHistory.shift(); // Keep last 30
    setHistory(newHistory);
    setHistoryPointer(newHistory.length - 1);
    setTemplate(newTemplate);
  };

  const undo = useCallback(() => {
    if (historyPointer > 0) {
      setHistoryPointer(historyPointer - 1);
      setTemplate(history[historyPointer - 1]);
    }
  }, [history, historyPointer]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
         if (selectedElementId && (e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
           removeElement(selectedElementId);
         }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementId, undo]);

  const addElement = (type: LabelElement['type']) => {
    const newElement: LabelElement = {
      id: crypto.randomUUID(),
      type,
      x: 10,
      y: 10,
      width: type === 'qr' ? 20 : type === 'barcode' ? 80 : 40,
      height: type === 'qr' ? 20 : type === 'line' ? 1 : 10,
      value: type === 'text' ? 'Yeni Metin' : type === 'barcode' ? '{SKU}' : type === 'qr' ? '{ALL_INFO}' : '',
      fontSize: 4,
      borderWidth: 0.5,
    };
    saveState({ ...template, elements: [...template.elements, newElement] });
    setSelectedElementId(newElement.id);
  };

  const updateElement = (id: string, updates: Partial<LabelElement>, commit: boolean = true) => {
    const updatedElements = template.elements.map(el => {
      if (el.id === id) {
         return { ...el, ...updates };
      }
      return el;
    });
    
    // Check bounds strictly
    const checkedElements = updatedElements.map(el => {
       if (el.id === id) {
          let nx = el.x;
          let ny = el.y;
          let nw = el.width;
          let nh = el.height;
          
          if (nx < 0) nx = 0;
          if (ny < 0) ny = 0;
          if (nx + nw > 100) nx = 100 - nw;
          if (ny + nh > 100) ny = 100 - nh;
          
          if (nw > 100) nw = 100;
          if (nh > 100) nh = 100;
          
          return { ...el, x: nx, y: ny, width: nw, height: nh };
       }
       return el;
    });

    const newTemplate = { ...template, elements: checkedElements };
    
    if (commit) {
       saveState(newTemplate);
    } else {
       setTemplate(newTemplate); // fast update without history
    }
  };

  const removeElement = (id: string) => {
    saveState({
      ...template,
      elements: template.elements.filter(el => el.id !== id)
    });
    if (selectedElementId === id) setSelectedElementId(null);
  };

  const selectedElement = template.elements.find(el => el.id === selectedElementId);

  // Tools
  const duplicateElement = () => {
    if (!selectedElement) return;
    const newElement = { ...selectedElement, id: crypto.randomUUID(), x: selectedElement.x + 5, y: selectedElement.y + 5 };
    saveState({ ...template, elements: [...template.elements, newElement] });
    setSelectedElementId(newElement.id);
  };

  const alignElement = (align: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    if (!selectedElement) return;
    let updates: Partial<LabelElement> = {};
    if (align === 'center') updates.x = (100 - selectedElement.width) / 2;
    if (align === 'middle') updates.y = (100 - selectedElement.height) / 2;
    if (align === 'left') updates.x = SAFE_MARGIN;
    if (align === 'right') updates.x = 100 - SAFE_MARGIN - selectedElement.width;
    if (align === 'top') updates.y = SAFE_MARGIN;
    if (align === 'bottom') updates.y = 100 - SAFE_MARGIN - selectedElement.height;
    
    updateElement(selectedElement.id, updates, true);
  };

  // Safe area checks
  const outOfBoundsCount = template.elements.filter(el => 
    el.x < SAFE_MARGIN || el.y < SAFE_MARGIN || 
    el.x + el.width > 100 - SAFE_MARGIN || el.y + el.height > 100 - SAFE_MARGIN
  ).length;

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden w-full absolute inset-0 z-40 relative">
      
      {/* Top Header */}
      <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 shadow-sm shrink-0">
         <div className="flex items-center gap-4">
           <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-md text-slate-600 transition-colors tooltip" title="Geri Dön">
             <ArrowLeft size={18} />
           </button>
           <h2 className="font-bold text-slate-800 text-sm">Etiket Tasarla</h2>
           
           <div className="h-6 w-px bg-slate-300 mx-2" />
           
           <div className="flex items-center gap-2 text-xs">
             <span className="text-slate-500 font-medium">Şablon:</span>
             <select 
                className="border border-slate-300 rounded px-2 py-1 bg-slate-50 hover:bg-white outline-none cursor-pointer text-slate-700 font-medium"
                value={template.id}
                onChange={(e) => {
                  const selected = TEMPLATES.find(t => t.id === e.target.value);
                  if (selected) {
                    if (window.confirm("Bunu seçerseniz mevcut tasarım silinecek. Emin misiniz?")) {
                      saveState(selected);
                      setSelectedElementId(null);
                    }
                  }
                }}
             >
                <option value={template.id}>{template.name} (Geçerli)</option>
                <option disabled>--- Hazır Şablonlar ---</option>
                {TEMPLATES.filter(t => t.id !== template.id).map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
             </select>
           </div>
         </div>
         
         <div className="flex items-center gap-3">
           {outOfBoundsCount > 0 && <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded">{outOfBoundsCount} obje güvenli alan dışında!</span>}
           <button onClick={() => onSave(template)} className="text-sm px-5 py-2 bg-indigo-600 text-white rounded-md font-semibold hover:bg-indigo-700 flex items-center gap-2 shadow-sm transition-colors">
             <Save size={16} /> Tasarımı Kaydet
           </button>
         </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        
        {/* LEFT PANEL: Tools */}
        <div className="w-64 bg-white flex flex-col h-full overflow-y-auto border-r border-slate-200 shrink-0 shadow-sm z-10">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50">
               <h3 className="text-xs font-bold text-slate-800 mb-3 uppercase tracking-wider text-slate-500">Objeler</h3>
               <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => addElement('text')} className="flex flex-col items-center justify-center gap-1 p-3 border border-slate-200 rounded-md text-xs hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors bg-white shadow-sm"><Type size={18} /> Metin</button>
                  <button onClick={() => addElement('barcode')} className="flex flex-col items-center justify-center gap-1 p-3 border border-slate-200 rounded-md text-xs hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors bg-white shadow-sm"><Barcode size={18} /> Barkod</button>
                  <button onClick={() => addElement('qr')} className="flex flex-col items-center justify-center gap-1 p-3 border border-slate-200 rounded-md text-xs hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors bg-white shadow-sm"><QrCode size={18} /> QR Kod</button>
                  <button onClick={() => addElement('box')} className="flex flex-col items-center justify-center gap-1 p-3 border border-slate-200 rounded-md text-xs hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors bg-white shadow-sm"><Square size={18} /> Kutu</button>
               </div>
          </div>
          
          <div className="p-4">
               <h3 className="text-xs font-bold text-slate-800 mb-3 uppercase tracking-wider text-slate-500">Dinamik Alanlar</h3>
               <div className="flex flex-col gap-1.5">
                  <button onClick={() => {
                     const el = { id: crypto.randomUUID(), type: 'text' as const, x: 10, y: 10, width: 40, height: 6, value: '{SKU}', fontSize: 4, fontWeight: 'bold' };
                     saveState({ ...template, elements: [...template.elements, el]});
                  }} className="text-left px-3 py-2 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200">SKU Ekle</button>
                  
                  <button onClick={() => {
                     const el = { id: crypto.randomUUID(), type: 'text' as const, x: 10, y: 10, width: 80, height: 10, value: '{Urun_adi}', fontSize: 3.5 };
                     saveState({ ...template, elements: [...template.elements, el]});
                  }} className="text-left px-3 py-2 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200">Ürün Adı Ekle</button>

                  <button onClick={() => {
                     const el = { id: crypto.randomUUID(), type: 'text' as const, x: 10, y: 10, width: 30, height: 5, value: 'LOT: {Parti_lot}', fontSize: 3 };
                     saveState({ ...template, elements: [...template.elements, el]});
                  }} className="text-left px-3 py-2 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200">Lot Numarası Ekle</button>
               </div>
          </div>

          <div className="p-4 mt-auto border-t border-slate-200 text-xs text-slate-400 leading-relaxed bg-slate-50">
             <strong>İpucu:</strong> Objeleri Canvas üzerinde sürükleyip bırakarak taşıyabilirsiniz. Ölçekleri mm cinsindendir.
          </div>
        </div>

        {/* MIDDLE PANEL: Canvas */}
        <div className="flex-1 bg-slate-300 flex flex-col relative overflow-hidden">
          
          {/* Zoom Toolbar */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur shadow-lg border border-slate-200 rounded-full px-4 py-2 flex items-center gap-4 z-50">
             <button onClick={() => setZoom(Math.max(1, zoom - 1))} className="p-1 hover:bg-slate-200 rounded"><ZoomOut size={16}/></button>
             <span className="text-xs font-bold text-slate-700 tabular-nums w-12 text-center">{Math.round(zoom * 25)}%</span>
             <button onClick={() => setZoom(Math.min(8, zoom + 1))} className="p-1 hover:bg-slate-200 rounded"><ZoomIn size={16}/></button>
             <div className="w-px h-4 bg-slate-300" />
             <button onClick={() => setZoom(4)} className="p-1 hover:bg-slate-200 rounded" title="Orijinal Boyut (100%)"><Maximize size={16}/></button>
          </div>

          <div 
             className="flex-1 overflow-auto relative p-8 flex items-center justify-center cursor-crosshair"
             onClick={() => setSelectedElementId(null)}
          >
             <div 
               className="bg-white shadow-2xl relative transition-transform origin-top-left"
               style={{
                 width: `${100 * zoom}px`, // 100mm
                 height: `${100 * zoom}px`, // 100mm
                 backgroundSize: `${zoom}px ${zoom}px`,
                 backgroundImage: 'linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)'
               }}
               onClick={e => e.stopPropagation()}
             >
                {/* Safe Area Visualizer */}
                <div 
                  className="absolute pointer-events-none z-0"
                  style={{
                    left: `${SAFE_MARGIN * zoom}px`,
                    top: `${SAFE_MARGIN * zoom}px`,
                    width: `${(100 - SAFE_MARGIN * 2) * zoom}px`,
                    height: `${(100 - SAFE_MARGIN * 2) * zoom}px`,
                    border: '1px dashed rgba(239, 68, 68, 0.4)'
                  }}
                />
                
                {template.elements.map(el => (
                    <Rnd
                      key={el.id}
                      size={{ width: `${Math.max(el.width, 1) * zoom}px`, height: `${Math.max(el.height, 1) * zoom}px` }}
                      position={{ x: el.x * zoom, y: el.y * zoom }}
                      dragGrid={[zoom, zoom]} 
                      resizeGrid={[zoom, zoom]} 
                      onDragStop={(e, d) => {
                        updateElement(el.id, { 
                          x: Math.round((d.x / zoom) * 10) / 10, 
                          y: Math.round((d.y / zoom) * 10) / 10 
                        }, true);
                      }}
                      onResizeStop={(e, direction, ref, delta, position) => {
                         updateElement(el.id, {
                           width: Math.round((parseFloat(ref.style.width) / zoom) * 10) / 10,
                           height: Math.round((parseFloat(ref.style.height) / zoom) * 10) / 10,
                           x: Math.round((position.x / zoom) * 10) / 10,
                           y: Math.round((position.y / zoom) * 10) / 10
                         }, true);
                      }}
                      bounds="parent"
                      onMouseDown={() => setSelectedElementId(el.id)}
                      className={cn(
                        "absolute group",
                        selectedElementId === el.id && "ring-2 ring-indigo-500 z-50 shadow-md",
                        el.type === 'box' && "border-slate-800",
                        el.type === 'line' && "bg-slate-800"
                      )}
                      style={{
                        borderWidth: el.type === 'box' ? `${(el.borderWidth || 0.5) * zoom}px` : 0,
                      }}
                    >
                       <div className="w-full h-full relative overflow-hidden pointer-events-none flex items-center justify-center">
                         {el.type === 'text' && (
                           <div style={{
                             fontSize: `${(el.fontSize || 3) * zoom}px`,
                             fontWeight: el.fontWeight === 'bold' ? 'bold' : el.fontWeight === 'black' ? 900 : 'normal',
                             textAlign: el.textAlign || 'left',
                             width: '100%',
                             lineHeight: 1.1,
                             alignItems: 'flex-start',
                             color: '#0f172a'
                           }} className="absolute top-0 left-0 whitespace-pre-wrap">
                             {el.value || 'Metin'}
                           </div>
                         )}
                         {el.type === 'barcode' && (
                           <div className="w-full h-full bg-slate-50 flex items-center justify-center border border-slate-200 text-slate-400 flex-col py-1">
                             <Barcode size={32 * (zoom/4)} />
                             <span className="text-[10px] mt-1" style={{fontSize: `${2 * zoom}px`}}>{el.value}</span>
                           </div>
                         )}
                         {el.type === 'qr' && (
                           <div className="w-full h-full bg-slate-50 flex items-center justify-center border border-slate-200 text-slate-400 flex-col">
                             <QrCode size={24 * (zoom/4)} />
                           </div>
                         )}
                       </div>
                    </Rnd>
                ))}
             </div>
          </div>
        </div>

        {/* RIGHT PANEL: Properties & Preview */}
        <div className="w-80 bg-white flex flex-col h-full z-10 border-l border-slate-200 shrink-0 shadow-sm">
           
           <div className="flex border-b border-slate-200 bg-slate-50 w-full shrink-0">
             <button 
                className={cn("flex-1 py-3 text-xs font-bold transition-colors uppercase tracking-wider", rightTab === 'properties' ? 'text-indigo-700 border-b-2 border-indigo-600 bg-white' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100')}
                onClick={() => setRightTab('properties')}
             >
                Özellikler
             </button>
             <button 
                className={cn("flex-1 py-3 text-xs font-bold transition-colors uppercase tracking-wider", rightTab === 'preview' ? 'text-indigo-700 border-b-2 border-indigo-600 bg-white' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100')}
                onClick={() => setRightTab('preview')}
             >
                Önizleme
             </button>
           </div>
           
           <div className="flex-1 overflow-y-auto">
             {rightTab === 'properties' && (
                <div className="flex flex-col h-full">
                  {selectedElement ? (
                    <div className="p-4 flex flex-col gap-5">
                       
                       <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <h3 className="font-bold text-slate-800 text-lg capitalize">{selectedElement.type} Ayarları</h3>
                       </div>

                       <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex gap-1 justify-center shadow-sm">
                          <button onClick={() => alignElement('left')} className="p-1.5 hover:bg-white hover:shadow-sm rounded border border-transparent hover:border-slate-300 text-slate-600" title="Sola Sığdır"><AlignLeft size={16} /></button>
                          <button onClick={() => alignElement('center')} className="p-1.5 hover:bg-white hover:shadow-sm rounded border border-transparent hover:border-slate-300 text-slate-600" title="Yatay Ortala"><AlignCenter size={16} /></button>
                          <button onClick={() => alignElement('right')} className="p-1.5 hover:bg-white hover:shadow-sm rounded border border-transparent hover:border-slate-300 text-slate-600" title="Sağa Sığdır"><AlignRight size={16} /></button>
                          <div className="w-px h-6 bg-slate-300 mx-1 self-center" />
                          <button onClick={() => alignElement('middle')} className="p-1.5 hover:bg-white hover:shadow-sm rounded border border-transparent hover:border-slate-300 text-slate-600" title="Dikey Ortala"><AlignVerticalJustifyCenter size={16} /></button>
                       </div>

                       <div className="grid grid-cols-2 gap-3">
                         <div>
                           <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">X (mm)</label>
                           <input type="number" step="0.5" value={selectedElement.x} onChange={e => updateElement(selectedElement.id, { x: Number(e.target.value) })} className="w-full text-sm p-2 border border-slate-300 rounded focus:border-indigo-500 outline-none" />
                         </div>
                         <div>
                           <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Y (mm)</label>
                           <input type="number" step="0.5" value={selectedElement.y} onChange={e => updateElement(selectedElement.id, { y: Number(e.target.value) })} className="w-full text-sm p-2 border border-slate-300 rounded focus:border-indigo-500 outline-none" />
                         </div>
                         <div>
                           <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Genişlik</label>
                           <input type="number" step="0.5" value={selectedElement.width} onChange={e => updateElement(selectedElement.id, { width: Number(e.target.value) })} className="w-full text-sm p-2 border border-slate-300 rounded focus:border-indigo-500 outline-none" />
                         </div>
                         <div>
                           <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Yükseklik</label>
                           <input type="number" step="0.5" value={selectedElement.height} onChange={e => updateElement(selectedElement.id, { height: Number(e.target.value) })} className="w-full text-sm p-2 border border-slate-300 rounded focus:border-indigo-500 outline-none" />
                         </div>
                       </div>

                       {(selectedElement.type === 'text' || selectedElement.type === 'barcode' || selectedElement.type === 'qr') && (
                         <div>
                           <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Değer / İçerik</label>
                           <textarea 
                             value={selectedElement.value} 
                             onChange={e => updateElement(selectedElement.id, { value: e.target.value }, false)}
                             onBlur={e => updateElement(selectedElement.id, { value: e.target.value }, true)} 
                             className="w-full text-sm p-2.5 border border-slate-300 rounded focus:border-indigo-500 outline-none resize-y min-h-[80px]"
                           />
                         </div>
                       )}

                       {selectedElement.type === 'text' && (
                         <>
                           <div className="grid grid-cols-2 gap-3">
                             <div>
                               <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Yazı Boyutu</label>
                               <input type="number" step="0.1" value={selectedElement.fontSize || 3} onChange={e => updateElement(selectedElement.id, { fontSize: Number(e.target.value) })} className="w-full text-sm p-2 border border-slate-300 rounded focus:border-indigo-500 outline-none" />
                             </div>
                             <div>
                               <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Kalınlık</label>
                               <select value={selectedElement.fontWeight || 'normal'} onChange={e => updateElement(selectedElement.id, { fontWeight: e.target.value as any })} className="w-full text-sm p-2 border border-slate-300 rounded focus:border-indigo-500 outline-none">
                                  <option value="normal">Normal</option>
                                  <option value="bold">Kalın (Bold)</option>
                                  <option value="black">Çok Kalın</option>
                               </select>
                             </div>
                           </div>
                           <div>
                               <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Hizalama</label>
                               <select value={selectedElement.textAlign || 'left'} onChange={e => updateElement(selectedElement.id, { textAlign: e.target.value as any })} className="w-full text-sm p-2 border border-slate-300 rounded focus:border-indigo-500 outline-none">
                                  <option value="left">Sola Hizala</option>
                                  <option value="center">Ortala</option>
                                  <option value="right">Sağa Hizala</option>
                               </select>
                           </div>
                         </>
                       )}

                       {(selectedElement.type === 'box' || selectedElement.type === 'line') && (
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Çizgi Kalınlığı (mm)</label>
                            <input type="number" step="0.1" value={selectedElement.borderWidth || 0.5} onChange={e => updateElement(selectedElement.id, { borderWidth: Number(e.target.value) })} className="w-full text-sm p-2 border border-slate-300 rounded focus:border-indigo-500 outline-none" />
                          </div>
                       )}

                       <div className="mt-8 pt-4 border-t border-slate-100 flex gap-2">
                           <button onClick={duplicateElement} className="flex-1 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded font-semibold text-sm flex items-center justify-center gap-2 transition-colors">
                             <Copy size={16} /> Çoğalt
                           </button>
                           <button onClick={() => removeElement(selectedElement.id)} className="flex-1 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded font-semibold text-sm flex items-center justify-center gap-2 transition-colors">
                             <Trash2 size={16} /> Sil
                           </button>
                       </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center h-full">
                      <Layout size={40} className="mb-4 opacity-50 text-slate-300" />
                      <p className="text-sm font-medium text-slate-500">Düzenlemek için<br/>kanvas üzerinden obje seçin.</p>
                    </div>
                  )}
                </div>
             )}

             {rightTab === 'preview' && (
                <div className="p-6 bg-slate-100 h-full flex flex-col items-center">
                   <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-4 align-left w-full text-center">Örnek Veri ile Canlı Çıktı</div>
                   <div className="shadow-lg border border-slate-200 ring-1 ring-black/5 bg-white shrink-0 pointer-events-none" style={{ width: '100mm', height: '100mm', zoom: 0.75 }}>
                      <DynamicThermalLabel product={sampleProduct} template={template} settings={settings} />
                   </div>
                   
                   <button 
                     onClick={async () => {
                       const { generateLabelsPDF } = await import('../lib/pdfGenerator');
                       try {
                          await generateLabelsPDF('test-pdf-export-container', 'test_etiket.pdf');
                       } catch (e) {
                          alert("Hata: " + e);
                       }
                     }}
                     className="mt-8 w-full py-2.5 bg-indigo-600 text-white rounded font-bold text-sm hover:bg-indigo-700 flex items-center justify-center gap-2 transition-colors shadow-sm"
                   >
                     <FileText size={16} /> PDF İndir (Test)
                   </button>

                   {/* Hidden element just for quick export */}
                   <div id="test-pdf-export-container" className="hidden">
                     <div className="print-label-pdf-target bg-white" style={{ width: '100mm', height: '100mm' }}>
                        <DynamicThermalLabel product={sampleProduct} template={template} settings={settings} />
                     </div>
                   </div>
                </div>
             )}
           </div>
        </div>

      </div>
    </div>
  );
}
