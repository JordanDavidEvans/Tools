// Popup script: sends crawl requests and displays results.

const output = document.getElementById('output');
const crawlBtn = document.getElementById('crawl');

// Display the JSON data in the popup
function display(data) {
  output.textContent = JSON.stringify(data, null, 2);
}

// Optionally send the data to a Cloudflare Worker endpoint
async function reportToWorker(data) {
  try {
    await fetch('https://your-worker.workers.dev/api/report', {
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
});

// Trigger crawling of the active tab
crawlBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'crawlPage' });
});
