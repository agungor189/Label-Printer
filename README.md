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

## 🖥️ Sunucuda Kalıcı Çalıştırma

Uygulama artık tek Express server üzerinden hem arayüzü hem de kalıcı kayıt API'sini sunar. Ürün listesi, aktif tasarım ve ayarlar varsayılan olarak `data/app-state.json` dosyasına kaydedilir.

```bash
npm install
npm run build
npm start
```

PM2 ile arka planda kalıcı çalıştırmak için:

```bash
pm2 start ecosystem.config.cjs
pm2 save
```

Sunucuda farklı port veya kayıt klasörü kullanmak için `.env` dosyasında `PORT`, `DATA_DIR` ve `STATE_FILE` değerlerini ayarlayın. Kalıcı verinin korunması için `data/` klasörünü yedekleyin.

### Docker ile Çalıştırma ve Güncelleme

```bash
docker compose up -d --build
```

Bu kurulum `./data` klasörünü container içindeki `/app/data` klasörüne bağlar. Yüklenen listeler, oluşturulan etiketler, ayarlar ve etiket tasarımı `./data/app-state.json` içinde kalıcı tutulur.

Güncelleme için:

```bash
git pull origin main
docker compose up -d --build
```

Kalıcı kayıtları silmemek için `./data` klasörünü silmeyin ve `docker compose down -v` kullanmayın.

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
