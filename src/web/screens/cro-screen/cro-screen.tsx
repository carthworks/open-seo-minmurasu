'use client'

import { memo, useState, useTransition, type SubmitEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@web/components/button'
import { CroReport } from '@web/components/cro-report'
import { EmptyState } from '@web/components/empty-state'
import { Icon } from '@web/components/icon'
import { PageHeader } from '@web/components/page-header'
import type { CroScreenProps } from './cro-screen.types'

/** Standalone scanner for Conversion Rate Optimization (CRO) and lead capture readiness. */
const CroScreen = (props: CroScreenProps) => {
	const { initialUrl, result, error } = props

	const router = useRouter()
	const [url, setUrl] = useState(initialUrl)
	const [pending, startTransition] = useTransition()

	const runScan = (target: string) =>
		startTransition(() => {
			if (target === initialUrl) router.refresh()
			else router.push(`/cro?url=${encodeURIComponent(target)}`)
		})

	const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
		e.preventDefault()
		if (url.trim() && !pending) runScan(url.trim())
	}

	return (
		<div className="screen">
			<PageHeader
				eyebrow="Audit"
				title="CRO & Lead Capture Scanner"
				description="Evaluate action-oriented CTAs, lead form friction, click-to-call and WhatsApp links, live chat widgets, and social proof signals."
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
						{pending ? 'Scanning…' : 'Scan CRO'}
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
							{result.cro.ctaCount} CTA{result.cro.ctaCount === 1 ? '' : 's'} ·{' '}
							{result.cro.leadFormCount} form{result.cro.leadFormCount === 1 ? '' : 's'}
						</span>
						<Button small disabled={pending} onClick={() => runScan(initialUrl)}>
							<Icon name="refresh" size={14} />
							Scan again
						</Button>
					</div>
					<div className="report-card">
						<CroReport cro={result.cro} />
					</div>
				</div>
			) : (
				!error && (
					<EmptyState icon="cro" title="Paste a URL to scan CRO & lead capture">
						<p>
							Inspects CTAs, lead capture forms and field friction, click-to-call /
							WhatsApp links, live chat widgets (Intercom, Tawk.to, Crisp, HubSpot),
							and social proof.
						</p>
					</EmptyState>
				)
			)}
		</div>
	)
}

export default memo(CroScreen)
