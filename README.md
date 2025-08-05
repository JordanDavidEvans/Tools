# Tools

Cloudflare Worker scripts providing a hub for QA tooling. The main entry
point is `worker.js` which serves a landing page with links to available
tools.

## Image QA Tool

Navigate to `/image-qa` to use the image quality assurance utility. After
entering a website URL, the worker crawls all internal links, gathers the
images on each page, and sorts them by file size. A slider allows QA
engineers to highlight images above a chosen threshold (1 KB–100 MB) for
review. Each page is labeled with its `<h1>` text and every image displays
its file size and `alt` text.

### Usage

Once deployed, visit `https://<your-worker>/image-qa?url=https://example.com`
to crawl a site and display its images. Use the size slider at the top of the
results page to highlight files above a given threshold.

## Client-side QA Crawler

Navigate to `/qa-crawler` to gather basic page metadata directly in the
browser. The worker serves a self-contained page that loads each internal link
in a hidden iframe, extracts the title, meta description, H1–H3 headings, and
word count, and displays the results in a table. Because the crawling runs in
the client, DOM access is limited to same-origin pages and sites with strict
CORS or `X-Frame-Options` headers may return empty data or 403 errors.

### Usage

Visit `https://<your-worker>/qa-crawler`, enter a base URL, and click **Start**.

### Local Development

Install [Wrangler](https://github.com/cloudflare/wrangler) and start a
development server:

```
wrangler dev worker.js
```

The tool will be available at `http://127.0.0.1:8787/`.

## Deployment

Deploy the worker using [Cloudflare Workers](https://workers.cloudflare.com/)
or a compatible tooling such as [Wrangler](https://github.com/cloudflare/wrangler):

```
wrangler publish worker.js
```
