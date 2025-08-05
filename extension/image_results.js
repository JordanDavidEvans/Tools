function formatSize(n) {
  if (n > 1024 * 1024) return (n / 1024 / 1024).toFixed(2) + ' MB';
  if (n > 1024) return (n / 1024).toFixed(2) + ' KB';
  return n + ' B';
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[c]);
}

const container = document.getElementById('results');
const indicator = document.createElement('div');
indicator.id = 'pageIndicator';
document.body.appendChild(indicator);

chrome.storage.local.get('imageQaData').then(({ imageQaData }) => {
  if (!imageQaData) {
    container.textContent = 'No data.';
    return;
  }

  const pages = Object.entries(imageQaData);
  for (const [pageUrl, data] of pages) {
    const h2 = document.createElement('h2');
    const link = document.createElement('a');
    link.href = pageUrl;
    link.textContent = data.title;
    h2.appendChild(link);
    container.appendChild(h2);

    for (const img of data.images) {
      const div = document.createElement('div');
      div.className = 'image';
      div.dataset.size = img.size;
      div.innerHTML = `<img src="${img.url}" alt="${escapeHtml(img.alt)}" loading="lazy"><br><span>${formatSize(img.size)}</span><br><em>Alt: ${escapeHtml(img.alt)}</em>`;
      container.appendChild(div);
    }
  }

  const headers = Array.from(container.querySelectorAll('h2'));
  function updateIndicator() {
    let current = 0;
    for (let i = 0; i < headers.length; i++) {
      if (headers[i].getBoundingClientRect().top - 60 <= 0) {
        current = i;
      } else {
        break;
      }
    }
    const prev = headers[current - 1] ? headers[current - 1].textContent : 'None';
    const next = headers[current + 1] ? headers[current + 1].textContent : 'None';
    indicator.innerHTML = `<strong>Page ${current + 1} / ${headers.length}</strong><br><em>Prev:</em> ${prev}<br><em>Next:</em> ${next}`;
  }
  window.addEventListener('scroll', updateIndicator);
  updateIndicator();

  const input = document.getElementById('sizeInput');
  function update() {
    const threshold = Number(input.value) * 1024;
    document.querySelectorAll('.image').forEach((el) => {
      el.classList.toggle('oversize', Number(el.dataset.size) > threshold);
    });
  }
  input.addEventListener('input', update);
  update();

  chrome.storage.local.remove('imageQaData');
});
