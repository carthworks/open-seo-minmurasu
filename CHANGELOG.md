# Changelog

All notable changes to OpenSEO. Versions follow [Semantic Versioning](https://semver.org).

## [0.4.0](https://github.com/carthworks/open-seo-minmurasu/compare/v0.3.0...v0.4.0) (2026-11-10)


### Features

* add about page and company screen for MIN MURASU branding ([d78a33a](https://github.com/carthworks/open-seo-minmurasu/commit/d78a33aa466122441243060e52b7b42e52cfdc13))
* add about screen, home screen preview, and update documentation for 10-area SEO audit ([7591cd2](https://github.com/carthworks/open-seo-minmurasu/commit/7591cd23188898f4fcf2b70daa197103f36e1d32))
* add app pages, trust audit checks, and UI screen components ([2673987](https://github.com/carthworks/open-seo-minmurasu/commit/2673987618c5fd0f7d187e02d7b0e9379d1e65a5))
* add category grade pills on PDF report cover and print stylesheet ([34c0cf5](https://github.com/carthworks/open-seo-minmurasu/commit/34c0cf5036f1a46f81e2fa323dc72c09ace49554))
* add design tokens and base styles for OpenSEO web interface ([7e9314e](https://github.com/carthworks/open-seo-minmurasu/commit/7e9314e1694b280000868a72dffa61a792c286bf))
* add link intelligence module with API routes and UI components ([9a0756e](https://github.com/carthworks/open-seo-minmurasu/commit/9a0756e9947e2d5603e8c038eac38ddaf3b83b23))
* add open-seo application structure and core features ([2bf331e](https://github.com/carthworks/open-seo-minmurasu/commit/2bf331e6156118bcb2242abce0b566befe62de7c))
* add trust and E-E-A-T audit checks for SEO analysis ([bc5e28c](https://github.com/carthworks/open-seo-minmurasu/commit/bc5e28c61b5ca7830f83e0b24b6312b8f1cca78a))
* add WHOIS and domain intelligence lookup features ([4064df7](https://github.com/carthworks/open-seo-minmurasu/commit/4064df7859edc2f61dc23b3215d27f8da6d799fb))
* **report:** add ready-made VibeCode prompt modal in top bar ([57844c7](https://github.com/carthworks/open-seo-minmurasu/commit/57844c7d6e47ef5a69cb356dac86b0e23a8c6838))


### Documentation

* update banner image reference to PNG format and add asset ([6e77d37](https://github.com/carthworks/open-seo-minmurasu/commit/6e77d37fdbcaab9224752e2aba417d5b91ab5bc7))
* update README and home screen with VibeCode prompt, quick tools, and 10 audit areas ([d7addd4](https://github.com/carthworks/open-seo-minmurasu/commit/d7addd4f8c73804148c8068f26011434e4b8afcf))
* update README with MIN MURASU branding and features ([f0dfd0d](https://github.com/carthworks/open-seo-minmurasu/commit/f0dfd0d02d89c8ea671601f4375fb697835018c2))

## [0.3.0](https://github.com/alexsilver8/open-seo/compare/v0.2.0...v0.3.0) (2026-10-11)

### Compare two audits

- Put two audits side by side: the same page before and after a change, or your page next to a
  competitor's. See both grades, the change in score, each category, speed and size, and every
  check grouped by how it changed: new problems, got worse, fixed, improved and still to fix.
- Pick two audits under Compare in the sidebar, or audit a competitor's page on the spot. Reports
  have a Compare button, and each site in History has Compare last two.
- Each comparison has a shareable page, white-labelled like reports, with Save PDF. The same data
  comes from `GET /api/compare?a=<id>&b=<id>`.

### Monitors and alerts

- Re-audit a page every day or every week, at an hour in your time zone. Every run is a normal
  audit in History.
- Get an alert when the score drops (by 5 points by default, naming the checks that started
  failing and linking to the comparison), when the page stops loading and when it's back, and
  when its SSL certificate is invalid or about to expire (14 days by default).
- Alerts go by email (set `SMTP_URL` and `SMTP_FROM`), Slack, Discord or a JSON webhook, set up
  under Settings → Alerts, with a button that sends a test alert. Each piece of news is sent once.
- The scheduler starts with OpenSEO and catches up on runs it missed while it was off;
  `OPENSEO_SCHEDULER=false` turns it off. API: `/api/monitors` and `POST /api/alerts/test`.

### GitHub Action

- `uses: alexsilver8/open-seo@v0` audits each preview deploy next to production and fails the pull
  request when a page drops more than 2 points, a check starts failing, or the page doesn't load.
- The results go to the job summary and to a pull request comment that later runs update. It
  works with Vercel and Netlify previews, and leaves out what preview hosts change on purpose:
  the `X-Robots-Tag: noindex` header, canonical tags and email records. Timings never fail it.
- `pnpm check` does the same in any other CI.

### MCP server

- Claude, Cursor, VS Code and other AI tools can use OpenSEO through its MCP server at `/api/mcp`:
  run audits, read and compare reports, crawl sites, check share previews and add monitors.
- Claude Desktop connects through a bridge in the Docker image:
  `docker exec -i openseo node mcp-stdio.mjs`. With `ADMIN_PASSWORD` set, MCP asks for it like
  the rest of the admin API.

## [0.2.0](https://github.com/alexsilver8/open-seo/releases/tag/v0.2.0) (2026-10-10)

### Share previews

- See how a link looks on Google, Facebook, X, LinkedIn, Slack, Discord, WhatsApp and iMessage,
  with what to fix for each. Each preview follows that platform's rules: large or small image,
  card type, image size and file size limits, and theme color.
- Every share image, favicon, Apple touch icon and web app manifest icon is downloaded and
  measured: real pixel size (including every size inside .ico files), format and weight.
- A table of every Open Graph, X, icon and app tag on the page.
- In every report, and as a standalone Share preview page and `GET /api/preview`.
- New checks: share image, Apple touch icon, web app manifest and theme color. The Open Graph,
  X card and favicon checks now look at the images and icons themselves, not just the tags.

### Run it with one command

- A Docker image for Intel and ARM is published to `ghcr.io/alexsilver8/open-seo` with every
  release:
  `docker run -d --name openseo -p 3000:3000 -v openseo-data:/data ghcr.io/alexsilver8/open-seo`
- Fixed the Dockerfile, which copied a `public` folder that no longer exists and broke the build.
- `docker compose` passes every option from `.env` and can reach sites on your own computer.

### Removed

- The Branding section in Settings. Name, logo, accent color, footer and call to action still
  white-label reports when set in `data/settings.json` or through `PUT /api/settings`.
- Leads and the embeddable audit widget: the Leads page, `/embed`, `embed.js`, `/api/leads`,
  the embed settings and the `email` and `name` fields of `POST /api/audit`. An existing
  `data/leads.json` is left in place but no longer read.

## 0.1.0

The first release.

### Audits

- Grades a page from A+ to F with about 70 checks in seven categories: on-page SEO,
  performance, usability, security, links, social and AI search readiness.
- Ranks what to fix by priority, with a recommendation and evidence for every problem.
- Checks links live, measures scripts, stylesheets and images, and reads robots.txt, the
  sitemap, llms.txt, the SSL certificate, HTTP/2 support and SPF and DMARC records.
- Optional Core Web Vitals, accessibility score and phone and desktop screenshots from Google
  PageSpeed Insights.
- Refuses private and internal addresses, with timeouts, size limits and a per-visitor rate
  limit.

### Reports

- Shareable report pages with a category sidebar, a "fix these first" list and filters for
  problems and passes.
- Save as PDF from the browser, or download as JSON.
- White-label branding: name, logo, accent color, footer and a call to action button.
- A light theme by default, with dark and match-system options in Settings.

### Crawler

- Crawls up to 500 pages of a site, respecting robots.txt.
- Finds broken pages, links to broken pages, missing or duplicate titles and descriptions,
  missing or extra H1s, thin content, slow pages, noindex, canonicals and missing alt text.
- Site health score, issue filters and CSV export.

### Leads and embed

- One script tag puts the audit on any website, in your branding, resizing itself.
- Captures each visitor's email and website as a lead, with CSV export.

### Running it

- History of every audit with each site's score over time.
- REST API with streamed progress, and `pnpm scan` and `pnpm crawl` in the terminal.
- Data stored as JSON files. Optional admin password. Docker image and Compose file.
- Fonts are bundled with the app, so neither builds nor visitors call Google Fonts.
