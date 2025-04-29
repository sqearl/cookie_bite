# Cookie-Bite: Bypassing Azure MFA via Chrome Extension & Session Replay

This project is inspired by Varonis' original Cookie-Bite article, expanding on the concept by automating session replay and attempting to bypass geolocation detections. It demonstrates how browser extensions can be weaponized to steal Microsoft Azure authentication cookies, exfiltrate them silently via a Google Form, and replay the session using Puppeteer and TokenSmith — effectively bypassing MFA and many behavioral security controls.

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
After receiving the stolen session data:

Save the payload to a file called session_dump.json.

Run:
```bash
node replay_to_browser_session.js
```
This script gives you control over how closely you match the original intercepted session.

Before replaying, you will be prompted to choose:
- Replay the session exactly as captured (original User-Agent, Language, Geolocation).
- Modify the User-Agent manually to impersonate a different browser/device.
- Modify the Geolocation manually (latitude and longitude) to simulate logging in from another physical location.
- Modify the Accept-Language header to appear as if coming from a different locale.
- Modify combinations of these attributes to trigger specific Azure security alerts based on anomaly detection.

The script first displays:
The original captured session info (IP, city, country, User-Agent, Language)
Your current machine’s public IP and location (using ipinfo.io)
It then asks what modifications you'd like to make before proceeding to session replay.

By spoofing attributes like language, geolocation, and user-agent, you can test how Azure Conditional Access Policies and security monitoring tools respond to various anomaly conditions.

```bash
--- Original Captured Session ---
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36
IP Address: 73.14.194.136
City: Denver
Region/State: Colorado
Country: United States
Latitude: 39.7394
Longitude: -104.9836
Language: en-US

--- Your Current Info ---
IP Address: 73.14.194.10
City: Thornton
Region/State: Colorado
Country: US
Location (lat,long): 39.8680,-104.9719

Options:
1. Replay session exactly (original User-Agent, Language, Geo)
2. Modify User-Agent manually
3. Modify Geolocation manually
4. Modify Language manually
5. Modify User-Agent and Geolocation
6. Modify User-Agent and Language
7. Modify Geolocation and Language
8. Modify all three (User-Agent, Language, Geolocation)
9. Proceed without modifying anything
Select an option (1-9):
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
