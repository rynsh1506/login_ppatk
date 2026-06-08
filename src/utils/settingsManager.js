'use strict';

const fs = require('fs');
const path = require('path');
const config = require('../config/config');
const logger = require('./logger');

const SETTINGS_FILE = path.join(__dirname, '../../settings.json');

/**
 * Mendapatkan pengaturan terkini (membaca dari settings.json jika ada, jika tidak, pakai config bawaan env)
 */
const getSettings = () => {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    logger.warn(`[SettingsManager] Gagal membaca settings.json: ${err.message}. Menggunakan default config.`);
  }

  // Default fallback from .env / config
  return {
    strategy: config.captcha.strategy || 'manual',
    headless: process.env.HEADLESS ? process.env.HEADLESS.toLowerCase() === 'true' : false
  };
};

/**
 * Menyimpan pengaturan ke file settings.json
 */
const updateSettings = (newSettings) => {
  try {
    const currentSettings = getSettings();
    const mergedSettings = { ...currentSettings, ...newSettings };
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(mergedSettings, null, 2), 'utf8');
    logger.info('[SettingsManager] Pengaturan berhasil disimpan ke settings.json');
    return mergedSettings;
  } catch (err) {
    logger.error(`[SettingsManager] Gagal menyimpan settings.json: ${err.message}`);
    throw err;
  }
};

module.exports = {
  getSettings,
  updateSettings
};
