'use client'

import { memo, useState } from 'react'
import Link from 'next/link'
import { Icon } from '@web/components/icon'
import { PageHeader } from '@web/components/page-header'
import type { HelpFaqItem, HelpGuideSection } from './help-screen.types'

const GUIDE_SECTIONS: HelpGuideSection[] = [
	{
		id: 'single-audit',
		title: 'Single-Page SEO Audit (10 Areas, One Grade)',
		badge: 'Core Audit',
		icon: 'audit',
		summary:
			'Audit any single URL across 10 weighted categories — On-page SEO, Performance, Usability, Security, Links, Social, AI Search, Local SEO, Accessibility, and Trust & E-E-A-T — and generate a graded report (A+ to F).',
		href: '/',
		ctaLabel: 'Open New Audit',
		steps: [
			{
				title: 'Enter a target URL',
				detail:
					'Go to the homepage, enter any website URL (e.g., https://example.com), and click Run audit.'
			},
			{
				title: 'Review category grades & checks',
				detail:
					'Inspect passed, warning, and failed checks across all 10 categories. Filter by priority (High, Medium, Low) to focus on the biggest wins first.'
			},
			{
				title: 'Export or compare',
				detail:
					'Use Print / PDF to export a branded report with a cover page and category grade pills, or open Compare to benchmark two URLs side by side.'
			}
		],
		tips: [
			'Trust & E-E-A-T checks verify author bios, contact info, privacy policy, terms, and HTTPS trust signals.',
			'AI Search (GEO) evaluates /llms.txt and AI crawler directives for ChatGPT, Claude, Gemini, and Perplexity.'
		]
	},
	{
		id: 'vibecode-prompt',
		title: 'VibeCode AI Prompt Generator',
		badge: 'Auto-Fix',
		icon: 'sparkline',
		summary:
			'Turn audit results directly into an actionable coding prompt. Package all failed checks, warnings, and low-priority improvements into a structured prompt for Cursor, Claude Code, Lovable, v0, or Antigravity.',
		href: '/history',
		ctaLabel: 'View Past Reports',
		steps: [
			{
				title: 'Run or open any audit report',
				detail: 'Complete a scan on any URL or open an existing report from History.'
			},
			{
				title: 'Click "VibeCode Prompt" in the top-right bar',
				detail:
					'A popup modal opens with a ready-made markdown prompt listing every failed, warning, and low-priority issue along with recommended fixes.'
			},
			{
				title: 'Copy & paste into your coding agent',
				detail:
					'Click Copy Prompt and paste it into Cursor, Claude Code, Antigravity, or ChatGPT to apply fixes directly to your codebase.'
			}
		]
	},
	{
		id: 'keyword-audit',
		title: 'Website SEO & Keyword Audit Tool (10-Area Client Proposal)',
		badge: 'Client Service',
		icon: 'search',
		summary:
			'Built for auditing prospective clients’ websites. Crawls 10–50 pages and produces a 10-category report covering target keywords, search intent, heading placement, competitor content gaps, and revised titles & meta descriptions.',
		href: '/keyword-audit',
		ctaLabel: 'Launch Keyword Audit',
		steps: [
			{
				title: 'Enter the client website URL & page limit',
				detail:
					'Choose 10, 15, 25, or 50 pages and click Run 10-Area Audit. Live crawl progress streams in real time.'
			},
			{
				title: 'Explore the 10 audit tabs',
				detail:
					'Switch between Website Overview, SEO Keywords, Meta Information, Headings, Content Analysis, Technical SEO, Images, Local SEO, Competitor Analysis, and Recommendations.'
			},
			{
				title: 'Filter keywords & export deliverables',
				detail:
					'Filter discovered keywords by Primary/Secondary/Long-tail and Search Intent (Commercial, Transactional, Informational, Navigational), download Keywords CSV or Pages CSV, or copy the VibeCode AI Fix Prompt.'
			}
		],
		tips: [
			'The Recommendations tab provides before-and-after revised titles and meta descriptions with character-count rationales for each crawled page.'
		]
	},
	{
		id: 'link-intelligence',
		title: 'Link Intelligence & Domain WHOIS',
		badge: 'Links & WHOIS',
		icon: 'compare',
		summary:
			'Inspect every internal link, outbound external link, backlink profile, and domain WHOIS/RDAP record directly on the homepage below "Ten areas, one grade".',
		href: '/#link-intelligence',
		ctaLabel: 'Go to Link Intelligence',
		steps: [
			{
				title: 'Select a recent scan',
				detail:
					'Use the scan selector dropdown in the Link Intelligence section on the homepage to load link data for any audited domain.'
			},
			{
				title: 'Switch between Internal, External, Backlinks & WHOIS tabs',
				detail:
					'Review broken links (4xx/5xx), 3xx redirects, redirect chains, empty or generic anchor text, non-HTTPS links, and full RDAP/DNS WHOIS registration details.'
			},
			{
				title: 'Filter, search, sort & export',
				detail:
					'Filter by Follow, Nofollow, Broken Links, Redirects, or Unique Domains; search by URL, domain, or anchor text; and export CSV.'
			}
		],
		tips: [
			'Backlinks require a configured provider (Google Search Console, Ahrefs, Semrush, or Moz API). When no provider is connected, the UI clearly states "Backlink data not connected" instead of showing fabricated numbers.'
		]
	},
	{
		id: 'crawler-sitemap',
		title: 'Site-Wide Crawler & Sitemap Explorer',
		badge: 'Discovery',
		icon: 'crawl',
		summary:
			'Crawl an entire site to catch broken pages, duplicate titles, missing descriptions, and thin content, or inspect sitemap.xml entries and batch-audit discovered URLs.',
		href: '/crawls',
		ctaLabel: 'Open Crawler',
		steps: [
			{
				title: 'Start a site crawl (/crawls)',
				detail:
					'Enter a domain, pick a page limit, and review site health %, broken pages, response times, and page-level issues.'
			},
			{
				title: 'Inspect XML Sitemaps (/sitemap)',
				detail:
					'Enter a domain or sitemap.xml URL to list discovered URLs, lastmod dates, priorities, and launch audits directly.'
			}
		]
	},
	{
		id: 'tools-checklist',
		title: 'SEO Utilities & 2027 SEO Checklist',
		badge: 'Utilities',
		icon: 'tools',
		summary:
			'Interactive tools for SERP snippet previews, Schema.org JSON-LD generation, AI crawler robots.txt rules, and a trackable 2027 SEO implementation checklist.',
		href: '/tools',
		ctaLabel: 'Open SEO Utilities',
		steps: [
			{
				title: 'Preview SERPs & generate Schema (/tools)',
				detail:
					'Test title/description pixel & character limits in the SERP Simulator, generate LocalBusiness/Organization/FAQPage JSON-LD, and build robots.txt directives for GPTBot, ClaudeBot, and PerplexityBot.'
			},
			{
				title: 'Track progress on the SEO Checklist (/checklist)',
				detail:
					'Check off Technical, Local, AI Search, Performance, and WCAG items — progress is saved automatically in your browser.'
			}
		]
	},
	{
		id: 'monitors-settings',
		title: 'Automated Monitors, Alerts & White-Label Settings',
		badge: 'Workspace',
		icon: 'settings',
		summary:
			'Schedule recurring audits with Slack, Discord, Email, or Webhook alerts on score drops or downtime, and customize branding, logo, colors, and crawl limits.',
		href: '/settings',
		ctaLabel: 'Open Settings',
		steps: [
			{
				title: 'Configure Monitors (/monitors)',
				detail:
					'Add any URL, choose a daily or weekly schedule, and set alert channels for score drops or HTTP failures.'
			},
			{
				title: 'Customize Branding & Limits (/settings)',
				detail:
					'Set your agency Brand Name, Logo, Accent Color, Contact details (for report Call/WhatsApp/Email CTAs), and default Crawl Page Limit.'
			}
		]
	}
]

const FAQS: HelpFaqItem[] = [
	{
		question: 'Why does the Backlinks card say "Backlink data not connected"?',
		answer:
			'OpenSEO never fabricates or scrapes third-party search index data. Backlinks are populated only when genuine API credentials (Google Search Console, Ahrefs, Semrush, or Moz) are configured in your environment.'
	},
	{
		question: 'What is the difference between "New audit" and "SEO & Keywords"?',
		answer:
			'"New audit" performs a deep 81-check diagnostic on a single URL across 10 weighted areas (including Performance, Security, Accessibility, and Trust & E-E-A-T). "SEO & Keywords" crawls multiple pages (10–50) across a whole website to extract target keywords, search intent, competitor gaps, and page-by-page revised meta recommendations for client proposals.'
	},
	{
		question: 'Are timed-out or bot-blocked links marked as broken?',
		answer:
			'No. Link Intelligence distinguishes confirmed HTTP errors (4xx/5xx) from timeouts and hosts that block automated requests so you get accurate broken-link counts without false positives.'
	},
	{
		question: 'How do I deploy OpenSEO on Vercel?',
		answer:
			'Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in your Vercel project environment variables so audit reports, keyword audits, crawls, and settings persist across serverless requests. Next.js automatically adapts output mode when VERCEL is detected.'
	}
]

const HelpScreen = () => {
	const [openFaq, setOpenFaq] = useState<number | null>(0)

	return (
		<div className="screen help-screen">
			<PageHeader
				eyebrow="Documentation"
				title="Help & How-To Guide"
				description="Step-by-step instructions for running SEO audits, extracting client keyword strategies, inspecting Link Intelligence & WHOIS, and generating VibeCode AI fix prompts."
			/>

			<nav className="help-quick-nav" aria-label="Help sections">
				{GUIDE_SECTIONS.map((sec) => (
					<a key={sec.id} href={`#${sec.id}`} className="help-quick-pill">
						<Icon name={sec.icon} size={14} />
						<span>{sec.badge}</span>
					</a>
				))}
				<a href="#faq" className="help-quick-pill">
					<Icon name="info" size={14} />
					<span>FAQ</span>
				</a>
			</nav>

			<div className="help-sections">
				{GUIDE_SECTIONS.map((sec) => (
					<section key={sec.id} id={sec.id} className="help-card">
						<div className="help-card-header">
							<div className="help-card-title-wrap">
								<span className="help-card-icon">
									<Icon name={sec.icon} size={20} />
								</span>
								<div>
									<span className="help-badge">{sec.badge}</span>
									<h2 className="help-card-title">{sec.title}</h2>
								</div>
							</div>
							<Link href={sec.href} className="button button-sm button-ghost">
								{sec.ctaLabel}
								<Icon name="arrowRight" size={14} />
							</Link>
						</div>

						<p className="help-card-summary">{sec.summary}</p>

						<ol className="help-steps">
							{sec.steps.map((step, idx) => (
								<li key={step.title} className="help-step">
									<span className="help-step-num">{idx + 1}</span>
									<div>
										<strong className="help-step-title">{step.title}</strong>
										<p className="help-step-detail">{step.detail}</p>
									</div>
								</li>
							))}
						</ol>

						{sec.tips && sec.tips.length > 0 && (
							<div className="help-tips">
								<strong>Tips:</strong>
								<ul>
									{sec.tips.map((tip) => (
										<li key={tip}>{tip}</li>
									))}
								</ul>
							</div>
						)}
					</section>
				))}
			</div>

			<section id="faq" className="help-faq-section">
				<h2 className="screen-subtitle">Frequently Asked Questions</h2>
				<div className="help-faq-list">
					{FAQS.map((item, idx) => {
						const isOpen = openFaq === idx

						return (
							<div key={item.question} className="help-faq-item">
								<button
									type="button"
									className="help-faq-trigger"
									aria-expanded={isOpen}
									onClick={() => setOpenFaq(isOpen ? null : idx)}
								>
									<span>{item.question}</span>
									<Icon
										name="chevronDown"
										size={16}
										style={{
											transform: isOpen ? 'rotate(180deg)' : 'none',
											transition: 'transform 0.15s ease'
										}}
									/>
								</button>
								{isOpen && <p className="help-faq-answer">{item.answer}</p>}
							</div>
						)
					})}
				</div>
			</section>
		</div>
	)
}

export default memo(HelpScreen)
