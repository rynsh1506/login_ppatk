# Task: Implement IP Rotation and Proxy Support for PPATK Scraper

## 🎯 Objective
Add robust **proxy support** and **IP rotation configuration** to the PPATK scraper codebase. This will allow the Playwright browser to route its traffic through external proxies, reducing the chance of being blocked by Google reCAPTCHA or target server rate-limiting.

This issue specification is designed to be easily read and executed by a junior developer or a budget AI assistant.

---

## 📂 Files to Create/Modify
- **`[MODIFY]`** [.env](file:///d:/login_ppatk/.env) & [.env.example](file:///d:/login_ppatk/.env.example) — Add proxy configuration variables.
- **`[MODIFY]`** [src/config/config.js](file:///d:/login_ppatk/src/config/config.js) — Map proxy env variables to the global config object.
- **`[MODIFY]`** [src/services/browser.js](file:///d:/login_ppatk/src/services/browser.js) — Update browser launching options to apply the proxy config.

---

## 🛠️ Step-by-Step Implementation Guide

### Step 1: Update Environment Configurations
Add variables to configure the proxy in both `.env` and `.env.example`.

**What to add to the files:**
```env
# ─── Proxy Configuration ──────────────────────────────────────────────────────
# Set to true to route browser traffic through a proxy
USE_PROXY=false

# Proxy server URI (e.g. http://123.456.78.90:8000 or http://my-rotating-proxy.com:3128)
PROXY_SERVER=

# Authentication credentials (leave blank if your proxy uses IP-whitelist instead of password)
PROXY_USERNAME=
PROXY_PASSWORD=
```

---

### Step 2: Update Config Object Mapping
Open [src/config/config.js](file:///d:/login_ppatk/src/config/config.js) and map the new environment variables so other services can access them cleanly.

**Add under the scraper/captcha config section:**
```javascript
proxy: {
  useProxy: process.env.USE_PROXY === 'true',
  server: process.env.PROXY_SERVER || '',
  username: process.env.PROXY_USERNAME || '',
  password: process.env.PROXY_PASSWORD || '',
}
```

---

### Step 3: Inject Proxy Options into Playwright Browser Launch
Open [src/services/browser.js](file:///d:/login_ppatk/src/services/browser.js) and update the `launchBrowser` function. 

Playwright's `chromium.launch()` accepts a `proxy` option object containing `server`, `username`, and `password`.

**Example Code Implementation:**
1. Import `config` (it should already be imported at the top of `src/services/browser.js`).
2. Inside `launchBrowser()`, before running `chromium.launch()`, build the configuration object dynamically:
```javascript
  const launchOptions = {
    headless: isHeadless,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
  };

  // Check if proxy is enabled in configuration
  if (config.proxy && config.proxy.useProxy) {
    if (!config.proxy.server) {
      logger.warn('[Browser] Proxy is enabled (USE_PROXY=true) but PROXY_SERVER is empty!');
    } else {
      logger.info(`[Browser] Launching with proxy server: ${config.proxy.server}`);
      
      const proxyConfig = {
        server: config.proxy.server
      };

      // Add credentials if username is provided
      if (config.proxy.username) {
        proxyConfig.username = config.proxy.username;
        proxyConfig.password = config.proxy.password;
      }

      launchOptions.proxy = proxyConfig;
    }
  }
```
3. Pass `launchOptions` to the launch command:
```javascript
  const browser = await chromium.launch(launchOptions);
```

---

## 🧪 Verification & Testing Plan

### Test 1: Verify Proxy Injection Logs
1. In `.env`, set `USE_PROXY=true` and `PROXY_SERVER=http://127.0.0.1:8080`.
2. Start the server: `node server.js`.
3. Call the API: `curl http://localhost:3000/api/v1/token` or trigger a scrape.
4. Check the console/log files. You should see a log entry:
   `[Browser] Launching with proxy server: http://127.0.0.1:8080`.

### Test 2: Verify IP Rotation (Actual IP Check)
To prove the proxy actually masks your real IP:
1. Temporary change the target login URL in `.env` to:
   `TARGET_URL=https://api.ipify.org?format=json` (an endpoint that returns the visiting client's IP address).
2. Add a `console.log(await page.textContent('body'))` inside `attemptAutoScrape` in `src/services/scraper.js` after visiting the URL, to see what IP is being reported.
3. Test 1 (Proxy OFF): Ensure the logged IP matches your computer's public IP.
4. Test 2 (Proxy ON): Set up a working proxy. Ensure the logged IP matches the proxy's IP.

---

## ✅ Definition of Done (DoD)
- [ ] Environment variables for proxies are documented in `.env.example`.
- [ ] Config loader in `src/config/config.js` validates or parses proxy settings safely.
- [ ] `browser.js` successfully receives and configures proxy options dynamically when `USE_PROXY=true`.
- [ ] Scraper gracefully skips proxy insertion if `USE_PROXY=false` or not defined.
- [ ] No hardcoded proxy credentials exist in the source code files.
