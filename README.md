# PPATK Token Scraper API

REST API for scraping PPATK session tokens using **Playwright** with a flexible, **hybrid reCAPTCHA strategy**.

## Tech Stack
- **Node.js** (v18+)
- **Express.js** - REST API framework
- **playwright-extra** - Headless browser automation
- **puppeteer-extra-plugin-stealth** - Bot detection bypass (free)
- **puppeteer-extra-plugin-recaptcha** - reCAPTCHA solver (for paid providers)
- **winston** - Structured logging

## Project Structure
```
├── src/
│   ├── config/config.js              # Centralized config from .env
│   ├── utils/logger.js               # Winston logger
│   ├── utils/responseHelper.js       # Standard API response helpers
│   ├── services/browser.js           # Playwright launcher with strategy pattern
│   ├── services/scraper.js           # Core scraping logic (auto + manual)
│   ├── controllers/tokenController.js
│   ├── routes/tokenRoutes.js
│   ├── middlewares/requestLogger.js
│   ├── middlewares/errorHandler.js
│   └── app.js                        # Express app setup
├── server.js                         # Server entry point
├── session.json                      # Auto-generated (manual strategy only)
├── logs/                             # Auto-generated log files
├── .env.example
└── package.json
```

---

## 🛠️ Cara Setup & Menjalankan (Langkah demi Langkah)

Ikuti petunjuk di bawah ini untuk memasang dan menjalankan aplikasi di lingkungan lokal Anda.

### Langkah 1: Pasang Dependensi
Buka terminal di direktori proyek ini dan jalankan perintah berikut:
```bash
# Mengunduh dependensi Node.js yang diperlukan
npm install

# Memasang modul Chromium yang dibutuhkan oleh Playwright
npx playwright install chromium
```

### Langkah 2: Salin & Konfigurasi Environment Variables
Salin berkas template konfigurasi `.env.example` menjadi berkas aktif `.env`.

*   **Untuk sistem berbasis UNIX (Linux / macOS / Git Bash):**
    ```bash
    cp .env.example .env
    ```
*   **Untuk sistem Windows (Command Prompt / cmd):**
    ```cmd
    copy .env.example .env
    ```
*   **Untuk Windows PowerShell:**
    ```powershell
    Copy-Item .env.example .env
    ```

Setelah menyalin, buka berkas `.env` dan konfigurasikan parameter login target (`LOGIN_EMAIL` dan `LOGIN_PASSWORD`), serta atur strategi Captcha yang ingin digunakan.

### Langkah 3: Jalankan Aplikasi
Setelah berkas `.env` siap, Anda dapat menjalankan server dengan salah satu perintah berikut:

*   **Mode Produksi / Standard:**
    ```bash
    npm start
    ```
*   **Mode Development (dilengkapi auto-reload saat kode diubah):**
    ```bash
    npm run dev
    ```

---

## ⚙️ Penjelasan Variabel Konfigurasi (`.env`)

Berikut adalah tabel referensi lengkap semua variabel yang dapat dikonfigurasi di dalam file `.env`:

### 1. Server Configuration
| Nama Variabel | Wajib/Opsional | Nilai Default | Keterangan |
| :--- | :--- | :--- | :--- |
| `PORT` | Opsional | `3000` | Port tempat server Express berjalan. |
| `NODE_ENV` | Opsional | `development` | Mode berjalannya aplikasi (`development` atau `production`). |
| `LOG_LEVEL` | Opsional | `info` | Batas tingkat log yang disimpan (`error`, `warn`, `info`, `debug`). |

### 2. Target & Login Credentials
| Nama Variabel | Wajib/Opsional | Nilai Default | Keterangan |
| :--- | :--- | :--- | :--- |
| `TARGET_URL` | **Wajib** | `https://pep.ppatk.go.id/admin/user/login` | URL halaman login PPATK target. |
| `LOGIN_EMAIL` | **Wajib** | *(Kosong)* | Alamat email / username akun PPATK Anda. |
| `LOGIN_PASSWORD` | **Wajib** | *(Kosong)* | Password akun PPATK Anda. |

### 3. Captcha Configuration
| Nama Variabel | Wajib/Opsional | Nilai Default | Keterangan |
| :--- | :--- | :--- | :--- |
| `CAPTCHA_STRATEGY`| Opsional | `stealth` | Pilihan metode pemecahan captcha: `stealth`, `manual`, `capsolver`, atau `2captcha`. |
| `CAPTCHA_API_KEY` | Kondisional | *(Kosong)* | API Key dari Capsolver / 2Captcha (Wajib jika memilih strategi tersebut). |
| `SESSION_FILE` | Opsional | `session.json` | Nama file untuk menyimpan session cookies yang valid (Khusus mode `manual`). |

### 4. Proxy Configuration
| Nama Variabel | Wajib/Opsional | Nilai Default | Keterangan |
| :--- | :--- | :--- | :--- |
| `USE_PROXY` | Opsional | `false` | Set ke `true` untuk mengaktifkan koneksi melalui proxy server. |
| `PROXY_SERVER` | Kondisional | *(Kosong)* | URL Proxy Server lengkap dengan port (misal: `http://ip:port`). |
| `PROXY_USERNAME`| Opsional | *(Kosong)* | Username otentikasi proxy server. |
| `PROXY_PASSWORD`| Opsional | *(Kosong)* | Password otentikasi proxy server. |

---

## 💡 Contoh Kasus Konfigurasi `.env`

### Kasus A: Mode Gratis & Tanpa API Captcha (Stealth - Default)
Mode paling praktis dan gratis. Menggunakan plugin stealth untuk menyamar sebagai pengguna biasa tanpa memicu reCAPTCHA ketat.
```env
CAPTCHA_STRATEGY=stealth
USE_PROXY=false
```

### Kasus B: Mode Manual (Gratis, Sangat Stabil untuk Sesi Panjang)
Browser visual non-headless akan terbuka pada percobaan pertama. User menyelesaikan Captcha secara manual, kemudian menekan **ENTER** di terminal. Sesi cookies akan disimpan otomatis di file `session.json` dan terus digunakan kembali tanpa perlu login ulang sampai token kedaluwarsa.
```env
CAPTCHA_STRATEGY=manual
SESSION_FILE=session.json
```
> [!TIP]
> Kasus ini sangat direkomendasikan jika reCAPTCHA di situs web target terus berubah-ubah dan deteksi bot sangat ketat.

### Kasus C: Mode Pemecah Captcha Otomatis & Berbayar (Capsolver / 2Captcha)
Strategi fully automated menggunakan layanan pemecah Captcha pihak ketiga. Wajib mengisi API Key.
```env
CAPTCHA_STRATEGY=capsolver
CAPTCHA_API_KEY=CAP-XXXXXXXXXXXXXXXXXXXXXXXX
```

---

## 🔌 API Endpoints

| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| **GET** | `/health` | Pemeriksaan kesehatan aplikasi (Health check). |
| **GET** | `/api/v1/token` | Memulai proses scraping dan mengembalikan token PPATK terbaru. |

### Contoh Response (Sukses)
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Contoh Response (Error)
```json
{
  "success": false,
  "error": "All 3 scrape attempts failed. Last error: Token not found..."
}
```

---

## 📁 Catatan Logs
Aplikasi menyimpan rekaman log aktivitas di folder `logs/`:
*   `logs/combined.log` — Berisi semua tingkatan pesan log (info, warning, error).
*   `logs/error.log` — Khusus menyimpan pesan log kesalahan/error untuk mempermudah debugging.

---

## ⚠️ Peringatan Penting
1.  **Pembaruan Selector DOM:** Periksa dan sesuaikan konstanta `SELECTORS` di berkas `src/services/scraper.js` jika terdapat perubahan struktur HTML pada situs target.
2.  **Penanganan Sesi Stale (Kadaluwarsa):** Pada strategi `manual`, jika token yang diambil tidak valid atau sesi kadaluwarsa, file `session.json` akan dihapus secara otomatis dan browser manual akan terbuka kembali untuk meminta login ulang pada request berikutnya.
3.  **Kebutuhan RAM:** Playwright membutuhkan memori yang cukup karena setiap request akan membuka satu thread instance browser. Pastikan server Anda memiliki spesifikasi RAM yang memadai untuk memproses concurrent request.
