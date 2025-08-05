// Background service worker for the extension.
// Handles communication between popup and content scripts
// and optionally forwards data to a Cloudflare Worker endpoint.

let crawlTabId = null;

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

  // Start an image QA crawl using the local browser
  if (msg && msg.type === 'startImageQa') {
    (async () => {
      const tab = await chrome.tabs.create({ url: msg.url });
      crawlTabId = tab.id;
      const listener = (tabId, info) => {
        if (tabId === tab.id && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          chrome.tabs.sendMessage(tab.id, { type: 'startImageQa', url: msg.url });
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
    })();
  }

  if (msg && msg.type === 'startHeaderQa') {
    (async () => {
      const tab = await chrome.tabs.create({ url: msg.url });
      crawlTabId = tab.id;
      const listener = (tabId, info) => {
        if (tabId === tab.id && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          chrome.tabs.sendMessage(tab.id, { type: 'startHeaderQa', url: msg.url });
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
    })();
  }

  // Content script has finished crawling and sent back results
  if (msg && msg.type === 'imageQaResult') {
    chrome.storage.local.set({ imageQaData: msg.pages }, () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('image_results.html') });
    });
    if (crawlTabId) {
      chrome.tabs.remove(crawlTabId);
      crawlTabId = null;
    }
  }

  if (msg && msg.type === 'headerQaResult') {
    chrome.storage.local.set({ headerQaData: msg.pages }, () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('header_results.html') });
    });
    if (crawlTabId) {
      chrome.tabs.remove(crawlTabId);
      crawlTabId = null;
    }
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
  if (msg && msg.type === 'crawlProgress') {
    chrome.runtime.sendMessage(msg);
  }
});
