'use strict';

const axios = require('axios');
const qs = require('qs');
const cheerio = require('cheerio');
const logger = require('../utils/logger');

const SEARCH_URL = 'https://pep.ppatk.go.id/admin/search';

/**
 * Melakukan HTTP GET untuk mengekstrak token CSRF dari halaman pencarian.
 * Diperlukan agar request POST tidak ditolak oleh Yii Framework.
 * @param {string} cookieString - String cookie dari sesi login
 * @returns {Promise<string>} - Token CSRF
 */
const getCsrfToken = async (cookieString) => {
  logger.info('[SearchService] Melakukan request GET untuk mengambil token _csrf_backend...');
  
  const headers = {
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'accept-encoding': 'gzip, deflate, br, zstd',
    'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7,la;q=0.6',
    'cache-control': 'max-age=0',
    'connection': 'keep-alive',
    'cookie': cookieString,
    'sec-ch-ua': '"Google Chrome";v="149", "Chromium";v="149", "Not)A;Brand";v="24"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-user': '?1',
    'upgrade-insecure-requests': '1',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36'
  };

  try {
    const response = await axios.get(SEARCH_URL, { headers });
    const $ = cheerio.load(response.data);
    
    // Yii Framework biasanya menaruh CSRF token di tag meta ini
    const csrfToken = $('meta[name="csrf-token"]').attr('content');
    
    if (!csrfToken) {
      const pageTitle = $('title').text().trim();
      logger.warn(`[SearchService] Peringatan: csrf-token tidak ditemukan di tag meta HTML. Page Title: "${pageTitle}"`);
      // Simpan HTML ke file untuk debugging
      const fs = require('fs');
      const path = require('path');
      const tempPath = path.join(__dirname, '../../temp_error_page.html');
      fs.writeFileSync(tempPath, response.data);
      logger.info(`[SearchService] HTML halaman error telah disimpan di ${tempPath} untuk investigasi.`);
    } else {
      logger.info('[SearchService] CSRF Token berhasil diekstrak.');
    }
    
    return csrfToken;
  } catch (error) {
    logger.error(`[SearchService] Gagal mengambil halaman pencarian: ${error.message}`);
    throw new Error('Gagal mengakses halaman pencarian PPATK.');
  }
};

/**
 * Melakukan pencarian langsung (Direct Search) menggunakan Axios
 * @param {string} cookieString - Format key=value; hasil dari Playwright
 * @param {string} csrfToken - Token yang diekstrak sebelumnya
 * @param {Object} searchData - Body / Payload pencarian dari klien API
 * @returns {Promise<any>} - Data hasil respon HTML / JSON
 */
const performDirectSearch = async (cookieString, csrfToken, searchData) => {
  logger.info('[SearchService] Menjalankan HTTP POST pencarian murni via Axios...');

  // Inject token CSRF ke dalam payload pencarian jika ada
  if (csrfToken) {
    searchData['_csrf_backend'] = csrfToken;
  }

  // Format menjadi x-www-form-urlencoded
  const encodedBody = qs.stringify(searchData);

  // Menyusun header persis seperti browser (berdasarkan inspeksi network DevTools)
  const headers = {
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'accept-encoding': 'gzip, deflate, br, zstd',
    'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7,la;q=0.6',
    'cache-control': 'max-age=0',
    'connection': 'keep-alive',
    'content-type': 'application/x-www-form-urlencoded',
    'cookie': cookieString,
    'origin': 'https://pep.ppatk.go.id',
    'referer': 'https://pep.ppatk.go.id/admin/search',
    'sec-ch-ua': '"Google Chrome";v="149", "Chromium";v="149", "Not)A;Brand";v="24"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-user': '?1',
    'upgrade-insecure-requests': '1',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36'
  };

  try {
    const response = await axios.post(SEARCH_URL, encodedBody, { 
      headers,
      maxRedirects: 5, // Izinkan redirect jika PPATK memberikan status 302
      validateStatus: (status) => status >= 200 && status < 400
    });
    
    logger.info(`[SearchService] Pencarian sukses dengan status: ${response.status}`);
    
    // (Opsional) Jika Anda ingin mengekstrak tabel, Anda bisa menggunakan cheerio di sini.
    // Sementara ini, kita kembalikan raw data (bisa berupa HTML atau JSON tergantung web PPATK).
    return response.data;
    
  } catch (error) {
    logger.error(`[SearchService] HTTP POST pencarian gagal: ${error.message}`);
    throw new Error(`Gagal melakukan pencarian: ${error.message}`);
  }
};

/**
 * Mengubah raw HTML dari PPATK menjadi JSON murni yang berisi data tabel.
 * Disesuaikan khusus untuk struktur tabel vertikal (Key-Value) milik PPATK.
 * @param {string} html - Raw HTML response
 * @returns {Object} - JSON berisi hasil parsing
 */
const parseSearchHtml = (html) => {
  const $ = cheerio.load(html);
  
  // Deteksi jika ada pesan alert (misal: "Data tidak ditemukan")
  const alertText = $('.alert, .text-danger, .callout-danger').text().trim();
  
  const results = [];
  
  // Mencari semua tabel dengan class .table-detail
  $('.table-detail').each((i, table) => {
    const record = {};
    
    // Looping setiap baris, di mana td pertama adalah Key, td kedua adalah Value
    $(table).find('tbody tr').each((j, tr) => {
      const tds = $(tr).find('td');
      
      if (tds.length === 2) {
        const key = $(tds[0]).text().trim();
        const value = $(tds[1]).text().trim();
        
        if (key) {
          record[key] = value;
        }
      }
    });
    
    // Masukkan ke array jika ada datanya
    if (Object.keys(record).length > 0) {
      results.push(record);
    }
  });

  return {
    pesan_sistem: alertText || 'Pencarian diproses',
    total_data_ditemukan: results.length,
    data: results
  };
};

module.exports = {
  getCsrfToken,
  performDirectSearch,
  parseSearchHtml
};
