# PPATK Token Scraper API

REST API terintegrasi untuk otomatisasi *login*, ekstraksi *cookie* / *token*, dan pengambilan data pencarian pada sistem PPATK menggunakan gabungan **Playwright (Headless Browser)**, **Axios (Direct Request)**, dan **Sistem Cache Persisten**.

Sistem ini didesain sangat tahan banting terhadap pemblokiran CAPTCHA dengan fitur "Keep-Alive" serta kemampuan manajemen *cookie* dari browser eksternal.

## ✨ Fitur Utama
1. **Dynamic Settings API**: Mengubah pengaturan bot (strategi bypass CAPTCHA & visibilitas browser) secara *real-time* tanpa harus me-restart server.
2. **Keep-Alive Cron Job**: Server secara otomatis melakukan *ping* (ketuk pintu) ke server PPATK setiap 15 menit agar *cookie* tetap hidup dan terhindar dari *Idle Timeout*.
3. **Manual Cookie Injection**: Kemampuan menyuntikkan *cookie* hasil *login* di browser kantor (Chrome/Edge/Firefox) ke dalam server secara instan, mengalahkan pemblokiran IP tingkat tinggi.
4. **Direct Search API (Bypass)**: Melakukan pencarian data langsung menggunakan Axios (tanpa harus memuat browser berat), mengandalkan *cache cookie* yang valid.
5. **Whisper-Local AI**: Opsi penyelesaian CAPTCHA suara sepenuhnya gratis menggunakan Python Whisper.

---

## 🛠️ Teknologi & Arsitektur
- **Node.js** (v18+) & **Express.js** - REST API framework
- **Playwright-extra** - Browser Automation
- **Python Whisper & ffmpeg-static** - Zero-cost Local Audio CAPTCHA Solver
- **Winston** - Structured logging

### Project Structure Tambahan Terbaru
```
├── src/
│   ├── config/config.js              # Environment var parser
│   ├── utils/settingsManager.js      # Dynamic JSON Settings Manager
│   ├── controllers/
│   │    ├── tokenController.js       # Login otomatis & manual inject
│   │    ├── searchController.js      # Direct Axios API Proxy
│   │    └── settingController.js     # API config runtime
│   ├── routes/                       # Express routes (token, search, settings)
│   ├── services/
│   │    ├── browser.js               # Playwright launcher
│   │    └── scraper.js               # Core auto-scraping & auto-detect login
│   └── app.js                        # App setup
├── server.js                         # Entry point (Termasuk Keep-Alive Cron)
├── settings.json                     # Konfigurasi aktif (terbuat otomatis)
├── cache.json                        # Tempat penyimpanan Cookie & CSRF yang abadi
├── session.json                      # Browser state session storage
└── .env.example                      # Contoh file konfigurasi utama
```

---

## 🚀 Instalasi & Setup

### Langkah 1: Pasang Dependensi
Buka terminal di direktori proyek ini dan jalankan perintah berikut:
```bash
# 1. Mengunduh dependensi Node.js
npm install

# 2. Menginstal Python Whisper dan ruang isolasinya
npm run setup

# 3. Memasang modul Chromium bawaan Playwright
npx playwright install chromium
```

### Langkah 2: Konfigurasi `.env`
Salin file `.env.example` menjadi `.env` lalu isikan kredensial Anda.
```ini
LOGIN_EMAIL=email_anda@domain.com
LOGIN_PASSWORD=password_rahasia
```

### Langkah 3: Jalankan Server
```bash
npm start
```

---

## 📖 Dokumentasi Endpoint API

### 1. **Settings API**
Mengelola perilaku Bot tanpa me-restart aplikasi. Perubahan otomatis disimpan ke `settings.json`.

- **Mengecek Konfigurasi Saat Ini**
  ```bash
  curl -X GET http://localhost:3000/api/v1/settings
  ```
- **Mengubah Strategi & Headless Mode**
  ```bash
  # Mengubah jadi mode manual (tampil visual browser)
  curl -X PUT http://localhost:3000/api/v1/settings \
    -H "Content-Type: application/json" \
    -d "{\"strategy\": \"manual\", \"headless\": false}"
  ```
  *(Opsi Strategy: `stealth`, `manual`, `capsolver`, `2captcha`, `whisper-local`)*

### 2. **Token API (Auto/Manual Login via Browser)**
Menginstruksikan server membuka *browser* dan melakukan tugas login sesuai strategi aktif.
- Pengeksekusian:
  ```bash
  curl -X GET http://localhost:3000/api/v1/token
  ```
- **Jika mode `manual` aktif**, browser akan tampil di layar Anda. Anda tinggal mengerjakan CAPTCHA dan menekan tombol *Login*. **Bot secara otomatis mendeteksi perpindahan URL**, mengekstrak *cookie*, dan menutup browser.

### 3. **Manual Cookie Injection (Fitur Kebal Blokir IP)**
Jika Google memblokir IP server Anda, silakan *login* mandiri di Edge/Chrome PC Anda, *copy* cookie Anda, lalu suntikkan ke server menggunakan API ini:
- **Inject Cookie:**
  ```bash
  curl -X POST http://localhost:3000/api/v1/update-cache \
    -H "Content-Type: application/json" \
    -d "{\"cookieString\": \"PHPSESSID=b4cf...; _csrf_backend=6b87...\"}"
  ```
- Bot otomatis mengekstrak CSRF, dan menyimpan semuanya permanen di `cache.json`!

### 4. **Direct Search API (Target Utama)**
Melakukan pencarian ringan, aman, dan super cepat tanpa *browser*. Menggunakan kredensial dari `cache.json`.
- Pengeksekusian:
  ```bash
  curl -X POST http://localhost:3000/api/v1/search \
    -H "Content-Type: application/json" \
    -d "{\"searchQuery\": \"BUDI SANTOSO\"}"
  ```
- Jika Cache rusak/kadaluwarsa, API ini akan otomatis "Membangunkan Bot Playwright" untuk mengambil kredensial baru (jika memungkinkan) atau mengembalikan error.

---

## 🔒 Tips Keamanan & Stabilitas
- **Keep-Alive Cron**: Anda tidak perlu khawatir *Idle Timeout*. Selama Node.js berjalan, sistem akan mem-ping PPATK tiap 15 menit.
- **Strategi Harian**: Jika sistem memiliki *Hard Session Timeout* (misal 24 Jam), Anda cukup melakukan *Inject Cookie* 10 detik setiap awal hari sebelum jam kerja, lalu biarkan API `/search` bekerja dengan mulus seharian penuh.
