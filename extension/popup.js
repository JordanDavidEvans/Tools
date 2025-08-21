// Popup script: sends crawl requests and displays results.

const BUILD_DATE = '__BUILD_DATE__';
const output = document.getElementById('output');
const crawlBtn = document.getElementById('crawl');
const runImageQaBtn = document.getElementById('runImageQa');
const runHeaderQaBtn = document.getElementById('runHeaderQa');
const runButtonQaBtn = document.getElementById('runButtonQa');
const runLinkQaBtn = document.getElementById('runLinkQa');
const progress = document.getElementById('progress');

const buildDate = new Date(BUILD_DATE);
document.getElementById('buildDate').textContent = isNaN(buildDate) ? 'unknown' : buildDate.toLocaleDateString();

// Display the JSON data in the popup
function display(data) {
  output.textContent = JSON.stringify(data, null, 2);
}

// Optionally send the data to a Cloudflare Worker endpoint
async function reportToWorker(data) {
  try {
    await fetch('https://qa-tools-worker.jordan-evans.workers.dev/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch (err) {
    console.error('Reporting failed', err);
  }
}

// Listen for messages from the background script containing page data
chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === 'pageData') {
    display(msg.data);
    reportToWorker(msg.data); // Optional reporting
  }
  if (msg && msg.type === 'crawlProgress') {
    progress.textContent = `Crawled ${msg.crawled} / Discovered ${msg.discovered}`;
  }
});

// Trigger crawling of the active tab
crawlBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'crawlPage' });
});

runImageQaBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'startImageQa' });
});

runHeaderQaBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'startHeaderQa' });
});

runButtonQaBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'startButtonQa' });
});

runLinkQaBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'startLinkQa' });
});
