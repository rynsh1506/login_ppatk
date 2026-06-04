'use strict';

require('dotenv').config();

/**
 * Captcha Strategy Options:
 *  - 'stealth'   : Gunakan puppeteer-extra-plugin-stealth (100% gratis, tanpa API key)
 *  - 'manual'    : Browser jalan non-headless, user solve captcha manual lalu tekan Enter
 *  - 'capsolver' : Gunakan Capsolver.com (ada free tier)
 *  - '2captcha'  : Gunakan 2Captcha (berbayar, ~$2-3 per 1000 solve)
 */
const config = {
  app: {
    port: parseInt(process.env.PORT, 10) || 3000,
    env: process.env.NODE_ENV || 'development',
  },
  captcha: {
    strategy: process.env.CAPTCHA_STRATEGY || 'stealth',
    apiKey: process.env.CAPTCHA_API_KEY || '',
  },
  scraper: {
    targetUrl:     process.env.TARGET_URL     || 'https://pep.ppatk.go.id/admin/user/login',
    loginEmail:    process.env.LOGIN_EMAIL    || '',
    loginPassword: process.env.LOGIN_PASSWORD || '',
    maxRetries:    3,
    retryDelayMs:  2000,
    timeoutMs:     60000,
    sessionFile:   process.env.SESSION_FILE   || 'session.json',
  },
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
  proxy: {
    useProxy: process.env.USE_PROXY === 'true',
    server: process.env.PROXY_SERVER || '',
    username: process.env.PROXY_USERNAME || '',
    password: process.env.PROXY_PASSWORD || '',
  },
};

module.exports = config;
