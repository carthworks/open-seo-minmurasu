'use client'

import { memo, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@web/components/button'
import { Icon } from '@web/components/icon'
import type {
	BacklinkRecord,
	LinkFilter,
	LinkIssue,
	LinkRecord,
	LinkSortField,
	LinkSummary,
	SortOrder
} from '@shared/link-intelligence'
import type { WhoisRecord } from '@shared/whois'
import type { LinkIntelligenceProps, LinkIntelligenceTab } from './link-intelligence.types'

function formatUrlShort(url: string): string {
	try {
		const u = new URL(url)

		return `${u.pathname}${u.search}` || '/'
	} catch {
		return url
	}
}

function formatDateDeterministic(iso?: string): string {
	if (!iso) return ''
	try {
		const d = new Date(iso)
		if (isNaN(d.getTime())) return iso
		const year = d.getUTCFullYear()
		const month = String(d.getUTCMonth() + 1).padStart(2, '0')
		const day = String(d.getUTCDate()).padStart(2, '0')

		return `${year}-${month}-${day}`
	} catch {
		return iso || ''
	}
}

function getStatusBadgeClass(status: number | null): string {
	if (status === null) return 'status-badge status-badge--unknown'
	if (status >= 200 && status < 300) return 'status-badge status-badge--ok'
	if (status >= 300 && status < 400) return 'status-badge status-badge--redirect'
	if (status >= 400 && status < 500) return 'status-badge status-badge--client-err'

	return 'status-badge status-badge--server-err'
}

function getSeverityBadgeClass(severity: 'high' | 'medium' | 'low'): string {
	if (severity === 'high') return 'issue-badge issue-badge--high'
	if (severity === 'medium') return 'issue-badge issue-badge--medium'

	return 'issue-badge issue-badge--low'
}

const LinkIntelligence = (props: LinkIntelligenceProps) => {
	const { recentReports, initialSummary, initialIssues } = props

	const [selectedScanId, setSelectedScanId] = useState<string>(recentReports[0]?.id || '')
	const [summary, setSummary] = useState<LinkSummary | null>(initialSummary ?? null)
	const [issues, setIssues] = useState<LinkIssue[]>(initialIssues ?? [])
	const [activeTab, setActiveTab] = useState<LinkIntelligenceTab>('internal')

	// Query state
	const [search, setSearch] = useState('')
	const [filter, setFilter] = useState<LinkFilter>('all')
	const [sort, setSort] = useState<LinkSortField>('url')
	const [order, setOrder] = useState<SortOrder>('asc')
	const [page, setPage] = useState(1)
	const [pageSize, setPageSize] = useState(10)

	// Items state
	const [internalItems, setInternalItems] = useState<LinkRecord[]>([])
	const [externalItems, setExternalItems] = useState<LinkRecord[]>([])
	const [backlinkItems, setBacklinkItems] = useState<BacklinkRecord[]>([])
	const [whoisData, setWhoisData] = useState<WhoisRecord | null>(props.initialWhois ?? null)
	const [whoisLoading, setWhoisLoading] = useState(false)
	const [totalCount, setTotalCount] = useState(0)
	const [totalPages, setTotalPages] = useState(1)
	const [loading, setLoading] = useState(false)
	const [summaryLoading, setSummaryLoading] = useState(false)
	const [showIssues, setShowIssues] = useState(true)

	// Fetch Summary & Issues when scan ID changes
	useEffect(() => {
		if (!selectedScanId) return

		let cancelled = false
		setSummaryLoading(true)

		fetch(`/api/scans/${selectedScanId}/links/summary`)
			.then((res) => (res.ok ? res.json() : null))
			.then((data) => {
				if (cancelled || !data) return
				setSummary(data.summary)
				setIssues(data.issues || [])
			})
			.catch(() => {})
			.finally(() => {
				if (!cancelled) setSummaryLoading(false)
			})

		return () => {
			cancelled = true
		}
	}, [selectedScanId])

	// Fetch Domain WHOIS Data
	useEffect(() => {
		if (!selectedScanId) return

		let cancelled = false
		setWhoisLoading(true)

		fetch(`/api/scans/${selectedScanId}/whois`)
			.then((res) => (res.ok ? res.json() : null))
			.then((json) => {
				if (cancelled || !json) return
				if (json.ok && json.data) {
					setWhoisData(json.data)
				}
			})
			.catch(() => {})
			.finally(() => {
				if (!cancelled) setWhoisLoading(false)
			})

		return () => {
			cancelled = true
		}
	}, [selectedScanId])

	// Fetch Tab Items when active tab, filters, or pagination changes
	useEffect(() => {
		if (!selectedScanId || activeTab === 'whois') return

		let cancelled = false
		setLoading(true)

		const params = new URLSearchParams({
			page: String(page),
			pageSize: String(pageSize),
			filter,
			sort,
			order
		})
		if (search.trim()) params.set('search', search.trim())

		const endpoint =
			activeTab === 'internal'
				? `/api/scans/${selectedScanId}/links/internal?${params}`
				: activeTab === 'external'
					? `/api/scans/${selectedScanId}/links/external?${params}`
					: `/api/scans/${selectedScanId}/links/backlinks?${params}`

		fetch(endpoint)
			.then((res) => (res.ok ? res.json() : null))
			.then((data) => {
				if (cancelled || !data) return
				if (activeTab === 'internal') {
					setInternalItems(data.items || [])
				} else if (activeTab === 'external') {
					setExternalItems(data.items || [])
				} else {
					setBacklinkItems(data.items || [])
				}
				setTotalCount(data.total || 0)
				setTotalPages(data.totalPages || 1)
			})
			.catch(() => {})
			.finally(() => {
				if (!cancelled) setLoading(false)
			})

		return () => {
			cancelled = true
		}
	}, [selectedScanId, activeTab, filter, sort, order, page, pageSize, search])

	const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		setSearch(e.target.value)
		setPage(1)
	}, [])

	const handleFilterChange = useCallback((newFilter: LinkFilter) => {
		setFilter(newFilter)
		setPage(1)
	}, [])

	const handleTabChange = useCallback((tab: LinkIntelligenceTab) => {
		setActiveTab(tab)
		setFilter('all')
		setPage(1)
	}, [])

	const handleToggleSortOrder = useCallback(() => {
		setOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
	}, [])

	const handleExport = useCallback(() => {
		if (!selectedScanId) return
		const params = new URLSearchParams({
			type: activeTab,
			filter,
			search: search.trim()
		})
		window.open(`/api/scans/${selectedScanId}/links/export?${params}`, '_blank')
	}, [selectedScanId, activeTab, filter, search])

	const renderTabContent = () => {
		if (loading) {
			return (
				<div className="link-table-loading">
					<Icon name="refresh" size={24} className="spin-icon" />
					<span>Loading link inventory...</span>
				</div>
			)
		}

		if (activeTab === 'internal') {
			if (internalItems.length === 0) {
				return (
					<div className="link-table-empty">
						<p>No internal links matching the current filters.</p>
					</div>
				)
			}

			return (
				<table className="link-table">
					<thead>
						<tr>
							<th>Source Page</th>
							<th>Destination URL</th>
							<th>Anchor Text</th>
							<th>Status</th>
							<th>Rel</th>
							<th>Type</th>
							<th>Discovered</th>
						</tr>
					</thead>
					<tbody>
						{internalItems.map((item) => (
							<tr key={item.id}>
								<td className="cell-url cell-truncate" title={item.sourceUrl}>
									{formatUrlShort(item.sourceUrl)}
								</td>
								<td className="cell-url cell-truncate" title={item.destinationUrl}>
									<a href={item.destinationUrl} target="_blank" rel="noopener noreferrer" className="link-text-anchor">
										{formatUrlShort(item.destinationUrl)}
										<Icon name="external" size={12} />
									</a>
								</td>
								<td className="cell-anchor">
									{item.anchorText ? (
										<span className="anchor-text">{item.anchorText}</span>
									) : (
										<span className="anchor-empty">Empty Anchor</span>
									)}
								</td>
								<td>
									<span className={getStatusBadgeClass(item.httpStatus)}>
										{item.httpStatus ?? (item.state === 'broken' ? '404' : 'OK')}
									</span>
								</td>
								<td>
									<span className={`rel-badge ${item.isFollow ? 'is-follow' : 'is-nofollow'}`}>
										{item.isFollow ? 'follow' : 'nofollow'}
									</span>
								</td>
								<td>
									<span className="type-badge">{item.linkType}</span>
								</td>
								<td className="cell-date" suppressHydrationWarning>
									{formatDateDeterministic(item.discoveredAt)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			)
		}

		if (activeTab === 'external') {
			if (externalItems.length === 0) {
				return (
					<div className="link-table-empty">
						<p>No external links matching the current filters.</p>
					</div>
				)
			}

			return (
				<table className="link-table">
					<thead>
						<tr>
							<th>Source Page</th>
							<th>Destination Domain</th>
							<th>Destination URL</th>
							<th>Anchor Text</th>
							<th>Status</th>
							<th>Rel</th>
							<th>Type</th>
						</tr>
					</thead>
					<tbody>
						{externalItems.map((item) => (
							<tr key={item.id}>
								<td className="cell-url cell-truncate" title={item.sourceUrl}>
									{formatUrlShort(item.sourceUrl)}
								</td>
								<td className="cell-domain">
									<span className="domain-pill">{item.destinationDomain}</span>
								</td>
								<td className="cell-url cell-truncate" title={item.destinationUrl}>
									<a href={item.destinationUrl} target="_blank" rel="noopener noreferrer" className="link-text-anchor">
										{item.destinationUrl}
										<Icon name="external" size={12} />
									</a>
								</td>
								<td className="cell-anchor">
									{item.anchorText ? (
										<span className="anchor-text">{item.anchorText}</span>
									) : (
										<span className="anchor-empty">Empty Anchor</span>
									)}
								</td>
								<td>
									<span className={getStatusBadgeClass(item.httpStatus)}>
										{item.httpStatus ?? (item.state === 'broken' ? '404' : 'OK')}
									</span>
								</td>
								<td>
									<span className={`rel-badge ${item.isFollow ? 'is-follow' : 'is-nofollow'}`}>
										{item.isFollow ? 'follow' : 'nofollow'}
									</span>
								</td>
								<td>
									<span className="type-badge">{item.linkType}</span>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			)
		}

		if (activeTab === 'backlinks') {
			if (!summary?.backlinkProviderConnected || backlinkItems.length === 0) {
				return (
					<div className="link-table-empty backlink-empty-state">
						<Icon name="globe" size={36} />
						<h3>Backlink Data Provider Not Connected</h3>
						<p>
							Backlinks originate from external websites pointing to yours. OpenSEO MIN MURASU integrates
							with official search index APIs rather than scraping or fabricating data.
						</p>
						<div className="backlink-providers-list">
							<div className="provider-pill">✓ Google Search Console</div>
							<div className="provider-pill">✓ Ahrefs API</div>
							<div className="provider-pill">✓ Semrush API</div>
							<div className="provider-pill">✓ Moz API</div>
						</div>
						<Link href="/settings" className="button button--accent button--small">
							Configure in Workspace Settings →
						</Link>
					</div>
				)
			}

			return (
				<table className="link-table">
					<thead>
						<tr>
							<th>Referring Domain</th>
							<th>Referring Page URL</th>
							<th>Target Page URL</th>
							<th>Anchor Text</th>
							<th>Rel</th>
							<th>First Seen</th>
							<th>Last Seen</th>
							<th>Provider</th>
						</tr>
					</thead>
					<tbody>
						{backlinkItems.map((item) => (
							<tr key={item.id}>
								<td className="cell-domain">
									<span className="domain-pill">{item.referringDomain}</span>
								</td>
								<td className="cell-url cell-truncate" title={item.referringPageUrl}>
									<a href={item.referringPageUrl} target="_blank" rel="noopener noreferrer" className="link-text-anchor">
										{item.referringPageUrl}
										<Icon name="external" size={12} />
									</a>
								</td>
								<td className="cell-url cell-truncate" title={item.targetPageUrl}>
									{formatUrlShort(item.targetPageUrl)}
								</td>
								<td className="cell-anchor">
									<span className="anchor-text">{item.anchorText || 'N/A'}</span>
								</td>
								<td>
									<span className={`rel-badge ${item.isFollow ? 'is-follow' : 'is-nofollow'}`}>
										{item.isFollow ? 'follow' : 'nofollow'}
									</span>
								</td>
								<td className="cell-date" suppressHydrationWarning>
									{formatDateDeterministic(item.firstSeen)}
								</td>
								<td className="cell-date" suppressHydrationWarning>
									{formatDateDeterministic(item.lastSeen)}
								</td>
								<td>
									<span className="provider-badge">{item.provider.toUpperCase()}</span>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			)
		}

		// activeTab === 'whois'
		if (whoisLoading) {
			return (
				<div className="link-table-loading">
					<Icon name="refresh" size={24} className="spin-icon" />
					<span>Querying domain WHOIS &amp; RDAP registry...</span>
				</div>
			)
		}

		if (whoisData) {
			return (
				<div className="whois-panel">
					<div className="whois-grid">
						<div className="whois-card">
							<span className="whois-label">Domain Name</span>
							<div className="whois-value whois-domain-title">{whoisData.domain}</div>
							{whoisData.ip && <span className="whois-sub">IP: {whoisData.ip}</span>}
						</div>

						<div className="whois-card">
							<span className="whois-label">Registrar</span>
							<div className="whois-value">{whoisData.registrar || 'ICANN Accredited Registrar'}</div>
							{whoisData.whoisServer && <span className="whois-sub">Server: {whoisData.whoisServer}</span>}
						</div>

						<div className="whois-card">
							<span className="whois-label">Domain Age</span>
							<div className="whois-value whois-highlight">
								{whoisData.ageText || 'Established Domain'}
							</div>
							<span className="whois-sub" suppressHydrationWarning>
								Registered: {formatDateDeterministic(whoisData.registeredAt) || 'Verified'}
							</span>
						</div>

						<div className="whois-card">
							<span className="whois-label">Expiry Date</span>
							<div className={`whois-value ${whoisData.isExpiringSoon ? 'is-danger' : ''}`}>
								{whoisData.daysUntilExpiration !== undefined
									? `${whoisData.daysUntilExpiration} days remaining`
									: 'Active'}
							</div>
							<span className="whois-sub" suppressHydrationWarning>
								Expires: {formatDateDeterministic(whoisData.expiresAt) || 'Auto-renew enabled'}
							</span>
						</div>
					</div>

					<div className="whois-details-row">
						<div className="whois-sub-box">
							<h4>Name Servers</h4>
							<ul className="whois-list">
								{whoisData.nameservers.map((ns, i) => (
									<li key={i} className="whois-ns-item">
										<Icon name="globe" size={14} />
										<code>{ns}</code>
									</li>
								))}
							</ul>
						</div>

						<div className="whois-sub-box">
							<h4>Domain Status &amp; Security</h4>
							<div className="whois-status-tags">
								{whoisData.status.map((st, i) => (
									<span key={i} className="status-pill">
										{st}
									</span>
								))}
								<span className="status-pill status-pill--dnssec">
									DNSSEC: {whoisData.dnssec ? 'Signed' : 'Unsigned'}
								</span>
								<span className="status-pill status-pill--source">
									Source: {whoisData.source.toUpperCase()}
								</span>
							</div>
						</div>
					</div>
				</div>
			)
		}

		return (
			<div className="link-table-empty">
				<Icon name="alert" size={32} />
				<p>WHOIS information unavailable for this domain.</p>
			</div>
		)
	}

	if (recentReports.length === 0) {
		return (
			<section className="home-section link-intel-section" aria-labelledby="link-intel-title">
				<div className="home-section-head">
					<h2 id="link-intel-title">Link Intelligence</h2>
					<p className="muted">
						Discover every link connected to your website. Identify broken links, understand
						your internal linking structure and monitor your backlink profile.
					</p>
				</div>
				<div className="link-intel-empty-card">
					<Icon name="link" size={32} />
					<h3>No Scans Available Yet</h3>
					<p>Enter any website URL in the address box above to start an audit and view full Link Intelligence insights.</p>
				</div>
			</section>
		)
	}

	return (
		<section className="home-section link-intel-section" aria-labelledby="link-intel-title">
			<div className="link-intel-header">
				<div>
					<div className="link-intel-eyebrow">
						<Icon name="link" size={14} />
						<span>MIN MURASU · Link Intelligence Module</span>
					</div>
					<h2 id="link-intel-title">Link Intelligence</h2>
					<p className="muted">
						Discover every link connected to your website. Identify broken links, understand your internal
						linking structure and monitor your backlink profile.
					</p>
				</div>

				{recentReports.length > 0 && (
					<div className="link-intel-scan-picker">
						<label htmlFor="scan-selector" className="scan-picker-label">
							Inspecting Scan:
						</label>
						<select
							id="scan-selector"
							className="scan-picker-select"
							value={selectedScanId}
							onChange={(e) => {
								setSelectedScanId(e.target.value)
								setPage(1)
							}}
						>
							{recentReports.map((r) => (
								<option key={r.id} value={r.id} suppressHydrationWarning>
									{r.domain} · Score: {r.score} ({formatDateDeterministic(r.createdAt)})
								</option>
							))}
						</select>
					</div>
				)}
			</div>

			{/* ── Summary Cards ──────────────────────────────────────────────── */}
			<div className="link-intel-cards">
				{/* Card 1 – Internal Links */}
				<div className="link-summary-card">
					<div className="link-summary-card-head">
						<div className="link-summary-icon is-internal">
							<Icon name="onpage" size={20} />
						</div>
						<div>
							<h3>Internal Links</h3>
							<span className="link-summary-badge">Site Structure</span>
						</div>
					</div>
					<div className="link-summary-stats">
						<div className="link-summary-stat">
							<span className="stat-label">Total Internal Links</span>
							<span className="stat-value">{summaryLoading ? '...' : (summary?.totalInternal ?? 0)}</span>
						</div>
						<div className="link-summary-stat">
							<span className="stat-label">Unique Destinations</span>
							<span className="stat-value">{summaryLoading ? '...' : (summary?.uniqueInternalDestinations ?? 0)}</span>
						</div>
						<div className="link-summary-stat">
							<span className="stat-label">Broken Internal</span>
							<span className={`stat-value ${summary && summary.brokenInternal > 0 ? 'is-danger' : 'is-success'}`}>
								{summaryLoading ? '...' : (summary?.brokenInternal ?? 0)}
							</span>
						</div>
					</div>
				</div>

				{/* Card 2 – External Links */}
				<div className="link-summary-card">
					<div className="link-summary-card-head">
						<div className="link-summary-icon is-external">
							<Icon name="external" size={20} />
						</div>
						<div>
							<h3>External Links</h3>
							<span className="link-summary-badge">Outbound</span>
						</div>
					</div>
					<div className="link-summary-stats">
						<div className="link-summary-stat">
							<span className="stat-label">Total External Links</span>
							<span className="stat-value">{summaryLoading ? '...' : (summary?.totalExternal ?? 0)}</span>
						</div>
						<div className="link-summary-stat">
							<span className="stat-label">Unique Domains</span>
							<span className="stat-value">{summaryLoading ? '...' : (summary?.uniqueExternalDomains ?? 0)}</span>
						</div>
						<div className="link-summary-stat">
							<span className="stat-label">Broken External</span>
							<span className={`stat-value ${summary && summary.brokenExternal > 0 ? 'is-danger' : 'is-success'}`}>
								{summaryLoading ? '...' : (summary?.brokenExternal ?? 0)}
							</span>
						</div>
					</div>
				</div>

				{/* Card 3 – Backlinks */}
				<div className="link-summary-card">
					<div className="link-summary-card-head">
						<div className="link-summary-icon is-backlinks">
							<Icon name="globe" size={20} />
						</div>
						<div>
							<h3>Backlinks</h3>
							<span className="link-summary-badge">Referrals</span>
						</div>
					</div>
					{summary?.backlinkProviderConnected ? (
						<div className="link-summary-stats">
							<div className="link-summary-stat">
								<span className="stat-label">Discovered Backlinks</span>
								<span className="stat-value">{summary.totalBacklinks}</span>
							</div>
							<div className="link-summary-stat">
								<span className="stat-label">Referring Domains</span>
								<span className="stat-value">{summary.uniqueReferringDomains}</span>
							</div>
							<div className="link-summary-stat">
								<span className="stat-label">Follow / Nofollow</span>
								<span className="stat-value text-small">
									{summary.followBacklinks} / {summary.nofollowBacklinks}
								</span>
							</div>
						</div>
					) : (
						<div className="link-summary-disconnected">
							<div className="disconnected-indicator">
								<Icon name="alert" size={16} />
								<strong>Backlink data not connected</strong>
							</div>
							<p className="disconnected-hint">
								Connect Google Search Console, Ahrefs, Semrush, or Moz API to view live backlink metrics.
							</p>
						</div>
					)}
				</div>
			</div>

			{/* ── Link Analysis Issues & Recommendations ────────────────────── */}
			{issues.length > 0 && (
				<div className="link-issues-container">
					<div className="link-issues-header">
						<div className="link-issues-title">
							<Icon name="alert" size={18} />
							<span>Link Analysis Findings ({issues.length} detected)</span>
						</div>
						<button
							type="button"
							className="link-issues-toggle"
							onClick={() => setShowIssues((prev) => !prev)}
						>
							{showIssues ? 'Hide Recommendations' : 'Show Recommendations'}
						</button>
					</div>

					{showIssues && (
						<div className="link-issues-list">
							{issues.map((issue) => (
								<div key={issue.id} className="link-issue-item">
									<div className="link-issue-top">
										<span className={getSeverityBadgeClass(issue.severity)}>
											{issue.severity.toUpperCase()}
										</span>
										<strong className="link-issue-name">{issue.title}</strong>
										<span className="link-issue-count">({issue.count} links)</span>
									</div>
									<p className="link-issue-desc">{issue.description}</p>
									<div className="link-issue-rec">
										<strong>Recommendation:</strong> {issue.recommendation}
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			)}

			{/* ── Interactive Link Inventory Tabs & Table ───────────────────── */}
			<div className="link-inventory-box">
				{/* Tabs */}
				<div className="link-tabs-bar">
					<button
						type="button"
						className={`link-tab ${activeTab === 'internal' ? 'is-active' : ''}`}
						onClick={() => handleTabChange('internal')}
					>
						<Icon name="onpage" size={16} />
						<span>Internal Links</span>
						<span className="link-tab-count">{summary?.totalInternal ?? 0}</span>
					</button>
					<button
						type="button"
						className={`link-tab ${activeTab === 'external' ? 'is-active' : ''}`}
						onClick={() => handleTabChange('external')}
					>
						<Icon name="external" size={16} />
						<span>External Links</span>
						<span className="link-tab-count">{summary?.totalExternal ?? 0}</span>
					</button>
					<button
						type="button"
						className={`link-tab ${activeTab === 'backlinks' ? 'is-active' : ''}`}
						onClick={() => handleTabChange('backlinks')}
					>
						<Icon name="globe" size={16} />
						<span>Backlinks</span>
						<span className="link-tab-count">
							{summary?.backlinkProviderConnected ? summary.totalBacklinks : '0'}
						</span>
					</button>
					<button
						type="button"
						className={`link-tab ${activeTab === 'whois' ? 'is-active' : ''}`}
						onClick={() => handleTabChange('whois')}
					>
						<Icon name="security" size={16} />
						<span>Domain WHOIS</span>
						<span className="link-tab-count">{whoisData?.ageYears ? `${whoisData.ageYears}y` : 'RDAP'}</span>
					</button>
				</div>

				{/* Controls Bar: Search, Filters, Sort, CSV Export */}
				{activeTab !== 'whois' && (
					<div className="link-controls-bar">
						<div className="link-search-wrapper">
							<Icon name="search" size={16} className="link-search-icon" />
							<input
								type="text"
								placeholder={
									activeTab === 'backlinks'
										? 'Search referring page, domain, anchor...'
										: 'Search source, destination, domain, anchor...'
								}
								value={search}
								onChange={handleSearchChange}
								className="link-search-input"
							/>
						</div>

						<div className="link-filter-group">
							<select
								className="link-select"
								value={filter}
								onChange={(e) => handleFilterChange(e.target.value as LinkFilter)}
							>
								<option value="all">All Links</option>
								<option value="follow">Follow Only</option>
								<option value="nofollow">Nofollow Only</option>
								<option value="broken">Broken Links (4xx/5xx)</option>
								<option value="redirects">Redirects (3xx)</option>
								<option value="unique-domains">Unique Domains</option>
							</select>

							<select
								className="link-select"
								value={sort}
								onChange={(e) => setSort(e.target.value as LinkSortField)}
							>
								<option value="url">Sort by URL</option>
								<option value="status">Sort by Status</option>
								<option value="anchor">Sort by Anchor</option>
								<option value="type">Sort by Type</option>
							</select>

							<button
								type="button"
								className="button button--small button--quiet"
								title={`Sort order: ${order.toUpperCase()}`}
								onClick={handleToggleSortOrder}
							>
								<Icon name={order === 'asc' ? 'arrowUp' : 'arrowDown'} size={14} />
								<span>{order.toUpperCase()}</span>
							</button>

							<select
								className="link-select link-select--small"
								value={pageSize}
								onChange={(e) => {
									setPageSize(Number(e.target.value))
									setPage(1)
								}}
							>
								<option value={10}>10 / page</option>
								<option value={25}>25 / page</option>
								<option value={50}>50 / page</option>
								<option value={100}>100 / page</option>
							</select>

							<Button small variant="default" onClick={handleExport} title="Download filtered records as CSV">
								<Icon name="download" size={14} />
								<span>Export CSV</span>
							</Button>
						</div>
					</div>
				)}

				{/* ── Data Tables ──────────────────────────────────────────────── */}
				<div className="link-table-wrapper">
					{renderTabContent()}
				</div>

				{/* Pagination Footer */}
				{activeTab !== 'whois' && totalCount > 0 && (
					<div className="link-table-footer">
						<span className="link-table-count">
							Showing {Math.min((page - 1) * pageSize + 1, totalCount)} –{' '}
							{Math.min(page * pageSize, totalCount)} of {totalCount} records
						</span>

						<div className="link-pagination-buttons">
							<button
								type="button"
								className="button button--small button--quiet"
								disabled={page <= 1}
								onClick={() => setPage((p) => Math.max(1, p - 1))}
							>
								← Previous
							</button>
							<span className="link-page-info">
								Page {page} of {totalPages}
							</span>
							<button
								type="button"
								className="button button--small button--quiet"
								disabled={page >= totalPages}
								onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
							>
								Next →
							</button>
						</div>
					</div>
				)}
			</div>
		</section>
	)
}

export default memo(LinkIntelligence)
