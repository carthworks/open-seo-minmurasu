import { clientIp, takeRateLimit, withSlot } from '@server/limits'
import {
	analyzeWebsiteKeywords,
	crawlWebsiteForKeywords,
	listKeywordAudits,
	saveKeywordAudit
} from '@server/keyword-audit'
import { getSettings } from '@server/store'
import { jsonError, streamEvents } from '@server/stream'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/** GET /api/keyword-audit: list past keyword audits */
export async function GET(): Promise<Response> {
	const audits = await listKeywordAudits()

	return Response.json(audits)
}

/** POST /api/keyword-audit { url, maxPages? }: streams crawl and keyword audit progress */
export async function POST(request: Request): Promise<Response> {
	const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
	const url = typeof body.url === 'string' ? body.url : ''
	const settings = await getSettings()
	const maxAllowed = Math.min(settings.crawlPageLimit || 50, 50)
	const requested = typeof body.maxPages === 'number' ? Math.min(Math.max(body.maxPages, 1), maxAllowed) : 15

	if (!url.trim()) return jsonError('Please enter a website URL to audit.', 400)
	if (!takeRateLimit(`keyword-audit:${clientIp(request)}`)) {
		return jsonError('Too many audits requested. Please try again shortly.', 429)
	}

	return streamEvents(async (send) => {
		send({ type: 'progress', step: 'init', label: 'Initializing website crawler...', pct: 2 })
		const startTime = Date.now()

		const crawlResult = await withSlot(() =>
			crawlWebsiteForKeywords(url, {
				maxPages: requested,
				onProgress: (p) => send({ type: 'progress', ...p })
			})
		)

		if (crawlResult.pages.length === 0) {
			throw new Error('Could not fetch or parse any HTML pages from the target website.')
		}

		send({
			type: 'progress',
			step: 'analyze',
			label: 'Analyzing keywords, search intent, and 10 SEO categories...',
			pct: 90
		})

		const durationMs = Date.now() - startTime
		const report = analyzeWebsiteKeywords(crawlResult, durationMs)

		send({
			type: 'progress',
			step: 'save',
			label: 'Saving SEO & Keyword Audit report...',
			pct: 98
		})

		await saveKeywordAudit(report)

		send({
			type: 'done',
			id: report.id,
			score: report.overallScore,
			grade: report.overallGrade
		})
	})
}
