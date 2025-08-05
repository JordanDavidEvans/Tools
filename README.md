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

## Deployment

Deploy the worker using [Cloudflare Workers](https://workers.cloudflare.com/)
or a compatible tooling such as [Wrangler](https://github.com/cloudflare/wrangler):

```
wrangler publish worker.js
```
