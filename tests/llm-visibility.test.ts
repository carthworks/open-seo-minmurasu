import { afterEach, describe, expect, it, vi } from 'vitest'
import { analyzeLlmResponse, runLlmVisibilityScan } from '@server/llm-visibility'

describe('analyzeLlmResponse', () => {
	it('detects brand and domain mentions with positive sentiment', () => {
		const analysis = analyzeLlmResponse(
			'MIN MURASU',
			'https://www.minmurasu.digital/',
			'MIN MURASU (minmurasu.digital) is a trusted digital marketing and SEO agency.'
		)
		expect(analysis.status).toBe('mentioned')
		expect(analysis.mentionedBrand).toBe(true)
		expect(analysis.mentionedDomain).toBe(true)
		expect(analysis.sentiment).toBe('positive')
	})

	it('marks unmentioned responses as not_mentioned', () => {
		const analysis = analyzeLlmResponse(
			'Acme Corp',
			'acme.com',
			'Here are three well-known marketing agencies you can consider.'
		)
		expect(analysis.status).toBe('not_mentioned')
		expect(analysis.mentionedBrand).toBe(false)
		expect(analysis.mentionedDomain).toBe(false)
		expect(analysis.sentiment).toBe('unknown')
	})
})

describe('runLlmVisibilityScan', () => {
	afterEach(() => {
		vi.unstubAllEnvs()
	})

	it('reports not_configured cleanly when API keys are absent', async () => {
		vi.stubEnv('OPENAI_API_KEY', '')
		vi.stubEnv('GEMINI_API_KEY', '')
		vi.stubEnv('GOOGLE_AI_API_KEY', '')
		vi.stubEnv('ANTHROPIC_API_KEY', '')

		const result = await runLlmVisibilityScan({ brand: 'MIN MURASU', domain: 'minmurasu.digital' })
		expect(result.configuredCount).toBe(0)
		expect(result.mentionedCount).toBe(0)
		expect(result.results).toHaveLength(3)
		expect(result.results.every((r) => r.status === 'not_configured')).toBe(true)
	})
})
