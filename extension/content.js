// Content script injected into every page.
// Waits for the page to load, collects metadata, and sends it back
// to the extension's background service worker.

// Helper function to gather all required data from the DOM.
function collectPageData() {
  const title = document.title;
  const h1 = document.querySelector('h1')?.textContent.trim() || '';
  const headings = {
    h1: Array.from(document.querySelectorAll('h1')).map((e) => e.textContent.trim()),
    h2: Array.from(document.querySelectorAll('h2')).map((e) => e.textContent.trim()),
    h3: Array.from(document.querySelectorAll('h3')).map((e) => e.textContent.trim()),
  };
  const bodyText = document.body.innerText || '';
  const wordCount = bodyText.trim().split(/\s+/).filter(Boolean).length;
  const html = document.documentElement.innerHTML;
  const htmlLength = html.length;
  return { title, h1, headings, wordCount, htmlLength, html };
}

// Sends the collected data to the background script
function sendData() {
  const data = collectPageData();
  chrome.runtime.sendMessage({ type: 'pageData', data });
}

// Automatically crawl once the page has fully loaded
window.addEventListener('load', sendData);

// Crawl an entire site by fetching each internal page and gathering image data.
function stripHash(u) {
  try {
    const url = new URL(u);
    url.hash = '';
    return url.href;
  } catch {
    return u;
  }
}

async function crawlSite(startUrl) {
  const origin = new URL(startUrl).origin;
  const queue = [stripHash(startUrl)];
  const visited = new Set();
  const pages = {};

  while (queue.length) {
    const current = queue.shift();
    const normalized = stripHash(new URL(current, origin).href);
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
      const imgUrl = stripHash(new URL(src, normalized).href);
      const altMatch = tag.match(/alt=["']([^"']*)["']/i);
      const alt = altMatch ? altMatch[1] : '';
      let size = 0;
      try {
        const head = await fetch(imgUrl, { method: 'HEAD' });
        size = parseInt(head.headers.get('content-length')) || 0;
      } catch (err) {}
      images.push({ url: imgUrl, alt, size });
    }
    pages[normalized] = { title, images };

    const linkRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>/gi;
    let linkMatch;
    while ((linkMatch = linkRegex.exec(html)) !== null) {
      const href = linkMatch[1];
      if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('javascript:')) continue;
      try {
        const link = stripHash(new URL(href, normalized).href);
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

async function crawlSiteHeaders(startUrl) {
  const origin = new URL(startUrl).origin;
  const queue = [stripHash(startUrl)];
  const visited = new Set();
  const pages = {};

  while (queue.length) {
    const current = queue.shift();
    const normalized = stripHash(new URL(current, origin).href);
    if (visited.has(normalized)) continue;
    visited.add(normalized);

    let html = '';
    try {
      const res = await fetch(normalized, { credentials: 'include' });
      html = await res.text();
    } catch (err) {
      continue;
    }

    const doc = new DOMParser().parseFromString(html, 'text/html');
    const title = doc.querySelector('title')?.textContent.trim() || normalized;
    const headings = {
      h1: Array.from(doc.querySelectorAll('h1')).map(e => e.textContent.trim()),
      h2: Array.from(doc.querySelectorAll('h2')).map(e => e.textContent.trim()),
      h3: Array.from(doc.querySelectorAll('h3')).map(e => e.textContent.trim()),
    };
    const size = html.length;
    pages[normalized] = { title, headings, size };

    const linkRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>/gi;
    let linkMatch;
    while ((linkMatch = linkRegex.exec(html)) !== null) {
      const href = linkMatch[1];
      if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('javascript:')) continue;
      try {
        const link = stripHash(new URL(href, normalized).href);
        if (link.startsWith(origin) && !visited.has(link)) {
          queue.push(link);
        }
      } catch (e) {}
  }
  }
  return pages;
}

async function crawlSiteButtons(startUrl) {
  const origin = new URL(startUrl).origin;
  const queue = [stripHash(startUrl)];
  const visited = new Set();
  const pages = {};

  while (queue.length) {
    const current = queue.shift();
    const normalized = stripHash(new URL(current, origin).href);
    if (visited.has(normalized)) continue;
    visited.add(normalized);

    let html = '';
    try {
      const res = await fetch(normalized, { credentials: 'include' });
      html = await res.text();
    } catch (err) {
      continue;
    }

    const doc = new DOMParser().parseFromString(html, 'text/html');
    const title = doc.querySelector('title')?.textContent.trim() || normalized;
    const buttons = [];
    doc.querySelectorAll('a, button, [role="button"]').forEach(el => {
      buttons.push({ html: el.outerHTML, href: el.getAttribute('href') || '' });
    });

    const styles = [];
    doc.querySelectorAll('style').forEach(styleEl => {
      styles.push(styleEl.textContent);
    });
    for (const linkEl of doc.querySelectorAll('link[rel="stylesheet"]')) {
      const href = linkEl.getAttribute('href');
      if (!href) continue;
      try {
        const cssUrl = new URL(href, normalized).href;
        const res = await fetch(cssUrl, { credentials: 'include' });
        styles.push(await res.text());
      } catch (e) {}
    }

    pages[normalized] = { title, buttons, styles };

    const linkRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>/gi;
    let linkMatch;
    while ((linkMatch = linkRegex.exec(html)) !== null) {
      const href = linkMatch[1];
      if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('javascript:')) continue;
      try {
        const link = stripHash(new URL(href, normalized).href);
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
  if (msg && msg.type === 'startHeaderQa') {
    crawlSiteHeaders(msg.url).then((pages) => {
      chrome.runtime.sendMessage({ type: 'headerQaResult', pages });
    });
  }
  if (msg && msg.type === 'startButtonQa') {
    crawlSiteButtons(msg.url).then((pages) => {
      chrome.runtime.sendMessage({ type: 'buttonQaResult', pages });
    });
  }
});
