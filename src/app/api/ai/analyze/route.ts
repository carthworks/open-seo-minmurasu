import {
	buildAiPrompts,
	buildAuditContext,
	buildKeywordAuditContext,
	streamLocalAiCompletion
} from '@server/ai'
import { getKeywordAudit } from '@server/keyword-audit'
import { getReport, getSettings } from '@server/store'
import { AI_ANALYSIS_MODES, type AiAnalysisMode } from '@shared/ai'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const VALID_MODES = new Set<AiAnalysisMode>(AI_ANALYSIS_MODES.map((m) => m.id))

/** POST /api/ai/analyze: streams local AI analysis for an audit or keyword audit report. */
export async function POST(request: Request): Promise<Response> {
	const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
	const reportId = typeof body.reportId === 'string' ? body.reportId : undefined
	const keywordAuditId = typeof body.keywordAuditId === 'string' ? body.keywordAuditId : undefined
	const mode = typeof body.mode === 'string' && VALID_MODES.has(body.mode as AiAnalysisMode)
		? (body.mode as AiAnalysisMode)
		: 'performance'

	if (!reportId && !keywordAuditId) {
		return Response.json(
			{ error: 'Provide either reportId or keywordAuditId to analyze.' },
			{ status: 400 }
		)
	}

	const settings = await getSettings()
	if (!settings.localAiEnabled) {
		return Response.json(
			{ error: 'Local AI is disabled in Settings. Enable it under Workspace → Settings.' },
			{ status: 400 }
		)
	}

	const [report, keywordAudit] = await Promise.all([
		reportId ? getReport(reportId) : Promise.resolve(null),
		keywordAuditId ? getKeywordAudit(keywordAuditId) : Promise.resolve(null)
	])

	if (!report && !keywordAudit) {
		return Response.json({ error: 'Requested audit report was not found.' }, { status: 404 })
	}

	const contextParts: string[] = []
	if (report) contextParts.push(buildAuditContext(report))
	if (keywordAudit) contextParts.push(buildKeywordAuditContext(keywordAudit))

	const { systemPrompt, userPrompt } = buildAiPrompts(
		mode,
		contextParts.join('\n\n'),
		settings.vibecodeTargetStack,
		settings.brandName || 'MIN MURASU'
	)

	const encoder = new TextEncoder()
	const stream = new ReadableStream<Uint8Array>({
		async start(controller) {
			const send = (obj: unknown) => {
				controller.enqueue(encoder.encode(`${JSON.stringify(obj)}\n`))
			}

			try {
				await streamLocalAiCompletion({
					baseUrl: settings.localAiBaseUrl,
					model: settings.localAiModel,
					systemPrompt,
					userPrompt,
					onToken: (text) => send({ type: 'token', text })
				})
				send({ type: 'done', model: settings.localAiModel })
			} catch (err) {
				send({
					type: 'error',
					message:
						err instanceof Error
							? err.message
							: 'Failed to generate response from local AI server.'
				})
			} finally {
				controller.close()
			}
		}
	})

	return new Response(stream, {
		headers: {
			'content-type': 'application/x-ndjson; charset=utf-8',
			'cache-control': 'no-cache, no-transform',
			'x-accel-buffering': 'no'
		}
	})
}
