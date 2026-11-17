import { listLocalAiModels, normalizeLocalAiBaseUrl } from '@server/ai'
import { getSettings } from '@server/store'
import type { AiStatusResponse } from '@shared/ai'

export const dynamic = 'force-dynamic'

/** GET /api/ai/status: checks local Ollama / LM Studio connectivity and lists installed models. */
export async function GET(): Promise<Response> {
	const settings = await getSettings()
	const baseUrl = normalizeLocalAiBaseUrl(settings.localAiBaseUrl)

	try {
		const models = await listLocalAiModels(baseUrl)
		const payload: AiStatusResponse = {
			ok: true,
			enabled: settings.localAiEnabled,
			baseUrl,
			selectedModel: settings.localAiModel,
			models
		}

		return Response.json(payload)
	} catch (err) {
		const payload: AiStatusResponse = {
			ok: false,
			enabled: settings.localAiEnabled,
			baseUrl,
			selectedModel: settings.localAiModel,
			models: [],
			error: err instanceof Error ? err.message : 'Unable to reach local AI server.'
		}

		return Response.json(payload)
	}
}
