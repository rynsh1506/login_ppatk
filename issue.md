# Task: Implementasi Solver reCAPTCHA Menggunakan Audio Challenge & Whisper Local (Zero-Cost Solver)

*(...Isi dokumentasi Task 1 Whisper Local sebelumnya sudah diselesaikan dan diringkas agar rapi...)*
✅ **Status**: SELESAI (Telah diimplementasikan).

---

# Task: Implementasi Fitur "Direct Search" Menggunakan Cookie Hasil Login

✅ **Status**: SELESAI (Issue #11 Telah diimplementasikan - Lihat Walkthrough).
- Menambah modul axios pencarian cepat.
- Implementasi sistem Cache Persistent (`cache.json`).
- Implementasi ekstraksi CSRF Token.
- Implementasi Cheerio HTML to JSON Parser khusus untuk "Vertical Table".

---

# Task: Implementasi "RAM Spike Protection" (Mutex Lock) Saat Cache Miss

## 🎯 Objective
Sistem pencarian telah dialihkan menggunakan Axios yang dikombinasikan dengan *file caching* (`cache.json`). Namun, terdapat celah keamanan dan stabilitas ketika sistem diterapkan di peladen produksi:
Bila *cookie cache* kosong atau kedaluwarsa, API akan mencoba meluncurkan bot *Headful Playwright* untuk melakukan re-login secara latar belakang (*background*).
Jika pada sepersekian detik yang sama terdapat 50 permintaan masuk (Concurrency yang tinggi), maka sistem *Node.js* akan meluncurkan 50 proses *Google Chrome* secara simultan. Hal ini dijamin 100% akan menyebabkan peladen lumpuh (*Out Of Memory* / OOM).

## 📂 Tujuan Perbaikan (Goal)
Menerapkan "Mutex Lock" atau bendera status (*state flag*) sederhana tingkat aplikasi. Ketika satu peladen sedang dalam mode *Spawning Browser* untuk Re-Login, seluruh *request* lain yang masuk (yang mendapati bahwa *cache* sedang kosong) harus langsung ditolak dengan status HTTP 503 (Service Unavailable) hingga peramban selesai dan membuahkan *cookie cache* baru.

---

## 🛠️ Step-by-Step Implementation Guide untuk Junior Programmer / AI Model

### Step 1: Modifikasi Controller Pencarian (`src/controllers/searchController.js`)
Di dalam baris awal berkas `searchController.js`, deklarasikan sebuah variabel *boolean* secara global.

```javascript
// Global Lock untuk mencegah Multiple Browser Spawns (RAM Spike Protection)
let isScraping = false;
```

### Step 2: Implementasi Lock pada Logika *Cache Miss* (Belum Ada Cache)
Ketika logika memasuki kondisi `if (!cookieCache || !csrfCache)`, periksa nilai `isScraping` terlebih dahulu.

```javascript
if (!cookieCache || !csrfCache) {
  // Tolak langsung jika sistem sedang mengoperasikan Playwright
  if (isScraping) {
    return res.status(503).json({
      success: false,
      error: 'Sistem sedang memperbarui sesi login dari peladen PPATK. Silakan ulangi pencarian Anda dalam 10-15 detik.'
    });
  }

  isScraping = true;
  try {
    // ... panggil scrapeToken() & getCsrfToken()
    // ... jalankan fungsi saveCache()
  } finally {
    // Wajib memastikan lock dibuka kembali apa pun yang terjadi (Error/Sukses)
    isScraping = false; 
  }
}
```

### Step 3: Implementasi Lock pada Logika *Session Expired* (Cache Basi)
Jika Axios ditembak dan ternyata peladen mengembalikan HTML yang berisi atribut spesifik (*form login*), ini menandakan *session* kedaluwarsa. Lindungi juga bagian ini.

```javascript
if (typeof searchHtml === 'string' && searchHtml.includes('login-form')) {
  clearCache();

  if (isScraping) {
    return res.status(503).json({
      success: false,
      error: 'Sesi berakhir dan sistem sedang mencoba login kembali. Silakan ulangi dalam beberapa detik.'
    });
  }

  isScraping = true;
  try {
     // ... panggil ulang scrapeToken()
  } finally {
     isScraping = false;
  }
}
```

---

## ✅ Definition of Done (DoD)
1. Disediakan mekanisme *Mutex Lock* (via variabel global).
2. Jika dilakukan *load testing* atau memukul (*hit*) *endpoint* API secara bersamaan (secara simultan) saat *cache* tidak ada, peramban Playwright hanya terbuka **1 kali**.
3. *Request* sisanya menerima pesan kegagalan `503 Service Unavailable` secara cepat.
