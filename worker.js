addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  if (url.pathname === '/') {
    return new Response(homePage(), {
      headers: { 'content-type': 'text/html;charset=UTF-8' }
    });
  }

  if (url.pathname === '/qa-crawler') {
    return new Response(qaCrawlerPage(), {
      headers: { 'content-type': 'text/html;charset=UTF-8' }
    });
  }

  if (url.pathname === '/image-compressor') {
    return new Response(imageCompressorPage(), {
      headers: { 'content-type': 'text/html;charset=UTF-8' }
    });
  }

  if (url.pathname === '/image-qa') {
    const target = url.searchParams.get('url') || '';
    return new Response(imageQaPage(target), {
      headers: { 'content-type': 'text/html;charset=UTF-8' }
    });
  }

  if (url.pathname === '/keyword-crawler') {
    const target = url.searchParams.get('url');
    const keywordsParam = url.searchParams.get('keywords');
    if (target && keywordsParam) {
      const keywords = keywordsParam.split(',').map(k => k.trim()).filter(Boolean);
      const origin = url.searchParams.get('origin') || new URL(target).origin;
      const seenParam = url.searchParams.get('seen');
      const seen = seenParam ? JSON.parse(atob(seenParam)) : [];
      const workerBase = new URL(request.url).origin;
      const result = await crawlForKeywords(target, keywords, origin, seen, workerBase);
      return new Response(JSON.stringify(result), {
        headers: { 'content-type': 'application/json' }
      });
    }
    return new Response(keywordCrawlerPage(), {
      headers: { 'content-type': 'text/html;charset=UTF-8' }
    });
  }

  if (url.pathname === '/bookmarks') {
    return new Response(bookmarksPage(), {
      headers: { 'content-type': 'text/html;charset=UTF-8' }
    });
  }

  return new Response('Not found', { status: 404 });
}

function homePage() {
  return `<!DOCTYPE html>
<html>
<head><title>QA Tools Hub</title></head>
<body>
<h1>QA Tools Hub</h1>
<ul>
  <li><a href="https://qa-tools-worker.jordan-evans.workers.dev/image-qa">Image QA Tool</a></li>
  <li><a href="https://qa-tools-worker.jordan-evans.workers.dev/qa-crawler">Client-side QA Crawler</a></li>
  <li><a href="https://qa-tools-worker.jordan-evans.workers.dev/image-compressor">Image Compression Tool</a></li>
  <li><a href="https://qa-tools-worker.jordan-evans.workers.dev/keyword-crawler">Keyword Search Crawler</a></li>
  <li><a href="https://qa-tools-worker.jordan-evans.workers.dev/bookmarks">Bookmarklets</a></li>
</ul>
</body>
</html>`;
}

function imageCompressorPage() {
  return `<!DOCTYPE html>
<html>
<head>
<title>Image Compression Tool</title>
<style>
 body {font-family:sans-serif;margin:1rem;}
 #preview {max-width:100%;margin-top:1rem;}
 #download {display:none;}
</style>
</head>
<body>
<h1>Image Compression Tool</h1>
<p>Select an image and choose a quality level to convert it to JPEG. Images will be resized to a maximum of 1920x1080 while maintaining a 16:9 aspect ratio and will download automatically.</p>
<input type="file" id="fileInput" accept="image/*">
<label>Quality: <input type="range" id="quality" min="1" max="100" value="80"></label>
<button id="compressBtn">Compress</button>
<br>
<img id="preview">
<a id="download" download="compressed.jpg"></a>
<script>
const fileInput = document.getElementById('fileInput');
const qualityInput = document.getElementById('quality');
const preview = document.getElementById('preview');
const download = document.getElementById('download');
document.getElementById('compressBtn').addEventListener('click', () => {
  const file = fileInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const targetRatio = 16 / 9;
      let sx = 0, sy = 0, sWidth = img.width, sHeight = img.height;
      if (img.width / img.height > targetRatio) {
        sHeight = img.height;
        sWidth = img.height * targetRatio;
        sx = (img.width - sWidth) / 2;
      } else {
        sWidth = img.width;
        sHeight = img.width / targetRatio;
        sy = (img.height - sHeight) / 2;
      }
      const scale = Math.min(1920 / sWidth, 1080 / sHeight, 1);
      canvas.width = Math.round(sWidth * scale);
      canvas.height = Math.round(sHeight * scale);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        preview.src = url;
        download.href = url;
        download.click();
      }, 'image/jpeg', Number(qualityInput.value)/100);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
});
</script>
</body>
</html>`;
}


function imageQaPage(target = '') {
  const escaped = escapeHtml(target);
  return `<!DOCTYPE html>
<html>
<head><title>Image QA Tool</title></head>
<body>
<h1>Image QA Tool</h1>
<form id="qaForm">
  <input type="url" id="urlInput" placeholder="https://example.com" value="${escaped}" required>
  <button type="submit">Crawl</button>
</form>
<p id="status"></p>
<script>
function start(url){
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
    chrome.runtime.sendMessage({type:'startImageQa', url});
    document.getElementById('status').textContent = 'Extension detected. Results will open in a new tab.';
  } else {
    document.getElementById('status').innerHTML = 'Chrome extension not detected. Download it from <a href="https://github.com/JordanDavidEvans/Tools/archive/refs/heads/main.zip">GitHub</a>, unzip it, then load the "extension" folder via chrome://extensions using "Load unpacked".';
  }
}
document.getElementById('qaForm').addEventListener('submit', e => {
  e.preventDefault();
  start(document.getElementById('urlInput').value);
});
${target ? `start('${escaped}');` : ''}
</script>
</body>
</html>`;
}

function qaCrawlerPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Header QA Crawler</title>
</head>
<body>
<h1>Header QA Crawler</h1>
<input id="startUrl" size="50" placeholder="https://example.com" type="url">
<button id="startBtn">Start</button>
<p id="status"></p>
<script>
document.getElementById('startBtn').addEventListener('click', () => {
  const url = document.getElementById('startUrl').value;
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
    chrome.runtime.sendMessage({type:'startHeaderQa', url});
    document.getElementById('status').textContent = 'Extension detected. Results will open in a new tab.';
  } else {
    document.getElementById('status').innerHTML = 'Chrome extension not detected. Download it from <a href="https://github.com/JordanDavidEvans/Tools/archive/refs/heads/main.zip">GitHub</a>, unzip it, then load the "extension" folder via chrome://extensions using "Load unpacked".';
  }
});
</script>
</body>
</html>`;
}

async function crawlForKeywords(targetUrl, keywords, origin, seen = [], workerBase) {
  seen.push(targetUrl);
  let html = '';
  try {
    const res = await fetch(targetUrl, {
      headers: {
        'Accept': 'text/html',
        'User-Agent': 'Mozilla/5.0 (compatible; KeywordCrawler/1.0; +https://example.com/bot)'
      }
    });
    if (!res.ok) {
      return { url: targetUrl, error: res.status };
    }
    html = await res.text();
  } catch (err) {
    return { url: targetUrl, error: err.message };
  }

  const matches = {};
  for (const kw of keywords) {
    const regex = new RegExp(escapeRegExp(kw), 'gi');
    let m;
    const occurrences = [];
    while ((m = regex.exec(html)) !== null) {
      const index = m.index;
      const line = html.slice(0, index).split(/\n/).length;
      const column = index - html.lastIndexOf('\n', index - 1);
      const start = Math.max(0, index - 20);
      const end = Math.min(html.length, index + m[0].length + 20);
      const context = html.slice(start, end);
      occurrences.push({ line, column, context });
    }
    matches[kw] = occurrences;
  }

  const linkRegex = /href=["']([^"'#]+)["']/g;
  const links = [];
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    try {
      const u = new URL(match[1], targetUrl);
      if (u.origin === origin) {
        const normalized = u.href.split('#')[0];
        if (!seen.includes(normalized)) {
          links.push(normalized);
        }
      }
    } catch {}
  }

  const newSeen = seen.concat(links);
  const encodedSeen = encodeURIComponent(btoa(JSON.stringify(newSeen)));
  const childPromises = links.map(link =>
    fetch(`${workerBase}/keyword-crawler?url=${encodeURIComponent(link)}&keywords=${encodeURIComponent(keywords.join(','))}&origin=${encodeURIComponent(origin)}&seen=${encodedSeen}`)
  );

  const children = [];
  for (const p of childPromises) {
    try {
      const r = await p;
      if (r.ok) {
        children.push(await r.json());
      }
    } catch {}
  }

  return { url: targetUrl, matches, children };
}

function keywordCrawlerPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Keyword Search Crawler</title>
</head>
<body>
<h1>Keyword Search Crawler</h1>
<input id="startUrl" size="50" placeholder="https://example.com" type="url">
<input id="keywords" size="30" placeholder="keyword1, keyword2">
<button id="startBtn">Start</button>
<div id="result"></div>
<script>
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
}
function render(node) {
  let html = '<div><strong>' + escapeHtml(node.url) + '</strong>';
  for (const kw in node.matches) {
    const occ = node.matches[kw];
    if (occ.length) {
      html += '<div>Keyword "' + escapeHtml(kw) + '":<ul>';
      for (const o of occ) {
        html += '<li>Line ' + o.line + ', column ' + o.column + ': ' + escapeHtml(o.context) + '</li>';
      }
      html += '</ul></div>';
    }
  }
  if (node.children) {
    for (const child of node.children) {
      html += render(child);
    }
  }
  html += '</div>';
  return html;
}
document.getElementById('startBtn').addEventListener('click', async () => {
  const url = document.getElementById('startUrl').value;
  const keywords = document.getElementById('keywords').value;
  const res = await fetch('/keyword-crawler?url=' + encodeURIComponent(url) + '&keywords=' + encodeURIComponent(keywords));
  const data = await res.json();
  document.getElementById('result').innerHTML = render(data);
});
</script>
</body>
  </html>`;
}
function bookmarksPage() {
  const scripts = [
    {
      name: 'Show Form Success',
      code: `(()=>{const successMessages=document.querySelectorAll('.dmform-success');successMessages.forEach(el=>{el.style.display='block';console.log('✅ Showing .dmform-success element:',el);});const form=document.querySelector('form.dmRespDesignRow');if(form){form.style.display='none';console.log('✅ Hiding form:',form);}else{console.warn('❌ Could not find form.dmRespDesignRow');}if(successMessages.length>0){successMessages[0].scrollIntoView({behavior:'smooth',block:'center'});}})();`
    },
    {
      name: 'Log Current URL',
      code: `(()=>{console.log('Current URL:',location.href);})();`
    },
    {
      name: 'Toggle Dark Mode',
      code: `(()=>{document.body.style.filter=document.body.style.filter?'':'invert(1) hue-rotate(180deg)';})();`
    }
  ];
  const links = scripts.map(s => `<li><a href="javascript:${encodeURIComponent(s.code)}">${s.name}</a></li>`).join('\n');
  return `<!DOCTYPE html>
<html>
<head><title>Bookmarklets</title></head>
<body>
<h1>Bookmarklets</h1>
<p>Drag the links below to your bookmarks bar and click them on any page.</p>
<ul>
${links}
</ul>
</body>
</html>`;
}
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
}

function escapeRegExp(str) {
  return str.replace(/[-\/\^$*+?.()|[\]{}]/g, '\\$&');
}
