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

    const wrapper = document.createElement('div');
    const shadow = wrapper.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    const pageStyles = (data.styles || []).join('\n');
    style.textContent = `.button { margin:10px; display:inline-block; }\n${pageStyles}`;
    shadow.appendChild(style);

    (data.buttons || []).forEach(btn => {
      const div = document.createElement('div');
      div.className = 'button';
      div.innerHTML = btn.html;
      shadow.appendChild(div);
    });

    container.appendChild(wrapper);
  }

  chrome.storage.local.remove('buttonQaData');
});
