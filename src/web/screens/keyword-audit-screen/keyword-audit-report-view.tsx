'use client'

import { memo, useMemo, useState } from 'react'
import Link from 'next/link'
import type {
	KeywordAuditCategoryId,
	SearchIntent
} from '@shared/keyword-audit'
import { Button } from '@web/components/button'
import { GradeRing } from '@web/components/grade-ring'
import { Icon } from '@web/components/icon'
import { PageHeader } from '@web/components/page-header'
import type {
	CategoryTabOption,
	IntentFilterType,
	KeywordAuditReportViewProps,
	KeywordFilterType
} from './keyword-audit-screen.types'

const CATEGORY_TABS: CategoryTabOption[] = [
	{ id: 'overview', label: 'Website Overview' },
	{ id: 'keywords', label: 'SEO Keywords' },
	{ id: 'meta', label: 'Meta Information' },
	{ id: 'headings', label: 'Headings' },
	{ id: 'content', label: 'Content Analysis' },
	{ id: 'technical', label: 'Technical SEO' },
	{ id: 'images', label: 'Images' },
	{ id: 'local', label: 'Local SEO' },
	{ id: 'competitor', label: 'Competitor Analysis' },
	{ id: 'recommendations', label: 'Recommendations' }
]

function formatIsoDate(iso: string): string {
	try {
		return iso.split('T')[0]
	} catch {
		return iso
	}
}

function getIntentBadgeClass(intent: SearchIntent): string {
	switch (intent) {
		case 'transactional':
			return 'ka-intent-transactional'
		case 'commercial':
			return 'ka-intent-commercial'
		case 'informational':
			return 'ka-intent-informational'
		case 'navigational':
			return 'ka-intent-navigational'
		default:
			return ''
	}
}

const KeywordAuditReportView = (props: KeywordAuditReportViewProps) => {
	const { report } = props

	const [activeTab, setActiveTab] = useState<KeywordAuditCategoryId>('overview')
	const [copiedPrompt, setCopiedPrompt] = useState(false)

	// Keywords tab filters
	const [kwSearch, setKwSearch] = useState('')
	const [kwTypeFilter, setKwTypeFilter] = useState<KeywordFilterType>('all')
	const [kwIntentFilter, setKwIntentFilter] = useState<IntentFilterType>('all')
	const [kwSortBy, setKwSortBy] = useState<'score' | 'frequency' | 'density' | 'term'>('score')
	const [kwSortDir, setKwSortDir] = useState<'asc' | 'desc'>('desc')

	// Filtered & sorted keywords
	const filteredKeywords = useMemo(() => {
		let list = report.keywordCandidates.filter((k) => {
			if (kwSearch && !k.term.toLowerCase().includes(kwSearch.toLowerCase())) {
				return false
			}
			if (kwTypeFilter !== 'all' && k.type !== kwTypeFilter) {
				return false
			}
			if (kwIntentFilter !== 'all' && k.intent !== kwIntentFilter) {
				return false
			}

			return true
		})

		list.sort((a, b) => {
			let diff = 0
			if (kwSortBy === 'score') diff = a.score - b.score
			else if (kwSortBy === 'frequency') diff = a.frequency - b.frequency
			else if (kwSortBy === 'density') diff = a.density - b.density
			else if (kwSortBy === 'term') diff = a.term.localeCompare(b.term)

			return kwSortDir === 'desc' ? -diff : diff
		})

		return list
	}, [report.keywordCandidates, kwSearch, kwTypeFilter, kwIntentFilter, kwSortBy, kwSortDir])

	// Current category object
	const activeCategory = useMemo(() => {
		return report.categories.find((c) => c.id === activeTab)
	}, [report.categories, activeTab])

	// Generate VibeCode AI Prompt for client repairs
	const handleCopyVibeCodePrompt = () => {
		const highPriorityFixes = report.categories
			.filter((c) => c.grade === 'F' || c.grade === 'D')
			.map((c) => `- [${c.name}] (${c.grade}): ${c.recommendations.join('; ')}`)
			.join('\n')

		const revisedMetaList = report.revisedMetas
			.slice(0, 5)
			.map(
				(m) =>
					`Page: ${m.pageUrl}\n  - Title -> "${m.recommendedTitle}" (Target: ${m.targetKeywords.join(', ')})\n  - Description -> "${m.recommendedDescription}"`
			)
			.join('\n\n')

		const prompt = `# MIN MURASU SEO & Keyword Optimization Fix Request
Target Website: ${report.domain} (${report.url})
Overall Audit Grade: ${report.overallGrade} (${report.overallScore}/100)
Pages Audited: ${report.pagesCrawled}

## Critical Areas Needing Immediate Fixes:
${highPriorityFixes || 'All audit categories scored acceptable base marks.'}

## Target Keyword Strategy to Implement:
Primary Keywords: ${report.keywordCandidates
			.filter((k) => k.type === 'primary')
			.slice(0, 8)
			.map((k) => `"${k.term}" (${k.intent}, score: ${k.score})`)
			.join(', ')}

Missing High-Value Keywords: ${report.missingKeywords.slice(0, 10).join(', ')}

## Recommended Revised Titles & Descriptions:
${revisedMetaList}

## Instructions:
1. Update each page's <title> and <meta name="description"> according to the recommended values.
2. Ensure every page has exactly one <h1> tag including the target primary keyword.
3. Add descriptive alt tags and semantic filenames to all image elements.
4. If LocalBusiness schema is missing, inject standard JSON-LD Schema.org markup.
5. Provide minimal, clean code diffs for all changes.`

		navigator.clipboard.writeText(prompt)
		setCopiedPrompt(true)
		setTimeout(() => setCopiedPrompt(false), 3000)
	}

	// Sub-renderers for each tab
	const renderOverviewTab = () => {
		return (
			<div className="ka-tab-content">
				<div className="ka-metrics-grid">
					<div className="ka-metric-card">
						<span className="ka-metric-label">Pages Crawled</span>
						<span className="ka-metric-val">{report.pagesCrawled}</span>
						<span className="ka-metric-sub">Discovered {report.totalPagesDiscovered} URLs</span>
					</div>
					<div className="ka-metric-card">
						<span className="ka-metric-label">Audit Duration</span>
						<span className="ka-metric-val">{(report.durationMs / 1000).toFixed(1)}s</span>
						<span className="ka-metric-sub">Fast multi-page analysis</span>
					</div>
					<div className="ka-metric-card">
						<span className="ka-metric-label">XML Sitemap</span>
						<span className={`ka-metric-val ${report.sitemapFound ? 'ka-text-success' : 'ka-text-warn'}`}>
							{report.sitemapFound ? 'Detected' : 'Missing'}
						</span>
						<span className="ka-metric-sub">{report.sitemapUrl || 'No sitemap found'}</span>
					</div>
					<div className="ka-metric-card">
						<span className="ka-metric-label">Robots.txt</span>
						<span className={`ka-metric-val ${report.robotsTxtFound ? 'ka-text-success' : 'ka-text-warn'}`}>
							{report.robotsTxtFound ? 'Active' : 'Missing'}
						</span>
						<span className="ka-metric-sub">{report.robotsTxtUrl || 'No robots.txt found'}</span>
					</div>
				</div>

				<div className="ka-section-box">
					<h3 className="ka-section-title">Crawled Pages Inventory</h3>
					<div className="ka-table-wrap">
						<table className="ka-table">
							<thead>
								<tr>
									<th>Path</th>
									<th>Status</th>
									<th>Word Count</th>
									<th>Title</th>
									<th>Target Keyword</th>
								</tr>
							</thead>
							<tbody>
								{report.pages.map((p) => (
									<tr key={p.url}>
										<td className="ka-cell-url">
											<span className="mono">{p.pathname}</span>
										</td>
										<td>
											<span className={`badge ${p.statusCode === 200 ? 'badge-pass' : 'badge-fail'}`}>
												{p.statusCode}
											</span>
										</td>
										<td className="mono">{p.wordCount} words</td>
										<td className="ka-cell-truncate" title={p.title}>
											{p.title || <span className="ka-text-dim">Missing Title</span>}
										</td>
										<td>
											{p.primaryKeyword ? (
												<span className="badge badge-accent">{p.primaryKeyword}</span>
											) : (
												<span className="ka-text-dim">—</span>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		)
	}

	const renderKeywordsTab = () => {
		return (
			<div className="ka-tab-content">
				<div className="ka-filter-toolbar">
					<div className="ka-search-box">
						<Icon name="search" size={16} />
						<input
							type="text"
							placeholder="Search keyword term..."
							value={kwSearch}
							onChange={(e) => setKwSearch(e.target.value)}
						/>
						{kwSearch && (
							<button type="button" onClick={() => setKwSearch('')} className="ka-clear-btn">
								<Icon name="close" size={12} />
							</button>
						)}
					</div>

					<div className="ka-filters-row">
						<label className="ka-filter-label">
							<span>Type:</span>
							<select
								value={kwTypeFilter}
								onChange={(e) => setKwTypeFilter(e.target.value as KeywordFilterType)}
							>
								<option value="all">All Types</option>
								<option value="primary">Primary</option>
								<option value="secondary">Secondary</option>
								<option value="long-tail">Long-Tail</option>
							</select>
						</label>

						<label className="ka-filter-label">
							<span>Intent:</span>
							<select
								value={kwIntentFilter}
								onChange={(e) => setKwIntentFilter(e.target.value as IntentFilterType)}
							>
								<option value="all">All Intents</option>
								<option value="commercial">Commercial</option>
								<option value="transactional">Transactional</option>
								<option value="informational">Informational</option>
								<option value="navigational">Navigational</option>
							</select>
						</label>

						<label className="ka-filter-label">
							<span>Sort:</span>
							<select
								value={`${kwSortBy}-${kwSortDir}`}
								onChange={(e) => {
									const [by, dir] = e.target.value.split('-') as [typeof kwSortBy, typeof kwSortDir]
									setKwSortBy(by)
									setKwSortDir(dir)
								}}
							>
								<option value="score-desc">Targeting Score (High to Low)</option>
								<option value="score-asc">Targeting Score (Low to High)</option>
								<option value="frequency-desc">Frequency (High to Low)</option>
								<option value="density-desc">Density (High to Low)</option>
								<option value="term-asc">Keyword (A-Z)</option>
							</select>
						</label>
					</div>
				</div>

				<div className="ka-table-wrap">
					<table className="ka-table">
						<thead>
							<tr>
								<th>Keyword Term</th>
								<th>Type</th>
								<th>Intent</th>
								<th>Targeting Score</th>
								<th>Density</th>
								<th>Placements (Title, Meta, H1, H2, URL)</th>
								<th>Pages</th>
							</tr>
						</thead>
						<tbody>
							{filteredKeywords.length > 0 ? (
								filteredKeywords.map((k) => (
									<tr key={k.term}>
										<td className="ka-kw-term">
											<strong>{k.term}</strong>
										</td>
										<td>
											<span className={`ka-kw-type-badge ka-type-${k.type}`}>{k.type}</span>
										</td>
										<td>
											<span className={`ka-intent-pill ${getIntentBadgeClass(k.intent)}`}>
												{k.intent}
											</span>
										</td>
										<td>
											<div className="ka-score-cell">
												<div className="ka-score-bar-bg">
													<div
														className="ka-score-bar-fill"
														style={{ width: `${k.score}%` }}
													/>
												</div>
												<span className="mono ka-score-num">{k.score}</span>
											</div>
										</td>
										<td className="mono">{k.density}%</td>
										<td>
											<div className="ka-placement-pills">
												<span className={`ka-place-badge ${k.placement.inTitle ? 'ka-placed' : ''}`} title="In Title Tag">
													T
												</span>
												<span className={`ka-place-badge ${k.placement.inMetaDescription ? 'ka-placed' : ''}`} title="In Meta Description">
													M
												</span>
												<span className={`ka-place-badge ${k.placement.inH1 ? 'ka-placed' : ''}`} title="In H1 Heading">
													H1
												</span>
												<span className={`ka-place-badge ${k.placement.inH2 ? 'ka-placed' : ''}`} title="In H2 Heading">
													H2
												</span>
												<span className={`ka-place-badge ${k.placement.inUrl ? 'ka-placed' : ''}`} title="In URL Slug">
													URL
												</span>
											</div>
										</td>
										<td className="mono">{k.pagesFound.length}</td>
									</tr>
								))
							) : (
								<tr>
									<td colSpan={7} className="ka-empty-cell">
										No keywords match the selected filter.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</div>
		)
	}

	const renderMetaTab = () => {
		return (
			<div className="ka-tab-content">
				<div className="ka-section-box">
					<h3 className="ka-section-title">Page Meta Tags & Length Compliance</h3>
					<p className="ka-section-desc">
						Optimal title lengths: 50–60 characters. Optimal meta description lengths: 120–160 characters.
					</p>
					<div className="ka-table-wrap">
						<table className="ka-table">
							<thead>
								<tr>
									<th>Page</th>
									<th>Title Tag & Length</th>
									<th>Meta Description & Length</th>
								</tr>
							</thead>
							<tbody>
								{report.pages.map((p) => (
									<tr key={p.url}>
										<td className="ka-cell-url">
											<span className="mono">{p.pathname}</span>
										</td>
										<td>
											<div className="ka-meta-cell">
												<div className="ka-meta-text">{p.title || <span className="ka-text-dim">Missing Title</span>}</div>
												<div className="ka-meta-badge-row">
													<span className={`badge ${p.titleStatus === 'good' ? 'badge-pass' : 'badge-warn'}`}>
														{p.titleLength} chars ({p.titleStatus})
													</span>
												</div>
											</div>
										</td>
										<td>
											<div className="ka-meta-cell">
												<div className="ka-meta-text">
													{p.description || <span className="ka-text-dim">Missing Meta Description</span>}
												</div>
												<div className="ka-meta-badge-row">
													<span className={`badge ${p.descriptionStatus === 'good' ? 'badge-pass' : 'badge-warn'}`}>
														{p.descriptionLength} chars ({p.descriptionStatus})
													</span>
												</div>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		)
	}

	const renderHeadingsTab = () => {
		return (
			<div className="ka-tab-content">
				<div className="ka-section-box">
					<h3 className="ka-section-title">Heading Hierarchy (H1, H2, H3) & Keyword Integration</h3>
					<div className="ka-table-wrap">
						<table className="ka-table">
							<thead>
								<tr>
									<th>Page</th>
									<th>H1 Heading</th>
									<th>H2 / H3 Count</th>
									<th>Target in Headings</th>
								</tr>
							</thead>
							<tbody>
								{report.pages.map((p) => (
									<tr key={p.url}>
										<td className="ka-cell-url">
											<span className="mono">{p.pathname}</span>
										</td>
										<td>
											{p.h1.length === 0 ? (
												<span className="badge badge-fail">Missing H1</span>
											) : p.h1.length > 1 ? (
												<div>
													<span className="badge badge-warn">Multiple H1s ({p.h1.length})</span>
													<div className="ka-sub-text">{p.h1.join(' | ')}</div>
												</div>
											) : (
												<span className="ka-text-bold">{p.h1[0]}</span>
											)}
										</td>
										<td className="mono">
											{p.h2.length} H2 · {p.h3.length} H3
										</td>
										<td>
											{p.missingTargetInHeadings ? (
												<span className="badge badge-warn">Missing Target Keyword</span>
											) : (
												<span className="badge badge-pass">Target Keyword Present</span>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		)
	}

	const renderContentTab = () => {
		return (
			<div className="ka-tab-content">
				<div className="ka-section-box">
					<h3 className="ka-section-title">Content Depth, Reading Time & Search Intent</h3>
					<div className="ka-table-wrap">
						<table className="ka-table">
							<thead>
								<tr>
									<th>Page</th>
									<th>Word Count</th>
									<th>Reading Time</th>
									<th>Thin Content</th>
									<th>Topics Detected</th>
								</tr>
							</thead>
							<tbody>
								{report.pages.map((p) => (
									<tr key={p.url}>
										<td className="ka-cell-url">
											<span className="mono">{p.pathname}</span>
										</td>
										<td className="mono">{p.wordCount} words</td>
										<td className="mono">{p.readingTimeMin} min</td>
										<td>
											{p.wordCount < 250 ? (
												<span className="badge badge-fail">Thin Content (&lt;250 words)</span>
											) : (
												<span className="badge badge-pass">Satisfactory</span>
											)}
										</td>
										<td>
											<div className="ka-topics-wrap">
												{p.topics.slice(0, 4).map((t) => (
													<span key={t} className="ka-topic-tag">
														{t}
													</span>
												))}
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		)
	}

	const renderTechnicalTab = () => {
		return (
			<div className="ka-tab-content">
				<div className="ka-section-box">
					<h3 className="ka-section-title">Technical Indexing, Canonicals & Status Codes</h3>
					<div className="ka-table-wrap">
						<table className="ka-table">
							<thead>
								<tr>
									<th>Page</th>
									<th>Status</th>
									<th>Indexing</th>
									<th>Canonical URL</th>
									<th>Broken Outgoing Links</th>
								</tr>
							</thead>
							<tbody>
								{report.pages.map((p) => (
									<tr key={p.url}>
										<td className="ka-cell-url">
											<span className="mono">{p.pathname}</span>
										</td>
										<td>
											<span className={`badge ${p.statusCode === 200 ? 'badge-pass' : 'badge-fail'}`}>
												{p.statusCode}
											</span>
										</td>
										<td>
											{p.noindex ? (
												<span className="badge badge-fail">noindex (Blocked from Google)</span>
											) : (
												<span className="badge badge-pass">Indexable</span>
											)}
										</td>
										<td className="ka-cell-truncate mono" title={p.canonical}>
											{p.canonical ? (
												p.isCanonicalMatching ? (
													<span className="ka-text-success">Self-referencing</span>
												) : (
													<span>{p.canonical}</span>
												)
											) : (
												<span className="ka-text-warn">Missing Canonical</span>
											)}
										</td>
										<td className="mono">
											{p.brokenLinks > 0 ? (
												<span className="badge badge-fail">{p.brokenLinks} broken</span>
											) : (
												<span className="ka-text-success">0</span>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		)
	}

	const renderImagesTab = () => {
		return (
			<div className="ka-tab-content">
				<div className="ka-section-box">
					<h3 className="ka-section-title">Image Alt Text & Descriptive Filenames</h3>
					<div className="ka-table-wrap">
						<table className="ka-table">
							<thead>
								<tr>
									<th>Page</th>
									<th>Total Images</th>
									<th>Missing Alt Text</th>
									<th>Generic Filenames</th>
									<th>Health</th>
								</tr>
							</thead>
							<tbody>
								{report.pages.map((p) => {
									const altHealth = p.imagesTotal === 0 ? 'good' : p.imagesMissingAlt === 0 ? 'good' : 'warn'

									return (
										<tr key={p.url}>
											<td className="ka-cell-url">
												<span className="mono">{p.pathname}</span>
											</td>
											<td className="mono">{p.imagesTotal}</td>
											<td className="mono">
												{p.imagesMissingAlt > 0 ? (
													<span className="badge badge-fail">{p.imagesMissingAlt} missing alt</span>
												) : (
													<span className="ka-text-success">All have alt</span>
												)}
											</td>
											<td className="mono">
												{p.imagesGenericFilename > 0 ? (
													<span className="badge badge-warn">{p.imagesGenericFilename} generic</span>
												) : (
													<span className="ka-text-success">Semantic</span>
												)}
											</td>
											<td>
												<span className={`badge ${altHealth === 'good' ? 'badge-pass' : 'badge-warn'}`}>
													{altHealth === 'good' ? 'Pass' : 'Needs Fix'}
												</span>
											</td>
										</tr>
									)
								})}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		)
	}

	const renderLocalTab = () => {
		const { localSeo } = report

		return (
			<div className="ka-tab-content">
				<div className="ka-metrics-grid">
					<div className="ka-metric-card">
						<span className="ka-metric-label">LocalBusiness Schema</span>
						<span className={`ka-metric-val ${localSeo.hasLocalBusinessSchema ? 'ka-text-success' : 'ka-text-fail'}`}>
							{localSeo.hasLocalBusinessSchema ? 'Active' : 'Missing'}
						</span>
						<span className="ka-metric-sub">JSON-LD / Microdata</span>
					</div>
					<div className="ka-metric-card">
						<span className="ka-metric-label">Click-to-Call Phone</span>
						<span className={`ka-metric-val ${localSeo.hasClickablePhone ? 'ka-text-success' : 'ka-text-warn'}`}>
							{localSeo.hasClickablePhone ? 'Present' : 'Missing'}
						</span>
						<span className="ka-metric-sub">tel: link on site</span>
					</div>
					<div className="ka-metric-card">
						<span className="ka-metric-label">Google Maps Embed</span>
						<span className={`ka-metric-val ${localSeo.hasMapEmbed ? 'ka-text-success' : 'ka-text-dim'}`}>
							{localSeo.hasMapEmbed ? 'Found' : 'None'}
						</span>
						<span className="ka-metric-sub">Location map visibility</span>
					</div>
					<div className="ka-metric-card">
						<span className="ka-metric-label">Address Indicators</span>
						<span className={`ka-metric-val ${localSeo.hasAddress ? 'ka-text-success' : 'ka-text-warn'}`}>
							{localSeo.hasAddress ? 'Detected' : 'Missing'}
						</span>
						<span className="ka-metric-sub">Physical location signals</span>
					</div>
				</div>

				<div className="ka-section-box">
					<h3 className="ka-section-title">Detected Locations in Content</h3>
					{localSeo.locationsDetected.length > 0 ? (
						<div className="ka-topics-wrap">
							{localSeo.locationsDetected.map((loc) => (
								<span key={loc} className="ka-topic-tag ka-topic-accent">
									📍 {loc}
								</span>
							))}
						</div>
					) : (
						<p className="ka-text-dim">No specific city or regional keywords detected in body content.</p>
					)}
				</div>
			</div>
		)
	}

	const renderCompetitorTab = () => {
		return (
			<div className="ka-tab-content">
				<div className="ka-section-box">
					<h3 className="ka-section-title">Competitor Keyword Benchmarks & Content Gaps</h3>
					<p className="ka-section-desc">
						Target commercial and transactional queries your competitors optimize for that this website is currently missing.
					</p>
					<div className="ka-table-wrap">
						<table className="ka-table">
							<thead>
								<tr>
									<th>Keyword Opportunity</th>
									<th>Category</th>
									<th>Intent</th>
									<th>Opportunity Level</th>
									<th>Benchmark Usage</th>
									<th>Recommendation</th>
								</tr>
							</thead>
							<tbody>
								{report.competitorGaps.map((gap) => (
									<tr key={gap.keyword}>
										<td>
											<strong className="ka-kw-term">{gap.keyword}</strong>
										</td>
										<td>{gap.category}</td>
										<td>
											<span className={`ka-intent-pill ${getIntentBadgeClass(gap.estimatedIntent)}`}>
												{gap.estimatedIntent}
											</span>
										</td>
										<td>
											<span
												className={`badge ${gap.opportunity === 'high' ? 'badge-fail' : gap.opportunity === 'medium' ? 'badge-warn' : 'badge-pass'}`}
											>
												{gap.opportunity.toUpperCase()}
											</span>
										</td>
										<td className="mono">{gap.competitorBenchmark}</td>
										<td>{gap.recommendation}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		)
	}

	const renderRecommendationsTab = () => {
		return (
			<div className="ka-tab-content">
				{/* VibeCode Fix Banner */}
				<div className="ka-vibecode-banner">
					<div className="ka-vibecode-left">
						<Icon name="sparkline" size={24} />
						<div>
							<h4>Generate VibeCode AI Fix Prompt</h4>
							<p>Copy a ready-made prompt with all detected issues, revised titles, descriptions, and code instructions to paste directly into AI coding agents (Cursor, Claude Code, ChatGPT) to repair the website.</p>
						</div>
					</div>
					<Button variant="primary" onClick={handleCopyVibeCodePrompt}>
						<Icon name="check" size={16} />
						{copiedPrompt ? 'Copied to Clipboard!' : 'Copy AI Fix Prompt'}
					</Button>
				</div>

				{/* Missing Keywords Box */}
				<div className="ka-section-box">
					<h3 className="ka-section-title">Missing Target Keywords</h3>
					<p className="ka-section-desc">High-value keywords identified across topics that are not currently featured in any page title or H1 tag:</p>
					<div className="ka-topics-wrap">
						{report.missingKeywords.map((kw) => (
							<span key={kw} className="ka-topic-tag ka-topic-missing">
								+ {kw}
							</span>
						))}
					</div>
				</div>

				{/* Page-by-Page Revised Titles and Descriptions */}
				<div className="ka-section-box">
					<h3 className="ka-section-title">Turnkey Revised Titles & Meta Descriptions</h3>
					<p className="ka-section-desc">Ready-to-use SEO title tags and meta descriptions optimized for character counts and target search intent:</p>
					<div className="ka-revised-list">
						{report.revisedMetas.map((rec) => (
							<div key={rec.pageUrl} className="ka-revised-card">
								<div className="ka-revised-url mono">{rec.pageUrl}</div>

								<div className="ka-revised-row">
									<div className="ka-revised-col">
										<span className="ka-revised-label">Current Title:</span>
										<div className="ka-current-text">{rec.currentTitle || '(None)'}</div>
									</div>
									<div className="ka-revised-col ka-revised-target">
										<span className="ka-revised-label ka-text-success">Recommended Title:</span>
										<div className="ka-recommended-text">{rec.recommendedTitle}</div>
										<span className="ka-rationale-text">{rec.titleRationale}</span>
									</div>
								</div>

								<div className="ka-revised-row">
									<div className="ka-revised-col">
										<span className="ka-revised-label">Current Meta Description:</span>
										<div className="ka-current-text">{rec.currentDescription || '(None)'}</div>
									</div>
									<div className="ka-revised-col ka-revised-target">
										<span className="ka-revised-label ka-text-success">Recommended Meta Description:</span>
										<div className="ka-recommended-text">{rec.recommendedDescription}</div>
										<span className="ka-rationale-text">{rec.descriptionRationale}</span>
									</div>
								</div>

								<div className="ka-revised-targets-tag">
									<span>Target Keywords:</span>
									{rec.targetKeywords.map((tk) => (
										<span key={tk} className="badge badge-accent">
											{tk}
										</span>
									))}
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		)
	}

	const renderActiveTabContent = () => {
		switch (activeTab) {
			case 'overview':
				return renderOverviewTab()
			case 'keywords':
				return renderKeywordsTab()
			case 'meta':
				return renderMetaTab()
			case 'headings':
				return renderHeadingsTab()
			case 'content':
				return renderContentTab()
			case 'technical':
				return renderTechnicalTab()
			case 'images':
				return renderImagesTab()
			case 'local':
				return renderLocalTab()
			case 'competitor':
				return renderCompetitorTab()
			case 'recommendations':
				return renderRecommendationsTab()
			default:
				return renderOverviewTab()
		}
	}

	return (
		<div className="screen ka-report-view">
			<PageHeader
				eyebrow={`Website SEO & Keyword Audit · ${report.domain}`}
				title={report.domain}
				description={`Comprehensive 10-category audit covering ${report.pagesCrawled} crawled pages, keyword intent, heading hierarchy, technical compliance, and competitor gaps.`}
				actions={
					<div className="ka-header-actions">
						<a
							className="button button-ghost"
							href={`/api/keyword-audit/${report.id}/export?type=keywords`}
							download
						>
							<Icon name="download" size={15} />
							Keywords CSV
						</a>
						<a
							className="button button-ghost"
							href={`/api/keyword-audit/${report.id}/export?type=pages`}
							download
						>
							<Icon name="download" size={15} />
							Pages CSV
						</a>
						<Button variant="primary" onClick={handleCopyVibeCodePrompt}>
							<Icon name="sparkline" size={15} />
							{copiedPrompt ? 'Copied Fix Prompt!' : 'VibeCode Fix Prompt'}
						</Button>
					</div>
				}
			/>

			{/* Executive Summary Card */}
			<div className="ka-exec-card">
				<div className="ka-exec-ring">
					<GradeRing score={report.overallScore} grade={report.overallGrade} size="lg" />
				</div>
				<div className="ka-exec-details">
					<div className="ka-exec-headline">
						<h2>Client SEO & Keyword Audit Grade: {report.overallGrade} ({report.overallScore}/100)</h2>
						<span className="ka-date-tag" suppressHydrationWarning>
							Audited on {formatIsoDate(report.createdAt)}
						</span>
					</div>

					<p className="ka-exec-summary">
						{activeCategory ? activeCategory.summary : '10-area analysis completed successfully.'}
					</p>

					<div className="ka-exec-stats-row">
						<div className="ka-exec-stat">
							<span className="ka-exec-stat-num">{report.pagesCrawled}</span>
							<span className="ka-exec-stat-label">Pages Crawled</span>
						</div>
						<div className="ka-exec-stat">
							<span className="ka-exec-stat-num">
								{report.keywordCandidates.filter((k) => k.type === 'primary').length}
							</span>
							<span className="ka-exec-stat-label">Primary Keywords</span>
						</div>
						<div className="ka-exec-stat">
							<span className="ka-exec-stat-num">{report.competitorGaps.length}</span>
							<span className="ka-exec-stat-label">Competitor Gaps</span>
						</div>
						<div className="ka-exec-stat">
							<span className="ka-exec-stat-num">{report.missingKeywords.length}</span>
							<span className="ka-exec-stat-label">Missing Targets</span>
						</div>
					</div>
				</div>
			</div>

			{/* 10-Area Navigation Tabs */}
			<div className="ka-tabs-bar" role="tablist">
				{CATEGORY_TABS.map((tab) => {
					const cat = report.categories.find((c) => c.id === tab.id)
					const isActive = activeTab === tab.id

					return (
						<button
							key={tab.id}
							type="button"
							role="tab"
							aria-selected={isActive}
							className={`ka-tab-btn ${isActive ? 'ka-tab-active' : ''}`}
							onClick={() => setActiveTab(tab.id)}
						>
							<span>{tab.label}</span>
							{cat && (
								<span className={`ka-tab-grade ka-grade-${cat.grade.toLowerCase().charAt(0)}`}>
									{cat.grade}
								</span>
							)}
						</button>
					)
				})}
			</div>

			{/* Category Header & Findings if applicable */}
			{activeCategory && (
				<div className="ka-category-banner">
					<div className="ka-cat-header-row">
						<div>
							<h3 className="ka-cat-title">{activeCategory.name}</h3>
							<p className="ka-cat-summary">{activeCategory.summary}</p>
						</div>
						<div className="ka-cat-score-badge">
							<span className="ka-cat-score-val">{activeCategory.score}%</span>
							<span className="ka-cat-grade-val">Grade {activeCategory.grade}</span>
						</div>
					</div>

					{activeCategory.findings.length > 0 && (
						<div className="ka-findings-list">
							<strong>Key Audit Findings:</strong>
							<ul>
								{activeCategory.findings.map((f, i) => (
									<li key={i}>{f}</li>
								))}
							</ul>
						</div>
					)}
				</div>
			)}

			{/* Tab Body */}
			{renderActiveTabContent()}

			{/* Back Link */}
			<div className="ka-footer-nav">
				<Link href="/keyword-audit" className="button button-ghost">
					<Icon name="arrowRight" size={14} style={{ transform: 'rotate(180deg)' }} />
					Back to Keyword Audits
				</Link>
			</div>
		</div>
	)
}

export default memo(KeywordAuditReportView)
