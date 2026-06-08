'use strict';

const { Router } = require('express');
const { getToken, updateCache } = require('../controllers/tokenController');
const { executeDirectSearch } = require('../controllers/searchController');

const router = Router();

/**
 * @route  GET /api/v1/token
 * @desc   Scrape and return a PPATK token via headless Playwright
 * @access Public
 */
router.get('/token', getToken);

/**
 * @route  POST /api/v1/search
 * @desc   Melakukan Direct Search (Axios) ke web PPATK menggunakan Cookie dari Playwright
 * @access Public
 */
router.post('/search', executeDirectSearch);

/**
 * @route  POST /api/v1/update-cache
 * @desc   Mengupdate cache.json secara manual dengan cookie dari luar
 * @access Public
 */
router.post('/update-cache', updateCache);

module.exports = router;
