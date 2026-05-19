# DSDST Etiket Oluşturucu (Label Print Pro)

DSDST depo yönetim süreçleri için 100x100 mm PDF termal etiket oluşturma uygulamasıdır. İçerisindeki görsel "Etiket Tasarım Editörü" sayesinde herhangi bir kod yazmadan etiket düzenlerinizi özelleştirebilirsiniz.

## 🚀 Özellikler

- **Excel ve CSV Desteği:** Toplu ürün yükleme ve yazdırma.
- **Manuel Veri Girişi:** Dosya yüklemeden anında ürün etiketi hazırlama.
- **Görsel Etiket Tasarım Aracı:** 
  - Drag & Drop (sürükle bırak) arayüz.
  - Barkod oluşturma (CODE128).
  - Özel QR kod oluşturma (URL, SKU veya tüm bilgiler).
  - Şablonlara kaydetme ve geri çağırma (Varsayılan ve Minimal şablonlar).
- **Termal Uyumlu Saf PDF Çıktısı:** Tam 100x100mm sayfa ölçüsü ile çıktı verme.
- **Otomatik Seri Çoğaltma:** Toplam paket veya print miktarını belirterek (örn. Paket 1/4, 2/4 otomatik çoğaltma).

## 🛠️ Kurulum İçin Gerekli Olanlar

Yerel sisteminizde bilgisayarınızda **Node.js** (v18+) kurulu olmalıdır.

## 📦 Kurulum Adımları

1. Repoyu bilgisayarınıza indirin veya klonlayın.
2. Terminali açın ve proje dizinine gidin.
3. Paketleri kurun:
   ```bash
   npm install
   ```

## 🚀 Çalıştırma

Geliştirme sunucusunu başlatmak için aşağıdaki komutu terminale girin:

```bash
npm run dev
```

Uygulamanız varsayılan olarak `http://localhost:3000` adresinde çalışacaktır. Tarayıcınızdan bu adrese giderek uygulamayı kullanabilirsiniz.

## 📝 Örnek CSV Formatı

Uygulamanın içindeki menüden **"Örnek CSV İndir"** diyerek güncel şablon formatına ulaşabilirsiniz.
Sistem ayrıca Türkçe karakter sorunu olmaksızın en az şu isimli sütunları bekler:

- `SKU` (Zorunlu)
- `Urun_kodu`
- `Malzeme` 
- `Olcu`
- `Urun_adi`
- `Parti_Lot`
- `Paket_ici_adet`
- `Paket_no`
- `Toplam_paket` (Eğer sadece bu girilirse, sistem Paket_no'yu 1/4, 2/4 şeklinde oto oluşturur.)
- `Lokasyon`
- `Not`
- `Baski_adedi` (Boş ise 1 adet yazdırılır)

## 🗂️ Dosya / Klasör Yapısı

- `src/components/DynamicThermalLabel.tsx` : Dinamik etiket renderer motoru (Tasarım JSON'unu görselleştirir).
- `src/components/DesignEditor.tsx` : Sürükle-bırak etiket tasarım editörü.
- `src/lib/templates.ts` : Hazır DSDST etiket şablonları.
- `src/lib/pdfGenerator.ts` : html2canvas & jsPDF birleşimi olan yüksek kaliteli termal PDF çıktı modülü.
- `src/App.tsx` : Ana dashboard ve layout.

## 📌 Teknik Notlar & İleriye Dönük Yapı
Uygulama tam fonksiyonel bir "Client-Side Application" dır ancak istenildiği an kolayca bir backend'e veri gönderebilecek yapıya (örneğin SQLite veya PostgreSQL üzerinden çekilebilecek bir endpoint için `src/lib/types.ts` içerisindeki veri tiplerine uyumlu bir fetch ile entegre edilebilir) sahiptir. QR koda eklenebilen `{SKU}` parametreli custom url sayesinde DSDST depo panelinize (örn: `https://panel.dsdst.com/item/{SKU}`) bağlantı sağlanabilir.
