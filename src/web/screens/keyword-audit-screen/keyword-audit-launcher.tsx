'use client'

import type { AuditProgress } from '@shared/types'
import { AuditProgressView } from '@web/components/audit-progress-view'
import { Button } from '@web/components/button'
import { EmptyState } from '@web/components/empty-state'
import { Icon } from '@web/components/icon'
import { Input } from '@web/components/input'
import { PageHeader } from '@web/components/page-header'
import { postForEvents } from '@web/lib/stream'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { memo, useState, type SubmitEvent } from 'react'
import type { KeywordAuditLauncherProps } from './keyword-audit-screen.types'

/** Competitor URLs separated by commas or spaces, at most 3. */
function parseCompetitors(text: string): string[] {
	return text
		.split(/[\s,]+/)
		.map((part) => part.trim())
		.filter(Boolean)
		.slice(0, 3)
}

const PAGE_OPTIONS = [
	{ value: 10, label: '10 pages · Quick audit' },
	{ value: 15, label: '15 pages · Standard sample' },
	{ value: 25, label: '25 pages · In-depth crawl' },
	{ value: 50, label: '50 pages · Full site inventory' }
]

function formatIsoDate(iso: string): string {
	try {
		return iso.split('T')[0]
	} catch {
		return iso
	}
}

function getGradeBadgeColor(grade: string): string {
	switch (grade) {
		case 'A+':
		case 'A':
			return 'var(--grade-a, #10b981)'
		case 'B':
			return 'var(--grade-b, #3b82f6)'
		case 'C':
			return 'var(--grade-c, #f59e0b)'
		case 'D':
			return 'var(--grade-d, #f97316)'
		default:
			return 'var(--grade-f, #ef4444)'
	}
}

const KeywordAuditLauncher = (props: KeywordAuditLauncherProps) => {
	const { audits, pageLimit, defaultMaxPages = 15 } = props
	const router = useRouter()

	const [url, setUrl] = useState('')
	const [maxPages, setMaxPages] = useState(defaultMaxPages)
	const [competitors, setCompetitors] = useState('')
	const [progress, setProgress] = useState<AuditProgress | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [deletingId, setDeletingId] = useState<string | null>(null)

	const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
		e.preventDefault()
		if (!url.trim() || progress) return

		setError(null)
		setProgress({ step: 'init', label: 'Starting website crawl and keyword audit...', pct: 2 })

		const body = { url: url.trim(), maxPages, competitors: parseCompetitors(competitors) }
		await postForEvents('/api/keyword-audit', body, (event) => {
			if (event.type === 'progress') {
				setProgress(event)
			} else if (event.type === 'done') {
				router.push(`/keyword-audit/${event.id}`)
			} else {
				setError(event.message)
				setProgress(null)
			}
		})
	}

	const handleDelete = async (id: string, e: React.MouseEvent) => {
		e.preventDefault()
		e.stopPropagation()
		if (!confirm('Are you sure you want to delete this keyword audit?')) return

		setDeletingId(id)
		try {
			await fetch(`/api/keyword-audit/${id}`, { method: 'DELETE' })
			router.refresh()
		} catch {
			// ignore
		} finally {
			setDeletingId(null)
		}
	}

	return (
		<div className="screen keyword-audit-container">
			<PageHeader
				eyebrow="MIN MURASU Client Solutions"
				title="Website SEO & Keyword Audit Tool"
				description="Audit prospective client websites to identify keyword targeting, search intent, headings hierarchy, technical health, competitor gaps, and revised metadata recommendations across 10 vital audit areas."
			/>

			{/* Agency Value Banner */}
			<div className="ka-agency-banner">
				<div className="ka-agency-banner-icon">
					<Icon name="sparkline" size={24} />
				</div>
				<div className="ka-agency-banner-content">
					<h3 className="ka-agency-banner-title">High-Value Client Pitch & Proposal Service</h3>
					<p className="ka-agency-banner-desc">
						Use this tool to generate actionable audit presentations for prospective clients. Discover what keywords they are actually ranking for, uncover missed search intent, detect missing schemas and thin content, and provide turn-key revised titles and descriptions ready to implement.
					</p>
				</div>
			</div>

			{/* Audit Launcher Form */}
			<form className="panel-form ka-form" onSubmit={handleSubmit}>
				<div className="panel-form-row">
					<label className="composer-field panel-form-url">
						<Icon name="globe" size={18} />
						<span className="sr-only">Prospective Client Website URL</span>
						<input
							type="text"
							inputMode="url"
							spellCheck={false}
							placeholder="e.g. clientwebsite.com or https://example.com"
							value={url}
							disabled={progress !== null}
							onChange={(e) => setUrl(e.currentTarget.value)}
						/>
					</label>

					<select
						className="select panel-form-select ka-select"
						aria-label="Pages to crawl"
						value={maxPages}
						disabled={progress !== null}
						onChange={(e) => setMaxPages(Number(e.currentTarget.value))}
					>
						{PAGE_OPTIONS.map((opt) => (
							<option key={opt.value} value={opt.value} disabled={opt.value > pageLimit && pageLimit > 0}>
								{opt.label}
							</option>
						))}
					</select>

					<Button
						type="submit"
						variant="primary"
						disabled={!url.trim() || progress !== null}
					>
						<Icon name="search" size={16} />
						Run 10-Area Audit
					</Button>
				</div>

				<label className="ka-competitors-field">
					<span className="ka-competitors-label">Competitor sites (optional, up to 3)</span>
					<Input
						type="text"
						inputMode="url"
						spellCheck={false}
						placeholder="competitor-one.com, competitor-two.com"
						value={competitors}
						disabled={progress !== null}
						onChange={(e) => setCompetitors(e.currentTarget.value)}
					/>
					<span className="ka-competitors-hint">
						Their pages are crawled too, to find phrases they use that this site never mentions. Leave
						empty to skip the competitor comparison.
					</span>
				</label>

				{progress && (
					<div className="ka-progress-box">
						<AuditProgressView progress={progress} />
					</div>
				)}

				{error && (
					<div className="callout callout-error ka-error" role="alert">
						<Icon name="alert" size={18} />
						<span>{error}</span>
					</div>
				)}
			</form>

			{/* 10 Areas Overview Grid */}
			<div className="ka-categories-overview">
				<h2 className="screen-subtitle">10 Extracted Audit Areas</h2>
				<div className="ka-area-grid">
					<div className="ka-area-card">
						<span className="ka-area-num">01</span>
						<h4>Website Overview</h4>
						<p>Page hierarchy, crawl depth, XML sitemap validation, and server TTFB.</p>
					</div>
					<div className="ka-area-card">
						<span className="ka-area-num">02</span>
						<h4>SEO Keywords</h4>
						<p>Primary & secondary candidate terms, targeting scores, and density.</p>
					</div>
					<div className="ka-area-card">
						<span className="ka-area-num">03</span>
						<h4>Meta Information</h4>
						<p>Title and meta description lengths (50-60 & 120-160), missing & duplicates.</p>
					</div>
					<div className="ka-area-card">
						<span className="ka-area-num">04</span>
						<h4>Headings & Placement</h4>
						<p>Single H1 check, H2/H3 structure, and keyword placement in headings.</p>
					</div>
					<div className="ka-area-card">
						<span className="ka-area-num">05</span>
						<h4>Content Analysis</h4>
						<p>Search intent classification, topic extraction, and thin content flags.</p>
					</div>
					<div className="ka-area-card">
						<span className="ka-area-num">06</span>
						<h4>Technical SEO</h4>
						<p>Canonical consistency, noindex directives, robots.txt, and broken links.</p>
					</div>
					<div className="ka-area-card">
						<span className="ka-area-num">07</span>
						<h4>Images</h4>
						<p>Alt text coverage, keyword-rich vs generic filenames, and optimizations.</p>
					</div>
					<div className="ka-area-card">
						<span className="ka-area-num">08</span>
						<h4>Local SEO</h4>
						<p>Location keywords, LocalBusiness schema, click-to-call, and map embeds.</p>
					</div>
					<div className="ka-area-card">
						<span className="ka-area-num">09</span>
						<h4>Competitor Analysis</h4>
						<p>Phrases the competitor sites you enter use that this site never mentions.</p>
					</div>
					<div className="ka-area-card">
						<span className="ka-area-num">10</span>
						<h4>Recommendations</h4>
						<p>Revised titles & descriptions, missing keywords, and VibeCode fix prompts.</p>
					</div>
				</div>
			</div>

			{/* Past Audits List */}
			<div className="ka-history-section">
				<h2 className="screen-subtitle">Past Client Audits</h2>
				{audits.length > 0 ? (
					<div className="ka-history-list">
						{audits.map((item) => (
							<Link
								key={item.id}
								href={`/keyword-audit/${item.id}`}
								className="ka-history-row"
							>
								<div className="ka-history-score-col">
									<span
										className="ka-grade-badge"
										style={{ backgroundColor: getGradeBadgeColor(item.overallGrade) }}
									>
										{item.overallGrade}
									</span>
									<span className="ka-score-text">{item.overallScore}%</span>
								</div>

								<div className="ka-history-info-col">
									<div className="ka-history-domain">{item.domain}</div>
									<div className="ka-history-url">{item.url}</div>
									<div className="ka-history-meta">
										<span suppressHydrationWarning>{formatIsoDate(item.createdAt)}</span>
										<span>·</span>
										<span>{item.pagesCrawled} pages</span>
										<span>·</span>
										<span>{item.primaryKeywordCount} primary keywords</span>
										{item.criticalIssuesCount > 0 && (
											<>
												<span>·</span>
												<span className="ka-issue-warn">
													{item.criticalIssuesCount} issue{item.criticalIssuesCount > 1 ? 's' : ''} to fix
												</span>
											</>
										)}
									</div>
								</div>

								<div className="ka-history-action-col">
									<span className="button button-sm button-ghost">
										View Report
										<Icon name="arrowRight" size={14} />
									</span>
									<button
										type="button"
										className="ka-delete-btn"
										title="Delete audit"
										disabled={deletingId === item.id}
										onClick={(e) => handleDelete(item.id, e)}
									>
										<Icon name="close" size={14} />
									</button>
								</div>
							</Link>
						))}
					</div>
				) : (
					<EmptyState icon="search" title="No keyword audits yet">
						<p>Enter any website URL above to generate a client audit report across all 10 SEO categories.</p>
					</EmptyState>
				)}
			</div>
		</div>
	)
}

export default memo(KeywordAuditLauncher)
