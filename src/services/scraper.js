'use strict';

const fs = require('fs');
const path = require('path');
const { launchBrowser } = require('./browser');
const config = require('../config/config');
const logger = require('../utils/logger');

// ─── Selectors ─────────────────────────────────────────────────────────────────
// Verified directly from DOM of https://pep.ppatk.go.id/admin/user/login
// NOTE: Update these if the PPATK page structure ever changes.
const SELECTORS = {
  usernameInput:     'input[name="username"]',   // type="text", placeholder="Username"
  passwordInput:     'input[name="password"]',   // type="password", placeholder="Password"
  loginButton:       'button#btn-login',          // id="btn-login", class="btn btn-lg btn-primary btn-block"

  // Token/session location after login:
  // The site uses a PHP session cookie. After login, check DevTools →
  // Application → Cookies → pep.ppatk.go.id to find the session cookie name.
  // Common names: 'PHPSESSID', '_identity-backend', or similar.
  sessionCookieName: '_identity-backend',        // TODO: verify this after first manual login
};

const SESSION_FILE = path.resolve(config.scraper.sessionFile);

/**
 * Utility: sleep/delay helper.
 * @param {number} ms - Milliseconds to wait
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ─── Session Helpers ───────────────────────────────────────────────────────────

/**
 * Loads saved session cookies from disk.
 * Returns null if no session file exists yet.
 *
 * @returns {Array|null} Array of cookie objects, or null if not found
 */
const loadSession = () => {
  if (fs.existsSync(SESSION_FILE)) {
    logger.info(`[Scraper] Loading saved session from: ${SESSION_FILE}`);
    return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
  }
  return null;
};

/**
 * Saves current browser cookies to disk for future re-use.
 *
 * @param {import('playwright').BrowserContext} context
 */
const saveSession = async (context) => {
  const cookies = await context.cookies();
  fs.writeFileSync(SESSION_FILE, JSON.stringify(cookies, null, 2), 'utf8');
  logger.info(`[Scraper] Session saved to: ${SESSION_FILE}`);
};

/**
 * Waits for the user to press Enter in the terminal.
 * Used in 'manual' strategy to pause while user solves the CAPTCHA.
 */
const waitForUserInput = () => {
  return new Promise((resolve) => {
    logger.info('─────────────────────────────────────────────────────');
    logger.info('[MANUAL MODE] Selesaikan CAPTCHA di browser yang terbuka.');
    logger.info('[MANUAL MODE] Tekan ENTER di sini setelah selesai login...');
    logger.info('─────────────────────────────────────────────────────');
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.once('data', () => {
      process.stdin.pause();
      resolve();
    });
  });
};

// ─── Login Logic ───────────────────────────────────────────────────────────────

/**
 * Performs automated login using credentials from .env.
 * Works for strategy: stealth | capsolver | 2captcha.
 *
 * Flow:
 *  1. Navigate to login page
 *  2. Fill username + password
 *  3. If strategy uses a solver plugin → solve reCAPTCHA first
 *  4. Click login button and wait for redirect
 *  5. Verify redirect away from /login page
 *
 * @param {import('playwright').Page} page
 */
const performLogin = async (page) => {
  const { loginEmail, loginPassword, targetUrl, timeoutMs } = config.scraper;
  const strategy = config.captcha.strategy;

  // Guard: credentials must be set
  if (!loginEmail || !loginPassword) {
    throw new Error(
      '[Login] LOGIN_EMAIL atau LOGIN_PASSWORD belum diisi di file .env. ' +
      'Salin .env.example ke .env lalu isi nilai yang benar.'
    );
  }

  logger.info(`[Login] Navigating to: ${targetUrl}`);
  await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: timeoutMs });

  // Fill credentials
  logger.info(`[Login] Mengisi username: ${loginEmail}`);
  await page.fill(SELECTORS.usernameInput, loginEmail);
  await page.fill(SELECTORS.passwordInput, loginPassword);
  logger.info('[Login] Credentials terisi.');

  // Solve reCAPTCHA jika strategy menggunakan solver berbayar
  if (['capsolver', '2captcha'].includes(strategy)) {
    logger.info(`[Login] Solving reCAPTCHA via ${strategy}...`);
    const { solved, error: captchaError } = await page.solveRecaptchas();
    if (captchaError) {
      throw new Error(`[Login] reCAPTCHA solve gagal: ${captchaError}`);
    }
    logger.info(`[Login] reCAPTCHA solved (count: ${solved?.length ?? 0}).`);
  } else if (strategy === 'stealth') {
    // Stealth mode: browser terlihat seperti user biasa, semoga reCAPTCHA tidak muncul
    logger.info('[Login] Stealth mode — mencoba submit tanpa solver. reCAPTCHA mungkin tidak muncul jika terdeteksi sebagai browser normal.');
  }

  // Submit form dan tunggu navigasi
  logger.info('[Login] Klik tombol Login...');
  await Promise.all([
    page.waitForNavigation({ timeout: timeoutMs }),
    page.click(SELECTORS.loginButton),
  ]);

  // Verifikasi: URL harus berubah (bukan kembali ke /login)
  const currentUrl = page.url();
  if (currentUrl.includes('/login')) {
    throw new Error(
      '[Login] Login GAGAL — URL masih di halaman login. ' +
      'Kemungkinan: password salah, atau reCAPTCHA belum terselesaikan. ' +
      'Coba strategy "manual" untuk solve captcha secara manual.'
    );
  }

  logger.info(`[Login] Login berhasil! Redirected ke: ${currentUrl}`);
};

// ─── Token Extraction ─────────────────────────────────────────────────────────

/**
 * Extracts the session token from browser cookies after a successful login.
 * Logs all available cookie names if the expected cookie is not found.
 *
 * @param {import('playwright').BrowserContext} context
 * @returns {Promise<string>} The session token value
 */
const extractToken = async (context) => {
  const cookies = await context.cookies();

  const sessionCookie = cookies.find((c) => c.name === SELECTORS.sessionCookieName);
  const token = sessionCookie?.value;

  if (!token) {
    const cookieNames = cookies.map((c) => c.name).join(', ');
    logger.warn(`[Scraper] Cookie "${SELECTORS.sessionCookieName}" tidak ditemukan.`);
    logger.warn(`[Scraper] Cookie yang tersedia: ${cookieNames || '(tidak ada)'}`);
    throw new Error(
      `[Scraper] Token tidak ditemukan di cookie "${SELECTORS.sessionCookieName}". ` +
      'Buka DevTools (F12) → Application → Cookies → pep.ppatk.go.id setelah login manual ' +
      'untuk menemukan nama cookie yang benar, lalu update SELECTORS.sessionCookieName di scraper.js.'
    );
  }

  logger.info(`[Scraper] Token berhasil ditemukan: ${token.substring(0, 20)}...`);
  return token;
};

// ─── Auto Scrape (stealth / capsolver / 2captcha) ─────────────────────────────

/**
 * Automated scrape: login with credentials → solve captcha via plugin (if applicable)
 * → extract session token from cookies.
 *
 * @param {import('playwright').Browser} browser
 * @returns {Promise<string>} The session token
 */
const attemptAutoScrape = async (browser) => {
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  try {
    await performLogin(page);
    return await extractToken(context);
  } finally {
    await context.close().catch((err) => logger.warn('[Scraper] Failed to close context:', err));
  }
};

// ─── Manual Scrape ─────────────────────────────────────────────────────────────

/**
 * Manual scrape: reuse saved session if available, otherwise open non-headless browser
 * and wait for user to login and solve CAPTCHA manually, then save session for future use.
 *
 * @param {import('playwright').Browser} browser
 * @returns {Promise<string>} The session token
 */
const attemptManualScrape = async (browser) => {
  const savedCookies = loadSession();
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });

  if (savedCookies) {
    await context.addCookies(savedCookies);
    logger.info('[Scraper] Session cookies dari file berhasil di-inject. Mencoba skip login...');
  }

  const page = await context.newPage();

  try {
    logger.info(`[Scraper] Navigating to: ${config.scraper.targetUrl}`);
    await page.goto(config.scraper.targetUrl, {
      waitUntil: 'networkidle',
      timeout: config.scraper.timeoutMs,
    });

    // Cek apakah masih di halaman login (session expired atau belum pernah login)
    const isOnLoginPage = page.url().includes('/login');

    if (isOnLoginPage) {
      // Isi credential dulu, biarkan user selesaikan CAPTCHA secara manual
      if (config.scraper.loginEmail && config.scraper.loginPassword) {
        logger.info('[Scraper] Mengisi credential otomatis sebelum user solve CAPTCHA...');
        await page.fill(SELECTORS.usernameInput, config.scraper.loginEmail);
        await page.fill(SELECTORS.passwordInput, config.scraper.loginPassword);
        logger.info('[Scraper] Credential terisi. Silakan selesaikan CAPTCHA secara manual.');
      }

      await waitForUserInput();

      // Tunggu sampai URL berubah dari halaman login
      await page.waitForURL((url) => !url.includes('/login'), {
        timeout: config.scraper.timeoutMs,
      }).catch(() => {
        throw new Error('[Manual] Timeout menunggu redirect setelah login manual.');
      });

      await saveSession(context);
    } else {
      logger.info('[Scraper] Session masih valid, langsung ambil token.');
    }

    // Extract token
    const token = await extractToken(context);
    return token;

  } catch (err) {
    // Hapus session file yang stale jika token tidak ditemukan
    if (err.message.includes('Token tidak ditemukan') && fs.existsSync(SESSION_FILE)) {
      fs.unlinkSync(SESSION_FILE);
      logger.warn('[Scraper] Session stale dihapus. Request berikutnya akan login ulang.');
    }
    throw err;
  } finally {
    await context.close().catch((err) => logger.warn('[Scraper] Failed to close context:', err));
  }
};

// ─── Main Export ───────────────────────────────────────────────────────────────

/**
 * Main scraper function with retry logic.
 * Dispatches to the correct scrape function based on CAPTCHA_STRATEGY.
 *
 * @returns {Promise<string>} The extracted PPATK session token
 */
const scrapeToken = async () => {
  const { maxRetries, retryDelayMs } = config.scraper;
  const strategy = config.captcha.strategy;
  let browser = null;

  try {
    browser = await launchBrowser();

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      logger.info(`[Scraper] Attempt ${attempt}/${maxRetries} (strategy: ${strategy})...`);
      try {
        const token =
          strategy === 'manual'
            ? await attemptManualScrape(browser)
            : await attemptAutoScrape(browser);
        return token;
      } catch (err) {
        logger.warn(`[Scraper] Attempt ${attempt} failed: ${err.message}`);
        if (attempt < maxRetries) {
          logger.info(`[Scraper] Retrying in ${retryDelayMs}ms...`);
          await sleep(retryDelayMs);
        } else {
          throw new Error(`All ${maxRetries} scrape attempts failed. Last error: ${err.message}`);
        }
      }
    }
  } finally {
    if (browser) {
      await browser.close().catch((err) => logger.warn('[Scraper] Failed to close browser:', err));
      logger.info('[Browser] Browser closed.');
    }
  }
};

module.exports = { scrapeToken };
