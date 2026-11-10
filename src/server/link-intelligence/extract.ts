import { randomUUID } from 'node:crypto'
import type { AuditContext } from '@server/audit/context'
import type { CrawlReport, AuditReport } from '@shared/types'
import type { LinkInventory, LinkRecord } from '@shared/link-intelligence'
import { analyzeLinkInventory } from './analyze'
import { getBacklinksForDomain } from './backlinks'
import { extractDomain, isFollowRel, isInternalLink, normalizeLinkUrl } from './normalize'

/**
 * Builds a complete LinkInventory from an in-flight AuditContext and completed AuditReport.
 */
export async function buildLinkInventoryFromAudit(
	report: AuditReport,
	ctx: AuditContext
): Promise<LinkInventory> {
	const scanId = report.id
	const domain = report.domain
	const sourceUrl = report.finalUrl || report.url
	const discoveredAt = report.createdAt

	// Map of checked link statuses
	const checkMap = new Map<string, { status: number | null; state: LinkRecord['state'] }>()
	for (const check of ctx.linkChecks || []) {
		const norm = normalizeLinkUrl(check.url, sourceUrl) || check.url
		checkMap.set(norm, {
			status: check.status,
			state: check.state === 'ok' ? 'ok' : check.state === 'blocked' ? 'blocked' : check.state === 'unreachable' ? 'unreachable' : 'broken'
		})
	}

	const seen = new Set<string>()
	const internal: LinkRecord[] = []
	const external: LinkRecord[] = []

	// 1. Regular <a> links
	for (const link of ctx.links || []) {
		const rawHref = link.href
		const normalized = normalizeLinkUrl(rawHref, sourceUrl)
		if (!normalized) continue

		const dedupeKey = `${normalized}|${link.text}|${link.rel}`
		if (seen.has(dedupeKey)) continue
		seen.add(dedupeKey)

		const isInternal = isInternalLink(normalized, domain)
		const targetDomain = extractDomain(normalized)
		const rels = link.rel ? link.rel.split(/\s+/).filter(Boolean) : []
		const isFollow = !link.nofollow && isFollowRel(rels)
		const checkInfo = checkMap.get(normalized) || checkMap.get(rawHref)

		const record: LinkRecord = {
			id: `${scanId}-${randomUUID().slice(0, 8)}`,
			scanId,
			sourceUrl,
			destinationUrl: rawHref,
			normalizedDestinationUrl: normalized,
			destinationDomain: targetDomain,
			anchorText: link.label || link.text || '',
			linkType: link.hasImage ? 'image' : 'html',
			relAttributes: rels,
			isInternal,
			isFollow,
			httpStatus: checkInfo?.status ?? 200,
			state: checkInfo?.state ?? 'ok',
			isHttps: normalized.startsWith('https://'),
			discoveredAt,
			checkedAt: checkInfo ? discoveredAt : undefined
		}

		if (isInternal) {
			internal.push(record)
		} else {
			external.push(record)
		}
	}

	// 2. Canonical Link (if present)
	const canonicalHref = ctx.$('link[rel="canonical" i]').attr('href')
	if (canonicalHref) {
		const normalized = normalizeLinkUrl(canonicalHref, sourceUrl)
		if (normalized && !seen.has(normalized)) {
			seen.add(normalized)
			const isInternal = isInternalLink(normalized, domain)
			const record: LinkRecord = {
				id: `${scanId}-canon`,
				scanId,
				sourceUrl,
				destinationUrl: canonicalHref,
				normalizedDestinationUrl: normalized,
				destinationDomain: extractDomain(normalized),
				anchorText: 'Canonical Target',
				linkType: 'canonical',
				relAttributes: ['canonical'],
				isInternal,
				isFollow: true,
				httpStatus: 200,
				state: 'ok',
				isHttps: normalized.startsWith('https://'),
				discoveredAt
			}
			if (isInternal) internal.push(record)
			else external.push(record)
		}
	}

	// 3. Fallback: if no links were discovered, preserve self as root
	if (internal.length === 0) {
		internal.push({
			id: `${scanId}-root`,
			scanId,
			sourceUrl,
			destinationUrl: sourceUrl,
			normalizedDestinationUrl: sourceUrl,
			destinationDomain: domain,
			anchorText: report.overview.title || 'Home Page',
			linkType: 'canonical',
			relAttributes: ['self'],
			isInternal: true,
			isFollow: true,
			httpStatus: report.overview.statusCode || 200,
			state: 'ok',
			isHttps: sourceUrl.startsWith('https://'),
			discoveredAt
		})
	}

	// Fetch genuine backlinks if a provider is configured
	const backlinkResult = await getBacklinksForDomain(domain, sourceUrl)

	return analyzeLinkInventory({
		scanId,
		domain,
		url: sourceUrl,
		internal,
		external,
		backlinks: backlinkResult.backlinks,
		backlinkProviderConnected: backlinkResult.connected,
		backlinkProvider: backlinkResult.providerName,
		backlinkLastUpdated: backlinkResult.lastUpdated
	})
}

/**
 * Builds a complete LinkInventory from a site-wide CrawlReport.
 */
export async function buildLinkInventoryFromCrawl(
	crawl: CrawlReport,
	rawLinks: { source: string; target: string; text?: string; rel?: string; status?: number }[]
): Promise<LinkInventory> {
	const scanId = crawl.id
	const domain = crawl.domain
	const startUrl = crawl.startUrl
	const discoveredAt = crawl.createdAt

	const seen = new Set<string>()
	const internal: LinkRecord[] = []
	const external: LinkRecord[] = []
	const incomingCounts = new Map<string, number>()

	for (const link of rawLinks) {
		const normalized = normalizeLinkUrl(link.target, link.source)
		if (!normalized) continue

		const isInternal = isInternalLink(normalized, domain)
		if (isInternal) {
			incomingCounts.set(normalized, (incomingCounts.get(normalized) || 0) + 1)
		}

		const dedupeKey = `${link.source}|${normalized}`
		if (seen.has(dedupeKey)) continue
		seen.add(dedupeKey)

		const rels = link.rel ? link.rel.split(/\s+/).filter(Boolean) : []
		const isFollow = isFollowRel(rels)
		const status = link.status ?? 200
		const state: LinkRecord['state'] =
			status >= 400 ? 'broken' : status >= 300 ? 'redirect' : 'ok'

		const record: LinkRecord = {
			id: `${scanId}-${randomUUID().slice(0, 8)}`,
			scanId,
			sourceUrl: link.source,
			destinationUrl: link.target,
			normalizedDestinationUrl: normalized,
			destinationDomain: extractDomain(normalized),
			anchorText: link.text || '',
			linkType: 'html',
			relAttributes: rels,
			isInternal,
			isFollow,
			httpStatus: status,
			state,
			isHttps: normalized.startsWith('https://'),
			discoveredAt
		}

		if (isInternal) internal.push(record)
		else external.push(record)
	}

	const crawlPages = crawl.pages.map((p) => ({
		url: p.finalUrl || p.url,
		incomingCount: incomingCounts.get(p.finalUrl || p.url) || 0
	}))

	const backlinkResult = await getBacklinksForDomain(domain, startUrl)

	return analyzeLinkInventory({
		scanId,
		domain,
		url: startUrl,
		internal,
		external,
		backlinks: backlinkResult.backlinks,
		backlinkProviderConnected: backlinkResult.connected,
		backlinkProvider: backlinkResult.providerName,
		backlinkLastUpdated: backlinkResult.lastUpdated,
		crawlPages
	})
}
