import React from 'react';
import Barcode from 'react-barcode';
import QRCode from 'react-qr-code';
import { ProductData, LabelTemplate, LabelElement, LabelSettings } from '../lib/types';

interface Props {
  product: ProductData;
  template: LabelTemplate;
  settings: LabelSettings;
}

export function DynamicThermalLabel({ product, template, settings }: Props) {
  
  const replaceVariables = (text: string) => {
    if (!text) return '';
    let result = text;
    result = result.replace(/{SKU}/g, product.sku || '');
    result = result.replace(/{Urun_kodu}/g, product.urunKodu || '');
    result = result.replace(/{Malzeme}/g, product.malzeme || '');
    result = result.replace(/{Urun_adi}/g, product.urunAdi || '');
    result = result.replace(/{Olcu}/g, product.olcu || '');
    result = result.replace(/{Parti_Lot}/g, product.partiLot || '');
    result = result.replace(/{Paket_ici_adet}/g, product.paketIciAdet || '');
    result = result.replace(/{Paket_no}/g, product.paketNo || '');
    result = result.replace(/{Toplam_paket}/g, product.toplamPaket || '');
    result = result.replace(/{Lokasyon}/g, product.lokasyon || '');
    result = result.replace(/{Not}/g, product.not || '');
    
    if (result === '{ALL_INFO}') {
      return `SKU: ${product.sku}\nURUN_KODU: ${product.urunKodu}\nMALZEME: ${product.malzeme}\nURUN_ADI: ${product.urunAdi}\nOLCU: ${product.olcu}\nLOT: ${product.partiLot}\nPAKET_ICI_ADET: ${product.paketIciAdet}\nPAKET: ${product.paketNo}\nLOKASYON: ${product.lokasyon}\nNOT: ${product.not}`.trim();
    }
    return result;
  };

  const renderElement = (el: LabelElement) => {
    const commonStyle: React.CSSProperties = {
      position: 'absolute',
      left: `${el.x}mm`,
      top: `${el.y}mm`,
      width: `${el.width}mm`,
      height: `${el.height}mm`,
      display: 'flex',
      alignItems: el.type === 'text' ? 'flex-start' : 'center',
      justifyContent: el.textAlign === 'center' ? 'center' : el.textAlign === 'right' ? 'flex-end' : 'flex-start',
      overflow: 'hidden'
    };

    switch (el.type) {
      case 'box':
        return (
          <div key={el.id} style={{
            ...commonStyle,
            border: `${el.borderWidth || 0.5}mm solid black`,
            borderRadius: '1mm'
          }} />
        );
      case 'line':
        return (
          <div key={el.id} style={{
            ...commonStyle,
            backgroundColor: 'black',
            height: `${el.borderWidth || 0.5}mm`
          }} />
        );
      case 'text':
        return (
          <div key={el.id} style={{
            ...commonStyle,
            fontSize: `${el.fontSize || 3}mm`,
            fontWeight: el.fontWeight === 'bold' ? 'bold' : el.fontWeight === 'black' ? 900 : 'normal',
            lineHeight: 1.1,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            textOverflow: 'ellipsis',
          }}>
            <span style={{ 
               display: '-webkit-box', 
               WebkitLineClamp: Math.floor(el.height / ((el.fontSize || 3) * 1.1)), 
               WebkitBoxOrient: 'vertical',
               overflow: 'hidden' 
            }}>
               {replaceVariables(el.value)}
            </span>
          </div>
        );
      case 'barcode': {
        const value = replaceVariables(el.value) || 'BOS';
        return (
          <div key={el.id} style={{...commonStyle, justifyContent: 'center' }}>
            <Barcode 
              value={value} 
              width={2} 
              height={Math.max(20, (el.height * 3.77) - 20) /* Approx mm to px conversion for height */} 
              fontSize={14}
              font="monospace"
              margin={0}
              displayValue={true}
              textAlign="center"
              textMargin={2}
            />
          </div>
        );
      }
      case 'qr': {
        let qrData = replaceVariables(el.value);
        if (settings.qrType === 'custom_url') {
           qrData = settings.qrCustomUrl.replace(/{SKU}/g, product.sku || '');
        } else if (settings.qrType === 'sku_only') {
           qrData = product.sku || '';
        }

        return (
          <div key={el.id} style={{...commonStyle, backgroundColor: 'white', padding: '0.5mm'}}>
            <QRCode 
              value={qrData || 'N/A'} 
              size={256} 
              style={{ width: '100%', height: '100%' }} 
              viewBox={`0 0 256 256`} 
              level="M"
            />
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div 
      className="bg-white text-black relative shrink-0 font-sans mx-auto overflow-hidden print-label"
      style={{
        width: `${template.width}mm`,
        height: `${template.height}mm`,
        boxSizing: 'border-box'
      }}
    >
      {template.elements.map(renderElement)}
    </div>
  );
}
