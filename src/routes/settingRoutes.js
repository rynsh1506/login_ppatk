'use strict';

const { Router } = require('express');
const { getSettingsConfig, updateSettingsConfig } = require('../controllers/settingController');

const router = Router();

/**
 * @route  GET /api/v1/settings
 * @desc   Mengambil konfigurasi setting bot scraper (strategy, headless)
 * @access Public
 */
router.get('/', getSettingsConfig);

/**
 * @route  PUT /api/v1/settings
 * @desc   Mengupdate konfigurasi setting bot scraper
 * @access Public
 */
router.put('/', updateSettingsConfig);

module.exports = router;
