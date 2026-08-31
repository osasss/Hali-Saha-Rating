# Maç Sonu Puanlama

Futbol maçlarından sonra oyuncuların birbirini 1-10 arası puanladığı,
ortalamaların hesaplanıp maçın oyuncusunun belirlendiği web uygulaması.
Veriler ortak bir veritabanında tutulur; bu sayede her oyuncu **kendi
telefonundan/bilgisayarından** aynı linke girip puan verebilir.

## Vercel'e yükleme adımları

1. Bu klasörü bir GitHub deposuna (repository) yükleyin.
   - GitHub hesabınız yoksa github.com üzerinden ücretsiz oluşturabilirsiniz.
   - Yeni bir repo açın, bu klasördeki dosyaları oraya push edin (veya
     GitHub'ın web arayüzünden dosyaları sürükleyip bırakabilirsiniz).

2. vercel.com adresine gidin, GitHub hesabınızla giriş yapın.

3. "Add New… → Project" deyip az önce oluşturduğunuz repoyu seçin, "Import"
   deyin. Ayar değiştirmeden "Deploy" butonuna basabilirsiniz (Next.js
   otomatik algılanır).

4. İlk deploy hata verecek çünkü veritabanı henüz bağlı değil. Bunu
   düzeltmek için: Vercel proje sayfanızda **Storage** sekmesine gidin →
   **Create Database** → **KV** (Upstash Redis tabanlı, ücretsiz katmanı
   yeterli) → oluşturun ve projenize bağlayın (Connect Project).
   Bu işlem gerekli ortam değişkenlerini (KV_REST_API_URL vb.) otomatik
   olarak projenize ekler.

5. **Deployments** sekmesinden en son deploy'un yanındaki üç nokta menüsünden
   **Redeploy** deyin (ortam değişkenlerinin devreye girmesi için).

6. Deploy tamamlanınca size verilen `https://...vercel.app` linkini
   oyuncularla paylaşın — herkes kendi cihazından girip puan verebilir.

## Yerelde çalıştırmak isterseniz

```bash
npm install
vercel env pull .env.local   # Vercel KV bilgilerini yerel ortama çeker
npm run dev
```

## Notlar

- Bu link paylaşıldığında linke erişen **herkes** maçları görebilir ve
  puan girebilir — kullanıcı girişi/şifre yoktur. Daha kapalı bir kullanım
  isterseniz üstüne basit bir şifre ekranı eklenebilir, isterseniz bunu da
  hazırlayabilirim.
