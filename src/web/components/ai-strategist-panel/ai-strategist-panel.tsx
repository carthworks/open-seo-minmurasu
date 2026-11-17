'use client'

import { memo, useRef, useState } from 'react'
import { AI_ANALYSIS_MODES, type AiAnalysisMode } from '@shared/ai'
import { Button } from '@web/components/button'
import { Icon } from '@web/components/icon'
import type { AiStrategistPanelProps } from './ai-strategist-panel.types'

const AiStrategistPanel = (props: AiStrategistPanelProps) => {
	const { reportId, keywordAuditId, domain, enabled = true } = props

	const [activeMode, setActiveMode] = useState<AiAnalysisMode>('performance')
	const [output, setOutput] = useState('')
	const [running, setRunning] = useState(false)
	const [modelUsed, setModelUsed] = useState<string | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [copied, setCopied] = useState(false)
	const abortRef = useRef<AbortController | null>(null)

	if (!enabled) return null

	const runAnalysis = async (mode: AiAnalysisMode) => {
		abortRef.current?.abort()
		const controller = new AbortController()
		abortRef.current = controller

		setActiveMode(mode)
		setOutput('')
		setError(null)
		setModelUsed(null)
		setRunning(true)

		try {
			const res = await fetch('/api/ai/analyze', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				signal: controller.signal,
				body: JSON.stringify({ reportId, keywordAuditId, mode })
			})

			if (!res.ok) {
				const errJson = (await res.json().catch(() => ({}))) as { error?: string }
				throw new Error(errJson.error || `Request failed with HTTP ${res.status}`)
			}

			if (!res.body) {
				throw new Error('Streaming response body unavailable.')
			}

			const reader = res.body.getReader()
			const decoder = new TextDecoder()
			let buffer = ''

			while (true) {
				const { value, done } = await reader.read()
				if (done) break

				buffer += decoder.decode(value, { stream: true })
				const lines = buffer.split('\n')
				buffer = lines.pop() ?? ''

				for (const line of lines) {
					const trimmed = line.trim()
					if (!trimmed) continue
					try {
						const event = JSON.parse(trimmed) as
							| { type: 'token'; text: string }
							| { type: 'done'; model: string }
							| { type: 'error'; message: string }

						if (event.type === 'token') {
							setOutput((prev) => prev + event.text)
						} else if (event.type === 'done') {
							setModelUsed(event.model)
						} else if (event.type === 'error') {
							setError(event.message)
						}
					} catch {
						// Ignore malformed line
					}
				}
			}
		} catch (err) {
			if ((err as Error).name !== 'AbortError') {
				setError(err instanceof Error ? err.message : 'Local AI request failed.')
			}
		} finally {
			setRunning(false)
		}
	}

	const handleCopy = () => {
		if (!output) return
		navigator.clipboard.writeText(output)
		setCopied(true)
		setTimeout(() => setCopied(false), 2500)
	}

	return (
		<section className="ka-section-box ai-strategist-panel" aria-label="Local AI Strategist">
			<div className="ai-panel-header">
				<div>
					<div className="ai-panel-eyebrow">
						<Icon name="sparkline" size={15} />
						<span>Local AI Strategist (Private · Ollama)</span>
					</div>
					<h3 className="ka-section-title">
						Generate AI Analysis for {domain}
					</h3>
					<p className="ka-section-desc" style={{ marginBottom: 0 }}>
						Runs on your local model to synthesize performance reports, sprint roadmaps, tailored VibeCode prompts, and strategic SEO recommendations.
					</p>
				</div>
				{modelUsed && (
					<span className="badge badge-accent">Model: {modelUsed}</span>
				)}
			</div>

			<div className="ai-mode-grid">
				{AI_ANALYSIS_MODES.map((m) => {
					const isActive = activeMode === m.id && (running || output.length > 0)

					return (
						<button
							key={m.id}
							type="button"
							className={`ai-mode-card ${isActive ? 'ai-mode-active' : ''}`}
							disabled={running}
							onClick={() => runAnalysis(m.id)}
						>
							<strong>{m.label}</strong>
							<span>{m.description}</span>
						</button>
					)
				})}
			</div>

			{running && (
				<div className="ai-status-bar">
					<span>Generating {AI_ANALYSIS_MODES.find((m) => m.id === activeMode)?.label}…</span>
					<Button
						type="button"
						small
						variant="danger-quiet"
						onClick={() => abortRef.current?.abort()}
					>
						Stop
					</Button>
				</div>
			)}

			{error && (
				<div className="callout callout-error" role="alert" style={{ marginTop: '1rem' }}>
					<Icon name="alert" size={16} />
					<span>{error}</span>
				</div>
			)}

			{output && (
				<div className="ai-output-wrap">
					<div className="ai-output-toolbar">
						<span className="mono" style={{ fontSize: '0.78rem' }}>
							{AI_ANALYSIS_MODES.find((m) => m.id === activeMode)?.label}
						</span>
						<Button type="button" small onClick={handleCopy}>
							<Icon name="check" size={13} />
							{copied ? 'Copied!' : 'Copy Markdown'}
						</Button>
					</div>
					<pre className="ai-output-pre">{output}</pre>
				</div>
			)}
		</section>
	)
}

export default memo(AiStrategistPanel)
