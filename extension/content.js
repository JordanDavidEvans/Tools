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

// Crawl an entire site by fetching each internal page and gathering image data.
async function crawlSite(startUrl) {
  const origin = new URL(startUrl).origin;
  const queue = [startUrl];
  const visited = new Set();
  const pages = {};

  while (queue.length) {
    const current = queue.shift();
    const normalized = new URL(current, origin).href;
    if (visited.has(normalized)) continue;
    visited.add(normalized);

    let html = '';
    try {
      const res = await fetch(normalized, { credentials: 'include' });
      html = await res.text();
    } catch (err) {
      continue;
    }

    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    const title = titleMatch ? stripTags(titleMatch[1]) : normalized;

    const images = [];
    const imgRegex = /<img[^>]*src=["']([^"']+)["'][^>]*>/gi;
    let imgMatch;
    while ((imgMatch = imgRegex.exec(html)) !== null) {
      const tag = imgMatch[0];
      const src = imgMatch[1];
      const imgUrl = new URL(src, normalized).href;
      const altMatch = tag.match(/alt=["']([^"']*)["']/i);
      const alt = altMatch ? altMatch[1] : '';
      // Only record the image URL and alt text; do not fetch the image.
      images.push({ url: imgUrl, alt });
    }
    pages[normalized] = { title, images };

    const linkRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>/gi;
    let linkMatch;
    while ((linkMatch = linkRegex.exec(html)) !== null) {
      const href = linkMatch[1];
      if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('javascript:')) continue;
      try {
        const link = new URL(href, normalized).href;
        if (link.startsWith(origin) && !visited.has(link)) {
          queue.push(link);
        }
      } catch (e) {}
    }
    chrome.runtime.sendMessage({
      type: 'crawlProgress',
      crawled: visited.size,
      discovered: visited.size + queue.length,
    });
  }
  return pages;
}

function stripTags(str) {
  return str.replace(/<[^>]*>/g, '').trim();
}

// Also respond to explicit crawl requests from the background/popup
chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === 'crawl') {
    sendData();
  }
  if (msg && msg.type === 'startImageQa') {
    crawlSite(msg.url).then((pages) => {
      chrome.runtime.sendMessage({ type: 'imageQaResult', pages });
    });
  }
});
