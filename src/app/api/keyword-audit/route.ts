import { normalizeInputUrl, stripWww } from '@server/audit/http'
import { clientIp, takeRateLimit, withSlot } from '@server/limits'
import {
	analyzeWebsiteKeywords,
	crawlWebsiteForKeywords,
	listKeywordAudits,
	saveKeywordAudit
} from '@server/keyword-audit'
import type { CrawlWebsiteResult } from '@server/keyword-audit/crawler'
import { getSettings } from '@server/store'
import { jsonError, streamEvents } from '@server/stream'

/** Competitor sites one keyword audit compares against, and the pages crawled on each. */
const MAX_COMPETITORS = 3
const COMPETITOR_PAGES = 10

function hostOf(input: string): string {
	try {
		return stripWww(new URL(normalizeInputUrl(input)).host)
	} catch {
		return ''
	}
}

/** The competitor URLs from the request: up to 3, each a different site from the target. */
function readCompetitors(value: unknown, target: string): string[] {
	if (!Array.isArray(value)) return []
	const seen = new Set([hostOf(target)])
	const urls: string[] = []
	for (const item of value) {
		if (typeof item !== 'string' || !item.trim()) continue
		const host = hostOf(item)
		if (!host || seen.has(host)) continue
		seen.add(host)
		urls.push(item.trim())
		if (urls.length === MAX_COMPETITORS) break
	}

	return urls
}

export const dynamic = 'force-dynamic'
export const maxDuration = 800

/** GET /api/keyword-audit: list past keyword audits */
export async function GET(): Promise<Response> {
	const audits = await listKeywordAudits()

	return Response.json(audits)
}

/**
 * POST /api/keyword-audit { url, maxPages?, competitors? }: streams crawl and keyword audit
 * progress. `competitors` is up to 3 competitor URLs; their pages are crawled too, to find phrases
 * they use that the audited site doesn't.
 */
export async function POST(request: Request): Promise<Response> {
	const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
	const url = typeof body.url === 'string' ? body.url : ''
	const settings = await getSettings()
	const maxAllowed = Math.min(settings.crawlPageLimit || 50, 50)
	const requested = typeof body.maxPages === 'number' ? Math.min(Math.max(body.maxPages, 1), maxAllowed) : 15

	if (!url.trim()) return jsonError('Please enter a website URL to audit.', 400)
	const competitorUrls = readCompetitors(body.competitors, url)
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

		const competitorCrawls: CrawlWebsiteResult[] = []
		for (const [index, competitorUrl] of competitorUrls.entries()) {
			send({
				type: 'progress',
				step: 'competitors',
				label: `Crawling competitor ${index + 1} of ${competitorUrls.length}: ${competitorUrl}`,
				pct: 86 + index
			})
			try {
				competitorCrawls.push(
					await withSlot(() =>
						crawlWebsiteForKeywords(competitorUrl, {
							maxPages: Math.min(requested, COMPETITOR_PAGES)
						})
					)
				)
			} catch {
				// A competitor that can't be crawled is listed with 0 pages and left out of the comparison
				competitorCrawls.push({
					startUrl: competitorUrl,
					domain: hostOf(competitorUrl) || competitorUrl,
					pages: [],
					totalDiscovered: 0,
					sitemapFound: false,
					robotsFound: false
				})
			}
		}

		send({
			type: 'progress',
			step: 'analyze',
			label: 'Analyzing keywords, search intent, and 10 SEO categories...',
			pct: 90
		})

		const durationMs = Date.now() - startTime
		const report = analyzeWebsiteKeywords(crawlResult, durationMs, competitorCrawls)

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
