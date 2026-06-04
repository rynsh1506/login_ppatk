'use strict';

const { chromium } = require('playwright-extra');
const RecaptchaPlugin = require('puppeteer-extra-plugin-recaptcha');
const config = require('../config/config');
const logger = require('../utils/logger');

/**
 * Launches a configured Playwright browser (headless) with the
 * reCAPTCHA solver plugin pre-registered.
 *
 * @returns {Promise<import('playwright').Browser>} A ready-to-use browser instance
 */
const launchBrowser = async () => {
  logger.info('[Browser] Registering reCAPTCHA solver plugin...');

  chromium.use(
    RecaptchaPlugin({
      provider: {
        id: config.captcha.provider,
        token: config.captcha.apiKey,
      },
      visualFeedback: true, // Marks solved CAPTCHAs with a green border (useful for debugging)
    })
  );

  logger.info('[Browser] Launching headless Chromium...');

  const browser = await chromium.launch({
    headless: config.scraper.headless,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage', // Crucial for running in low-memory environments (e.g., Docker)
    ],
  });

  logger.info('[Browser] Browser launched successfully.');
  return browser;
};

module.exports = { launchBrowser };
