// Background service worker for the extension.
// Handles communication between popup and content scripts
// and optionally forwards data to a Cloudflare Worker endpoint.

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((msg, sender) => {
  // Popup requests a crawl of the current active tab
  if (msg && msg.type === 'crawlPage') {
    (async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) return;

      try {
        // Ask existing content script to crawl
        await chrome.tabs.sendMessage(tab.id, { type: 'crawl' });
      } catch (e) {
        // If the content script isn't injected yet, inject it and try again
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
        await chrome.tabs.sendMessage(tab.id, { type: 'crawl' });
      }
    })();
  }

  // Content script has sent back the page data
  if (msg && msg.type === 'pageData') {
    // Forward to popup
    chrome.runtime.sendMessage(msg);

    // Optionally report to a Cloudflare Worker endpoint
    fetch('https://qa-tools-worker.jordan-evans.workers.dev/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg.data),
    }).catch((err) => console.error('Reporting failed', err));
  }
});
