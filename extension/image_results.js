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

chrome.storage.local.get('imageQaData').then(({ imageQaData }) => {
  if (!imageQaData) {
    container.textContent = 'No data.';
    return;
  }

  for (const [pageUrl, data] of Object.entries(imageQaData)) {
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
