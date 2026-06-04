'use strict';

const { Router } = require('express');
const { getToken } = require('../controllers/tokenController');

const router = Router();

/**
 * @route  GET /api/v1/token
 * @desc   Scrape and return a PPATK token via headless Playwright
 * @access Public
 */
router.get('/token', getToken);

module.exports = router;
