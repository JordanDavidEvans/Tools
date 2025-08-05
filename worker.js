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
    document.getElementById('status').innerHTML = 'Chrome extension not detected. Download it from <a href="https://github.com/jordan-evans/Tools">GitHub</a>, unzip it, then load the "extension" folder via chrome://extensions using "Load unpacked".';
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
    document.getElementById('status').innerHTML = 'Chrome extension not detected. Download it from <a href="https://github.com/jordan-evans/Tools">GitHub</a>, unzip it, then load the "extension" folder via chrome://extensions using "Load unpacked".';
  }
});
</script>
</body>
</html>`;
}
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
}
