# Task: Implementasi Solver reCAPTCHA Menggunakan Audio Challenge & Whisper Local (Zero-Cost Solver)

*(...Isi dokumentasi Task 1 Whisper Local sebelumnya sudah diselesaikan dan diringkas agar rapi...)*
✅ **Status**: SELESAI (Telah diimplementasikan).

---

# Task: Implementasi Fitur "Direct Search" Menggunakan Cookie Hasil Login

## 🎯 Objective
Saat ini, aplikasi bertindak sebagai **Token Provider**. Alurnya adalah: Login ➡️ Ambil Cookies ➡️ Tutup Browser ➡️ Kembalikan JSON berisi Cookies ke klien.

Berdasarkan *requirement* terbaru, aplikasi harus diubah (atau ditambah endpoint baru) agar bertindak sebagai **Search Relay**.
Alur barunya: Login ➡️ Ambil Cookies ➡️ **Langsung gunakan Cookies tersebut untuk melakukan HTTP Request pencarian data ke `https://pep.ppatk.go.id/admin/search`** ➡️ Kembalikan hasil pencarian (HTML/JSON web target) ke klien pengguna API.

Hal ini akan membuat bot jauh lebih cepat dan efisien karena proses *searching* tidak perlu dilakukan di dalam *headful browser*, melainkan langsung lewat *HTTP Protocol* murni menggunakan Axios/Fetch berbekal *Cookie* dari Playwright.

---

## 📂 Files to Create/Modify
- **`[NEW]`** `src/services/searchService.js` — Modul untuk menangani *HTTP request* murni (menggunakan Axios) menembak endpoint `/admin/search`.
- **`[NEW]`** `src/controllers/searchController.js` — Endpoint handler yang menggabungkan proses `scrapeToken()` dan `performSearch()`.
- **`[MODIFY]`** `src/routes/tokenRoutes.js` (atau route baru) — Menambahkan rute POST `/api/v1/search`.

---

## 🛠️ Step-by-Step Implementation Guide untuk Junior Programmer / AI Model

### Step 1: Install Dependencies (Jika Belum Ada)
Pastikan library untuk melakukan HTTP Request terinstal di proyek. Kita akan menggunakan `axios` dan `qs` (untuk memformat data menjadi `application/x-www-form-urlencoded`).
```bash
npm install axios qs
```

### Step 2: Buat Modul Service Pencarian (`src/services/searchService.js`)
Buat file ini. Tugas utamanya adalah menerima `cookieString` dan data pencarian dari user (misal: nama, NIK), lalu mengirimkan *HTTP POST/GET request* ke situs PPATK persis seolah-olah request tersebut datang dari browser asli.

**Instruksi Kode:**
1. Import `axios` dan `qs`.
2. Buat fungsi `performDirectSearch(cookieString, searchPayload)`.
3. Di dalam fungsi, buat konfigurasi `axios` yang **harus memuat *headers* mutlak** ini (sesuai *raw request* dari DevTools yang dilampirkan user):
   - `Accept`: `text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8`
   - `Accept-Encoding`: `gzip, deflate, br, zstd`
   - `Accept-Language`: `id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7`
   - `Content-Type`: `application/x-www-form-urlencoded`
   - `Cookie`: `[MASUKKAN VARIABEL cookieString DI SINI]`
   - `Origin`: `https://pep.ppatk.go.id`
   - `Referer`: `https://pep.ppatk.go.id/admin/search`
   - `User-Agent`: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36`

4. Format `searchPayload` menggunakan `qs.stringify()` agar body request menjadi *url-encoded* yang valid (karena `content-type` adalah `x-www-form-urlencoded`).

**Contoh Template Kode:**
```javascript
const axios = require('axios');
const qs = require('qs');

const performDirectSearch = async (cookieString, searchData) => {
  const url = 'https://pep.ppatk.go.id/admin/search';
  
  // Format body request (contoh searchData: { nama: 'budi', nik: '123' })
  // WARNING: Cari tahu dulu key form yang sebenarnya dipakai di HTML PPATK
  const encodedBody = qs.stringify(searchData);

  const headers = {
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'cache-control': 'max-age=0',
    'content-type': 'application/x-www-form-urlencoded',
    'cookie': cookieString, // Inject Cookie dari hasil login Playwright
    'origin': 'https://pep.ppatk.go.id',
    'referer': 'https://pep.ppatk.go.id/admin/search',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
    'upgrade-insecure-requests': '1'
  };

  try {
    const response = await axios.post(url, encodedBody, { headers });
    return response.data; // Mengembalikan HTML table / JSON hasil pencarian
  } catch (error) {
    throw new Error(`Pencarian gagal: ${error.message}`);
  }
};

module.exports = { performDirectSearch };
```

### Step 3: Implementasi Controller Baru (`src/controllers/searchController.js`)
Buat *controller* baru yang berfungsi merangkai proses Playwright (Scraper) dan proses Axios (Searcher).

**Alur Logika Controller:**
1. Terima *request* dari pengguna via API (contoh: POST `/api/v1/search` dengan body `{"nama": "Joko"}`).
2. Jalankan `const loginResult = await scrapeToken()`. Tunggu hingga Playwright menyelesaikan reCAPTCHA dan login.
3. Setelah login berhasil, ambil *cookie* yang didapat: `const cookieStr = loginResult.cookieString`.
4. Lakukan pencarian data: `const searchDataHTML = await performDirectSearch(cookieStr, req.body)`.
5. Opsional (Namun Disarankan): Gunakan `cheerio` (Library Node.js) untuk mengekstrak data spesifik (parsing tabel HTML) dari `searchDataHTML` menjadi format JSON yang rapi.
6. Kembalikan data tersebut lewat `res.status(200).json(...)`.

### Step 4: Menangani CSRF Token (⚠️ TANTANGAN UTAMA / BLOCKER PENTING)
Aplikasi PPATK menggunakan Yii Framework (terlihat dari adanya cookie `_csrf_backend`). 
Jika sebuah website memiliki *cookie* `_csrf_backend`, maka **wajib hukumnya** form *POST request* yang dikirim juga memuat input tersembunyi bernama `_csrf_backend` di dalam payload *body*-nya. 

Jika `_csrf_backend` hanya dikirim via *cookie* tapi tidak dikirim di *body urlencoded*, server akan menolak permintaan dengan *Error 400 Bad Request* (CSRF Token Verification Failed).

**Instruksi Khusus Untuk AI/Junior Programmer:**
- Sebelum menjalankan `axios.post()` pencarian, Anda **HARUS** melakukan *HTTP GET* biasa terlebih dahulu ke URL `https://pep.ppatk.go.id/admin/search` dengan menggunakan *Cookie* login yang didapat.
- Ekstrak HTML dari hasil GET tersebut menggunakan *Regex* atau `cheerio`.
- Cari tag HTML `<meta name="csrf-token" content="...">` atau `<input type="hidden" name="_csrf_backend" value="...">`.
- Ambil *value* token CSRF tersebut.
- Selipkan token tersebut ke dalam `searchData` sebelum di-*stringify* menggunakan `qs`.
- Contoh: `searchData['_csrf_backend'] = csrfTokenYangDiambilDariHTML`.

### Step 5: Route Registration
Daftarkan endpoint baru di file routing aplikasi (contoh di `app.js` atau `routes/api.js`).
```javascript
const { executeSearchAPI } = require('../controllers/searchController');
router.post('/search', executeSearchAPI);
```

---

## ✅ Definition of Done (DoD)
1. Modul pencarian berbasis *HTTP request murni* (tanpa membuka browser) telah berhasil mengirim payload menggunakan data *cookie* dari Playwright.
2. Penanganan `_csrf_backend` telah diterapkan dengan metode ekstrak dari halaman web.
3. Klien API mengirim request POST dengan parameter nama/NIK ke server bot ini, lalu langsung mendapatkan hasil pencarian dari PPATK tanpa perlu mengetahui urusan Playwright/CAPTCHA/Cookie di balik layar.
