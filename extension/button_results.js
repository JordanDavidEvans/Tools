const container = document.getElementById('results');

chrome.storage.local.get('buttonQaData').then(({ buttonQaData }) => {
  if (!buttonQaData) {
    container.textContent = 'No data.';
    return;
  }

  for (const [url, data] of Object.entries(buttonQaData)) {
    const h2 = document.createElement('h2');
    const link = document.createElement('a');
    link.href = url;
    link.textContent = data.title;
    h2.appendChild(link);
    container.appendChild(h2);

    data.buttons.forEach(btn => {
      const div = document.createElement('div');
      div.className = 'button';
      div.innerHTML = btn.html;
      container.appendChild(div);
    });
  }

  chrome.storage.local.remove('buttonQaData');
});
