const container = document.getElementById('results');

chrome.storage.local.get('linkQaData').then(({ linkQaData }) => {
  if (!linkQaData) {
    container.textContent = 'No data.';
    return;
  }
  const { origin, links } = linkQaData;
  links.forEach(({ url, texts }) => {
    const urlObj = new URL(url);
    const display = urlObj.origin === origin ? urlObj.pathname + urlObj.search + urlObj.hash : url;

    const section = document.createElement('section');
    const h2 = document.createElement('h2');
    const a = document.createElement('a');
    a.href = url;
    a.textContent = display;
    h2.appendChild(a);
    section.appendChild(h2);

    const ul = document.createElement('ul');
    texts.forEach(text => {
      const li = document.createElement('li');
      li.textContent = text;
      ul.appendChild(li);
    });
    section.appendChild(ul);
    container.appendChild(section);
  });
  chrome.storage.local.remove('linkQaData');
});
