'use strict';

const logger = require('../utils/logger');
const { sendSuccess, sendError } = require('../utils/responseHelper');
const { scrapeToken } = require('../services/scraper');
const { getCsrfToken, performDirectSearch, parseSearchHtml } = require('../services/searchService');

const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, '../../cache.json');

// Helper functions untuk Cache File
const getCache = () => {
  if (fs.existsSync(CACHE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    } catch (e) {
      return null;
    }
  }
  return null;
};

const saveCache = (cookieString, csrfToken) => {
  fs.writeFileSync(CACHE_FILE, JSON.stringify({ cookieString, csrfToken }, null, 2));
};

const clearCache = () => {
  if (fs.existsSync(CACHE_FILE)) {
    fs.unlinkSync(CACHE_FILE);
  }
};

// Global Lock untuk mencegah Multiple Browser Spawns (RAM Spike Protection)
let isScraping = false;

/**
 * POST /api/v1/search
 * Menggunakan Axios untuk mencari data dengan memanfaatkan Cookie Cache dari file cache.json.
 */
const executeDirectSearch = async (req, res) => {
  logger.info(`[SearchController] executeDirectSearch dipanggil | IP: ${req.ip}`);
  
  try {
    // 1. Baca cache dari file
    let cache = getCache();
    let cookieCache = cache ? cache.cookieString : null;
    let csrfCache = cache ? cache.csrfToken : null;

    if (!cookieCache || !csrfCache) {
      // RAM Spike Protection: Tolak request jika sedang ada bot yang login
      if (isScraping) {
        return sendError(res, 'Sistem sedang memperbarui sesi login dari peladen PPATK. Silakan ulangi pencarian Anda dalam 10-15 detik.', 503);
      }

      isScraping = true;
      try {
        logger.info('[SearchController] Cache Cookie kosong/rusak. Menjalankan bot (Playwright) untuk Login...');
        const loginResult = await scrapeToken();
        cookieCache = loginResult.cookieString;
        
        logger.info('[SearchController] Mengekstrak CSRF Token perdana...');
        csrfCache = await getCsrfToken(cookieCache);

        // Simpan ke file
        saveCache(cookieCache, csrfCache);
        logger.info('[SearchController] Cache baru berhasil disimpan ke cache.json');
      } finally {
        isScraping = false; // Buka kembali gembok setelah selesai atau error
      }
    } else {
      logger.info('[SearchController] Menggunakan Cookie & CSRF dari File Cache (cache.json) ⚡');
    }

    // 2. Tembak HTTP POST langsung
    let searchHtml = await performDirectSearch(cookieCache, csrfCache, req.body);

    // 3. Validasi apakah session expired (ditendang ke halaman login oleh web PPATK)
    if (typeof searchHtml === 'string' && searchHtml.includes('login-form')) {
      logger.warn('[SearchController] Session Expired! PPATK meminta login ulang. Menghapus File Cache...');
      clearCache();

      // RAM Spike Protection
      if (isScraping) {
        return sendError(res, 'Sesi berakhir dan sistem sedang mencoba login kembali. Silakan ulangi dalam beberapa detik.', 503);
      }

      isScraping = true;
      try {
        // Jalankan ulang bot login sekali lagi
        logger.info('[SearchController] Re-Login otomatis via Playwright...');
        const loginResult = await scrapeToken();
        cookieCache = loginResult.cookieString;
        csrfCache = await getCsrfToken(cookieCache);
        
        saveCache(cookieCache, csrfCache);
      } finally {
        isScraping = false;
      }

      // Tembak ulang Axios dengan cookie baru
      logger.info('[SearchController] Melakukan pencarian ulang dengan Cookie baru...');
      searchHtml = await performDirectSearch(cookieCache, csrfCache, req.body);
    }

    logger.info('[SearchController] Proses pencarian (Axios) selesai. Mengekstrak data HTML menjadi JSON...');

    // Parsing HTML menjadi JSON Data Tabel menggunakan Cheerio
    const parsedData = parseSearchHtml(searchHtml);
    
    // Extract first item if it's an array to avoid returning an array as requested
    const finalData = (Array.isArray(parsedData) && parsedData.length > 0) ? parsedData[0] : (Array.isArray(parsedData) ? null : parsedData);

    // Kembalikan hasilnya
    return sendSuccess(res, {
      message: 'Pencarian berhasil dieksekusi via Axios',
      cookies_used: cookieCache,
      csrf_used: csrfCache,
      html_response_length: searchHtml ? searchHtml.length : 0,
      extracted_data: finalData 
    });

  } catch (err) {
    logger.error(`[SearchController] Gagal melakukan pencarian: ${err.message}`, err);
    
    // Jika error network parah, bersihkan cache biar aman
    clearCache();
    
    return sendError(res, err.message, 500);
  }
};

module.exports = {
  executeDirectSearch
};
