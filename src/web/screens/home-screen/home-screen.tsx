import { CATEGORIES } from '@shared/grades'
import { CategoryTile } from '@web/components/category-tile'
import Link from 'next/link'
import { memo } from 'react'
import { AuditForm } from './components/audit-form'
import { LinkIntelligence } from './components/link-intelligence'
import { RecentAudits } from './components/recent-audits'
import type { HomeScreenProps } from './home-screen.types'

const HomeScreen = (props: HomeScreenProps) => {
	const { recent, now, pagespeedEnabled, brandName = 'MIN MURASU' } = props

	return (
		<div className="home">
			<section className="home-hero">
				<span className="eyebrow">{brandName} · Powered by OpenSEO · 12 Areas · 90 Checks</span>
				<h1>
					Find what&apos;s <span className="highlight">holding your site</span> back
				</h1>
				<p className="home-lede">
					Paste a URL. {brandName} grades on-page SEO, speed, links, usability,
					security, AI search, local SEO, accessibility, trust &amp; E-E-A-T, analytics &amp; tracking, and CRO &amp; lead capture — built for conversion rate optimization, lead generation services, and instant VibeCode fixes.
				</p>
				<AuditForm pagespeedEnabled={pagespeedEnabled} brandName={brandName} />
			</section>

			<section className="home-section" aria-labelledby="features-title">
				<div className="home-section-head">
					<h2 id="features-title">What&apos;s New &amp; Quick Tools</h2>
					<p className="muted">
						Explore the AI prompt generator, live SEO utilities, and optimization roadmaps.
					</p>
				</div>
				<div className="home-features-grid">
					<div className="home-feature-card home-feature-card--highlight">
						<span className="home-feature-badge">✨ New Feature</span>
						<span className="home-feature-icon" aria-hidden="true">⚡</span>
						<div>
							<h3>VibeCode Prompt Generator</h3>
							<p>
								Run an audit and get a ready-to-run prompt compiling all failed checks and recommended improvements. Feed it directly into Cursor, Claude Code, v0, or Antigravity to auto-fix your codebase.
							</p>
						</div>
					</div>
					<Link href="/analytics" className="home-feature-card">
						<span className="home-feature-icon" aria-hidden="true">📊</span>
						<div>
							<h3>Analytics &amp; Tracking Scanner</h3>
							<p>Detect GA4, GTM, Meta Pixel, Google Ads, Clarity, Hotjar, TikTok, LinkedIn, and consent signals with IDs and status.</p>
						</div>
						<span className="home-feature-arrow" aria-hidden="true">→</span>
					</Link>
					<Link href="/cro" className="home-feature-card">
						<span className="home-feature-icon" aria-hidden="true">🎯</span>
						<div>
							<h3>CRO &amp; Lead Capture Scanner</h3>
							<p>Audit CTAs, lead form friction, click-to-call &amp; WhatsApp links, live chat widgets, and social proof signals.</p>
						</div>
						<span className="home-feature-arrow" aria-hidden="true">→</span>
					</Link>
					<Link href="/tools" className="home-feature-card">
						<span className="home-feature-icon" aria-hidden="true">🛠️</span>
						<div>
							<h3>Live SEO Utilities</h3>
							<p>SERP Simulator with character counters, Schema JSON-LD generator, and AI crawler directives for robots.txt.</p>
						</div>
						<span className="home-feature-arrow" aria-hidden="true">→</span>
					</Link>
					<Link href="/checklist" className="home-feature-card">
						<span className="home-feature-icon" aria-hidden="true">📋</span>
						<div>
							<h3>2027 SEO Checklist</h3>
							<p>Interactive 18-point roadmap covering Technical, Local, AI Search, Speed, and WCAG with progress tracking.</p>
						</div>
						<span className="home-feature-arrow" aria-hidden="true">→</span>
					</Link>
					<Link href="/sitemap" className="home-feature-card">
						<span className="home-feature-icon" aria-hidden="true">🗺️</span>
						<div>
							<h3>XML Sitemap Explorer</h3>
							<p>Discover indexed URLs, inspect priorities and change frequencies, and launch instant targeted audits.</p>
						</div>
						<span className="home-feature-arrow" aria-hidden="true">→</span>
					</Link>
				</div>
			</section>

			<section className="home-section" aria-labelledby="checks-title">
				<div className="home-section-head">
					<h2 id="checks-title">Twelve areas, one grade</h2>
					<p className="muted">
						Each area gets its own score, weighted by how much it matters for search.
					</p>
				</div>
				<ul className="category-grid">
					{CATEGORIES.map((category) => (
						<li key={category.id} className="category-card">
							<CategoryTile category={category.id} size={32} />
							<div>
								<h3>{category.name}</h3>
								<p>{category.description}</p>
							</div>
							<span className="category-card-weight mono">{category.weight}%</span>
						</li>
					))}
				</ul>
			</section>

			<LinkIntelligence recentReports={recent} />

			{recent.length > 0 && (
				<section className="home-section" aria-labelledby="recent-title">
					<div className="home-section-head home-section-head--row">
						<h2 id="recent-title">Recent audits</h2>
						<Link className="button button--quiet button--small" href="/history">
							See all
						</Link>
					</div>
					<RecentAudits reports={recent} now={now} />
				</section>
			)}
		</div>
	)
}

export default memo(HomeScreen)
