'use strict';

const fs = require('fs');
const path = require('path');
const { scrapeToken } = require('../services/scraper');
const { getCsrfToken } = require('../services/searchService');
const { sendSuccess, sendError } = require('../utils/responseHelper');
const logger = require('../utils/logger');

/**
 * GET /api/v1/token
 * Triggers a headless Playwright session to scrape and return a PPATK token.
 */
const getToken = async (req, res) => {
  logger.info(`[TokenController] getToken called | IP: ${req.ip}`);

  try {
    const result = await scrapeToken();
    logger.info('[TokenController] Token dan cookies retrieved successfully.');

    // Save to cache automatically so search API can use it
    const CACHE_FILE = path.join(__dirname, '../../cache.json');
    const csrfToken = await getCsrfToken(result.cookieString);
    fs.writeFileSync(CACHE_FILE, JSON.stringify({ cookieString: result.cookieString, csrfToken }, null, 2), 'utf8');
    logger.info('[TokenController] Token and CSRF saved to cache.json');

    return sendSuccess(res, { 
      token: result.token,
      cookieDict: result.cookieDict,
      cookieString: result.cookieString,
      rawCookies: result.rawCookies 
    });
  } catch (err) {
    logger.error(`[TokenController] Failed to retrieve token: ${err.message}`, err);
    return sendError(res, err.message, 500);
  }
};

/**
 * POST /api/v1/update-cache
 * Endpoint manual untuk menerima cookieString dari browser luar dan menyimpannya ke cache.json
 */
const updateCache = async (req, res) => {
  logger.info(`[TokenController] updateCache called | IP: ${req.ip}`);
  let { cookieString, csrfToken } = req.body;

  if (!cookieString) {
    return sendError(res, 'cookieString is required in request body.', 400);
  }

  try {
    if (!csrfToken) {
      logger.info('[TokenController] Mengekstrak CSRF token dari cookie yang diberikan...');
      csrfToken = await getCsrfToken(cookieString);
    } else {
      logger.info('[TokenController] Menggunakan CSRF token yang diberikan oleh user.');
    }

    const CACHE_FILE = path.join(__dirname, '../../cache.json');
    const cacheData = { cookieString, csrfToken };
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheData, null, 2), 'utf8');

    logger.info('[TokenController] cache.json berhasil diupdate dari injeksi manual.');
    return sendSuccess(res, { message: 'Cache updated successfully', cache: cacheData });
  } catch (err) {
    logger.error(`[TokenController] Gagal ekstrak CSRF: ${err.message}`);
    return sendError(res, `Gagal ekstrak CSRF token: ${err.message}`, 500);
  }
};

const checkStatus = (req, res) => {
  const CACHE_FILE = path.join(__dirname, '../../cache.json');
  const isLoggedIn = fs.existsSync(CACHE_FILE);
  return sendSuccess(res, { loggedIn: isLoggedIn });
};

const deleteCache = (req, res) => {
  const CACHE_FILE = path.join(__dirname, '../../cache.json');
  if (fs.existsSync(CACHE_FILE)) {
    try {
      fs.unlinkSync(CACHE_FILE);
      logger.info('[TokenController] cache.json berhasil dihapus secara manual (Logout).');
    } catch (e) {
      return sendError(res, `Gagal menghapus cache: ${e.message}`, 500);
    }
  }
  return sendSuccess(res, { message: 'Cache berhasil dikosongkan (Logout sukses).' });
};

module.exports = { getToken, updateCache, checkStatus, deleteCache };
