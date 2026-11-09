<p align="center">
  <img src="public/brand/min-murasu-banner.png" alt="MIN MURASU Banner" width="100%" />
</p>

# OpenSEO · MIN MURASU Edition

An open-source, full-stack SEO audit and digital marketing platform powered by **MIN MURASU** and OpenSEO. Enter any website URL to receive an in-depth, graded report (**A+** to **F**) across **10 critical audit categories** with **81 automated checks**, actionable prioritized recommendations, live SEO utilities, and white-labeled PDF export capabilities.

> **Turn Digital Attention Into Business Growth**  
> Comprehensive Technical SEO, Local Search Dominance, Speed Optimization, and AI Answer Engine Readiness.

<p align="center">
  <img src="public/brand/home-screen.png" alt="MIN MURASU OpenSEO Platform Home Screen" width="100%" />
</p>

---

## 📞 Get In Touch with MIN MURASU

- 🌐 **Website**: [www.minmurasu.digital](https://www.minmurasu.digital/)
- 📞 **Contact Phone**: [+91 9486772206](tel:+919486772206)
- 💬 **WhatsApp Chat**: [Chat on WhatsApp (+91 9486772206)](https://wa.me/919486772206)
- 📧 **Official Email**: [minmurasu.digital@gmail.com](mailto:minmurasu.digital@gmail.com)
- 📍 **Headquarters**: Tamil Nadu, India · Serving Clients Worldwide

---

## 🎯 What It Does

- **Comprehensive 10-Area Audits**: 81 automated diagnostic checks evaluated in seconds, weighted into one unified grade.
- **Actionable Prioritized Fixes**: Every issue is categorized by severity (`High`, `Medium`, `Low`) with step-by-step instructions and code snippets.
- **Site-Wide Crawler**: Crawls entire websites to detect broken links, duplicate titles, missing descriptions, thin content, and indexability issues.
- **Direct Lead Generation**: Generated reports include direct **Call**, **WhatsApp**, and **Email** buttons for instant client outreach.
- **Print & PDF Cover Export**: Generates agency-ready, beautifully styled PDF reports complete with a branded cover page.
- **XML Sitemap Explorer**: Inspects any `sitemap.xml`, extracts discovered URLs, change frequencies, priorities, and launches batch audits.
- **Interactive SEO Utilities**:
  - **SERP Simulator**: Live Google desktop search preview with character length counters and cut-off alerts.
  - **Schema JSON-LD Generator**: Instant Schema.org generator for `LocalBusiness`, `Organization`, and `FAQPage`.
  - **Robots & AI Directives Generator**: Pre-configured directives for GPTBot, ClaudeBot, PerplexityBot, and Google-Extended.
- **Interactive 2027 SEO Checklist**: High-impact roadmap across Technical, Local, AI Search, Speed, and WCAG requirements with local progress tracking.
- **Social & Share Previews**: Tests link card previews for Google, WhatsApp, Facebook, X (Twitter), LinkedIn, Slack, and Discord.
- **AI Search Readiness (GEO)**: Analyzes whether your site is accessible and citeable by AI answer engines via `/llms.txt` and crawler directives.
- **Side-by-Side Competitor Comparison**: Compare two URLs side-by-side to highlight competitive advantages and missing optimizations.
- **Continuous Monitoring & Alerts**: Automated daily or weekly re-audits with alerts sent to Email, Slack, Discord, or Webhooks on score drops or downtime.

---

## 📊 The 10 Audit Areas

Each area is scored individually and weighted into an overall grade from **A+** (95+) to **F** (<40):

| Category | Weight | What It Checks |
| :--- | :---: | :--- |
| **On-page SEO** | **22%** | Titles, meta descriptions, Google search preview, `<h1>` consistency, content volume, keyword density, image `alt` tags, canonical tags, indexability, XML sitemaps, language declarations. |
| **Performance** | **15%** | Core Web Vitals (Google PageSpeed Insights), TTFB server response time, download speeds, total page weight, asset compression (Brotli/Gzip), render-blocking files, image dimensions, lazy loading, DOM node depth. |
| **Usability** | **10%** | Responsive mobile viewports, mobile and desktop screenshots, font legibility, touch target sizing, favicon coverage, Apple touch icons, web app manifest (`manifest.json`), theme colors, deprecated HTML. |
| **Security** | **10%** | Full HTTPS enforcement, HTTP-to-HTTPS redirects, SSL certificate validity and expiration dates, mixed content detection, HSTS headers, security headers (CSP, X-Frame-Options, nosniff), SPF and DMARC email authentication records. |
| **Links** | **10%** | Live broken link detection (internal and external), link text quality, anchor text descriptiveness, nofollow vs dofollow distribution, redirect chains. |
| **Social** | **8%** | Open Graph meta tags (`og:title`, `og:description`, `og:image`), share image validation (resolution, aspect ratio, file size), Twitter/X Card markup, verified social media profiles. |
| **AI search** | **7%** | AI search and training crawler access in `robots.txt` (`GPTBot`, `Claude-SearchBot`, `PerplexityBot`), server-rendered content without JavaScript, semantic HTML markup, `/llms.txt` discovery. |
| **Local SEO** | **6%** | `schema.org/LocalBusiness` structured data, Name-Address-Phone (NAP) consistency, clickable `tel:` links, physical address presence, Google Maps embeds, and Google Business Profile links. |
| **Accessibility** | **6%** | WCAG heading hierarchy (ensuring unskipped `<h1>` through `<h6>` tags), accessible form `<label>` associations, non-empty button and link accessible names, semantic landmark regions (`<main>`, `<nav>`, `<header>`, `<footer>`). |
| **Trust & E-E-A-T** | **6%** | Author & editorial transparency (`Person`/author schema, rel="author", bylines), Privacy Policy links, Terms of Service links, accessible About and Contact page references, copyright notice & year freshness. |

---

## 🧭 Application Navigation

The sidebar navigation provides quick access to all platform capabilities:

- **Audit**:
  - `New audit` (`/`) — Grade any URL across 10 areas and 81 checks.
  - `Share preview` (`/preview`) — Inspect how links look across Google, WhatsApp, Facebook, X, and LinkedIn.
  - `History` (`/history`) — Search and browse all past audits.
  - `Compare` (`/compare`) — Side-by-side comparative analysis of two URLs.
- **Site**:
  - `Crawler` (`/crawls`) — Site-wide crawling and broken link spider.
  - `Sitemap` (`/sitemap`) — Parse XML sitemaps and batch-audit URLs.
  - `Monitors` (`/monitors`) — Scheduled uptime and SEO score monitoring.
- **Tools**:
  - `SEO Utilities` (`/tools`) — Google SERP simulator, Schema JSON-LD generator, and robots/AI directives generator.
  - `SEO Checklist` (`/checklist`) — Interactive 2027 SEO checklist with local persistence.
- **Agency**:
  - `Services` (`/services`) — Overview of MIN MURASU marketing & SEO agency offerings.
  - `Contact` (`/contact`) — Direct WhatsApp and email inquiry generator.
  - `About us` (`/about`) — MIN MURASU brand story and platform architecture.
- **Workspace**:
  - `Settings` (`/settings`) — White-label branding, custom logos, colors, API keys, and notification webhooks.

---

## 🚀 Quickstart

### Prerequisites
- [Node.js](https://nodejs.org/) `>= 22.12`
- [pnpm](https://pnpm.io/) `>= 12.10.1`

### Running Locally

```bash
# 1. Clone the repository
git clone https://github.com/alexsilver8/open-seo.git
cd open-seo

# 2. Install dependencies
pnpm install

# 3. Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
pnpm build
pnpm start
```

### Running with Docker

```bash
docker run -d \
  --name openseo-minmurasu \
  --restart unless-stopped \
  -p 3000:3000 \
  -v openseo-data:/data \
  open-seo-minmurasu
```

---

## ⚙️ Configuration & White-Labeling

You can configure branding, alerts, and audit limits either interactively under **Workspace → Settings** in the app, or by editing [`data/settings.json`](data/settings.json):

```json
{
  "theme": "light",
  "brandName": "MIN MURASU",
  "brandLogo": "/brand/min-murasu-logo.png",
  "brandColor": "#f28c28",
  "reportFooter": "MIN MURASU · www.minmurasu.digital",
  "ctaText": "Visit MIN MURASU",
  "ctaUrl": "https://www.minmurasu.digital/",
  "contactPhone": "9486772206",
  "contactEmail": "minmurasu.digital@gmail.com",
  "pagespeedEnabled": false,
  "brokenLinkLimit": 40,
  "crawlPageLimit": 100,
  "alertEmails": [],
  "slackWebhookUrl": "",
  "discordWebhookUrl": "",
  "webhookUrl": "",
  "appUrl": ""
}
```

### Optional Environment Variables

Create a `.env.local` file to configure options:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PAGESPEED_API_KEY` | Google PageSpeed API key for Core Web Vitals and live screenshots | Optional |
| `ADMIN_PASSWORD` | Password (user: `admin`) to protect crawler, history, and settings | Open |
| `OPENSEO_DATA_DIR` | Directory where reports, crawls, and settings are saved | `./data` |
| `SMTP_URL` | SMTP connection URL for alert emails (`smtps://user:pass@smtp.mail.com:465`) | Optional |
| `OPENSEO_RATE_LIMIT` | Max public audits allowed per visitor per hour | `60` |
| `OPENSEO_MAX_CONCURRENT` | Maximum concurrent audits running at once | `4` |

---

## 🛠️ Development & Testing

```bash
# Run tests (241 unit and integration tests across 16 test files)
pnpm test

# Run TypeScript typecheck
pnpm typecheck

# Code formatting and linting
pnpm lint
pnpm format
```

### Project Structure

```
├── public/                 # Static assets (brand logos, banner, screenshots, llms.txt, robots.txt)
│   └── brand/              # MIN MURASU logos, banner, and home-screen preview
├── src/
│   ├── app/                # Next.js App Router (pages, layouts, and API routes)
│   ├── server/             # Core audit engine, crawler, store, and alert dispatchers
│   │   ├── audit/          # 10 audit check modules (onpage, performance, usability, security, links, social, ai, local, a11y, trust)
│   │   ├── monitors/       # Scheduled website health checks and alert runner
│   │   └── store.ts        # JSON and Redis storage adapters
│   ├── shared/             # Shared types, grade definitions, formatters, and settings schema
│   └── web/                # React components, screens, styles, and UI hooks
├── tests/                  # Vitest test suites (241 tests)
└── data/                   # Persistent storage (settings, crawls, reports)
```

---

## 📄 License

Distributed under the **MIT License**.
