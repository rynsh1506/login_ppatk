'use strict';

const { scrapeToken } = require('../services/scraper');
const { sendSuccess, sendError } = require('../utils/responseHelper');
const logger = require('../utils/logger');

/**
 * GET /api/v1/token
 * Triggers a headless Playwright session to scrape and return a PPATK token.
 */
const getToken = async (req, res) => {
  const requestedStrategy = req.query.strategy;
  const requestedHeadless = req.query.headless;
  logger.info(`[TokenController] getToken called | IP: ${req.ip} | Strategy: ${requestedStrategy || 'None'} | Headless: ${requestedHeadless !== undefined ? requestedHeadless : 'Default'}`);

  try {
    const result = await scrapeToken(requestedStrategy, requestedHeadless);
    logger.info('[TokenController] Token dan cookies retrieved successfully.');
    return sendSuccess(res, { 
      token: result.token,
      csrfToken: result.csrfToken,
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
