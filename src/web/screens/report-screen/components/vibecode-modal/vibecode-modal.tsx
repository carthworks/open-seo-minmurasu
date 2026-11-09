'use client'

import { memo, useEffect, useMemo, useState } from 'react'
import { Icon } from '@web/components/icon'
import type { VibecodeModalProps } from './vibecode-modal.types'
import { generateVibecodePrompt } from './vibecode-modal.utils'

const VibecodeModal = (props: VibecodeModalProps) => {
	const { report, open, onClose } = props
	const [copied, setCopied] = useState(false)

	const promptText = useMemo(() => generateVibecodePrompt(report), [report])

	const failedCount = report.checks.filter((c) => c.status === 'fail').length
	const warnCount = report.checks.filter((c) => c.status === 'warn').length
	const passCount = report.checks.filter((c) => c.status === 'pass').length

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape' && open) onClose()
		}
		window.addEventListener('keydown', handleKeyDown)

		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [open, onClose])

	if (!open) return null

	const handleCopy = async () => {
		await navigator.clipboard.writeText(promptText)
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}

	return (
		<div className="vibecode-overlay" onClick={onClose} role="dialog" aria-modal="true">
			<div className="vibecode-modal" onClick={(e) => e.stopPropagation()}>
				{/* Modal Head */}
				<div className="vibecode-modal-head">
					<div className="vibecode-title-group">
						<span className="vibecode-badge">✨ VibeCode Ready</span>
						<h2>AI Code Fix Prompt</h2>
						<p className="muted">
							Feed this readymade prompt directly into Cursor, Claude, v0, Lovable, or Antigravity
							to fix all detected issues across your codebase.
						</p>
					</div>
					<button
						type="button"
						className="icon-button vibecode-close"
						onClick={onClose}
						aria-label="Close dialog"
					>
						<Icon name="close" size={16} />
					</button>
				</div>

				{/* Quick Stats Bar */}
				<div className="vibecode-stats-bar">
					<span className="vibecode-stat is-score">
						Score: <strong>{report.score}/100 ({report.grade})</strong>
					</span>
					<span className="vibecode-stat is-fail">
						Failed: <strong>{failedCount}</strong>
					</span>
					<span className="vibecode-stat is-warn">
						Needs Work: <strong>{warnCount}</strong>
					</span>
					<span className="vibecode-stat is-pass">
						Passed: <strong>{passCount}</strong>
					</span>
				</div>

				{/* Prompt Body */}
				<div className="vibecode-code-wrapper">
					<pre className="vibecode-pre mono">
						<code>{promptText}</code>
					</pre>
				</div>

				{/* Modal Actions */}
				<div className="vibecode-modal-foot">
					<span className="muted vibecode-hint">
						Tip: Open your project in Cursor or Claude Code, paste this prompt, and ask it to fix the issues step-by-step.
					</span>
					<div className="vibecode-foot-buttons">
						<button type="button" className="button button--quiet" onClick={onClose}>
							Close
						</button>
						<button
							type="button"
							className="button button--primary"
							onClick={handleCopy}
						>
							<Icon name={copied ? 'check' : 'code'} size={15} />
							<span>{copied ? '✓ Copied to clipboard!' : 'Copy Prompt'}</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}

export default memo(VibecodeModal)

