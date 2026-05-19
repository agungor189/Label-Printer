import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { LabelTemplate, LabelElement, ProductData, LabelSettings } from '../lib/types';
import { DynamicThermalLabel } from './DynamicThermalLabel';
import {
  Save, Trash2, Layout, Type, QrCode, Baseline as Barcode, Square,
  ArrowLeft, ZoomIn, ZoomOut, Maximize, Copy, AlignLeft,
  AlignCenter, AlignRight, AlignVerticalJustifyCenter, FileText,
  Undo2, Redo2, Eye, EyeOff, Lock, Unlock, Minus,
  AlignStartHorizontal, AlignEndHorizontal, AlignStartVertical, AlignEndVertical,
  Group, Ungroup, ClipboardCopy, ClipboardPaste, Layers,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { TEMPLATES } from '../lib/templates';
import { generatePdfFromDesign } from '../lib/pdfGenerator';

interface Props {
  template: LabelTemplate;
  onSave: (template: LabelTemplate) => void;
  sampleProduct: ProductData;
  settings: LabelSettings;
  onBack: () => void;
}

const SAFE_MARGIN = 3;
const HANDLE_PX = 10;

type DragMode =
  | { kind: 'none' }
  | { kind: 'marquee'; startX: number; startY: number; currentX: number; currentY: number }
  | { kind: 'move'; startMouse: { x: number; y: number }; origPositions: Record<string, { x: number; y: number }> }
  | { kind: 'resize'; id: string; handle: ResizeHandle; orig: { x: number; y: number; w: number; h: number }; startMouse: { x: number; y: number } };

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

interface Toast { id: number; type: 'success' | 'error' | 'info'; message: string; }

export function DesignEditor({ template: initialTemplate, onSave, sampleProduct, settings, onBack }: Props) {
  const [template, setTemplate] = useState<LabelTemplate>(initialTemplate);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [zoom, setZoom] = useState(4); // 1mm = N px
  const [snap, setSnap] = useState(true);
  const [gridStep, setGridStep] = useState(1); // mm
  const [drag, setDrag] = useState<DragMode>({ kind: 'none' });
  const [clipboard, setClipboard] = useState<LabelElement[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

  // History
  const [history, setHistory] = useState<LabelTemplate[]>([initialTemplate]);
  const [historyPointer, setHistoryPointer] = useState<number>(0);

  const pushHistory = useCallback((next: LabelTemplate) => {
    setHistory(h => {
      const trimmed = h.slice(0, historyPointer + 1);
      trimmed.push(next);
      if (trimmed.length > 50) trimmed.shift();
      setHistoryPointer(trimmed.length - 1);
      return trimmed;
    });
    setTemplate(next);
  }, [historyPointer]);

  const undo = useCallback(() => {
    if (historyPointer > 0) {
      const p = historyPointer - 1;
      setHistoryPointer(p);
      setTemplate(history[p]);
    }
  }, [history, historyPointer]);

  const redo = useCallback(() => {
    if (historyPointer < history.length - 1) {
      const p = historyPointer + 1;
      setHistoryPointer(p);
      setTemplate(history[p]);
    }
  }, [history, historyPointer]);

  const showToast = (type: Toast['type'], message: string) => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, type, message }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2800);
  };

  // ---- Geometry helpers ----
  const clampToCanvas = (el: LabelElement): LabelElement => {
    let { x, y, width, height } = el;
    width = Math.min(width, template.width);
    height = Math.min(height, template.height);
    x = Math.max(0, Math.min(x, template.width - width));
    y = Math.max(0, Math.min(y, template.height - height));
    return { ...el, x, y, width, height };
  };

  const snapValue = (v: number) => (snap ? Math.round(v / gridStep) * gridStep : Math.round(v * 10) / 10);

  // ---- Element ops ----
  const addElement = (partial: Partial<LabelElement> & { type: LabelElement['type'] }) => {
    const base: LabelElement = {
      id: crypto.randomUUID(),
      type: partial.type,
      x: 10,
      y: 10,
      width: partial.type === 'qr' ? 20 : partial.type === 'barcode' ? 70 : 40,
      height: partial.type === 'qr' ? 20 : partial.type === 'line' ? 0.5 : partial.type === 'barcode' ? 12 : 8,
      value: partial.type === 'text' ? 'Yeni Metin'
        : partial.type === 'barcode' ? '{SKU}'
        : partial.type === 'qr' ? '{ALL_INFO}'
        : '',
      fontSize: 3.5,
      borderWidth: partial.type === 'box' || partial.type === 'line' ? 0.4 : undefined,
      visible: true,
      locked: false,
      showBarcodeText: partial.type === 'barcode' ? true : undefined,
      ...partial,
    };
    pushHistory({ ...template, elements: [...template.elements, clampToCanvas(base)] });
    setSelectedIds([base.id]);
  };

  const updateElement = (id: string, updates: Partial<LabelElement>, commit = true) => {
    const next = {
      ...template,
      elements: template.elements.map(el => (el.id === id ? clampToCanvas({ ...el, ...updates }) : el)),
    };
    if (commit) pushHistory(next); else setTemplate(next);
  };

  const updateMany = (idsToUpdate: string[], mutator: (el: LabelElement) => Partial<LabelElement>, commit = true) => {
    const set = new Set(idsToUpdate);
    const next = {
      ...template,
      elements: template.elements.map(el => (set.has(el.id) ? clampToCanvas({ ...el, ...mutator(el) }) : el)),
    };
    if (commit) pushHistory(next); else setTemplate(next);
  };

  const removeSelected = () => {
    if (selectedIds.length === 0) return;
    pushHistory({ ...template, elements: template.elements.filter(el => !selectedIds.includes(el.id)) });
    setSelectedIds([]);
  };

  const duplicateSelected = () => {
    if (selectedIds.length === 0) return;
    const originals = template.elements.filter(el => selectedIds.includes(el.id));
    const copies = originals.map(o => ({ ...o, id: crypto.randomUUID(), x: Math.min(template.width - o.width, o.x + 3), y: Math.min(template.height - o.height, o.y + 3) }));
    pushHistory({ ...template, elements: [...template.elements, ...copies] });
    setSelectedIds(copies.map(c => c.id));
  };

  const copySelected = () => {
    const copies = template.elements.filter(el => selectedIds.includes(el.id)).map(el => ({ ...el }));
    setClipboard(copies);
    if (copies.length) showToast('info', `${copies.length} obje kopyalandı.`);
  };

  const pasteClipboard = () => {
    if (clipboard.length === 0) return;
    const pasted = clipboard.map(el => ({ ...el, id: crypto.randomUUID(), x: Math.min(template.width - el.width, el.x + 3), y: Math.min(template.height - el.height, el.y + 3) }));
    pushHistory({ ...template, elements: [...template.elements, ...pasted] });
    setSelectedIds(pasted.map(p => p.id));
  };

  const bringForward = () => {
    if (selectedIds.length === 0) return;
    const sel = new Set(selectedIds);
    const others = template.elements.filter(el => !sel.has(el.id));
    const selected = template.elements.filter(el => sel.has(el.id));
    pushHistory({ ...template, elements: [...others, ...selected] });
  };
  const sendBackward = () => {
    if (selectedIds.length === 0) return;
    const sel = new Set(selectedIds);
    const others = template.elements.filter(el => !sel.has(el.id));
    const selected = template.elements.filter(el => sel.has(el.id));
    pushHistory({ ...template, elements: [...selected, ...others] });
  };

  const toggleVisible = () => {
    if (selectedIds.length === 0) return;
    const anyHidden = template.elements.some(el => selectedIds.includes(el.id) && el.visible === false);
    updateMany(selectedIds, () => ({ visible: anyHidden ? true : false }), true);
  };
  const toggleLocked = () => {
    if (selectedIds.length === 0) return;
    const anyUnlocked = template.elements.some(el => selectedIds.includes(el.id) && !el.locked);
    updateMany(selectedIds, () => ({ locked: anyUnlocked ? true : false }), true);
  };

  // Alignment (group-aware)
  const alignSelection = (mode: 'left' | 'h-center' | 'right' | 'top' | 'v-center' | 'bottom') => {
    if (selectedIds.length === 0) return;
    const sel = template.elements.filter(el => selectedIds.includes(el.id));
    if (sel.length === 1) {
      // Align to canvas safe area
      const el = sel[0];
      const updates: Partial<LabelElement> = {};
      if (mode === 'left') updates.x = SAFE_MARGIN;
      if (mode === 'right') updates.x = template.width - SAFE_MARGIN - el.width;
      if (mode === 'h-center') updates.x = (template.width - el.width) / 2;
      if (mode === 'top') updates.y = SAFE_MARGIN;
      if (mode === 'bottom') updates.y = template.height - SAFE_MARGIN - el.height;
      if (mode === 'v-center') updates.y = (template.height - el.height) / 2;
      updateElement(el.id, updates, true);
      return;
    }
    // Multi: align within selection bounding box
    const minX = Math.min(...sel.map(e => e.x));
    const maxX = Math.max(...sel.map(e => e.x + e.width));
    const minY = Math.min(...sel.map(e => e.y));
    const maxY = Math.max(...sel.map(e => e.y + e.height));
    updateMany(selectedIds, el => {
      if (mode === 'left') return { x: minX };
      if (mode === 'right') return { x: maxX - el.width };
      if (mode === 'h-center') return { x: (minX + maxX) / 2 - el.width / 2 };
      if (mode === 'top') return { y: minY };
      if (mode === 'bottom') return { y: maxY - el.height };
      if (mode === 'v-center') return { y: (minY + maxY) / 2 - el.height / 2 };
      return {};
    }, true);
  };

  // ---- Canvas pointer handling ----
  const canvasMouse = (e: React.MouseEvent): { x: number; y: number } => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / zoom, y: (e.clientY - rect.top) / zoom };
  };

  const hitTestElement = (x: number, y: number): LabelElement | null => {
    // Topmost first (we render last on top)
    for (let i = template.elements.length - 1; i >= 0; i--) {
      const el = template.elements[i];
      if (el.visible === false) continue;
      const w = Math.max(el.width, 2); // small lines still selectable
      const h = Math.max(el.height, 2);
      if (x >= el.x && x <= el.x + w && y >= el.y && y <= el.y + h) return el;
    }
    return null;
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (editingTextId) return; // let inline edit take focus
    const target = e.target as HTMLElement;
    const handleAttr = target.closest('[data-handle]')?.getAttribute('data-handle') as ResizeHandle | null;
    const elIdAttr = target.closest('[data-element-id]')?.getAttribute('data-element-id');

    const { x, y } = canvasMouse(e);

    // Resize handle (single-selection only)
    if (handleAttr && selectedIds.length === 1) {
      const id = selectedIds[0];
      const el = template.elements.find(x => x.id === id);
      if (el && !el.locked) {
        setDrag({
          kind: 'resize',
          id,
          handle: handleAttr,
          orig: { x: el.x, y: el.y, w: el.width, h: el.height },
          startMouse: { x, y },
        });
        e.preventDefault();
        return;
      }
    }

    // Clicked on an element body
    if (elIdAttr) {
      const el = template.elements.find(x => x.id === elIdAttr);
      if (!el) return;
      let nextSelected = selectedIds;
      if (e.shiftKey || e.metaKey || e.ctrlKey) {
        nextSelected = selectedIds.includes(el.id)
          ? selectedIds.filter(id => id !== el.id)
          : [...selectedIds, el.id];
      } else if (!selectedIds.includes(el.id)) {
        nextSelected = [el.id];
      }
      setSelectedIds(nextSelected);
      // If clicked element is locked, do not start move
      if (template.elements.find(e2 => e2.id === el.id)?.locked) return;
      const origPositions: Record<string, { x: number; y: number }> = {};
      template.elements.forEach(e2 => {
        if (nextSelected.includes(e2.id)) origPositions[e2.id] = { x: e2.x, y: e2.y };
      });
      setDrag({ kind: 'move', startMouse: { x, y }, origPositions });
      e.preventDefault();
      return;
    }

    // Empty canvas: start marquee selection
    if (!(e.shiftKey || e.metaKey || e.ctrlKey)) setSelectedIds([]);
    setDrag({ kind: 'marquee', startX: x, startY: y, currentX: x, currentY: y });
    e.preventDefault();
  };

  const handleWindowMouseMove = useCallback((e: MouseEvent) => {
    if (drag.kind === 'none') return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = (e.clientX - rect.left) / zoom;
    const my = (e.clientY - rect.top) / zoom;

    if (drag.kind === 'marquee') {
      setDrag({ ...drag, currentX: mx, currentY: my });
    } else if (drag.kind === 'move') {
      const dx = mx - drag.startMouse.x;
      const dy = my - drag.startMouse.y;
      // Apply delta to all selected (excluding locked)
      const next = {
        ...template,
        elements: template.elements.map(el => {
          if (!selectedIds.includes(el.id)) return el;
          if (el.locked) return el;
          const orig = drag.origPositions[el.id];
          if (!orig) return el;
          const nx = snapValue(orig.x + dx);
          const ny = snapValue(orig.y + dy);
          return clampToCanvas({ ...el, x: nx, y: ny });
        }),
      };
      setTemplate(next);
    } else if (drag.kind === 'resize') {
      const dx = mx - drag.startMouse.x;
      const dy = my - drag.startMouse.y;
      let { x, y, w, h } = drag.orig;
      const handle = drag.handle;
      if (handle.includes('e')) w = Math.max(2, drag.orig.w + dx);
      if (handle.includes('s')) h = Math.max(1, drag.orig.h + dy);
      if (handle.includes('w')) { w = Math.max(2, drag.orig.w - dx); x = drag.orig.x + (drag.orig.w - w); }
      if (handle.includes('n')) { h = Math.max(1, drag.orig.h - dy); y = drag.orig.y + (drag.orig.h - h); }
      const next = {
        ...template,
        elements: template.elements.map(el => el.id === drag.id ? clampToCanvas({
          ...el,
          x: snapValue(x),
          y: snapValue(y),
          width: snapValue(w),
          height: snapValue(h),
        }) : el),
      };
      setTemplate(next);
    }
  }, [drag, selectedIds, snap, template, zoom, gridStep]);

  const handleWindowMouseUp = useCallback(() => {
    if (drag.kind === 'marquee') {
      const x1 = Math.min(drag.startX, drag.currentX);
      const x2 = Math.max(drag.startX, drag.currentX);
      const y1 = Math.min(drag.startY, drag.currentY);
      const y2 = Math.max(drag.startY, drag.currentY);
      const hits = template.elements
        .filter(el => el.visible !== false)
        .filter(el => el.x + el.width >= x1 && el.x <= x2 && el.y + el.height >= y1 && el.y <= y2)
        .map(el => el.id);
      setSelectedIds(prev => {
        // If marquee was started without modifier, prev is already []
        const combined = new Set([...prev, ...hits]);
        return Array.from(combined);
      });
    } else if (drag.kind === 'move' || drag.kind === 'resize') {
      // Commit current template to history
      pushHistory(template);
    }
    setDrag({ kind: 'none' });
  }, [drag, template, pushHistory]);

  useEffect(() => {
    if (drag.kind === 'none') return;
    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [drag.kind, handleWindowMouseMove, handleWindowMouseUp]);

  // ---- Keyboard shortcuts ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isEditing = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable;
      if (isEditing) return;

      const mod = e.ctrlKey || e.metaKey;

      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
      if (mod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); redo(); return; }
      if (mod && e.key.toLowerCase() === 'a') { e.preventDefault(); setSelectedIds(template.elements.map(el => el.id)); return; }
      if (mod && e.key.toLowerCase() === 'c') { e.preventDefault(); copySelected(); return; }
      if (mod && e.key.toLowerCase() === 'v') { e.preventDefault(); pasteClipboard(); return; }
      if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicateSelected(); return; }
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); removeSelected(); return; }

      // Arrow keys move selection
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) && selectedIds.length > 0) {
        e.preventDefault();
        const step = e.shiftKey ? 5 : (snap ? gridStep : 0.5);
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        updateMany(selectedIds, el => el.locked ? {} : ({ x: el.x + dx, y: el.y + dy }), true);
      }

      if (e.key === 'Escape') setSelectedIds([]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [template, selectedIds, snap, gridStep, undo, redo]);

  // ---- Derived ----
  const selectedElements = useMemo(
    () => template.elements.filter(el => selectedIds.includes(el.id)),
    [template, selectedIds]
  );

  const selectionBBox = useMemo(() => {
    if (selectedElements.length === 0) return null;
    const minX = Math.min(...selectedElements.map(e => e.x));
    const minY = Math.min(...selectedElements.map(e => e.y));
    const maxX = Math.max(...selectedElements.map(e => e.x + e.width));
    const maxY = Math.max(...selectedElements.map(e => e.y + e.height));
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }, [selectedElements]);

  const outOfBoundsCount = template.elements.filter(el =>
    el.visible !== false && (
      el.x < SAFE_MARGIN || el.y < SAFE_MARGIN ||
      el.x + el.width > template.width - SAFE_MARGIN ||
      el.y + el.height > template.height - SAFE_MARGIN
    )
  ).length;

  // ---- Save / export ----
  const handleSave = () => {
    onSave(template);
    showToast('success', 'Tasarım kaydedildi.');
  };

  const handleTestPdf = async () => {
    setIsGenerating(true);
    try {
      const product = sampleProduct;
      await generatePdfFromDesign([product], template, settings, { filename: 'test_etiket.pdf' });
      showToast('success', 'Test PDF oluşturuldu.');
    } catch (e: any) {
      showToast('error', e?.message || 'PDF oluşturulamadı.');
    } finally {
      setIsGenerating(false);
    }
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${template.id || 'tasarim'}.json`; a.click();
    URL.revokeObjectURL(url);
    showToast('success', 'Tasarım JSON olarak indirildi.');
  };

  const importJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string) as LabelTemplate;
        if (!parsed.elements || !Array.isArray(parsed.elements)) throw new Error('Geçersiz tasarım dosyası');
        pushHistory(parsed);
        setSelectedIds([]);
        showToast('success', 'Tasarım içe aktarıldı.');
      } catch (err: any) {
        showToast('error', 'Tasarım yüklenemedi: ' + err.message);
      }
    };
    reader.readAsText(f);
    e.target.value = '';
  };

  // ---- Render helpers ----
  const renderElementBody = (el: LabelElement) => {
    const editing = editingTextId === el.id;
    if (el.type === 'text' || el.type === 'logo') {
      if (editing) {
        return (
          <textarea
            autoFocus
            defaultValue={el.value}
            onBlur={(e) => { updateElement(el.id, { value: e.target.value }, true); setEditingTextId(null); }}
            onKeyDown={(e) => { if (e.key === 'Escape') setEditingTextId(null); }}
            style={{
              width: '100%', height: '100%',
              fontSize: `${(el.fontSize || 3) * zoom}px`,
              fontWeight: el.fontWeight === 'bold' || el.fontWeight === 'black' ? 'bold' : 'normal',
              lineHeight: 1.1,
              textAlign: el.textAlign || 'left',
              border: 'none', outline: '2px solid #4f46e5', padding: 0, margin: 0, resize: 'none', background: '#fefce8',
            }}
          />
        );
      }
      return (
        <div style={{
          width: '100%', height: '100%',
          fontSize: `${(el.fontSize || 3) * zoom}px`,
          fontWeight: el.fontWeight === 'bold' || el.fontWeight === 'black' ? 'bold' : 'normal',
          lineHeight: 1.1,
          textAlign: el.textAlign || 'left',
          color: '#0f172a',
          whiteSpace: 'pre-wrap',
          overflow: 'hidden',
        }}>
          {el.value || 'Metin'}
        </div>
      );
    }
    if (el.type === 'box') {
      return <div style={{ width: '100%', height: '100%', border: `${Math.max(1, (el.borderWidth || 0.4) * zoom)}px solid #0f172a`, boxSizing: 'border-box' }} />;
    }
    if (el.type === 'line') {
      const horizontal = el.width >= el.height;
      return (
        <div style={{
          position: 'absolute',
          left: 0, top: 0,
          width: '100%', height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={horizontal
            ? { width: '100%', height: `${Math.max(1, (el.borderWidth || 0.4) * zoom)}px`, background: '#0f172a' }
            : { width: `${Math.max(1, (el.borderWidth || 0.4) * zoom)}px`, height: '100%', background: '#0f172a' }} />
        </div>
      );
    }
    if (el.type === 'barcode') {
      return (
        <div style={{ width: '100%', height: '100%', background: 'repeating-linear-gradient(90deg,#000 0 2px,#fff 2px 4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
          <div style={{ background: 'white', fontSize: `${Math.max(8, zoom * 2)}px`, fontFamily: 'monospace', padding: '0 2px' }}>
            {el.value}
          </div>
        </div>
      );
    }
    if (el.type === 'qr') {
      return (
        <div style={{ width: '100%', height: '100%', display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gridTemplateRows: 'repeat(8,1fr)', background: 'white', border: '1px solid #ddd' }}>
          {Array.from({ length: 64 }).map((_, i) => (
            <div key={i} style={{ background: ((i * 31) % 7 < 3) ? '#0f172a' : 'transparent' }} />
          ))}
        </div>
      );
    }
    return null;
  };

  const handleStyleFor = (handle: ResizeHandle): React.CSSProperties => {
    const sz = HANDLE_PX;
    const half = sz / 2;
    const pos: React.CSSProperties = { position: 'absolute', width: sz, height: sz, background: '#fff', border: '1.5px solid #4f46e5', borderRadius: 2, zIndex: 60 };
    if (handle.includes('n')) (pos as any).top = -half;
    if (handle.includes('s')) (pos as any).bottom = -half;
    if (handle.includes('w')) (pos as any).left = -half;
    if (handle.includes('e')) (pos as any).right = -half;
    if (handle === 'n' || handle === 's') (pos as any).left = '50%', (pos as any).marginLeft = -half;
    if (handle === 'e' || handle === 'w') (pos as any).top = '50%', (pos as any).marginTop = -half;
    const cursors: Record<ResizeHandle, string> = {
      nw: 'nwse-resize', se: 'nwse-resize',
      ne: 'nesw-resize', sw: 'nesw-resize',
      n: 'ns-resize', s: 'ns-resize',
      e: 'ew-resize', w: 'ew-resize',
    };
    pos.cursor = cursors[handle];
    return pos;
  };

  // ---- UI ----
  const tplPx = template.width * zoom;

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden w-full absolute inset-0 z-40">

      {/* Top toolbar */}
      <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-md text-slate-600" title="Geri Dön">
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
                  if (window.confirm('Bunu seçerseniz mevcut tasarım silinecek. Emin misiniz?')) {
                    pushHistory(JSON.parse(JSON.stringify(selected)));
                    setSelectedIds([]);
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

          <div className="h-6 w-px bg-slate-300 mx-2" />

          <div className="flex items-center gap-1">
            <button onClick={undo} disabled={historyPointer <= 0} className="p-1.5 hover:bg-slate-100 rounded disabled:opacity-40" title="Geri Al (Cmd+Z)"><Undo2 size={16} /></button>
            <button onClick={redo} disabled={historyPointer >= history.length - 1} className="p-1.5 hover:bg-slate-100 rounded disabled:opacity-40" title="İleri Al (Cmd+Shift+Z)"><Redo2 size={16} /></button>
            <div className="h-5 w-px bg-slate-300 mx-1" />
            <button onClick={copySelected} disabled={selectedIds.length === 0} className="p-1.5 hover:bg-slate-100 rounded disabled:opacity-40" title="Kopyala (Cmd+C)"><ClipboardCopy size={16} /></button>
            <button onClick={pasteClipboard} disabled={clipboard.length === 0} className="p-1.5 hover:bg-slate-100 rounded disabled:opacity-40" title="Yapıştır (Cmd+V)"><ClipboardPaste size={16} /></button>
            <button onClick={duplicateSelected} disabled={selectedIds.length === 0} className="p-1.5 hover:bg-slate-100 rounded disabled:opacity-40" title="Çoğalt (Cmd+D)"><Copy size={16} /></button>
            <button onClick={removeSelected} disabled={selectedIds.length === 0} className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded disabled:opacity-40" title="Sil (Delete)"><Trash2 size={16} /></button>
            <div className="h-5 w-px bg-slate-300 mx-1" />
            <button onClick={() => alignSelection('left')}     disabled={selectedIds.length === 0} className="p-1.5 hover:bg-slate-100 rounded disabled:opacity-40" title="Sola hizala"><AlignStartVertical size={16} /></button>
            <button onClick={() => alignSelection('h-center')} disabled={selectedIds.length === 0} className="p-1.5 hover:bg-slate-100 rounded disabled:opacity-40" title="Yatay ortala"><AlignCenter size={16} /></button>
            <button onClick={() => alignSelection('right')}    disabled={selectedIds.length === 0} className="p-1.5 hover:bg-slate-100 rounded disabled:opacity-40" title="Sağa hizala"><AlignEndVertical size={16} /></button>
            <button onClick={() => alignSelection('top')}      disabled={selectedIds.length === 0} className="p-1.5 hover:bg-slate-100 rounded disabled:opacity-40" title="Üste hizala"><AlignStartHorizontal size={16} /></button>
            <button onClick={() => alignSelection('v-center')} disabled={selectedIds.length === 0} className="p-1.5 hover:bg-slate-100 rounded disabled:opacity-40" title="Dikey ortala"><AlignVerticalJustifyCenter size={16} /></button>
            <button onClick={() => alignSelection('bottom')}   disabled={selectedIds.length === 0} className="p-1.5 hover:bg-slate-100 rounded disabled:opacity-40" title="Alta hizala"><AlignEndHorizontal size={16} /></button>
            <div className="h-5 w-px bg-slate-300 mx-1" />
            <button onClick={bringForward} disabled={selectedIds.length === 0} className="p-1.5 hover:bg-slate-100 rounded disabled:opacity-40" title="Öne getir"><Layers size={16} /></button>
            <button onClick={sendBackward} disabled={selectedIds.length === 0} className="p-1.5 hover:bg-slate-100 rounded disabled:opacity-40" title="Arkaya gönder"><Layers size={16} style={{ transform: 'scaleY(-1)' }} /></button>
            <button onClick={toggleVisible} disabled={selectedIds.length === 0} className="p-1.5 hover:bg-slate-100 rounded disabled:opacity-40" title="Göster/Gizle">
              {selectedElements.some(e => e.visible === false) ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <button onClick={toggleLocked} disabled={selectedIds.length === 0} className="p-1.5 hover:bg-slate-100 rounded disabled:opacity-40" title="Kilitle/Aç">
              {selectedElements.some(e => e.locked) ? <Lock size={16} /> : <Unlock size={16} />}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {outOfBoundsCount > 0 && (
            <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
              {outOfBoundsCount} obje güvenli alan dışında
            </span>
          )}
          <button onClick={handleTestPdf} disabled={isGenerating} className="text-sm px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium flex items-center gap-2">
            <FileText size={16} /> {isGenerating ? 'PDF...' : 'Test PDF'}
          </button>
          <button onClick={handleSave} className="text-sm px-4 py-2 bg-indigo-600 text-white rounded-md font-semibold hover:bg-indigo-700 flex items-center gap-2 shadow-sm">
            <Save size={16} /> Tasarımı Kaydet
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* LEFT PANEL */}
        <div className="w-64 bg-white flex flex-col h-full overflow-y-auto border-r border-slate-200 shrink-0 shadow-sm z-10">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50">
            <h3 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">Objeler</h3>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => addElement({ type: 'text' })}    className="flex flex-col items-center gap-1 p-3 border border-slate-200 rounded-md text-xs hover:bg-indigo-50 bg-white shadow-sm"><Type size={18} /> Metin</button>
              <button onClick={() => addElement({ type: 'barcode' })} className="flex flex-col items-center gap-1 p-3 border border-slate-200 rounded-md text-xs hover:bg-indigo-50 bg-white shadow-sm"><Barcode size={18} /> Barkod</button>
              <button onClick={() => addElement({ type: 'qr' })}      className="flex flex-col items-center gap-1 p-3 border border-slate-200 rounded-md text-xs hover:bg-indigo-50 bg-white shadow-sm"><QrCode size={18} /> QR Kod</button>
              <button onClick={() => addElement({ type: 'box' })}     className="flex flex-col items-center gap-1 p-3 border border-slate-200 rounded-md text-xs hover:bg-indigo-50 bg-white shadow-sm"><Square size={18} /> Kutu</button>
              <button onClick={() => addElement({ type: 'line', width: 60, height: 0.5 })} className="flex flex-col items-center gap-1 p-3 border border-slate-200 rounded-md text-xs hover:bg-indigo-50 bg-white shadow-sm col-span-2"><Minus size={18} /> Çizgi</button>
            </div>
          </div>

          <div className="p-4 border-b border-slate-200">
            <h3 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">Dinamik Alanlar</h3>
            <div className="flex flex-col gap-1.5">
              {[
                { lbl: 'SKU', val: '{SKU}' },
                { lbl: 'Ürün Kodu', val: '{Urun_kodu}' },
                { lbl: 'Malzeme', val: '{Malzeme}' },
                { lbl: 'Tip', val: '{Tip}' },
                { lbl: 'Ölçü', val: '{Olcu}' },
                { lbl: 'Ürün Adı', val: '{Urun_adi}' },
                { lbl: 'Parti / Lot', val: '{Parti_Lot}' },
                { lbl: 'Paket içi adet', val: '{Paket_ici_adet}' },
                { lbl: 'Paket No', val: '{Paket_no}' },
                { lbl: 'Ürün ağırlığı', val: '{Urun_agirligi}' },
                { lbl: 'Kutu ağırlığı', val: '{Kutu_agirligi}' },
              ].map(f => (
                <button key={f.val} onClick={() => addElement({ type: 'text', value: f.val, width: 40, height: 5, fontSize: 3 })} className="text-left px-3 py-2 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200">
                  {f.lbl}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 border-b border-slate-200">
            <h3 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">Tasarım Dosyası</h3>
            <button onClick={exportJson} className="w-full mb-2 text-xs py-2 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 font-medium">JSON Olarak Dışa Aktar</button>
            <label className="block w-full text-xs py-2 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 font-medium text-center cursor-pointer">
              JSON İçe Aktar
              <input type="file" accept=".json" className="hidden" onChange={importJson} />
            </label>
          </div>

          <div className="p-4 text-xs text-slate-500 leading-relaxed bg-slate-50 mt-auto">
            <div className="font-bold mb-1 text-slate-600">Kısayollar</div>
            Cmd/Ctrl+A: Tümünü seç · Cmd/Ctrl+C/V/D · Delete: Sil · Ok tuşları: Taşı · Shift+Ok: 5 mm
          </div>
        </div>

        {/* CANVAS */}
        <div className="flex-1 bg-slate-300 flex flex-col relative overflow-hidden">
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur shadow-md border border-slate-200 rounded-full px-3 py-1 flex items-center gap-3 z-50 text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={snap} onChange={e => setSnap(e.target.checked)} /> Snap
            </label>
            <span className="text-slate-300">|</span>
            <label className="flex items-center gap-1.5">
              Grid:
              <select value={gridStep} onChange={e => setGridStep(Number(e.target.value))} className="border border-slate-300 rounded px-1 py-0.5">
                <option value={0.5}>0.5 mm</option>
                <option value={1}>1 mm</option>
                <option value={2}>2 mm</option>
                <option value={5}>5 mm</option>
              </select>
            </label>
            <span className="text-slate-300">|</span>
            <span className="text-slate-600">{selectedIds.length === 0 ? 'Seçim yok' : `${selectedIds.length} seçili`}</span>
          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur shadow-lg border border-slate-200 rounded-full px-4 py-2 flex items-center gap-3 z-50">
            <button onClick={() => setZoom(Math.max(2, zoom - 1))} className="p-1 hover:bg-slate-200 rounded"><ZoomOut size={16}/></button>
            <span className="text-xs font-bold text-slate-700 tabular-nums w-12 text-center">{Math.round(zoom * 25)}%</span>
            <button onClick={() => setZoom(Math.min(10, zoom + 1))} className="p-1 hover:bg-slate-200 rounded"><ZoomIn size={16}/></button>
            <div className="w-px h-4 bg-slate-300" />
            <button onClick={() => setZoom(4)} className="p-1 hover:bg-slate-200 rounded" title="100%"><Maximize size={16}/></button>
          </div>

          <div className="flex-1 overflow-auto relative p-10 flex items-center justify-center">
            <div
              ref={canvasRef}
              className="bg-white shadow-2xl relative select-none"
              style={{
                width: `${tplPx}px`,
                height: `${template.height * zoom}px`,
                backgroundSize: `${zoom * gridStep}px ${zoom * gridStep}px`,
                backgroundImage: 'linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)',
                cursor: drag.kind === 'marquee' ? 'crosshair' : 'default',
              }}
              onMouseDown={handleCanvasMouseDown}
              onDoubleClick={(e) => {
                const elId = (e.target as HTMLElement).closest('[data-element-id]')?.getAttribute('data-element-id');
                if (!elId) return;
                const el = template.elements.find(x => x.id === elId);
                if (el && (el.type === 'text' || el.type === 'logo') && !el.locked) {
                  setEditingTextId(el.id);
                }
              }}
            >
              {/* Safe area */}
              <div className="absolute pointer-events-none z-0" style={{
                left: `${SAFE_MARGIN * zoom}px`,
                top: `${SAFE_MARGIN * zoom}px`,
                width: `${(template.width - SAFE_MARGIN * 2) * zoom}px`,
                height: `${(template.height - SAFE_MARGIN * 2) * zoom}px`,
                border: '1px dashed rgba(239, 68, 68, 0.4)',
              }} />

              {/* Elements */}
              {template.elements.map(el => {
                const selected = selectedIds.includes(el.id);
                if (el.visible === false) {
                  return (
                    <div key={el.id}
                      data-element-id={el.id}
                      style={{ position: 'absolute', left: el.x * zoom, top: el.y * zoom, width: el.width * zoom, height: el.height * zoom, border: '1px dashed #94a3b8', opacity: 0.35, pointerEvents: 'auto', cursor: 'pointer' }}
                    />
                  );
                }
                return (
                  <div
                    key={el.id}
                    data-element-id={el.id}
                    style={{
                      position: 'absolute',
                      left: el.x * zoom,
                      top: el.y * zoom,
                      width: el.width * zoom,
                      height: el.height * zoom,
                      cursor: el.locked ? 'not-allowed' : (selected ? 'move' : 'pointer'),
                      outline: selected ? '2px solid #4f46e5' : 'none',
                      outlineOffset: '0px',
                      boxShadow: selected ? '0 0 0 1px rgba(79,70,229,0.2)' : 'none',
                      background: 'transparent',
                    }}
                    title={el.locked ? 'Kilitli' : undefined}
                  >
                    {renderElementBody(el)}
                    {/* Resize handles only when single-selected and unlocked */}
                    {selected && selectedIds.length === 1 && !el.locked && (['nw','n','ne','e','se','s','sw','w'] as ResizeHandle[]).map(h => (
                      <div key={h} data-handle={h} style={handleStyleFor(h)} />
                    ))}
                  </div>
                );
              })}

              {/* Group selection rectangle (multi-select) */}
              {selectionBBox && selectedIds.length > 1 && (
                <div style={{
                  position: 'absolute',
                  left: selectionBBox.x * zoom,
                  top: selectionBBox.y * zoom,
                  width: selectionBBox.width * zoom,
                  height: selectionBBox.height * zoom,
                  border: '2px dashed #4f46e5',
                  pointerEvents: 'none',
                  zIndex: 55,
                }} />
              )}

              {/* Marquee */}
              {drag.kind === 'marquee' && (
                <div style={{
                  position: 'absolute',
                  left: Math.min(drag.startX, drag.currentX) * zoom,
                  top: Math.min(drag.startY, drag.currentY) * zoom,
                  width: Math.abs(drag.currentX - drag.startX) * zoom,
                  height: Math.abs(drag.currentY - drag.startY) * zoom,
                  background: 'rgba(79,70,229,0.08)',
                  border: '1px solid #4f46e5',
                  pointerEvents: 'none',
                  zIndex: 70,
                }} />
              )}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="w-80 bg-white flex flex-col h-full z-10 border-l border-slate-200 shrink-0 shadow-sm overflow-y-auto">
          <RightPanel
            selectedElements={selectedElements}
            template={template}
            onUpdate={updateElement}
            onUpdateMany={updateMany}
            sampleProduct={sampleProduct}
            settings={settings}
            zoom={zoom}
            snap={snap}
            setSnap={setSnap}
          />
        </div>
      </div>

      {/* Toasts */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id} className={cn('px-4 py-2 rounded shadow-lg text-sm text-white animate-fade-in',
            t.type === 'success' ? 'bg-emerald-600' : t.type === 'error' ? 'bg-red-600' : 'bg-slate-700')}>
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}

// ===========================================================
// Right Panel — context-sensitive (no selection, 1, N)
// ===========================================================
interface RightPanelProps {
  selectedElements: LabelElement[];
  template: LabelTemplate;
  onUpdate: (id: string, updates: Partial<LabelElement>, commit?: boolean) => void;
  onUpdateMany: (ids: string[], mutator: (el: LabelElement) => Partial<LabelElement>, commit?: boolean) => void;
  sampleProduct: ProductData;
  settings: LabelSettings;
  zoom: number;
  snap: boolean;
  setSnap: (v: boolean) => void;
}

function RightPanel({ selectedElements, template, onUpdate, sampleProduct, settings }: RightPanelProps) {
  if (selectedElements.length === 0) {
    return (
      <div className="p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-3">Etiket Ayarları</h3>
        <div className="text-xs text-slate-500 space-y-2 bg-slate-50 border border-slate-200 rounded p-3">
          <div><span className="font-semibold text-slate-600">Etiket Ölçüsü:</span> {template.width} x {template.height} mm</div>
          <div><span className="font-semibold text-slate-600">Güvenli Alan:</span> 3 mm</div>
          <div><span className="font-semibold text-slate-600">Obje Sayısı:</span> {template.elements.length}</div>
          <div><span className="font-semibold text-slate-600">Şablon:</span> {template.name}</div>
        </div>

        <div className="mt-6">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Canlı Önizleme</h3>
          <div className="border border-slate-200 bg-white rounded overflow-hidden flex items-center justify-center" style={{ height: 280 }}>
            <div className="origin-top-left" style={{ transform: 'scale(0.7)', transformOrigin: 'top left', width: '100mm', height: '100mm' }}>
              <DynamicThermalLabel product={sampleProduct} template={template} settings={settings} />
            </div>
          </div>
        </div>

        <div className="mt-6 text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded p-3">
          <strong className="text-amber-700">İpucu:</strong> Canvas üzerine tıklayıp sürükleyerek birden fazla obje seçebilirsiniz. Shift / Cmd+Click ile çoklu seçim.
        </div>
      </div>
    );
  }

  if (selectedElements.length > 1) {
    return (
      <div className="p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-1">{selectedElements.length} obje seçili</h3>
        <p className="text-xs text-slate-500 mb-4">Grup işlemleri toolbardan yapılabilir. Çoklu seçili objeler birlikte taşınır, kopyalanır, silinir.</p>

        <ul className="text-xs space-y-1 max-h-48 overflow-y-auto bg-slate-50 border border-slate-200 rounded p-2">
          {selectedElements.map(el => (
            <li key={el.id} className="flex items-center justify-between">
              <span className="text-slate-700">{el.type} — {el.value?.slice(0, 18)}</span>
              <span className="text-slate-400 tabular-nums">{el.x.toFixed(1)},{el.y.toFixed(1)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Canlı Önizleme</h3>
          <div className="border border-slate-200 bg-white rounded overflow-hidden flex items-center justify-center" style={{ height: 280 }}>
            <div className="origin-top-left" style={{ transform: 'scale(0.7)', transformOrigin: 'top left', width: '100mm', height: '100mm' }}>
              <DynamicThermalLabel product={sampleProduct} template={template} settings={settings} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const el = selectedElements[0];

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h3 className="font-bold text-slate-800 text-base capitalize">{el.type} Ayarları</h3>
        <div className="flex items-center gap-1 text-xs">
          <button onClick={() => onUpdate(el.id, { visible: el.visible === false ? true : false }, true)} className="p-1.5 hover:bg-slate-100 rounded" title="Göster/Gizle">
            {el.visible === false ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <button onClick={() => onUpdate(el.id, { locked: !el.locked }, true)} className="p-1.5 hover:bg-slate-100 rounded" title="Kilitle/Aç">
            {el.locked ? <Lock size={14} /> : <Unlock size={14} />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <NumberField label="X (mm)" value={el.x} onChange={v => onUpdate(el.id, { x: v }, true)} />
        <NumberField label="Y (mm)" value={el.y} onChange={v => onUpdate(el.id, { y: v }, true)} />
        <NumberField label="Genişlik" value={el.width} onChange={v => onUpdate(el.id, { width: v }, true)} />
        <NumberField label="Yükseklik" value={el.height} onChange={v => onUpdate(el.id, { height: v }, true)} />
      </div>

      {(el.type === 'text' || el.type === 'barcode' || el.type === 'qr' || el.type === 'logo') && (
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Değer / İçerik</label>
          <textarea
            value={el.value}
            onChange={e => onUpdate(el.id, { value: e.target.value }, false)}
            onBlur={e => onUpdate(el.id, { value: e.target.value }, true)}
            className="w-full text-sm p-2.5 border border-slate-300 rounded focus:border-indigo-500 outline-none resize-y min-h-[64px]"
          />
        </div>
      )}

      {(el.type === 'text' || el.type === 'logo') && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Yazı Boyutu (mm)" value={el.fontSize || 3} onChange={v => onUpdate(el.id, { fontSize: v }, true)} step={0.1} />
            <SelectField label="Kalınlık" value={el.fontWeight || 'normal'} onChange={v => onUpdate(el.id, { fontWeight: v as any }, true)} options={[
              { value: 'normal', label: 'Normal' },
              { value: 'bold', label: 'Kalın' },
              { value: 'black', label: 'Çok Kalın' },
            ]} />
          </div>
          <SelectField label="Hizalama" value={el.textAlign || 'left'} onChange={v => onUpdate(el.id, { textAlign: v as any }, true)} options={[
            { value: 'left', label: 'Sola Hizala' },
            { value: 'center', label: 'Ortala' },
            { value: 'right', label: 'Sağa Hizala' },
          ]} />
        </>
      )}

      {(el.type === 'box' || el.type === 'line') && (
        <NumberField label="Çizgi Kalınlığı (mm)" value={el.borderWidth || 0.4} onChange={v => onUpdate(el.id, { borderWidth: v }, true)} step={0.1} />
      )}

      {el.type === 'barcode' && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={el.showBarcodeText !== false} onChange={e => onUpdate(el.id, { showBarcodeText: e.target.checked }, true)} />
          Barkod altında metin göster
        </label>
      )}
    </div>
  );
}

function NumberField({ label, value, onChange, step = 0.5 }: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{label}</label>
      <input type="number" step={step} value={Number.isFinite(value) ? Number(value.toFixed(2)) : 0}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full text-sm p-2 border border-slate-300 rounded focus:border-indigo-500 outline-none" />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full text-sm p-2 border border-slate-300 rounded focus:border-indigo-500 outline-none">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
