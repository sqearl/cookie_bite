# Cookie-Bite: Bypassing Azure MFA via Chrome Extension & Session Replay

This project is inspired by Varonis' original Cookie-Bite article, but takes a different direction: it focuses on using stolen session metadata to test how Microsoft Defender for Cloud Apps (formerly MCAS) logs and alerts on suspicious sign-ins.

It demonstrates how browser extensions can be weaponized to steal Microsoft Azure authentication cookies, exfiltrate them silently via a Google Form, and then replay those sessions with modified environment metadata (e.g., IP, User-Agent, Accept-Language, proxy routing) — allowing defenders to observe how session anomalies are detected by Azure.

---

## ⚙️ Dependencies

Make sure you have the following installed on your MacBook:

- [Google Chrome](https://www.google.com/chrome/)
- [Node.js](https://nodejs.org/) (v18.x or newer recommended)
- [npm](https://www.npmjs.com/) (comes with Node)
- [Puppeteer](https://pptr.dev/) (`npm install puppeteer`)
- [TokenSmith](https://github.com/gladstomychaos/tokensmith) (must be in your system PATH)
- [Python 3](https://www.python.org/) and [ROADtools](https://github.com/dirkjanm/ROADtools) (`pip install roadtools`)

Optional helper:
- [jq](https://stedolan.github.io/jq/) for easy JSON parsing (`brew install jq`)

---

## Setup & Usage

### 1. Setup the Exfiltration Endpoint

- Create a **Google Form** with a short answer field (label it "Log Info").
- Capture the **form POST URL** and **entry ID** using Chrome DevTools.

### 2. Configure the Chrome Extension

- Edit `background.js` to replace:
  - `<FORM-ID>` in the `fetch` URL
  - `<entry.XXXXXXXXXX>` with your Google Form's entry field ID.
- Load the `mslogin_cookie_extension/` as an unpacked extension in Chrome (Developer Mode).
- Visit [portal.azure.com](https://portal.azure.com) — the extension will intercept session cookies silently.

On a mac, launch the extension automatically with:

```bash
./install.sh
```

### 3. Replay Stolen Session to Browser
Once you’ve captured the session data and saved it as session_dump.json, run:

```bash
node replay_to_browser_session.js
```

The script will:

Display both the captured session metadata and your current machine’s metadata, including:

IP address

City, Region, Country

User-Agent and Language

Prompt you to:

Replay with the original User-Agent, or override it manually

Optionally route browser traffic through a proxy (e.g., http://127.0.0.1:8080 or socks5://...)

If a proxy is selected:

The script will re-display both the modified and current session metadata

Ask for confirmation before launching the replay

Once launched, a Chrome window opens in incognito mode, with the cookies, headers, and environment spoofed to match (or deviate from) the original session.

Use this replay to test how Azure logs and flags the authentication, such as:
- Impossible travel detection
- Unfamiliar sign-in properties
- Risky sign-ins and location anomalies
- Proxy detection or legacy browser logging

```bash
% node replay_to_browser_session.js

--- Original Captured Session ---
IP Address: 24.8.124.19
City: Colorado Springs
Region/State: Colorado
Country: United States
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36
Language: en-US

--- Your Current Machine Info ---
IP Address: 82.221.107.187
City: Grindavík
Region/State: Southern Peninsula
Country: IS

Options:
1. Replay with original User-Agent
2. Modify User-Agent manually
Select an option (1-2): 2
Enter the User-Agent string you want to use: Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:138.0) Gecko/20100101 Firefox/138.0
Do you want to use a proxy? (y/n): n
Replay session started in incognito window.
```

### 4. Replay Session to Extract Azure Tokens
Make sure tokensmith is executable and installed in your system PATH.

Run:
``` bash
node replay_to_token.js
```
This script uses TokenSmith and Puppeteer to request Azure OAuth tokens (Access Token + Refresh Token) using the victim session.

Tokens will be saved automatically in a tokens_output_<timestamp>.json file.

### 5. (Optional) Map the Azure Tenant with RoadRECON
If you extracted access tokens:
``` bash
roadrecon auth --access-token <your_access_token>
roadrecon gather
roadrecon gui
```
Browse to http://127.0.0.1:5000 to view users, groups, apps, and relationships in the Azure tenant.

--- 

### Summary
Key Concepts Demonstrated
- MFA bypass without needing user credentials.
- Session hijacking through browser extension abuse.
- Bypassing geolocation restrictions by spoofing user-agent and coordinates.
- OAuth token extraction using stolen cookies.
- Tenant mapping via API after stealing tokens.

Recommendations for Defense
- Enforce managed browser policies.
- Disable or restrict Chrome Developer Mode where possible.
- Monitor login anomalies (IP + location mismatch).
- Require device trust validation via Conditional Access Policies.
- Educate users about the risks of installing unknown or unpacked extensions.

⚠️ Legal Disclaimer
This project is intended for educational and authorized testing purposes only.
Unauthorized access to computer systems is illegal.

Use responsibly.
