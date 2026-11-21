import { clientIp } from '@server/limits'
import { scanLlmVisibilityForVisitor } from '@server/llm-visibility'
import { jsonError } from '@server/stream'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** POST /api/llm-visibility { brand, domain?, prompt? } */
export async function POST(request: Request): Promise<Response> {
	const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
	const brand = typeof body.brand === 'string' ? body.brand.trim().slice(0, 120) : ''
	const domain = typeof body.domain === 'string' ? body.domain.trim().slice(0, 120) : undefined
	const prompt = typeof body.prompt === 'string' ? body.prompt.trim().slice(0, 500) : undefined

	const outcome = await scanLlmVisibilityForVisitor({ brand, domain, prompt }, clientIp(request))
	if ('error' in outcome) return jsonError(outcome.error, outcome.status)

	return Response.json(outcome.result)
}
