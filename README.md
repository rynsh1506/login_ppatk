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

## Setup

### 1. Install dependencies
```bash
npm install
npx playwright install chromium
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env — pilih CAPTCHA_STRATEGY yang sesuai (lihat tabel di bawah)
```

### 3. Run the server
```bash
npm start
# atau untuk development dengan auto-reload:
npm run dev
```

---

## Captcha Strategy

Pilih strategi yang sesuai kebutuhan lewat variabel `CAPTCHA_STRATEGY` di file `.env`:

| Strategy | Biaya | API Key | Keterangan |
|---|---|---|---|
| `stealth` | **Gratis** | ❌ Tidak perlu | Default. Gunakan stealth plugin untuk menghindari deteksi bot. Cocok untuk situs dengan captcha tidak terlalu ketat. |
| `manual` | **Gratis** | ❌ Tidak perlu | Browser terbuka visual (non-headless). User solve captcha sekali, **session disimpan otomatis** di `session.json` dan dipakai kembali hingga expired. |
| `capsolver` | **Free tier** | ✅ Perlu | Daftar di [capsolver.com](https://capsolver.com). Ada free credits untuk akun baru. Isi `CAPTCHA_API_KEY` di `.env`. |
| `2captcha` | **Berbayar** | ✅ Perlu | ~$2-3 per 1000 solve. Daftar di [2captcha.com](https://2captcha.com). Isi `CAPTCHA_API_KEY` di `.env`. |

### Contoh konfigurasi `.env`

**Stealth (default, gratis):**
```env
CAPTCHA_STRATEGY=stealth
```

**Manual (gratis, butuh intervensi pertama kali):**
```env
CAPTCHA_STRATEGY=manual
SESSION_FILE=session.json
```

**Capsolver (free tier):**
```env
CAPTCHA_STRATEGY=capsolver
CAPTCHA_API_KEY=CAP-xxxxxxxxxxxxxxxxxxxxxxxx
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/v1/token` | Scrape dan return PPATK token |

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

## Logs
- `logs/combined.log` - Semua log (info, warn, error)
- `logs/error.log` - Error saja

---

## ⚠️ Catatan Penting
- Update **SELECTORS** di `src/services/scraper.js` sesuai elemen halaman PPATK target.
- Untuk strategi `manual`: session akan otomatis dihapus dan diminta ulang jika sudah expired.
- Playwright cukup berat memori — satu API call membuka satu instance browser. Pastikan server memiliki RAM yang cukup.
