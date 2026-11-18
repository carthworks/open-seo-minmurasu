import { afterEach, describe, expect, it, vi } from 'vitest'
import {
	buildAiPrompts,
	buildAuditContext,
	buildKeywordAuditContext,
	listLocalAiModels,
	normalizeLocalAiBaseUrl,
	streamLocalAiCompletion
} from '@server/ai'
import type { WebsiteKeywordAuditReport } from '@shared/keyword-audit'
import type { AuditReport } from '@shared/types'

describe('Local AI Integration', () => {
	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('normalizes local AI base URLs cleanly', () => {
		expect(normalizeLocalAiBaseUrl('http://127.0.0.1:11434/v1/')).toBe(
			'http://127.0.0.1:11434/v1'
		)
		expect(normalizeLocalAiBaseUrl('')).toBe('http://127.0.0.1:11434/v1')
	})

	it('builds compact audit context and all 4 AI prompt modes', () => {
		const mockReport = {
			id: 'rep-1',
			url: 'https://example.com',
			finalUrl: 'https://example.com/',
			domain: 'example.com',
			createdAt: '2026-11-16T00:00:00.000Z',
			score: 78,
			grade: 'B',
			source: 'web',
			overview: {
				title: 'Example',
				description: 'Desc',
				wordCount: 450,
				responseMs: 210,
				technologies: [{ name: 'Next.js', category: 'Framework' }]
			},
			categories: [
				{
					id: 'on-page',
					name: 'On-page SEO',
					score: 80,
					grade: 'B',
					counts: { pass: 8, warn: 1, fail: 1, info: 0 }
				}
			],
			checks: [
				{
					id: 'meta-desc',
					category: 'on-page',
					title: 'Meta description length',
					status: 'fail',
					priority: 'high',
					summary: 'Meta description is missing.',
					recommendation: 'Add a 140-character meta description.'
				}
			]
		} as unknown as AuditReport

		const ctx = buildAuditContext(mockReport)
		expect(ctx).toContain('example.com')
		expect(ctx).toContain('78/100')
		expect(ctx).toContain('Meta description length')

		for (const mode of ['performance', 'roadmap', 'vibecode', 'strategy'] as const) {
			const { systemPrompt, userPrompt } = buildAiPrompts(mode, ctx, 'nextjs', 'MIN MURASU')
			expect(systemPrompt.length).toBeGreaterThan(20)
			expect(userPrompt).toContain('example.com')
		}
	})

	it('builds compact keyword audit context', () => {
		const mockKeywordAudit = {
			id: 'ka-1',
			url: 'https://example.com',
			domain: 'example.com',
			createdAt: '2026-11-16T00:00:00.000Z',
			pagesCrawled: 5,
			totalPagesDiscovered: 12,
			durationMs: 1200,
			overallScore: 74,
			overallGrade: 'C',
			sitemapFound: true,
			robotsTxtFound: true,
			localSeo: {
				hasLocalBusinessSchema: false,
				locationsDetected: ['Chennai'],
				hasClickablePhone: true,
				hasAddress: true,
				hasMapEmbed: false
			},
			categories: [
				{
					id: 'keywords',
					name: 'SEO Keywords',
					score: 80,
					grade: 'B',
					summary: 'Found 10 keywords',
					findings: [],
					recommendations: []
				}
			],
			pages: [],
			keywordCandidates: [
				{
					term: 'lead generation services',
					type: 'primary',
					frequency: 6,
					density: 1.2,
					score: 85,
					intent: 'commercial',
					placement: {
						inTitle: true,
						inMetaDescription: false,
						inH1: true,
						inH2: false,
						inH3: false,
						inUrl: false,
						density: 1.2,
						occurrences: 6
					},
					pagesFound: ['https://example.com/']
				}
			],
			competitorGaps: [],
			competitors: [{ url: 'https://rival.com/', domain: 'rival.com', pagesCrawled: 3 }],
			revisedMetas: [],
			missingKeywords: ['conversion rate optimization']
		} as unknown as WebsiteKeywordAuditReport

		const ctx = buildKeywordAuditContext(mockKeywordAudit)
		expect(ctx).toContain('lead generation services')
		expect(ctx).toContain('conversion rate optimization')
		expect(ctx).toContain('Chennai')
	})

	it('lists models from /v1/models and streams SSE chat completions', async () => {
		const fetchMock = vi.fn(async (url: string) => {
			if (url.endsWith('/models')) {
				return new Response(JSON.stringify({ data: [{ id: 'qwen2.5:14b' }, { id: 'llama3:latest' }] }), {
					status: 200,
					headers: { 'content-type': 'application/json' }
				})
			}

			const encoder = new TextEncoder()
			const stream = new ReadableStream({
				start(controller) {
					controller.enqueue(
						encoder.encode('data: {"choices":[{"delta":{"content":"Hello "}}]}\n\n')
					)
					controller.enqueue(
						encoder.encode('data: {"choices":[{"delta":{"content":"Ollama!"}}]}\n\n')
					)
					controller.enqueue(encoder.encode('data: [DONE]\n\n'))
					controller.close()
				}
			})

			return new Response(stream, {
				status: 200,
				headers: { 'content-type': 'text/event-stream' }
			})
		})

		vi.stubGlobal('fetch', fetchMock)

		const models = await listLocalAiModels('http://127.0.0.1:11434/v1')
		expect(models).toEqual(['qwen2.5:14b', 'llama3:latest'])

		const tokens: string[] = []
		const full = await streamLocalAiCompletion({
			baseUrl: 'http://127.0.0.1:11434/v1',
			model: 'qwen2.5:14b',
			systemPrompt: 'sys',
			userPrompt: 'usr',
			onToken: (t) => tokens.push(t)
		})

		expect(tokens).toEqual(['Hello ', 'Ollama!'])
		expect(full).toBe('Hello Ollama!')
	})
})
