const container = document.getElementById('results');

chrome.storage.local.get('headerQaData').then(({ headerQaData }) => {
  if (!headerQaData) {
    container.textContent = 'No data.';
    return;
  }

  for (const [url, data] of Object.entries(headerQaData)) {
    const section = document.createElement('section');
    section.className = 'page';
    section.dataset.size = data.size;

    const h2 = document.createElement('h2');
    const link = document.createElement('a');
    link.href = url;
    link.textContent = data.title;
    h2.appendChild(link);
    section.appendChild(h2);

    ['h1','h2','h3'].forEach(level => {
      data.headings[level].forEach(text => {
        const div = document.createElement('div');
        div.className = level;
        div.textContent = text;
        section.appendChild(div);
      });
    });

    container.appendChild(section);
  }

  const applyFilter = () => {
    const min = parseInt(document.getElementById('sizeFilter').value, 10) || 0;
    document.querySelectorAll('.page').forEach(sec => {
      const size = parseInt(sec.dataset.size, 10) || 0;
      sec.style.display = size >= min ? '' : 'none';
    });
  };

  document.getElementById('applyFilter').addEventListener('click', applyFilter);
  chrome.storage.local.remove('headerQaData');
});
