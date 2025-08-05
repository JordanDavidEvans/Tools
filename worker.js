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
      const target = url.searchParams.get('url');
      if (!target) {
        return new Response(imageQaForm(), {
          headers: {
            'content-type': 'text/html;charset=UTF-8',
            'access-control-allow-origin': '*'
          }
        });
      }
      try {
        const pages = await crawlSite(target);
        return new Response(renderImages(pages), {
          headers: {
            'content-type': 'text/html;charset=UTF-8',
            'access-control-allow-origin': '*'
          }
        });
      } catch (e) {
        return new Response(`<p>Error: ${escapeHtml(e.message)}</p>`, {
          status: 500,
          headers: {
            'content-type': 'text/html;charset=UTF-8',
            'access-control-allow-origin': '*'
          }
        });
      }
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
</style>
</head>
<body>
<h1>Image Compression Tool</h1>
<p>Select an image and choose a quality level to convert it to JPEG.</p>
<input type="file" id="fileInput" accept="image/*">
<label>Quality: <input type="range" id="quality" min="1" max="100" value="80"></label>
<button id="compressBtn">Compress</button>
<br>
<img id="preview">
<a id="download" download="compressed.jpg">Download</a>
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
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        preview.src = url;
        download.href = url;
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

function qaCrawlerPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Client-side QA crawler</title>
<style>
 body {font-family:sans-serif;margin:1rem;}
 iframe.hidden {display:none;}
 table {border-collapse:collapse;margin-top:1rem;width:100%;}
 th,td {border:1px solid #ccc;padding:.5rem;text-align:left;font-size:.9rem;}
</style>
</head>
<body>
<h1>QA crawler (browser only)</h1>
<p>
  Enter a base URL and click <em>Start</em>.  
  The script loads pages in hidden iframes so the browser handles cookies/session just like a user.
  <br><strong>Limit:</strong> DOM access is only possible for same-origin pages. If the target uses CORS or bot protection, results may be empty or 403.
  Opening the site in a normal tab first may set cookies that allow the iframe loads to succeed.
</p>

<input id="startUrl" size="50" placeholder="https://example.com">
<button id="startBtn">Start</button>
<input id="sizeFilter" type="number" placeholder="Min bytes">
<button id="filterBtn">Filter</button>

<table id="results">
  <thead>
    <tr>
      <th>URL</th>
      <th>Title</th>
      <th>H1</th>
      <th>H1–H3</th>
      <th>Word count</th>
      <th>HTML Size</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody></tbody>
</table>

<script>
const visited = new Set();
const queue = [];
const resultsBody = document.querySelector('#results tbody');

const normalize = (u, base) => {
  try {
    const url = new URL(u, base);
    url.hash = '';
    return url.href;
  } catch {
    return u;
  }
};

/* Utility helpers */
const sleep = ms => new Promise(res => setTimeout(res, ms));
const sameOrigin = (base, link) => {
  try {return new URL(link, base).origin === new URL(base).origin;}
  catch {return false;}
};
const wordCount = txt => txt.trim().split(/\\s+/).filter(Boolean).length;

/* Crawl workflow */
async function crawl(url) {
  url = normalize(url);
  visited.add(url);
  const frame = document.createElement('iframe');
  frame.className = 'hidden';
  frame.src = url;
  document.body.appendChild(frame);

  try {
    await new Promise((res, rej) => {
      frame.onload = res;
      frame.onerror = () => rej(new Error('load error'));
    });

    /* wait for potential client-side rendering */
    await sleep(1200);

    const doc = frame.contentDocument;
    if (!doc) throw new Error('No DOM access (probably cross-origin)');

    const title = doc.title || '';
    const h1 = doc.querySelector('h1')?.textContent.trim() || '';
    const headings = [...doc.querySelectorAll('h1,h2,h3')].map(h=>h.textContent.trim()).join(' | ');
    const wc = wordCount(doc.body.innerText || '');
    const size = doc.documentElement.outerHTML.length;

    /* enqueue internal links */
    [...doc.links].forEach(a=>{
      const href = a.getAttribute('href');
      if (href && sameOrigin(url, href)) {
        const abs = normalize(href, url);
        if (!visited.has(abs)) { queue.push(abs); }
      }
    });

    addRow({url, title, h1, headings, wc, size, status:'OK'});
  } catch(err) {
    addRow({url, status:err.message});
  } finally {
    frame.remove();
  }
}

function addRow({url,title='',h1='',headings='',wc='',size='',status=''}){
  const tr = document.createElement('tr');
  tr.dataset.size = size;
  tr.innerHTML = \`<td>\${url}</td>
                  <td>\${title}</td>
                  <td>\${h1}</td>
                  <td>\${headings}</td>
                  <td>\${wc}</td>
                  <td>\${size}</td>
                  <td>\${status}</td>\`;
  resultsBody.appendChild(tr);
}

async function start() {
  const base = document.getElementById('startUrl').value.trim();
  if (!base) return;
  queue.push(normalize(base));
  while (queue.length) {
    const next = queue.shift();
    if (!visited.has(next)) await crawl(next);
  }
  if (!resultsBody.children.length) {
    addRow({url:base,status:'No data – possibly blocked by CORS/403'});
  }
}

document.getElementById('startBtn').onclick = start;
document.getElementById('filterBtn').onclick = () => {
  const min = parseInt(document.getElementById('sizeFilter').value, 10) || 0;
  [...resultsBody.children].forEach(row => {
    const s = parseInt(row.dataset.size, 10) || 0;
    row.style.display = s >= min ? '' : 'none';
  });
};
</script>

<!--
CORS / cross-tab notes:
* Access to iframe DOM is allowed only when the iframe’s origin matches this page.
* If the target site requires authentication or session cookies, opening it in a regular tab first can establish the session so iframe requests succeed.
* To analyze pages on a different origin, a cooperating script/extension would need to run in that tab and postMessage its DOM back.
-->
</body>
</html>`;
}

function imageQaForm() {
  return `<!DOCTYPE html>
<html>
<head><title>Image QA Tool</title></head>
<body>
<h1>Image QA Tool</h1>
<form action="https://qa-tools-worker.jordan-evans.workers.dev/image-qa">
  <input type="url" name="url" placeholder="https://example.com" required>
  <button type="submit">Crawl</button>
</form>
</body>
</html>`;
}

async function crawlSite(startUrl) {
  const origin = new URL(startUrl).origin;
  const queue = [stripHash(startUrl)];
  const visited = new Set();
  const pages = {};

  while (queue.length) {
    const current = queue.shift();
    const normalized = stripHash(new URL(current).href);
    if (visited.has(normalized)) continue;
    visited.add(normalized);

    const res = await fetch(normalized);
    const html = await res.text();

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

    images.sort((a, b) => b.size - a.size);
    pages[normalized] = { title, images };

    const linkRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>/gi;
    let linkMatch;
    while ((linkMatch = linkRegex.exec(html)) !== null) {
      const href = linkMatch[1];
      if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('javascript:')) continue;
      const link = stripHash(new URL(href, normalized).href);
      if (link.startsWith(origin) && !visited.has(link)) {
        queue.push(link);
      }
    }
  }
  return pages;
}

function renderImages(pages) {
  let html = `<!DOCTYPE html>
<html>
<head>
<title>Image QA Result</title>
<style>
.image { margin:10px; display:inline-block; }
.image.oversize { outline:3px solid red; }
</style>
</head>
<body>
  <h1>Image QA Result</h1>
  <label>Highlight images above (KB): <input type="number" id="sizeInput" min="1" max="102400" value="1"></label>
`;

  for (const [pageUrl, data] of Object.entries(pages)) {
    html += `<h2><a href="${pageUrl}">${escapeHtml(data.title)}</a></h2>`;
    for (const img of data.images) {
      html += `<div class="image" data-size="${img.size}">
<img src="${img.url}" alt="${escapeHtml(img.alt)}" loading="lazy"><br>
<span>${formatSize(img.size)}</span><br>
<em>Alt: ${escapeHtml(img.alt)}</em>
</div>`;
    }
  }

  html += `<script>
  const input = document.getElementById('sizeInput');
  function update(){
    const threshold = Number(input.value) * 1024;
    document.querySelectorAll('.image').forEach(el=>{
      el.classList.toggle('oversize', Number(el.dataset.size) > threshold);
    });
  }
  input.addEventListener('input', update);
  update();
</script>
</body>
</html>`;
  return html;
}

function stripTags(str) {
  return str.replace(/<[^>]*>/g, '').trim();
}

function stripHash(url) {
  try {
    const u = new URL(url);
    u.hash = '';
    return u.href;
  } catch {
    return url;
  }
}

function formatSize(n) {
  if (n > 1024 * 1024) return (n/1024/1024).toFixed(2) + ' MB';
  if (n > 1024) return (n/1024).toFixed(2) + ' KB';
  return n + ' B';
}
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
}
