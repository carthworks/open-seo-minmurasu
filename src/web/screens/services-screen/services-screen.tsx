'use client'

import { memo } from 'react'
import Link from 'next/link'
import { Icon } from '@web/components/icon'
import { PageHeader } from '@web/components/page-header'
import type { ServiceItem, ServicesScreenProps } from './services-screen.types'

const SERVICES: ServiceItem[] = [
	{
		id: 'technical-seo',
		title: 'Technical SEO & Architecture',
		icon: 'audit',
		badge: 'Foundation',
		description:
			'Fix indexation barriers, canonical issues, redirect loops, and schema gaps so Google crawls and ranks your pages effortlessly.',
		deliverables: [
			'Full 77-point crawler and diagnostic audit',
			'XML sitemap and robots.txt hierarchy optimization',
			'Canonical tag alignment and broken redirect repair',
			'Schema.org structured data (Organization, LocalBusiness, Breadcrumbs)'
		]
	},
	{
		id: 'local-seo',
		title: 'Local SEO & Google Maps Ranking',
		icon: 'pin',
		badge: 'High ROI',
		description:
			'Dominate local search in your service territory. Turn map searches and local queries into phone calls and store visits.',
		deliverables: [
			'Google Business Profile (GBP) optimization and audit',
			'LocalBusiness JSON-LD markup with geo coordinates',
			'NAP (Name, Address, Phone) citation synchronization',
			'Targeted local landing pages and Google Maps embed integration'
		]
	},
	{
		id: 'ai-search',
		title: 'AI Search & Answer Engines (GEO)',
		icon: 'ai',
		badge: 'Next-Gen',
		description:
			'Position your business to be referenced, cited, and recommended by ChatGPT, Google Gemini, Claude, and Perplexity.',
		deliverables: [
			'llms.txt and llms-full.txt machine-readable manifest setup',
			'AI crawler permissions management (GPTBot, ClaudeBot, PerplexityBot)',
			'Entity-first content formatting for generative AI answer summaries',
			'Structured Q&A / FAQPage schema for high-citation rates'
		]
	},
	{
		id: 'performance',
		title: 'Speed & Core Web Vitals',
		icon: 'performance',
		badge: 'Conversion Booster',
		description:
			'Fast sites convert higher and rank better. We optimize Largest Contentful Paint (LCP), TTFB, and eliminate layout shifts (CLS).',
		deliverables: [
			'Server response time (TTFB) reduction & caching policies',
			'Image conversion to next-gen formats (WebP, AVIF) & responsive sizing',
			'JavaScript bundle trimming and non-critical CSS deferral',
			'Cumulative Layout Shift (CLS) prevention with reserved dimensions'
		]
	},
	{
		id: 'content-strategy',
		title: 'Content Strategy & Keywords',
		icon: 'onpage',
		badge: 'Growth Engine',
		description:
			'Target commercial search intent with authoritative, helpful content structured to capture featured snippets and top rankings.',
		deliverables: [
			'Competitor keyword gap analysis and search intent mapping',
			'Topical cluster and content architecture roadmaps',
			'Heading hierarchy, title tag, and meta description copywriting',
			'Flesch-Kincaid readability and helpful content compliance'
		]
	},
	{
		id: 'accessibility',
		title: 'Accessibility & WCAG Compliance',
		icon: 'accessibility',
		badge: 'Inclusive UX',
		description:
			'Ensure your website is accessible to all users and assistive devices while meeting modern legal standards and search signals.',
		deliverables: [
			'WCAG 2.1 AA compliance audit and remediation plan',
			'Screen reader compatibility and ARIA landmark structuring',
			'Form input labels and interactive control name validation',
			'Color contrast and logical keyboard navigation flow'
		]
	}
]

const ServicesScreen = (props: ServicesScreenProps) => {
	const { settings } = props
	const brandName = settings.brandName || 'MIN MURASU'
	const phone = settings.contactPhone || '9486772206'
	const whatsappUrl = `https://wa.me/91${phone.replace(/\D/g, '')}?text=Hi%20${encodeURIComponent(brandName)}%2C%20I%20am%20interested%20in%20your%20services.`

	return (
		<div className="screen services-screen">
			<PageHeader
				eyebrow="MIN MURASU Agency"
				title="Our Services"
				description="Strategic digital marketing, technical SEO, and conversion optimization to grow your online revenue."
				actions={
					<Link href="/contact" className="button button--primary button--small">
						<Icon name="mail" size={14} />
						<span>Contact us</span>
					</Link>
				}
			/>

			{/* Hero Banner */}
			<div className="services-hero-card">
				<div>
					<span className="services-tag">Data-Driven Growth</span>
					<h2>Built for Maximum ROI and Long-Term Search Visibility</h2>
					<p className="services-hero-p">
						At {brandName}, we combine cutting-edge technical diagnostics with battle-tested
						search strategies. Whether you need to fix crawl bottlenecks, rank at the top of Google
						Maps, or optimize for AI answer engines, we deliver measurable business outcomes.
					</p>
				</div>
				<div className="services-hero-actions">
					<Link href="/contact" className="button button--primary">
						<span>Request a Proposal</span>
					</Link>
					<a
						href={whatsappUrl}
						target="_blank"
						rel="noreferrer"
						className="button button--accent"
					>
						<span>💬 WhatsApp Inquiry</span>
					</a>
				</div>
			</div>

			{/* Service Cards Grid */}
			<div className="services-grid">
				{SERVICES.map((service) => (
					<div key={service.id} className="service-card" id={service.id}>
						<div className="service-card-top">
							<div className="service-card-icon">
								<Icon name={service.icon} size={22} />
							</div>
							<span className="service-badge">{service.badge}</span>
						</div>

						<h3 className="service-card-title">{service.title}</h3>
						<p className="service-card-desc">{service.description}</p>

						<div className="service-card-deliverables">
							<span className="service-deliverables-title">Deliverables & Impact:</span>
							<ul>
								{service.deliverables.map((item, index) => (
									<li key={index}>
										<span className="service-check-icon">✓</span>
										<span>{item}</span>
									</li>
								))}
							</ul>
						</div>

						<div className="service-card-action">
							<Link
								href={`/contact?service=${encodeURIComponent(service.title)}`}
								className="button button--quiet button--small"
							>
								<span>Get started with {service.title.split(' ')[0]} →</span>
							</Link>
						</div>
					</div>
				))}
			</div>

			{/* Bottom CTA */}
			<div className="services-bottom-card">
				<div>
					<h3>Unsure which service your website needs?</h3>
					<p className="muted">
						Run an instant, free 77-check audit or schedule a 15-minute consultation with our SEO
						team.
					</p>
				</div>
				<div className="services-bottom-buttons">
					<Link href="/" className="button button--primary">
						<Icon name="audit" size={15} />
						<span>Run Free Audit</span>
					</Link>
					<Link href="/contact" className="button">
						<Icon name="mail" size={15} />
						<span>Book Consultation</span>
					</Link>
				</div>
			</div>
		</div>
	)
}

export default memo(ServicesScreen)
