# PPATK Token Scraper API

REST API terintegrasi untuk otomatisasi _login_, ekstraksi _cookie_ / _token_, dan pengambilan data pencarian pada sistem PPATK menggunakan gabungan **Playwright (Headless Browser)**, **Axios (Direct Request)**, dan **Sistem Cache Persisten**.

Sistem ini didesain sangat tahan banting terhadap pemblokiran CAPTCHA dengan fitur "Keep-Alive" serta kemampuan manajemen _cookie_ dari browser eksternal.

## ✨ Fitur Utama

1. **Dynamic Settings API**: Mengubah pengaturan bot (strategi bypass CAPTCHA & visibilitas browser) secara _real-time_ tanpa harus me-restart server.
2. **Keep-Alive Cron Job**: Server secara otomatis melakukan _ping_ (ketuk pintu) ke server PPATK setiap 15 menit agar _cookie_ tetap hidup dan terhindar dari _Idle Timeout_.
3. **Manual Cookie Injection**: Kemampuan menyuntikkan _cookie_ hasil _login_ di browser kantor (Chrome/Edge/Firefox) ke dalam server secara instan, mengalahkan pemblokiran IP tingkat tinggi.
4. **Direct Search API (Bypass)**: Melakukan pencarian data langsung menggunakan Axios (tanpa harus memuat browser berat), mengandalkan _cache cookie_ yang valid.
5. **Whisper-Local AI**: Opsi penyelesaian CAPTCHA suara sepenuhnya gratis menggunakan Python Whisper.

---

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

## 🚀 Instalasi & Setup (PANDUAN JALANIN TANPA DOCKER)

> [!IMPORTANT]
> Panduan ini dibuat super jelas (idiot-proof) supaya bisa jalan tanpa Docker. Tolong ikuti langkah ini berurutan dari 0 sampai 3! Jangan ada yang di-skip!

### Langkah 0: Pastikan Requirement Terpenuhi!

Sebelum jalanin apa-apa, buka terminal dan pastikan komputer kamu sudah terinstal aplikasi berikut. (Harus terbaca di _Environment Variable_ / PATH):

1. **Node.js** (Minimal v18, disarankan v24+). Cek dengan perintah: `node -v`
2. **Python** (Minimal v3.10+). Cek dengan perintah: `python --version`
3. **FFmpeg** (Wajib untuk proses audio). Cek dengan perintah: `ffmpeg -version`

_(Jika waktu dicek ada tulisan `command not found` atau `is not recognized`, berarti aplikasinya belum diinstal atau PATH-nya belum di-setting. Benerin dulu!)_

### Langkah 1: Pasang Dependensi

Buka terminal (Command Prompt / PowerShell / Git Bash) dan pastikan kamu berada di dalam folder project ini. Lalu jalankan perintah berikut secara berurutan:

```bash
# 1. Download semua library utama Node.js
npm install

# 2. Setup Python environment untuk modul transkripsi suara (otomatis)
npm run setup

# 3. Download Chromium engine untuk bot scraping (wajib)
npx playwright install chromium
```

### Langkah 2: Atur Kredensial (.env)

Jangan langsung di-run! Sistem butuh email dan password untuk login ke web PPATK.

1. Cari file bernama `.env.example` di dalam folder ini.
2. **Copy/Duplicate** file tersebut dan beri nama **`.env`** (Ingat, titik env. Bukan `.env.txt`).
3. Buka file `.env` pakai Notepad atau VSCode, lalu isi data login kamu:

```ini
LOGIN_EMAIL=email_kamu@domain.com
LOGIN_PASSWORD=password_rahasia_kamu
```

### Langkah 3: Jalankan Server (Gini Doang)

Kalau langkah 0, 1, dan 2 udah sukses, jalankan perintah ini di terminal:

```bash
# Mode development (otomatis restart kalau ada kode yang diubah)
npm run dev

# ATAU Mode production
npm start
```

Jika sukses, server akan nyala di `http://localhost:3000`.
_(Note: Kalau mau mematikan server, tekan tombol `Ctrl + C` di terminal)._

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
  _(Opsi Strategy: `stealth`, `manual`, `capsolver`, `2captcha`, `whisper-local`)_

### 2. **Token API (Auto/Manual Login via Browser)**

Menginstruksikan server membuka _browser_ dan melakukan tugas login sesuai strategi aktif.

- Pengeksekusian:
  ```bash
  curl -X GET http://localhost:3000/api/v1/token
  ```
- **Jika mode `manual` aktif**, browser akan tampil di layar Anda. Anda tinggal mengerjakan CAPTCHA dan menekan tombol _Login_. **Bot secara otomatis mendeteksi perpindahan URL**, mengekstrak _cookie_, dan menutup browser.

### 3. **Manual Cookie Injection (Fitur Kebal Blokir IP)**

Jika Google memblokir IP server Anda, silakan _login_ mandiri di Edge/Chrome PC Anda, _copy_ cookie Anda, lalu suntikkan ke server menggunakan API ini:

- **Inject Cookie:**
  ```bash
  curl -X POST http://localhost:3000/api/v1/update-cache \
    -H "Content-Type: application/json" \
    -d "{\"cookieString\": \"PHPSESSID=b4cf...; _csrf_backend=6b87...\"}"
  ```
- Bot otomatis mengekstrak CSRF, dan menyimpan semuanya permanen di `cache.json`!

### 4. **Direct Search API (Target Utama)**

Melakukan pencarian ringan, aman, dan super cepat tanpa _browser_. Menggunakan kredensial dari `cache.json`.

- Pengeksekusian:
  ```bash
  curl -X POST http://localhost:3000/api/v1/search \
    -H "Content-Type: application/json" \
    -d "{\"searchQuery\": \"BUDI SANTOSO\"}"
  ```
- Jika Cache rusak/kadaluwarsa, API ini akan otomatis "Membangunkan Bot Playwright" untuk mengambil kredensial baru (jika memungkinkan) atau mengembalikan error.

---

## 🔒 Tips Keamanan & Stabilitas

- **Keep-Alive Cron**: Anda tidak perlu khawatir _Idle Timeout_. Selama Node.js berjalan, sistem akan mem-ping PPATK tiap 15 menit.
- **Strategi Harian**: Jika sistem memiliki _Hard Session Timeout_ (misal 24 Jam), Anda cukup melakukan _Inject Cookie_ 10 detik setiap awal hari sebelum jam kerja, lalu biarkan API `/search` bekerja dengan mulus seharian penuh.
