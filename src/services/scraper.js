'use strict';

const { launchBrowser } = require('./browser');
const config = require('../config/config');
const logger = require('../utils/logger');

// ─── Selectors ─────────────────────────────────────────────────────────────────
// NOTE: Update these selectors when the PPATK page structure changes.
const SELECTORS = {
  tokenInputField: 'input[name="token"]', // Adjust to actual field selector
  loginButton: 'button[type="submit"]',   // Adjust to actual submit button
};

/**
 * Utility: sleep/delay helper.
 * @param {number} ms - Milliseconds to wait
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Attempts a single scrape: opens the page, solves captcha, and extracts token.
 *
 * @param {import('playwright').Browser} browser
 * @returns {Promise<string>} The extracted token
 */
const attemptScrape = async (browser) => {
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

    logger.info('[Scraper] Page loaded. Solving reCAPTCHA...');
    const { solved, error: captchaError } = await page.solveRecaptchas();

    if (captchaError) {
      throw new Error(`reCAPTCHA solve failed: ${captchaError}`);
    }

    logger.info(`[Scraper] reCAPTCHA solved (count: ${solved?.length ?? 0}). Submitting form...`);

    // Click submit / trigger form submission after captcha is solved
    await page.click(SELECTORS.loginButton);
    await page.waitForNavigation({ timeout: config.scraper.timeoutMs });

    // ── Extract the token ─────────────────────────────────────────────────────
    // Strategy 1: Read from an input field
    const token = await page.inputValue(SELECTORS.tokenInputField).catch(() => null);

    // Strategy 2 (fallback): Read from response cookies
    // const cookies = await context.cookies();
    // const token = cookies.find((c) => c.name === 'session_token')?.value;

    if (!token) {
      throw new Error('Token not found in the page after captcha solve.');
    }

    logger.info(`[Scraper] Token extracted successfully: ${token.substring(0, 20)}...`);
    return token;
  } finally {
    // Always close the context to prevent memory leaks between requests
    await context.close().catch((err) => logger.warn('[Scraper] Failed to close context:', err));
  }
};

/**
 * Main scraper function with retry logic.
 * Opens a browser, tries to extract the token, retries on failure.
 *
 * @returns {Promise<string>} The extracted PPATK token
 */
const scrapeToken = async () => {
  const { maxRetries, retryDelayMs } = config.scraper;
  let browser = null;

  try {
    browser = await launchBrowser();

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      logger.info(`[Scraper] Attempt ${attempt} of ${maxRetries}...`);
      try {
        const token = await attemptScrape(browser);
        return token;
      } catch (err) {
        logger.warn(`[Scraper] Attempt ${attempt} failed: ${err.message}`);
        if (attempt < maxRetries) {
          logger.info(`[Scraper] Retrying in ${retryDelayMs}ms...`);
          await sleep(retryDelayMs);
        } else {
          // All retries exhausted - re-throw to caller
          throw new Error(`All ${maxRetries} scrape attempts failed. Last error: ${err.message}`);
        }
      }
    }
  } finally {
    // Always close the browser, even on error
    if (browser) {
      await browser.close().catch((err) => logger.warn('[Scraper] Failed to close browser:', err));
      logger.info('[Browser] Browser closed.');
    }
  }
};

module.exports = { scrapeToken };
