const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const sessionData = JSON.parse(fs.readFileSync('./session_dump.json', 'utf8'));

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--incognito']
  });

  // Use default context (first incognito window that opens)
  const pages = await browser.pages();
  const page = pages[0];

  // Set User-Agent and Language
  await page.setUserAgent(sessionData.userAgent || '');
  await page.setExtraHTTPHeaders({
    'Accept-Language': sessionData.language || 'en-US,en;q=0.9'
  });

  // Set cookies
  await page.setCookie(...sessionData.cookies);

  // Navigate to the login page
  await page.goto('https://login.microsoftonline.com');

  console.log("Replay session started in incognito window.");
})();

