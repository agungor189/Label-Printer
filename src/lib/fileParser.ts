import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export async function parseFile(file: File): Promise<{ headers: string[], rawRows: any[] }> {
  return new Promise((resolve, reject) => {
    if (file.name.toLowerCase().endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.meta.fields) {
            resolve({ headers: results.meta.fields, rawRows: results.data });
          } else {
            reject(new Error("CSV format could not be parsed. No headers found."));
          }
        },
        error: (error) => {
          reject(new Error("CSV Parsing Error: " + error.message));
        }
      });
    } else if (file.name.match(/\.xlsx?$/i)) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
          
          if (json.length > 0) {
            const headers = Object.keys(json[0] as object);
            resolve({ headers, rawRows: json });
          } else {
            resolve({ headers: [], rawRows: [] });
          }
        } catch (error) {
          reject(new Error("Excel Parsing Error: " + (error as Error).message));
        }
      };
      reader.onerror = () => reject(new Error("Dosya okuma hatası"));
      reader.readAsArrayBuffer(file);
    } else {
      reject(new Error("Unsupported file format. Please use .csv, .xls, or .xlsx."));
    }
  });
}
