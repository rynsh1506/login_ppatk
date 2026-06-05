# Task: Implementasi Solver reCAPTCHA Menggunakan Audio Challenge & Whisper Local (Zero-Cost Solver)

## 🎯 Objective

Saat ini, strategi pengatasan reCAPTCHA di aplikasi ini terbagi menjadi:
1. `stealth` (hanya klik checkbox, jika ditantang gambar maka gagal).
2. `manual` (memerlukan interaksi manusia penuh).
3. `capsolver`/`2captcha` (berbayar, memerlukan API Key).

Untuk mendapatkan solusi otomatis yang **100% gratis secara permanen (zero cost)**, kita akan menambahkan opsi strategy baru: **`whisper-local`**.

### Konsep Utama:
1. Ketika reCAPTCHA menantang pengguna, program akan mendeteksi tombol 🎧 **Audio Challenge** (`class="rc-button goog-inline-block rc-button-audio"` atau `#recaptcha-audio-button`).
2. Program mengklik tombol audio tersebut.
3. Program mengunduh file audio `.mp3` challenge yang disediakan oleh Google.
4. Program memanggil **Whisper** secara lokal (menggunakan Python script / CLI) untuk mentranskripsi file audio menjadi teks.
5. Memasukkan teks hasil transkripsi ke input response audio (`#audio-response`).
6. Klik tombol Verify (`#recaptcha-verify-button`).

---

## 📂 Files to Create/Modify

- **`[NEW]`** `src/utils/transcriber.js` — Modul Node.js untuk mengeksekusi script Python Whisper secara lokal menggunakan `child_process`.
- **`[NEW]`** `transcribe.py` — Script Python sederhana yang memuat library Whisper lokal, memproses audio, dan mencetak teks transkripsi ke `stdout`.
- **`[MODIFY]`** `src/services/scraper.js` — Menambahkan alur deteksi audio challenge, unduh file, panggil transcriber, isi teks, dan verifikasi.
- **`[MODIFY]`** `src/services/browser.js` — Mengaktifkan strategy `whisper-local` di pendaftaran plugin browser (tidak membutuhkan plugin recaptcha solver pihak ketiga).
- **`[MODIFY]`** `src/config/config.js` — Menambahkan `whisper-local` sebagai opsi strategi yang valid.
- **`[MODIFY]`** `.env.example` & `.env` — Dokumentasi opsi `CAPTCHA_STRATEGY=whisper-local`.

---

## 🛠️ Step-by-Step Implementation Guide

### Step 1: Persiapan Environment Python & Whisper (Sistem User)
Whisper berjalan secara lokal menggunakan Python. Junior programmer / AI harus memastikan prasyarat ini terinstal di komputer yang menjalankan bot.

1. **Instalasi Whisper & FFmpeg:**
   Programmer/User harus menginstal:
   - Python 3.9 ke atas.
   - FFmpeg (wajib untuk pemrosesan audio oleh Whisper). Di Windows: `choco install ffmpeg` atau unduh manual dan masukkan PATH.
   - Install OpenAI Whisper via pip:
     ```bash
     pip install openai-whisper
     ```

2. **Membuat File `transcribe.py` di Root Project:**
   Buat file `transcribe.py` yang akan dipanggil oleh Node.js. File ini menerima argumen berupa *path* file audio `.mp3` dan mencetak teksnya.
   
   **Isi `transcribe.py`:**
   ```python
   import sys
   import whisper
   import warnings

   # Sembunyikan warning agar tidak mengotori stdout
   warnings.filterwarnings("ignore")

   def transcribe(audio_path):
       try:
           # Gunakan model 'tiny' atau 'base' agar cepat dan ringan di CPU lokal
           model = whisper.load_model("tiny")
           result = model.transcribe(audio_path, fp16=False)
           print(result["text"].strip())
       except Exception as e:
           print(f"ERROR: {str(e)}", file=sys.stderr)
           sys.exit(1)

   if __name__ == "__main__":
       if len(sys.argv) < 2:
           print("ERROR: Path ke file audio tidak disertakan.", file=sys.stderr)
           sys.exit(1)
       transcribe(sys.argv[1])
   ```

---

### Step 2: Membuat Utility Transcriber di Node.js (`src/utils/transcriber.js`)

Modul ini bertanggung jawab memanggil `transcribe.py` dari Node.js secara asinkron.

**Isi `src/utils/transcriber.js`:**
```javascript
'use strict';

const { execFile } = require('child_process');
const path = require('path');
const logger = require('./logger');

/**
 * Mentranskripsi file audio MP3 secara lokal menggunakan Python Whisper
 * @param {string} audioFilePath - Path absolut file mp3
 * @returns {Promise<string>} Hasil transkripsi teks
 */
const transcribeAudioLocal = (audioFilePath) => {
  return new Promise((resolve, reject) => {
    const pythonScript = path.resolve(__dirname, '../../transcribe.py');
    
    logger.info(`[Transcriber] Menjalankan Whisper lokal pada: ${audioFilePath}`);
    
    // Panggil script python
    execFile('python', [pythonScript, audioFilePath], (error, stdout, stderr) => {
      if (error) {
        logger.error(`[Transcriber] Gagal menjalankan Whisper: ${stderr || error.message}`);
        return reject(new Error(`Whisper failed: ${stderr || error.message}`));
      }
      
      const transcription = stdout.trim();
      logger.info(`[Transcriber] Hasil transkripsi: "${transcription}"`);
      resolve(transcription);
    });
  });
};

module.exports = { transcribeAudioLocal };
```

---

### Step 3: Implementasi Flow Audio Solver di `src/services/scraper.js`

Ini adalah bagian paling inti. Kita harus memodifikasi file `scraper.js` agar memiliki fungsi untuk menyelesaikan tantangan audio secara otomatis.

1. **Import transcriber di bagian atas `scraper.js`:**
   ```javascript
   const { transcribeAudioLocal } = require('../utils/transcriber');
   const axios = require('axios'); // Pastikan axios atau fetch terinstall untuk download file
   ```
   *(Catatan: Jika axios belum terinstall, bisa menggunakan built-in `https` Node.js atau install `axios` via npm)*.

2. **Buat fungsi helper `solveAudioChallenge(page)`:**
   Fungsi ini akan dieksekusi ketika terdeteksi reCAPTCHA ditantang (Challenge Frame muncul).
   
   **Logika Langkah demi Langkah di dalam `solveAudioChallenge`:**
   *   **Langkah A:** Cari iframe tantangan (`bframe`). Iframe ini biasanya memiliki title yang mengandung kata "recaptcha challenge" atau src yang mengandung `"bframe"`.
       ```javascript
       const challengeFrameElement = await page.$('iframe[title*="recaptcha challenge"], iframe[src*="bframe"]');
       const challengeFrame = await challengeFrameElement.contentFrame();
       ```
   *   **Langkah B:** Klik tombol audio (`button.rc-button-audio` atau `#recaptcha-audio-button`).
       ```javascript
       await challengeFrame.click('#recaptcha-audio-button');
       // Berikan jeda waktu agar tantangan audio selesai dimuat
       await page.waitForTimeout(2000); 
       ```
   *   **Langkah C:** Dapatkan URL download audio. Cari element tag `a` dengan class `.rc-audiochallenge-download-link` dan ambil attribute `href`.
       ```javascript
       const downloadLink = await challengeFrame.$eval('.rc-audiochallenge-download-link', el => el.href);
       logger.info(`[Scraper] URL Audio didapatkan: ${downloadLink}`);
       ```
   *   **Langkah D:** Unduh file audio tersebut dan simpan sementara di lokal (misalnya di folder `temp/`).
       ```javascript
       const tempFolder = path.resolve(__dirname, '../../temp');
       if (!fs.existsSync(tempFolder)) fs.mkdirSync(tempFolder);
       const audioPath = path.join(tempFolder, `challenge_${Date.now()}.mp3`);
       
       // Download file via axios
       const response = await axios({
         method: 'GET',
         url: downloadLink,
         responseType: 'stream'
       });
       const writer = fs.createWriteStream(audioPath);
       response.data.pipe(writer);
       await new Promise((resolve, reject) => {
         writer.on('finish', resolve);
         writer.on('error', reject);
       });
       ```
   *   **Langkah E:** Kirim path audio ke `transcribeAudioLocal(audioPath)` untuk mendapatkan transkripsi teks.
       ```javascript
       const textResponse = await transcribeAudioLocal(audioPath);
       // Hapus file temp setelah selesai agar hemat ruang
       fs.unlinkSync(audioPath);
       ```
   *   **Langkah F:** Masukkan hasil transkripsi ke elemen input `#audio-response`.
       ```javascript
       await challengeFrame.fill('#audio-response', textResponse);
       ```
   *   **Langkah G:** Klik tombol verify (`#recaptcha-verify-button`).
       ```javascript
       await challengeFrame.click('#recaptcha-verify-button');
       await page.waitForTimeout(2000); // Tunggu proses verifikasi
       ```

3. **Integrasikan ke alur `performLogin`:**
   Jika `CAPTCHA_STRATEGY=whisper-local`, setelah mengisi username dan password, kita klik checkbox reCAPTCHA seperti biasa. Lalu kita tunggu apakah iframe tantangan muncul. Jika muncul, panggil `solveAudioChallenge(page)`.
   
   **Contoh Integrasi:**
   ```javascript
   if (strategy === 'whisper-local') {
     logger.info('[Login] Menjalankan reCAPTCHA solver berbasis Whisper Lokal...');
     
     // 1. Klik checkbox recaptcha
     const recaptchaFrame = await page.frameLocator('iframe[title*="reCAPTCHA"]').first();
     await recaptchaFrame.locator('.recaptcha-checkbox-border').click();
     
     // 2. Tunggu sebentar untuk melihat apakah langsung ter-checklist (hijau) atau ditantang
     await page.waitForTimeout(2000);
     
     const isChecked = await recaptchaFrame.locator('#recaptcha-anchor[aria-checked="true"]').count();
     if (isChecked > 0) {
       logger.info('[Login] reCAPTCHA langsung lolos tanpa tantangan gambar/audio.');
     } else {
       // Ditantang! Selesaikan dengan Audio
       logger.info('[Login] Ditantang oleh reCAPTCHA. Mulai memecahkan tantangan audio...');
       await solveAudioChallenge(page);
     }
   }
   ```

---

### Step 4: Daftarkan Strategi Baru di Browser & Config

1. **Update `src/config/config.js`:**
   Pastikan validasi strategi di config menerima nilai `whisper-local`.
   ```javascript
   // Tambahkan 'whisper-local' ke daftar strategy yang diperbolehkan
   const validStrategies = ['stealth', 'manual', 'capsolver', '2captcha', 'whisper-local'];
   ```

2. **Update `src/services/browser.js`:**
   Tambahkan opsi `whisper-local` di fungsi `applyStrategy`.
   ```javascript
   case 'whisper-local':
     // Tidak membutuhkan registrasi plugin eksternal berbayar.
     logger.info('[Browser] Strategy: WHISPER-LOCAL — Menggunakan audio challenge & model Whisper lokal.');
     break;
   ```

3. **Update `.env.example` & `.env`:**
   ```env
   # Pilihan: stealth | manual | capsolver | 2captcha | whisper-local
   CAPTCHA_STRATEGY=whisper-local
   ```

---

## 🧪 Verification & Testing Plan

1. **Uji Coba Script Python:**
   Jalankan secara manual perintah transkripsi pada terminal menggunakan file suara tes MP3:
   ```bash
   python transcribe.py path/to/test.mp3
   ```
   Pastikan script berhasil memuat model `tiny` dan mengeluarkan teks hasil suara.

2. **Uji Coba Integrasi End-to-End:**
   - Set `.env` dengan `CAPTCHA_STRATEGY=whisper-local`.
   - Jalankan `npm start`.
   - Perhatikan logs bot. Pastikan ia berhasil mendeteksi iframe tantangan, mengklik ikon audio, mengunduh file `.mp3`, menjalankan Python Whisper secara lokal, mengisi teks ke input, dan mengklik tombol verify hingga login sukses.

---

## ✅ Definition of Done (DoD)

- [ ] Script `transcribe.py` dibuat dan sukses mendeteksi/transkripsi suara.
- [ ] Modul `transcriber.js` sukses memanggil subprocess python dan mengembalikan string teks.
- [ ] Logika `solveAudioChallenge` di `scraper.js` sukses mencari iframe, menekan tombol audio, mengunduh file, mentranskripsi, mengisi, dan memverifikasi captcha.
- [ ] Config dan file `.env` telah mendukung opsi `whisper-local`.
- [ ] Aplikasi sukses melewati halaman login PPATK secara otomatis dan gratis menggunakan Whisper Lokal.
