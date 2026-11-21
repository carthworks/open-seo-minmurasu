import { takeRateLimit, withSlot } from '@server/limits'
import type { LlmProviderId, LlmProviderResult, LlmVisibilityResult } from '@shared/types'

const POSITIVE_WORDS = /\b(recommended|leading|trusted|reputable|top|best|popular|established|well-known|reliable|innovative)\b/i
const NEGATIVE_WORDS = /\b(scam|fraud|avoid|unreliable|complaints|warning|suspicious|poor)\b/i

function cleanDomain(input: string): string {
	return input
		.trim()
		.replace(/^https?:\/\//i, '')
		.replace(/^www\./i, '')
		.split('/')[0]
		.toLowerCase()
}

export function analyzeLlmResponse(
	brand: string,
	domain: string,
	text: string
): Pick<LlmProviderResult, 'mentionedBrand' | 'mentionedDomain' | 'sentiment' | 'status' | 'statusLabel' | 'excerpt'> {
	const lower = text.toLowerCase()
	const brandNeedle = brand.trim().toLowerCase()
	const domainNeedle = cleanDomain(domain)

	const mentionedBrand = Boolean(brandNeedle && lower.includes(brandNeedle))
	const mentionedDomain = Boolean(domainNeedle && lower.includes(domainNeedle))
	const mentioned = mentionedBrand || mentionedDomain

	let sentiment: LlmProviderResult['sentiment'] = 'neutral'
	if (!mentioned) sentiment = 'unknown'
	else if (NEGATIVE_WORDS.test(text)) sentiment = 'negative'
	else if (POSITIVE_WORDS.test(text)) sentiment = 'positive'

	const compact = text.replace(/\s+/g, ' ').trim()
	const excerpt = compact.length > 420 ? `${compact.slice(0, 420)}…` : compact

	return {
		mentionedBrand,
		mentionedDomain,
		sentiment,
		status: mentioned ? 'mentioned' : 'not_mentioned',
		statusLabel: mentioned ? 'Mentioned' : 'Not mentioned',
		excerpt
	}
}

function unconfiguredResult(
	provider: LlmProviderId,
	label: string,
	model: string,
	envVar: string
): LlmProviderResult {
	return {
		provider,
		label,
		model,
		status: 'not_configured',
		statusLabel: 'Key not configured',
		mentionedBrand: false,
		mentionedDomain: false,
		sentiment: 'unknown',
		excerpt: `Set ${envVar} in .env.local or Vercel Environment Variables to query live ${label} answers.`
	}
}

function errorResult(
	provider: LlmProviderId,
	label: string,
	model: string,
	message: string
): LlmProviderResult {
	return {
		provider,
		label,
		model,
		status: 'error',
		statusLabel: 'Request failed',
		mentionedBrand: false,
		mentionedDomain: false,
		sentiment: 'unknown',
		excerpt: message,
		error: message
	}
}

async function queryOpenAi(brand: string, domain: string, prompt: string): Promise<LlmProviderResult> {
	const apiKey = process.env.OPENAI_API_KEY?.trim()
	const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini'
	if (!apiKey) return unconfiguredResult('chatgpt', 'ChatGPT (OpenAI)', model, 'OPENAI_API_KEY')

	try {
		const res = await fetch('https://api.openai.com/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${apiKey}`
			},
			body: JSON.stringify({
				model,
				temperature: 0.2,
				max_tokens: 350,
				messages: [{ role: 'user', content: prompt }]
			}),
			signal: AbortSignal.timeout(20_000)
		})
		if (!res.ok) {
			return errorResult('chatgpt', 'ChatGPT (OpenAI)', model, `OpenAI HTTP ${res.status}`)
		}
		const data = (await res.json()) as {
			choices?: { message?: { content?: string } }[]
		}
		const text = data.choices?.[0]?.message?.content?.trim() || ''

		return {
			provider: 'chatgpt',
			label: 'ChatGPT (OpenAI)',
			model,
			...analyzeLlmResponse(brand, domain, text)
		}
	} catch (e) {
		return errorResult('chatgpt', 'ChatGPT (OpenAI)', model, (e as Error).message)
	}
}

async function queryGemini(brand: string, domain: string, prompt: string): Promise<LlmProviderResult> {
	const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY)?.trim()
	const model = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash'
	if (!apiKey) return unconfiguredResult('gemini', 'Google Gemini', model, 'GEMINI_API_KEY')

	try {
		const res = await fetch(
			`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					contents: [{ parts: [{ text: prompt }] }],
					generationConfig: { temperature: 0.2, maxOutputTokens: 350 }
				}),
				signal: AbortSignal.timeout(20_000)
			}
		)
		if (!res.ok) {
			return errorResult('gemini', 'Google Gemini', model, `Gemini HTTP ${res.status}`)
		}
		const data = (await res.json()) as {
			candidates?: { content?: { parts?: { text?: string }[] } }[]
		}
		const text =
			data.candidates?.[0]?.content?.parts
				?.map((p) => p.text ?? '')
				.join(' ')
				.trim() || ''

		return {
			provider: 'gemini',
			label: 'Google Gemini',
			model,
			...analyzeLlmResponse(brand, domain, text)
		}
	} catch (e) {
		return errorResult('gemini', 'Google Gemini', model, (e as Error).message)
	}
}

async function queryClaude(brand: string, domain: string, prompt: string): Promise<LlmProviderResult> {
	const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
	const model = process.env.ANTHROPIC_MODEL?.trim() || 'claude-3-5-haiku-latest'
	if (!apiKey) return unconfiguredResult('claude', 'Claude (Anthropic)', model, 'ANTHROPIC_API_KEY')

	try {
		const res = await fetch('https://api.anthropic.com/v1/messages', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': apiKey,
				'anthropic-version': '2023-06-01'
			},
			body: JSON.stringify({
				model,
				max_tokens: 350,
				messages: [{ role: 'user', content: prompt }]
			}),
			signal: AbortSignal.timeout(20_000)
		})
		if (!res.ok) {
			return errorResult('claude', 'Claude (Anthropic)', model, `Anthropic HTTP ${res.status}`)
		}
		const data = (await res.json()) as {
			content?: { type?: string; text?: string }[]
		}
		const text =
			data.content
				?.filter((c) => c.type === 'text')
				.map((c) => c.text ?? '')
				.join(' ')
				.trim() || ''

		return {
			provider: 'claude',
			label: 'Claude (Anthropic)',
			model,
			...analyzeLlmResponse(brand, domain, text)
		}
	} catch (e) {
		return errorResult('claude', 'Claude (Anthropic)', model, (e as Error).message)
	}
}

/** Queries ChatGPT, Gemini, and Claude in parallel to measure brand visibility. */
export async function runLlmVisibilityScan(input: {
	brand: string
	domain?: string
	prompt?: string
}): Promise<LlmVisibilityResult> {
	const brand = input.brand.trim()
	const domain = cleanDomain(input.domain || '')
	const prompt =
		input.prompt?.trim() ||
		`What do you know about ${brand}${domain ? ` (${domain})` : ''}? Summarize what they offer, who they serve, and whether they are a recognized brand.`

	const results = await Promise.all([
		queryOpenAi(brand, domain, prompt),
		queryGemini(brand, domain, prompt),
		queryClaude(brand, domain, prompt)
	])

	const configuredCount = results.filter((r) => r.status !== 'not_configured').length
	const mentionedCount = results.filter((r) => r.status === 'mentioned').length

	return {
		brand,
		domain,
		prompt,
		checkedAt: new Date().toISOString(),
		configuredCount,
		mentionedCount,
		results
	}
}

export type LlmVisibilityOutcome =
	| { result: LlmVisibilityResult }
	| { error: string; status: number }

export async function scanLlmVisibilityForVisitor(
	input: { brand: string; domain?: string; prompt?: string },
	ip: string
): Promise<LlmVisibilityOutcome> {
	if (!input.brand.trim()) {
		return { error: 'Enter a brand name to check LLM visibility.', status: 400 }
	}
	if (!takeRateLimit(`llm:${ip}`)) {
		return { error: "You've run a lot of LLM visibility checks. Try again in an hour.", status: 429 }
	}

	return {
		result: await withSlot(() => runLlmVisibilityScan(input))
	}
}
