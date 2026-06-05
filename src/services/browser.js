'use strict';

const { chromium } = require('playwright-extra');
const config = require('../config/config');
const logger = require('../utils/logger');

/**
 * Attach the correct plugin to `chromium` based on CAPTCHA_STRATEGY env var.
 *
 * Strategies:
 *  - 'stealth'   : puppeteer-extra-plugin-stealth (free, no API key needed)
 *  - 'manual'    : No plugin — browser runs non-headless so user can solve manually
 *  - 'capsolver' : puppeteer-extra-plugin-recaptcha with Capsolver provider (free tier available)
 *  - '2captcha'  : puppeteer-extra-plugin-recaptcha with 2Captcha provider (paid)
 */
const applyStrategy = (strategy) => {
  switch (strategy) {
    case 'stealth': {
      const StealthPlugin = require('puppeteer-extra-plugin-stealth');
      chromium.use(StealthPlugin());
      logger.info('[Browser] Strategy: STEALTH — using stealth plugin (no API key needed).');
      break;
    }

    case 'capsolver':
    case '2captcha': {
      if (!config.captcha.apiKey) {
        throw new Error(
          `[Browser] Strategy "${strategy}" requires CAPTCHA_API_KEY in .env but it is empty.`
        );
      }
      const RecaptchaPlugin = require('puppeteer-extra-plugin-recaptcha');
      chromium.use(
        RecaptchaPlugin({
          provider: {
            id: strategy, // 'capsolver' or '2captcha'
            token: config.captcha.apiKey,
          },
          visualFeedback: true,
        })
      );
      logger.info(`[Browser] Strategy: ${strategy.toUpperCase()} — reCAPTCHA plugin registered.`);
      break;
    }

    case 'manual':
      // No plugin needed — browser will run non-headless (see headless flag below)
      logger.info('[Browser] Strategy: MANUAL — browser will open visually for user interaction.');
      break;

    default:
      throw new Error(
        `[Browser] Unknown CAPTCHA_STRATEGY: "${strategy}". ` +
        `Valid options: stealth | manual | capsolver | 2captcha`
      );
  }
};

/**
 * Launches a Playwright browser with the correct strategy applied.
 * - 'manual' strategy runs non-headless so user can interact.
 * - All other strategies run headless.
 *
 * @returns {Promise<import('playwright').Browser>} A ready-to-use browser instance
 */
const launchBrowser = async () => {
  const strategy = config.captcha.strategy;

  applyStrategy(strategy);

  // Manual strategy harus non-headless; strategi lain bisa dipaksa non-headless
  // via env HEADLESS=false (berguna untuk debug / observasi stealth mode)
  const envHeadless = process.env.HEADLESS?.toLowerCase();
  const isHeadless = strategy !== 'manual' && envHeadless !== 'false';

  logger.info(`[Browser] Launching ${isHeadless ? 'headless' : 'non-headless'} Chromium...`);

  // Bangun opsi launch browser secara dinamis
  const launchOptions = {
    headless: isHeadless,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage', // Important for low-memory / Docker environments
    ],
  };

  if (!isHeadless) {
    launchOptions.args.push('--start-maximized');
  }

  // Suntikkan konfigurasi proxy jika diaktifkan
  if (config.proxy && config.proxy.useProxy) {
    if (!config.proxy.server) {
      logger.warn('[Browser] Proxy diaktifkan (USE_PROXY=true) tapi PROXY_SERVER kosong!');
    } else {
      logger.info(`[Browser] Menggunakan proxy server: ${config.proxy.server}`);
      const proxyConfig = {
        server: config.proxy.server,
      };

      if (config.proxy.username) {
        proxyConfig.username = config.proxy.username;
        proxyConfig.password = config.proxy.password;
      }

      launchOptions.proxy = proxyConfig;
    }
  }

  const browser = await chromium.launch(launchOptions);

  logger.info('[Browser] Browser launched successfully.');
  return browser;
};

module.exports = { launchBrowser };
