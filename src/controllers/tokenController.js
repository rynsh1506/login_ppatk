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
    const token = await scrapeToken();
    logger.info('[TokenController] Token retrieved successfully.');
    return sendSuccess(res, { token });
  } catch (err) {
    logger.error(`[TokenController] Failed to retrieve token: ${err.message}`, err);
    return sendError(res, err.message, 500);
  }
};

module.exports = { getToken };
