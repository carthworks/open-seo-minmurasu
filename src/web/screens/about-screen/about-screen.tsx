'use client'

import { memo, useState } from 'react'
import Link from 'next/link'
import { Icon } from '@web/components/icon'
import { PageHeader } from '@web/components/page-header'
import type { AboutScreenProps } from './about-screen.types'

const SERVICES = [
	{
		title: 'Technical SEO Auditing',
		icon: 'audit' as const,
		description:
			'Complete crawling, indexation analysis, canonical tags, redirects, and robots.txt validation across 77 checks.'
	},
	{
		title: 'Local SEO & Maps Dominance',
		icon: 'pin' as const,
		description:
			'Google Business Profile integration, LocalBusiness schema markup, NAP consistency, and geo-targeted ranking.'
	},
	{
		title: 'AI Search & Answer Engines',
		icon: 'ai' as const,
		description:
			'Generative Engine Optimization (GEO), llms.txt implementation, and AI agent readability for ChatGPT, Gemini, and Claude.'
	},
	{
		title: 'Speed & Core Web Vitals',
		icon: 'performance' as const,
		description:
			'LCP, TTFB, layout shift prevention, image optimization, script minification, and browser caching.'
	},
	{
		title: 'Security & Site Trust',
		icon: 'security' as const,
		description:
			'HTTPS enforcement, SSL certificate lifespan, security headers (CSP, HSTS), and email domain authentication.'
	},
	{
		title: 'Accessibility (WCAG 2.1 AA)',
		icon: 'accessibility' as const,
		description:
			'Heading hierarchy, form control labelling, accessible interactive buttons, and ARIA landmarks.'
	}
]

const AboutScreen = (props: AboutScreenProps) => {
	const { settings } = props
	const [bannerVisible, setBannerVisible] = useState(true)
	const brandName = settings.brandName || 'MIN MURASU'
	const phone = settings.contactPhone || '9486772206'
	const email = settings.contactEmail || 'minmurasu.digital@gmail.com'
	const website = 'https://www.minmurasu.digital/'
	const whatsappUrl = `https://wa.me/91${phone.replace(/\D/g, '')}?text=Hi%20${encodeURIComponent(brandName)}%2C%20I%20would%20like%20to%20learn%20more%20about%20your%20services.`

	return (
		<div className="screen about-screen">
			<PageHeader
				eyebrow="Company"
				title={`About ${brandName}`}
				description="Strategic digital marketing, technical SEO audits, and modern search performance."
				actions={
					<Link href="/" className="button button--primary button--small">
						<Icon name="plus" size={14} />
						<span>New audit</span>
					</Link>
				}
			/>

			{/* Hero Brand Card */}
			<div className="about-hero-card">
				{bannerVisible && (
					<div className="about-hero-banner">
						<img
							src="/brand/min-murasu-banner.png"
							alt={`${brandName} Banner`}
							className="about-hero-banner-img"
							onError={() => setBannerVisible(false)}
						/>
					</div>
				)}
				<div className="about-hero-content">
					<div className="about-hero-header">
						<img
							src={settings.brandLogo || '/brand/min-murasu-logo.png'}
							alt={`${brandName} Logo`}
							className="about-hero-logo"
						/>
						<div className="about-hero-titles">
							<h2>{brandName}</h2>
							<p className="about-hero-tagline">
								Digital Marketing & Technical SEO Agency · Tamil Nadu, India
							</p>
						</div>
					</div>

					<p className="about-hero-bio">
						{brandName} helps ambitious businesses capture top search positions, generate
						high-intent organic leads, and stay ahead in the age of AI search engines. Combining
						in-depth technical diagnostics with content strategy and local dominance, we turn search
						engines into your most reliable customer acquisition channel.
					</p>

					<div className="about-contact-actions">
						<a href={`tel:${phone}`} className="button button--small">
							<span>📞 Call {phone}</span>
						</a>
						<a
							href={whatsappUrl}
							target="_blank"
							rel="noreferrer"
							className="button button--small button--accent"
						>
							<span>💬 WhatsApp</span>
						</a>
						<a href={`mailto:${email}`} className="button button--small">
							<Icon name="mail" size={14} />
							<span>Email</span>
						</a>
						<a
							href={website}
							target="_blank"
							rel="noreferrer"
							className="button button--small button--quiet"
						>
							<Icon name="external" size={14} />
							<span>Visit Website</span>
						</a>
					</div>
				</div>
			</div>

			{/* Core Capabilities */}
			<section className="about-section">
				<div className="about-section-head">
					<h2>What We Do</h2>
					<p className="muted">
						End-to-end digital marketing and technical optimization built for long-term growth.
					</p>
				</div>
				<div className="about-services-grid">
					{SERVICES.map((s) => (
						<div key={s.title} className="about-service-card">
							<div className="about-service-icon">
								<Icon name={s.icon} size={20} />
							</div>
							<div>
								<h3>{s.title}</h3>
								<p>{s.description}</p>
							</div>
						</div>
					))}
				</div>
			</section>

			{/* Platform Engine Details */}
			<section className="about-section">
				<div className="about-section-head">
					<h2>Audit Engine & Technology</h2>
					<p className="muted">
						Transparent, privacy-first technical analysis powered by the open-source OpenSEO suite.
					</p>
				</div>
				<div className="about-info-panel">
					<div className="about-info-row">
						<div>
							<strong>Ten Diagnostic Areas</strong>
							<p className="muted">
								On-page SEO, Performance, Usability, Security, Links, Social, AI Search, Local SEO,
								Accessibility (WCAG), and Trust &amp; E-E-A-T.
							</p>
						</div>
						<span className="about-badge mono">10 Areas</span>
					</div>
					<div className="about-info-row">
						<div>
							<strong>Comprehensive Ruleset</strong>
							<p className="muted">
								81 automated checks inspect everything from schema markup and robots directives to
								response latency, ARIA landmarks, and trust credentials.
							</p>
						</div>
						<span className="about-badge mono">81 Checks</span>
					</div>
					<div className="about-info-row">
						<div>
							<strong>Privacy & Autonomy</strong>
							<p className="muted">
								Audits run on dedicated server infrastructure without third-party tracking or
								data resale.
							</p>
						</div>
						<span className="about-badge mono">100% Private</span>
					</div>
				</div>
			</section>

			{/* Footer CTA */}
			<div className="about-footer-card">
				<div>
					<h3>Ready to optimize your web presence?</h3>
					<p className="muted">
						Run a free audit on your domain or customize report branding in Settings.
					</p>
				</div>
				<div className="about-footer-buttons">
					<Link href="/" className="button button--primary">
						<span>Run an audit</span>
					</Link>
					<Link href="/settings" className="button">
						<span>Settings</span>
					</Link>
				</div>
			</div>
		</div>
	)
}

export default memo(AboutScreen)

