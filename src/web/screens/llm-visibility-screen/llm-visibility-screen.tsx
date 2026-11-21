'use client'

import { memo, useState, type SubmitEvent } from 'react'
import { Button } from '@web/components/button'
import { EmptyState } from '@web/components/empty-state'
import { Icon } from '@web/components/icon'
import { PageHeader } from '@web/components/page-header'
import { StatusMark } from '@web/components/status-mark'
import { ToastContainer, useToast } from '@web/components/toast'
import type { LlmProviderResult, LlmVisibilityResult, Status } from '@shared/types'

function statusToTone(status: LlmProviderResult['status']): Status {
	if (status === 'mentioned') return 'pass'
	if (status === 'not_mentioned') return 'warn'
	if (status === 'not_configured') return 'info'

	return 'fail'
}

/** Scanner showing how ChatGPT, Gemini, and Claude answer for your brand. */
const LlmVisibilityScreen = () => {
	const [brand, setBrand] = useState('')
	const [domain, setDomain] = useState('')
	const [prompt, setPrompt] = useState('')
	const [pending, setPending] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [result, setResult] = useState<LlmVisibilityResult | null>(null)
	const { toasts, push, dismiss } = useToast()

	const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
		e.preventDefault()
		if (!brand.trim() || pending) return
		setPending(true)
		setError(null)
		try {
			const res = await fetch('/api/llm-visibility', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					brand: brand.trim(),
					domain: domain.trim() || undefined,
					prompt: prompt.trim() || undefined
				})
			})
			const data = (await res.json()) as LlmVisibilityResult & { error?: string }
			if (!res.ok) {
				setError(data.error || 'Could not run LLM visibility check.')
			} else {
				setResult(data)
				push(
					`LLM visibility check complete (${data.mentionedCount}/${data.configuredCount || 3} mentioned).`
				)
			}
		} catch (err) {
			setError((err as Error).message || 'Network error while checking LLM visibility.')
		} finally {
			setPending(false)
		}
	}

	return (
		<div className="screen">
			<PageHeader
				eyebrow="AI Search & GEO"
				title="LLM Visibility Scanner"
				description="See how ChatGPT, Gemini, and Claude answer for your brand, whether they mention your domain, and how they position your business."
			/>

			<form className="panel-form" onSubmit={handleSubmit}>
				<div className="lead-form-grid">
					<label className="lead-field">
						<span>
							BRAND NAME <em>*</em>
						</span>
						<input
							type="text"
							required
							placeholder="e.g. MIN MURASU"
							value={brand}
							onChange={(e) => setBrand(e.currentTarget.value)}
						/>
					</label>

					<label className="lead-field">
						<span>WEBSITE DOMAIN (OPTIONAL)</span>
						<input
							type="text"
							inputMode="url"
							spellCheck={false}
							placeholder="minmurasu.digital"
							value={domain}
							onChange={(e) => setDomain(e.currentTarget.value)}
						/>
					</label>
				</div>

				<label className="lead-field lead-field--full" style={{ marginTop: 12 }}>
					<span>CUSTOM PROMPT (OPTIONAL — LEAVE BLANK FOR DEFAULT BRAND DISCOVERY)</span>
					<input
						type="text"
						placeholder="e.g. Best digital marketing agency in Tamil Nadu for B2B lead generation"
						value={prompt}
						onChange={(e) => setPrompt(e.currentTarget.value)}
					/>
				</label>

				<div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
					<Button type="submit" variant="primary" disabled={!brand.trim() || pending}>
						{pending ? 'Querying LLMs…' : 'Check LLM Visibility'}
					</Button>
				</div>
			</form>

			{error && !pending && (
				<p className="callout callout--error" role="alert">
					<Icon name="alert" size={16} />
					{error}
				</p>
			)}

			{pending ? (
				<div className="skeleton-card" aria-label="Loading LLM visibility results">
					<div className="skeleton-line" style={{ width: '42%' }} />
					<div className="skeleton-line" style={{ width: '92%' }} />
					<div className="skeleton-line" style={{ width: '78%' }} />
					<div className="skeleton-line" style={{ width: '85%' }} />
				</div>
			) : result ? (
				<div className="preview-result" aria-busy={pending}>
					<div className="preview-result-head">
						<span className="preview-result-page">
							<strong>
								{result.brand}
								{result.domain ? ` (${result.domain})` : ''}
							</strong>
							<span className="muted" style={{ fontSize: 12.5 }}>
								Prompt: {result.prompt}
							</span>
						</span>
						<span className="preview-result-score mono">
							{result.mentionedCount}/{result.configuredCount || 3} mentioned
						</span>
					</div>

					<div className="report-card">
						<div className="detail-table-wrap">
							<table className="detail-table">
								<thead>
									<tr>
										<th>Model</th>
										<th>Status</th>
										<th>Brand / Domain</th>
										<th>Sentiment</th>
										<th>Answer Excerpt</th>
									</tr>
								</thead>
								<tbody>
									{result.results.map((item) => {
										const tone = statusToTone(item.status)

										return (
											<tr key={item.provider}>
												<td>
													<strong>{item.label}</strong>
													<div className="muted mono" style={{ fontSize: 11.5 }}>
														{item.model}
													</div>
												</td>
												<td>
													<span className={`pill pill--${tone}`}>
														<StatusMark status={tone} size={13} />
														{item.statusLabel}
													</span>
												</td>
												<td className="mono" style={{ fontSize: 12 }}>
													{item.status === 'mentioned' || item.status === 'not_mentioned'
														? `Brand: ${item.mentionedBrand ? 'Yes' : 'No'} · Domain: ${item.mentionedDomain ? 'Yes' : 'No'}`
														: '—'}
												</td>
												<td style={{ textTransform: 'capitalize' }}>
													{item.sentiment}
												</td>
												<td>{item.excerpt}</td>
											</tr>
										)
									})}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			) : (
				!error && (
					<EmptyState icon="ai" title="Check how AI models answer for your brand">
						<p>
							Queries ChatGPT (<code>OPENAI_API_KEY</code>), Google Gemini (
							<code>GEMINI_API_KEY</code>), and Claude (<code>ANTHROPIC_API_KEY</code>
							) in parallel and reports brand/domain citations and sentiment.
						</p>
					</EmptyState>
				)
			)}
			<ToastContainer toasts={toasts} onDismiss={dismiss} />
		</div>
	)
}

export default memo(LlmVisibilityScreen)
