'use client'

import { memo, useState, useTransition, type SubmitEvent } from 'react'
import { useRouter } from 'next/navigation'
import { AnalyticsReport } from '@web/components/analytics-report'
import { Button } from '@web/components/button'
import { EmptyState } from '@web/components/empty-state'
import { Icon } from '@web/components/icon'
import { PageHeader } from '@web/components/page-header'
import type { AnalyticsScreenProps } from './analytics-screen.types'

/** Standalone scanner for detecting installed analytics, tag managers, and tracking pixels. */
const AnalyticsScreen = (props: AnalyticsScreenProps) => {
	const { initialUrl, result, error } = props

	const router = useRouter()
	const [url, setUrl] = useState(initialUrl)
	const [pending, startTransition] = useTransition()

	const runScan = (target: string) =>
		startTransition(() => {
			if (target === initialUrl) router.refresh()
			else router.push(`/analytics?url=${encodeURIComponent(target)}`)
		})

	const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
		e.preventDefault()
		if (url.trim() && !pending) runScan(url.trim())
	}

	return (
		<div className="screen">
			<PageHeader
				eyebrow="Audit"
				title="Analytics & Tracking Scanner"
				description="Detect installed analytics platforms, tag managers, ad pixels (Google Analytics, Meta Pixel, Google Ads, Clarity, Hotjar, TikTok, LinkedIn), their IDs, implementation details, and consent signals."
			/>
			<form className="panel-form" onSubmit={handleSubmit}>
				<div className="panel-form-row">
					<label className="composer-field panel-form-url">
						<Icon name="link" size={18} />
						<span className="sr-only">Page address</span>
						<input
							type="text"
							inputMode="url"
							spellCheck={false}
							placeholder="yourwebsite.com"
							value={url}
							onChange={(e) => setUrl(e.currentTarget.value)}
						/>
					</label>
					<Button type="submit" variant="primary" disabled={!url.trim() || pending}>
						{pending ? 'Scanning…' : 'Scan tracking'}
					</Button>
				</div>
			</form>
			{error && !pending && (
				<p className="callout callout--error" role="alert">
					<Icon name="alert" size={16} />
					{error}
				</p>
			)}
			{result ? (
				<div className={`preview-result${pending ? ' is-stale' : ''}`} aria-busy={pending}>
					<div className="preview-result-head">
						<span className="preview-result-page">
							<strong>{result.title || 'Untitled page'}</strong>
							<a href={result.finalUrl} target="_blank" rel="noreferrer">
								{result.finalUrl}
							</a>
						</span>
						<span className="preview-result-score mono">
							{result.analytics.tools.length}{' '}
							{result.analytics.tools.length === 1 ? 'tool' : 'tools'} detected
						</span>
						<Button small disabled={pending} onClick={() => runScan(initialUrl)}>
							<Icon name="refresh" size={14} />
							Scan again
						</Button>
					</div>
					<div className="report-card">
						<AnalyticsReport analytics={result.analytics} />
					</div>
				</div>
			) : (
				!error && (
					<EmptyState icon="analytics" title="Paste a URL to scan installed tracking">
						<p>
							Detects Google Analytics 4, Universal Analytics, Google Tag Manager, Meta
							Pixel, Google Ads, Microsoft Clarity, Hotjar, TikTok, LinkedIn,
							Plausible, and CMP consent signals.
						</p>
					</EmptyState>
				)
			)}
		</div>
	)
}

export default memo(AnalyticsScreen)
