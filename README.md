<p align="center">
  <img src="public/brand/min-murasu-banner.png" alt="MIN MURASU Banner" width="100%" />
</p>

# OpenSEO · MIN MURASU Edition

An open-source, full-stack SEO audit platform powered by **MIN MURASU** and OpenSEO. Enter any website URL to receive an in-depth, graded report (**A+** to **F**) across **9 critical categories** with **77 automated checks**, actionable prioritized recommendations, and white-labeled PDF export capabilities.

> **Turn Digital Attention Into Business Growth**  
> Comprehensive Digital Marketing, High-Performance Websites, and AI Automation Workflows.

---

## 📞 Get In Touch with MIN MURASU

- 🌐 **Website**: [www.minmurasu.digital](https://www.minmurasu.digital/)
- 📞 **Contact Phone**: [+91 9486772206](tel:+919486772206)
- 💬 **WhatsApp Chat**: [Chat on WhatsApp](https://wa.me/919486772206)
- 📧 **Email**: [minmurasu.digital@gmail.com](mailto:minmurasu.digital@gmail.com)
- 📍 **Service Coverage**: Coimbatore · Chennai · Bengaluru · Worldwide

---

## 🎯 What It Does

- **Comprehensive 9-Area Audits**: 77 automated checks evaluated in seconds, weighted into one unified grade.
- **Prioritized Fix Recommendations**: Every issue is categorized by severity (`High`, `Medium`, `Low`) with step-by-step instructions and code evidence.
- **Site-Wide Crawler**: Crawls entire websites to identify broken links, duplicate titles, missing descriptions, thin content, and indexability issues.
- **Direct Lead Generation & Contact**: Reports include instant **Call**, **WhatsApp**, and **Email** buttons for seamless customer outreach.
- **Print & PDF Cover Export**: Generates agency-ready, beautifully styled PDF reports complete with a branded cover page.
- **Social & Share Previews**: Tests link card previews for Google, WhatsApp, Facebook, X (Twitter), LinkedIn, Slack, and Discord.
- **AI Search Readiness**: Analyzes whether your site is optimized for AI assistants and answer engines (ChatGPT, Claude, Perplexity) via `/llms.txt` and crawler rules.
- **Side-by-Side Competitor Comparison**: Compare two URLs side-by-side to highlight competitive advantages and missing optimizations.
- **Continuous Monitoring & Alerts**: Automated daily or weekly re-audits with alerts sent to Email, Slack, Discord, or Webhooks on score drops or downtime.

---

## 📊 The 9 Audit Areas

Each area is scored individually and weighted into an overall grade from **A+** (95+) to **F** (<40):

| Category | Weight | What It Checks |
| :--- | :---: | :--- |
| **On-page SEO** | **24%** | Titles, meta descriptions, Google search preview, `<h1>` consistency, content volume, keyword consistency, image `alt` attributes, canonical tags, indexability, XML sitemaps, language declarations. |
| **Performance** | **16%** | Core Web Vitals (Google PageSpeed Insights), TTFB server response time, download speeds, total page weight, asset compression (Brotli/Gzip), render-blocking files, image dimensions, lazy loading, DOM node depth. |
| **Usability** | **11%** | Responsive mobile viewports, mobile and desktop screenshots, font legibility, touch target sizing, favicon coverage, Apple touch icons, web app manifest (`manifest.json`), theme colors, deprecated HTML. |
| **Security** | **11%** | Full HTTPS enforcement, HTTP-to-HTTPS redirects, SSL certificate validity and expiration dates, mixed content detection, HSTS headers, security headers (CSP, X-Frame-Options, nosniff), SPF and DMARC email authentication records. |
| **Links** | **10%** | Live broken link detection (internal and external), link text quality, anchor text descriptiveness, nofollow vs dofollow distribution, redirect chains. |
| **Social** | **8%** | Open Graph meta tags (`og:title`, `og:description`, `og:image`), share image validation (resolution, aspect ratio, file size), Twitter/X Card markup, verified social media profiles. |
| **AI search** | **7%** | AI search and training crawler access in `robots.txt` (`GPTBot`, `Claude-SearchBot`, `PerplexityBot`), server-rendered content without JavaScript, semantic HTML markup, `/llms.txt` discovery. |
| **Local SEO** | **7%** | `schema.org/LocalBusiness` structured data, Name-Address-Phone (NAP) consistency, clickable `tel:` links, physical address presence, Google Maps embeds, and Google Business Profile links. |
| **Accessibility** | **6%** | WCAG heading hierarchy (ensuring unskipped `<h1>` through `<h6>` tags), accessible form `<label>` associations, non-empty button and link accessible names, semantic landmark regions (`<main>`, `<nav>`, `<header>`, `<footer>`). |

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

Create a `.env.local` file to set options:

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
# Run tests (240 unit and integration tests)
pnpm test

# Run TypeScript typecheck
pnpm typecheck

# Code formatting and linting
pnpm lint
pnpm format
```

### Project Structure

```
├── public/                 # Static assets (brand logos, banner, llms.txt, robots.txt)
├── src/
│   ├── app/                # Next.js App Router (pages, layouts, and API routes)
│   ├── server/             # Core audit engine, crawler, store, and alert dispatchers
│   │   ├── audit/          # Audit checks (onpage, performance, usability, security, links, social, ai, local, a11y)
│   │   ├── monitors/       # Scheduled website health checks and alert runner
│   │   └── store.ts        # JSON and Redis storage adapters
│   ├── shared/             # Shared types, grade definitions, formatters, and settings schema
│   └── web/                # React components, screens, styles, and UI hooks
├── tests/                  # Vitest test suites
└── data/                   # Persistent storage (settings, crawls, reports)
```

---

## 📄 License

Distributed under the **MIT License**.
