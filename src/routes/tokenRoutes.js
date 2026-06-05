'use strict';

const { Router } = require('express');
const { getToken } = require('../controllers/tokenController');
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

module.exports = router;
