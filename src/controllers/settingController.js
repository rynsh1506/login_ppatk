'use strict';

const { getSettings, updateSettings } = require('../utils/settingsManager');
const { sendSuccess, sendError } = require('../utils/responseHelper');
const logger = require('../utils/logger');

/**
 * GET /api/v1/settings
 * Mengambil konfigurasi setting saat ini
 */
const getSettingsConfig = (req, res) => {
  try {
    const settings = getSettings();
    return sendSuccess(res, settings);
  } catch (err) {
    logger.error(`[SettingController] Gagal mengambil settings: ${err.message}`);
    return sendError(res, 'Gagal mengambil settings', 500);
  }
};

/**
 * PUT /api/v1/settings
 * Mengupdate konfigurasi setting
 * Body JSON: { strategy: "stealth", headless: true }
 */
const updateSettingsConfig = (req, res) => {
  const { strategy, headless } = req.body;

  if (strategy === undefined && headless === undefined) {
    return sendError(res, 'Diperlukan field strategy atau headless untuk update.', 400);
  }

  try {
    const newSettings = {};
    if (strategy !== undefined) newSettings.strategy = String(strategy).toLowerCase();
    if (headless !== undefined) newSettings.headless = Boolean(headless);

    const updatedSettings = updateSettings(newSettings);
    logger.info(`[SettingController] Settings berhasil diupdate: ${JSON.stringify(updatedSettings)}`);
    return sendSuccess(res, { message: 'Settings berhasil diupdate', settings: updatedSettings });
  } catch (err) {
    logger.error(`[SettingController] Gagal update settings: ${err.message}`);
    return sendError(res, 'Gagal mengupdate settings', 500);
  }
};

module.exports = {
  getSettingsConfig,
  updateSettingsConfig
};
