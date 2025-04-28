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

  // Grant geolocation permission for Microsoft login site
  await browser.defaultBrowserContext().overridePermissions(
    "https://login.microsoftonline.com",
    ["geolocation"]
  );

  // Set geolocation if coordinates are present
  if (sessionData.coordinates && sessionData.coordinates.latitude && sessionData.coordinates.longitude) {
    await page.setGeolocation({
      latitude: sessionData.coordinates.latitude,
      longitude: sessionData.coordinates.longitude
    });
    console.log(`Geolocation set to lat: ${sessionData.coordinates.latitude}, lon: ${sessionData.coordinates.longitude}`);
  } else {
    console.log('No geolocation coordinates provided in session_dump.json.');
  }

  // Set cookies
  await page.setCookie(...sessionData.cookies);

  // Navigate to the login page
  await page.goto('https://login.microsoftonline.com');

  console.log("Replay session started in incognito window.");
})();
