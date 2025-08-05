// Content script injected into every page.
// Waits for the page to load, collects metadata, and sends it back
// to the extension's background service worker.

// Helper function to gather all required data from the DOM.
function collectPageData() {
  // Page title
  const title = document.title;

  // All <meta> tags with name, property, and content attributes
  const metas = Array.from(document.querySelectorAll('meta')).map((m) => ({
    name: m.getAttribute('name') || '',
    property: m.getAttribute('property') || '',
    content: m.getAttribute('content') || '',
  }));

  // Text content of headings
  const headings = {
    h1: Array.from(document.querySelectorAll('h1')).map((e) => e.textContent.trim()),
    h2: Array.from(document.querySelectorAll('h2')).map((e) => e.textContent.trim()),
    h3: Array.from(document.querySelectorAll('h3')).map((e) => e.textContent.trim()),
  };

  // Visible body text word count
  const bodyText = document.body.innerText || '';
  const wordCount = bodyText.trim().split(/\s+/).filter(Boolean).length;

  // Full HTML and its length
  const html = document.documentElement.innerHTML;
  const htmlLength = html.length;

  return { title, metas, headings, wordCount, htmlLength, html };
}

// Sends the collected data to the background script
function sendData() {
  const data = collectPageData();
  chrome.runtime.sendMessage({ type: 'pageData', data });
}

// Automatically crawl once the page has fully loaded
window.addEventListener('load', sendData);

// Also respond to explicit crawl requests from the background/popup
chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === 'crawl') {
    sendData();
  }
});
