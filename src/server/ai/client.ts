export interface LocalAiChatOptions {
	baseUrl: string
	model: string
	systemPrompt: string
	userPrompt: string
	temperature?: number
	timeoutMs?: number
	onToken?: (token: string) => void
}

interface OpenAiModelsResponse {
	data?: { id?: string }[]
}

interface OpenAiStreamChunk {
	choices?: {
		delta?: { content?: string }
		message?: { content?: string }
	}[]
}

export function normalizeLocalAiBaseUrl(baseUrl: string): string {
	const cleaned = (baseUrl || 'http://127.0.0.1:11434/v1').trim().replace(/\/+$/, '')
	try {
		const parsed = new URL(cleaned)
		if (parsed.pathname === '' || parsed.pathname === '/') {
			return `${cleaned}/v1`
		}
	} catch {
		// Keep original string if URL parsing fails
	}

	return cleaned
}

/** Queries the local OpenAI-compatible /models endpoint and returns available model IDs. */
export async function listLocalAiModels(baseUrl: string, timeoutMs = 5000): Promise<string[]> {
	const root = normalizeLocalAiBaseUrl(baseUrl)
	const res = await fetch(`${root}/models`, {
		method: 'GET',
		signal: AbortSignal.timeout(timeoutMs),
		cache: 'no-store'
	})

	if (!res.ok) {
		throw new Error(`Local AI server returned HTTP ${res.status} at ${root}/models`)
	}

	const json = (await res.json()) as OpenAiModelsResponse
	const ids = (json.data ?? [])
		.map((item) => item.id?.trim())
		.filter((id): id is string => Boolean(id))

	return ids
}

/** Streams a chat completion from a local OpenAI-compatible runtime (Ollama, LM Studio, vLLM). */
export async function streamLocalAiCompletion(options: LocalAiChatOptions): Promise<string> {
	const root = normalizeLocalAiBaseUrl(options.baseUrl)
	const initialTimeoutMs = options.timeoutMs ?? 180_000
	const idleTimeoutMs = 60_000

	const controller = new AbortController()
	let timer: ReturnType<typeof setTimeout> = setTimeout(() => controller.abort(), initialTimeoutMs)

	const resetTimer = (ms: number) => {
		clearTimeout(timer)
		timer = setTimeout(() => controller.abort(), ms)
	}

	try {
		const res = await fetch(`${root}/chat/completions`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			signal: controller.signal,
			body: JSON.stringify({
				model: options.model,
				temperature: options.temperature ?? 0.3,
				max_tokens: 1400,
				stream: true,
				messages: [
					{ role: 'system', content: options.systemPrompt },
					{ role: 'user', content: options.userPrompt }
				]
			})
		})

		if (!res.ok) {
			const body = await res.text().catch(() => '')
			throw new Error(
				`Local AI error (HTTP ${res.status}): ${body.slice(0, 200) || res.statusText}`
			)
		}

		const contentType = res.headers.get('content-type') || ''
		if (!res.body || contentType.includes('application/json')) {
			const json = (await res.json()) as OpenAiStreamChunk
			const text = json.choices?.[0]?.message?.content ?? ''
			if (text) options.onToken?.(text)

			return text
		}

		const reader = res.body.getReader()
		const decoder = new TextDecoder()
		let buffer = ''
		let fullText = ''

		resetTimer(idleTimeoutMs)

		while (true) {
			const { value, done } = await reader.read()
			if (done) break

			resetTimer(idleTimeoutMs)
			buffer += decoder.decode(value, { stream: true })
			const lines = buffer.split('\n')
			buffer = lines.pop() ?? ''

			for (const rawLine of lines) {
				const line = rawLine.trim()
				if (!line || !line.startsWith('data:')) continue
				const payload = line.slice(5).trim()
				if (payload === '[DONE]') continue

				try {
					const parsed = JSON.parse(payload) as OpenAiStreamChunk
					const token = parsed.choices?.[0]?.delta?.content
					if (token) {
						fullText += token
						options.onToken?.(token)
					}
				} catch {
					// Ignore partial JSON lines
				}
			}
		}

		return fullText
	} catch (err) {
		if ((err as Error).name === 'AbortError') {
			throw new Error(
				'Local AI timed out waiting for the model. Try a smaller/faster model (like llama3:latest or qwen3:4b) in Settings, or retry now that the model is warm.'
			)
		}
		throw err
	} finally {
		clearTimeout(timer)
	}
}
