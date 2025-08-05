# Tools

Cloudflare Worker scripts providing a hub for QA tooling. The main entry
point is `worker.js` which serves a landing page with links to available
tools.

## Chrome Extension

The Image QA Tool and Header QA Crawler now rely on a companion Chrome
extension. When you visit `/image-qa` or `/qa-crawler` the worker attempts to
communicate with the extension. If it is not installed you will be prompted to
add it.

### Install the extension

1. Download this repository from [GitHub](https://github.com/jordan-evans/Tools)
   (use **Code → Download ZIP**).
2. Unzip the archive and locate the `extension` folder.
3. In Chrome, open `chrome://extensions`, enable **Developer mode**, click
   **Load unpacked**, and select the `extension` folder.

Once installed, the extension will handle crawling tasks and open result pages
in new tabs.

## Image QA Tool

Navigate to `/image-qa` and enter a website URL. If the extension is available
it will crawl the site for images and display results. Without the extension
the page will prompt you to install it.

## Header QA Crawler

Visit `/qa-crawler` to gather heading information across a site. The page sends
the request to the extension, which performs the crawl and shows results in a
separate tab. If the extension is missing you will be asked to install it.

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
