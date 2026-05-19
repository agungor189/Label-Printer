import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export async function generateLabelsPDF(
  containerId: string,
  filename: string = `dsdst_etiketler_${new Date().toISOString().split('T')[0]}.pdf`
) {
  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error('Etiket konteyneri bulunamadı.');
  }

  const labelElements = container.querySelectorAll('.print-label-pdf-target');
  if (labelElements.length === 0) {
    throw new Error('Yazdırılacak etiket bulunamadı.');
  }

  // Optimize jsPDF for 100x100mm
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [100, 100],
    compress: true,
  });

  for (let i = 0; i < labelElements.length; i++) {
    const el = labelElements[i] as HTMLElement;
    
    // Ensure element size is properly bounded for screenshot inside headless environment
    const originalWidth = el.style.width;
    const originalHeight = el.style.height;
    
    // Temporarily fix to px for accurate rendering
    el.style.width = '378px'; // roughly 100mm in 96dpi
    el.style.height = '378px';
    
    const canvas = await html2canvas(el, {
      scale: 3,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: 378,
      height: 378,
      windowWidth: 378,
      windowHeight: 378
    });

    el.style.width = originalWidth;
    el.style.height = originalHeight;

    const imgData = canvas.toDataURL('image/jpeg', 1.0);

    if (i > 0) {
      pdf.addPage([100, 100], 'portrait');
    }
    
    pdf.addImage({
      imageData: imgData,
      format: 'JPEG',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      compression: 'FAST'
    });
  }

  pdf.save(filename);
}
