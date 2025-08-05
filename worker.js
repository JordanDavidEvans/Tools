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

  if (url.pathname === '/image-qa') {
    const target = url.searchParams.get('url');
    if (!target) {
      return new Response(imageQaForm(), {
        headers: { 'content-type': 'text/html;charset=UTF-8' }
      });
    }
    try {
      const pages = await crawlSite(target);
      return new Response(renderImages(pages), {
        headers: { 'content-type': 'text/html;charset=UTF-8' }
      });
    } catch (e) {
      return new Response(`<p>Error: ${escapeHtml(e.message)}</p>`, {
        status: 500,
        headers: { 'content-type': 'text/html;charset=UTF-8' }
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
  <li><a href="/image-qa">Image QA Tool</a></li>
</ul>
</body>
</html>`;
}

function imageQaForm() {
  return `<!DOCTYPE html>
<html>
<head><title>Image QA Tool</title></head>
<body>
<h1>Image QA Tool</h1>
<form>
  <input type="url" name="url" placeholder="https://example.com" required>
  <button type="submit">Crawl</button>
</form>
</body>
</html>`;
}

async function crawlSite(startUrl) {
  const origin = new URL(startUrl).origin;
  const queue = [startUrl];
  const visited = new Set();
  const pages = {};

  while (queue.length) {
    const current = queue.shift();
    const normalized = new URL(current).href;
    if (visited.has(normalized)) continue;
    visited.add(normalized);

    const res = await fetch(normalized);
    const html = await res.text();

    const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
    const title = h1Match ? stripTags(h1Match[1]) : normalized;

    const images = [];
    const imgRegex = /<img[^>]*src=["']([^"']+)["'][^>]*>/gi;
    let imgMatch;
    while ((imgMatch = imgRegex.exec(html)) !== null) {
      const tag = imgMatch[0];
      const src = imgMatch[1];
      const imgUrl = new URL(src, normalized).href;
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
      const link = new URL(href, normalized).href;
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
<label>Highlight images above: <span id="sizeLabel">1 KB</span></label>
<input type="range" id="sizeSlider" min="1024" max="104857600" value="1024" step="1024">
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
const slider = document.getElementById('sizeSlider');
const label = document.getElementById('sizeLabel');
function format(n){if(n>1024*1024)return (n/1024/1024).toFixed(2)+' MB';if(n>1024)return (n/1024).toFixed(2)+' KB';return n+' B';}
function update(){
  const threshold = Number(slider.value);
  label.textContent = format(threshold);
  document.querySelectorAll('.image').forEach(el=>{
    el.classList.toggle('oversize', Number(el.dataset.size) > threshold);
  });
}
slider.addEventListener('input', update);
update();
</script>
</body>
</html>`;
  return html;
}

function stripTags(str) {
  return str.replace(/<[^>]*>/g, '').trim();
}


function formatSize(n) {
  if (n > 1024 * 1024) return (n/1024/1024).toFixed(2) + ' MB';
  if (n > 1024) return (n/1024).toFixed(2) + ' KB';
  return n + ' B';
}
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
}
