# PPATK Token Scraper API

REST API for scraping PPATK session tokens using **Playwright (headless)** with automated **reCAPTCHA bypass**.

## Tech Stack
- **Node.js** (v18+)
- **Express.js** - REST API framework
- **playwright-extra** - Headless browser automation
- **puppeteer-extra-plugin-recaptcha** - reCAPTCHA solver (2Captcha / Anti-Captcha)
- **winston** - Structured logging

## Project Structure
```
├── src/
│   ├── config/config.js          # Centralized config from .env
│   ├── utils/logger.js           # Winston logger
│   ├── utils/responseHelper.js   # Standard API response helpers
│   ├── services/browser.js       # Playwright browser launcher
│   ├── services/scraper.js       # Core scraping logic + retry
│   ├── controllers/tokenController.js
│   ├── routes/tokenRoutes.js
│   ├── middlewares/requestLogger.js
│   ├── middlewares/errorHandler.js
│   └── app.js                    # Express app setup
├── server.js                     # Server entry point
├── logs/                         # Auto-generated log files
├── .env.example
└── package.json
```

## Setup

### 1. Install dependencies
```bash
npm install
npx playwright install chromium
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env and fill in your CAPTCHA_API_KEY and TARGET_URL
```

### 3. Run the server
```bash
npm start
# or for development with auto-reload:
npm run dev
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/v1/token` | Scrape and return PPATK token |

### Example Response (Success)
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Example Response (Error)
```json
{
  "success": false,
  "error": "All 3 scrape attempts failed. Last error: Token not found..."
}
```

## Logs
- `logs/combined.log` - All log entries (info, warn, error)
- `logs/error.log` - Error entries only

## ⚠️ Important Notes
- You need a valid **2Captcha or Anti-Captcha API key** in `.env` for reCAPTCHA bypass to work.
- Update the **SELECTORS** object in `src/services/scraper.js` to match the actual PPATK page elements.
- Playwright is resource-intensive; each API call spawns a headless browser — ensure your server has adequate memory.
