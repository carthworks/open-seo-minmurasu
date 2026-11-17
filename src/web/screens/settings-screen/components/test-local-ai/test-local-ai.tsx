'use client'

import { memo, useState } from 'react'
import type { AiStatusResponse } from '@shared/ai'
import { Button } from '@web/components/button'
import { Icon } from '@web/components/icon'
import type { TestLocalAiProps } from './test-local-ai.types'

const TestLocalAi = (props: TestLocalAiProps) => {
	const { selectedModel, onSelectModel } = props
	const [checking, setChecking] = useState(false)
	const [result, setResult] = useState<AiStatusResponse | null>(null)

	const handleTest = async () => {
		setChecking(true)
		try {
			const res = await fetch('/api/ai/status', { cache: 'no-store' })
			const data = (await res.json()) as AiStatusResponse
			setResult(data)
		} catch {
			setResult({
				ok: false,
				enabled: true,
				baseUrl: '',
				selectedModel,
				models: [],
				error: 'Request failed while checking local AI endpoint.'
			})
		} finally {
			setChecking(false)
		}
	}

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', alignItems: 'flex-start' }}>
			<Button type="button" onClick={handleTest} disabled={checking}>
				<Icon name="sparkline" size={14} />
				{checking ? 'Checking…' : 'Test Local AI Connection'}
			</Button>

			{result && result.ok && (
				<div style={{ fontSize: '0.84rem' }}>
					<span className="badge badge-pass" style={{ marginRight: '0.5rem' }}>
						Connected · {result.models.length} model{result.models.length === 1 ? '' : 's'}
					</span>
					{result.models.length > 0 && (
						<div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.45rem' }}>
							{result.models.map((m) => (
								<button
									key={m}
									type="button"
									className={`badge ${m === selectedModel ? 'badge-accent' : ''}`}
									style={{ cursor: 'pointer', border: '1px solid var(--border, #e5e7eb)' }}
									onClick={() => onSelectModel({ localAiModel: m })}
								>
									{m}
								</button>
							))}
						</div>
					)}
				</div>
			)}

			{result && !result.ok && (
				<span className="field-error" role="alert">
					{result.error || 'Could not connect to local AI server.'}
				</span>
			)}
		</div>
	)
}

export default memo(TestLocalAi)
