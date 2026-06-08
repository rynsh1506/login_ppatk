'use strict';

require('dotenv').config();

/**
 * Centralized Configuration Schema
 * Grouped to match .env.example sections.
 */
const config = {
  // ==============================================================================
  // SERVER CONFIGURATION
  // ==============================================================================
  app: {
    port: parseInt(process.env.PORT, 10) || 3000,
    env: process.env.NODE_ENV || 'development',
    headless: process.env.HEADLESS !== 'false',
  },

  // ==============================================================================
  // TARGET & LOGIN CREDENTIALS
  // ==============================================================================
  scraper: {
    targetUrl: process.env.TARGET_URL || 'https://pep.ppatk.go.id/admin/user/login',
    timeoutMs: parseInt(process.env.SCRAPER_TIMEOUT) || 30000,
    maxRetries: parseInt(process.env.SCRAPER_MAX_RETRIES) || 1,
    retryDelayMs: parseInt(process.env.SCRAPER_RETRY_DELAY) || 5000,
    loginEmail: process.env.LOGIN_EMAIL || '',
    loginPassword: process.env.LOGIN_PASSWORD || '',
    sessionFile: process.env.SESSION_FILE || 'session.json',
  },

  // ==============================================================================
  // CAPTCHA CONFIGURATION
  // ==============================================================================
  captcha: {
    strategy: process.env.CAPTCHA_STRATEGY || 'stealth',
    apiKey: process.env.CAPTCHA_API_KEY || '',
  },

  // ==============================================================================
  // PROXY CONFIGURATION
  // ==============================================================================
  proxy: {
    useProxy: process.env.USE_PROXY === 'true',
    server: process.env.PROXY_SERVER || '',
    username: process.env.PROXY_USERNAME || '',
    password: process.env.PROXY_PASSWORD || '',
  },

  // ==============================================================================
  // LOGGER CONFIGURATION
  // ==============================================================================
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

module.exports = config;
