'use strict';

const fs = require('fs');
const path = require('path');
const { launchBrowser } = require('./browser');
const config = require('../config/config');
const logger = require('../utils/logger');

// ─── Selectors ─────────────────────────────────────────────────────────────────
// NOTE: Update these selectors when the PPATK page structure changes.
const SELECTORS = {
  tokenInputField: 'input[name="token"]', // Adjust to actual field selector
  loginButton: 'button[type="submit"]',   // Adjust to actual submit button
};

const SESSION_FILE = path.resolve(config.scraper.sessionFile);

/**
 * Utility: sleep/delay helper.
 * @param {number} ms - Milliseconds to wait
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ─── Manual Strategy Helpers ───────────────────────────────────────────────────

/**
 * Loads saved session cookies from disk (used by 'manual' strategy).
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
 * Saves current cookies to disk for future re-use.
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
 * Used in 'manual' strategy to pause and let the user solve the captcha.
 */
const waitForUserInput = () => {
  return new Promise((resolve) => {
    logger.info('─────────────────────────────────────────────────────');
    logger.info('[MANUAL MODE] Please solve the CAPTCHA in the browser.');
    logger.info('[MANUAL MODE] Press ENTER here when done...');
    logger.info('─────────────────────────────────────────────────────');
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.once('data', () => {
      process.stdin.pause();
      resolve();
    });
  });
};

// ─── Core Scrape Logic ─────────────────────────────────────────────────────────

/**
 * Attempts a single scrape using the 'stealth', 'capsolver', or '2captcha' strategy.
 * reCAPTCHA is handled by the browser plugin (or evaded by stealth).
 *
 * @param {import('playwright').Browser} browser
 * @returns {Promise<string>} The extracted token
 */
const attemptAutoScrape = async (browser) => {
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  try {
    logger.info(`[Scraper] Navigating to: ${config.scraper.targetUrl}`);
    await page.goto(config.scraper.targetUrl, {
      waitUntil: 'networkidle',
      timeout: config.scraper.timeoutMs,
    });

    // Only call solveRecaptchas() if using a solver plugin (not for stealth)
    if (['capsolver', '2captcha'].includes(config.captcha.strategy)) {
      logger.info('[Scraper] Solving reCAPTCHA via plugin...');
      const { solved, error: captchaError } = await page.solveRecaptchas();
      if (captchaError) {
        throw new Error(`reCAPTCHA solve failed: ${captchaError}`);
      }
      logger.info(`[Scraper] reCAPTCHA solved (count: ${solved?.length ?? 0}).`);
    } else {
      logger.info('[Scraper] Stealth mode — skipping solver, attempting natural navigation.');
    }

    await page.click(SELECTORS.loginButton);
    await page.waitForNavigation({ timeout: config.scraper.timeoutMs });

    const token = await page.inputValue(SELECTORS.tokenInputField).catch(() => null);

    if (!token) {
      throw new Error('Token not found in the page.');
    }

    logger.info(`[Scraper] Token extracted: ${token.substring(0, 20)}...`);
    return token;
  } finally {
    await context.close().catch((err) => logger.warn('[Scraper] Failed to close context:', err));
  }
};

/**
 * Attempts a single scrape using the 'manual' strategy:
 *  1. Try to load cookies from saved session file first.
 *  2. If no session, open browser non-headless, wait for user to login manually,
 *     save the session, then extract the token.
 *
 * @param {import('playwright').Browser} browser
 * @returns {Promise<string>} The extracted token
 */
const attemptManualScrape = async (browser) => {
  const savedCookies = loadSession();
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });

  // Re-inject saved cookies to skip login if session already exists
  if (savedCookies) {
    await context.addCookies(savedCookies);
    logger.info('[Scraper] Session cookies injected. Attempting to skip login...');
  }

  const page = await context.newPage();

  try {
    logger.info(`[Scraper] Navigating to: ${config.scraper.targetUrl}`);
    await page.goto(config.scraper.targetUrl, {
      waitUntil: 'networkidle',
      timeout: config.scraper.timeoutMs,
    });

    // Check if we still need to login (session may have expired)
    const needsLogin = !savedCookies || (await page.$(SELECTORS.loginButton)) !== null;

    if (needsLogin) {
      logger.info('[Scraper] Login required. Waiting for user to solve captcha manually...');
      await waitForUserInput();

      // Save session after user completes login
      await saveSession(context);
    } else {
      logger.info('[Scraper] Session is still valid. Proceeding without login.');
    }

    const token = await page.inputValue(SELECTORS.tokenInputField).catch(() => null);

    if (!token) {
      // Session might be expired — delete saved session and signal retry
      if (fs.existsSync(SESSION_FILE)) {
        fs.unlinkSync(SESSION_FILE);
        logger.warn('[Scraper] Token not found. Deleted stale session file. Will retry with fresh login.');
      }
      throw new Error('Token not found in the page. Session may have expired.');
    }

    logger.info(`[Scraper] Token extracted: ${token.substring(0, 20)}...`);
    return token;
  } finally {
    await context.close().catch((err) => logger.warn('[Scraper] Failed to close context:', err));
  }
};

// ─── Main Export ───────────────────────────────────────────────────────────────

/**
 * Main scraper function with retry logic.
 * Delegates to the correct strategy (auto or manual) based on config.
 *
 * @returns {Promise<string>} The extracted PPATK token
 */
const scrapeToken = async () => {
  const { maxRetries, retryDelayMs } = config.scraper;
  const strategy = config.captcha.strategy;
  let browser = null;

  try {
    browser = await launchBrowser();

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      logger.info(`[Scraper] Attempt ${attempt} of ${maxRetries} (strategy: ${strategy})...`);
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
