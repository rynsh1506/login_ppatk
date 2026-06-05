'use strict';

const { scrapeToken } = require('../services/scraper');
const { sendSuccess, sendError } = require('../utils/responseHelper');
const logger = require('../utils/logger');

/**
 * GET /api/v1/token
 * Triggers a headless Playwright session to scrape and return a PPATK token.
 */
const getToken = async (req, res) => {
  logger.info(`[TokenController] getToken called | IP: ${req.ip}`);

  try {
    const result = await scrapeToken();
    logger.info('[TokenController] Token dan cookies retrieved successfully.');
    return sendSuccess(res, { 
      token: result.token,
      cookieDict: result.cookieDict,
      cookieString: result.cookieString,
      rawCookies: result.rawCookies 
    });
  } catch (err) {
    logger.error(`[TokenController] Failed to retrieve token: ${err.message}`, err);
    return sendError(res, err.message, 500);
  }
};

module.exports = { getToken };
