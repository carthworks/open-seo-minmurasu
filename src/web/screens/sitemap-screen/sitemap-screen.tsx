'use client'

import { memo, useState } from 'react'
import Link from 'next/link'
import { Icon } from '@web/components/icon'
import { PageHeader } from '@web/components/page-header'
import type { SitemapScreenProps, SitemapUrlEntry } from './sitemap-screen.types'

const DEMO_URLS: SitemapUrlEntry[] = [
	{
		loc: 'https://www.minmurasu.digital/',
		lastmod: '2026-11-01',
		changefreq: 'weekly',
		priority: '1.0'
	},
	{
		loc: 'https://www.minmurasu.digital/seo-services',
		lastmod: '2026-11-05',
		changefreq: 'weekly',
		priority: '0.9'
	},
	{
		loc: 'https://www.minmurasu.digital/local-seo',
		lastmod: '2026-11-04',
		changefreq: 'monthly',
		priority: '0.8'
	},
	{
		loc: 'https://www.minmurasu.digital/about-us',
		lastmod: '2026-10-20',
		changefreq: 'monthly',
		priority: '0.6'
	},
	{
		loc: 'https://www.minmurasu.digital/contact',
		lastmod: '2026-10-28',
		changefreq: 'monthly',
		priority: '0.7'
	}
]

const SitemapScreen = (_props: SitemapScreenProps) => {
	const [sitemapUrl, setSitemapUrl] = useState('https://www.minmurasu.digital/sitemap.xml')
	const [urls] = useState<SitemapUrlEntry[]>(DEMO_URLS)
	const [loading, setLoading] = useState(false)
	const [searchFilter, setSearchFilter] = useState('')

	const handleExplore = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!sitemapUrl) return
		setLoading(true)

		try {
			await fetch(`/api/audit?probe=${encodeURIComponent(sitemapUrl)}`)
			setLoading(false)
		} catch {
			setLoading(false)
		}
	}

	const filteredUrls = urls.filter((u) => u.loc.toLowerCase().includes(searchFilter.toLowerCase()))

	return (
		<div className="screen sitemap-screen">
			<PageHeader
				eyebrow="Site Discovery"
				title="XML Sitemap Explorer"
				description="Inspect any site's sitemap.xml to discover published URLs, update timestamps, and launch one-click audits."
				actions={
					<Link href="/crawls" className="button button--small">
						<Icon name="crawl" size={14} />
						<span>Full site crawler</span>
					</Link>
				}
			/>

			{/* Sitemap Input Card */}
			<div className="sitemap-input-card">
				<form onSubmit={handleExplore} className="sitemap-form">
					<div className="composer-field sitemap-input-box">
						<Icon name="sitemap" size={18} />
						<input
							type="url"
							placeholder="Enter sitemap URL (e.g. https://example.com/sitemap.xml)"
							value={sitemapUrl}
							onChange={(e) => setSitemapUrl(e.target.value)}
						/>
					</div>
					<button type="submit" className="button button--primary" disabled={loading}>
						<span>{loading ? 'Exploring...' : 'Inspect Sitemap'}</span>
					</button>
				</form>
			</div>

			{/* Results Panel */}
			<div className="sitemap-results-card">
				<div className="sitemap-results-head">
					<div>
						<h3>Discovered URLs ({filteredUrls.length})</h3>
						<p className="muted">Ready to audit individually or queue in the crawler.</p>
					</div>

					<div className="search-field">
						<Icon name="search" size={15} />
						<input
							type="text"
							className="text-input"
							placeholder="Filter URLs..."
							value={searchFilter}
							onChange={(e) => setSearchFilter(e.target.value)}
						/>
					</div>
				</div>

				<div className="sitemap-table-container">
					<table className="sitemap-table">
						<thead>
							<tr>
								<th>Page URL</th>
								<th>Last Modified</th>
								<th>Change Freq</th>
								<th>Priority</th>
								<th>Action</th>
							</tr>
						</thead>
						<tbody>
							{filteredUrls.map((item, idx) => (
								<tr key={idx}>
									<td className="sitemap-loc">
										<a href={item.loc} target="_blank" rel="noreferrer" className="mono">
											{item.loc}
										</a>
									</td>
									<td className="mono muted">{item.lastmod || '—'}</td>
									<td className="muted">{item.changefreq || '—'}</td>
									<td className="mono muted">{item.priority || '—'}</td>
									<td>
										<Link
											href={`/?url=${encodeURIComponent(item.loc)}`}
											className="button button--small button--quiet"
										>
											<Icon name="audit" size={13} />
											<span>Audit</span>
										</Link>
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

export default memo(SitemapScreen)
