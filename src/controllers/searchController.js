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
      logger.info('[SearchController] Cache Cookie kosong/rusak. Menjalankan bot (Playwright) untuk Login...');
      const loginResult = await scrapeToken();
      cookieCache = loginResult.cookieString;
      
      logger.info('[SearchController] Mengekstrak CSRF Token perdana...');
      csrfCache = await getCsrfToken(cookieCache);

      // Simpan ke file
      saveCache(cookieCache, csrfCache);
      logger.info('[SearchController] Cache baru berhasil disimpan ke cache.json');
    } else {
      logger.info('[SearchController] Menggunakan Cookie & CSRF dari File Cache (cache.json) ⚡');
    }

    // 2. Tembak HTTP POST langsung
    let searchHtml = await performDirectSearch(cookieCache, csrfCache, req.body);

    // 3. Validasi apakah session expired (ditendang ke halaman login oleh web PPATK)
    if (typeof searchHtml === 'string' && searchHtml.includes('login-form')) {
      logger.warn('[SearchController] Session Expired! PPATK meminta login ulang. Menghapus File Cache...');
      clearCache();

      // Jalankan ulang bot login sekali lagi
      logger.info('[SearchController] Re-Login otomatis via Playwright...');
      const loginResult = await scrapeToken();
      cookieCache = loginResult.cookieString;
      csrfCache = await getCsrfToken(cookieCache);
      
      saveCache(cookieCache, csrfCache);

      // Tembak ulang Axios dengan cookie baru
      logger.info('[SearchController] Melakukan pencarian ulang dengan Cookie baru...');
      searchHtml = await performDirectSearch(cookieCache, csrfCache, req.body);
    }

    logger.info('[SearchController] Proses pencarian (Axios) selesai. Mengekstrak data HTML menjadi JSON...');

    // Parsing HTML menjadi JSON Data Tabel menggunakan Cheerio
    const parsedData = parseSearchHtml(searchHtml);

    // Kembalikan hasilnya
    return sendSuccess(res, {
      message: 'Pencarian berhasil dieksekusi via Axios',
      cookies_used: cookieCache,
      csrf_used: csrfCache,
      html_response_length: searchHtml ? searchHtml.length : 0,
      extracted_data: parsedData 
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
