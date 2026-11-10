import type {
	BacklinkRecord,
	LinkInventory,
	LinkIssue,
	LinkRecord,
	LinkSummary
} from '@shared/link-intelligence'
import { isGenericAnchor } from './normalize'

export interface AnalysisInput {
	scanId: string
	domain: string
	url: string
	internal: LinkRecord[]
	external: LinkRecord[]
	backlinks?: BacklinkRecord[]
	backlinkProviderConnected?: boolean
	backlinkProvider?: string
	backlinkLastUpdated?: string
	crawlPages?: { url: string; incomingCount?: number }[]
}

/**
 * Automatically inspects the inventory of discovered links and generates issues,
 * actionable recommendations, and aggregated summary statistics.
 */
export function analyzeLinkInventory(input: AnalysisInput): LinkInventory {
	const {
		scanId,
		domain,
		url,
		internal,
		external,
		backlinks = [],
		backlinkProviderConnected = false,
		backlinkProvider,
		backlinkLastUpdated
	} = input

	const issues: LinkIssue[] = []

	// 1. Broken Links (HTTP 4xx, 5xx, or confirmed broken state)
	const brokenInternal = internal.filter(
		(l) => (l.httpStatus !== null && l.httpStatus >= 400) || l.state === 'broken'
	)
	const brokenExternal = external.filter(
		(l) => (l.httpStatus !== null && l.httpStatus >= 400) || l.state === 'broken'
	)
	const totalBroken = brokenInternal.length + brokenExternal.length

	if (totalBroken > 0) {
		const sampleUrls = [...brokenInternal.map((l) => l.destinationUrl), ...brokenExternal.map((l) => l.destinationUrl)].slice(0, 5)
		issues.push({
			id: 'broken-links',
			type: 'broken',
			severity: brokenInternal.length > 0 ? 'high' : 'medium',
			title: 'Broken links detected',
			description: `Found ${brokenInternal.length} broken internal and ${brokenExternal.length} broken external links leading to 4xx/5xx dead ends.`,
			count: totalBroken,
			recommendation:
				'Update or remove broken destination links to preserve crawl budget and prevent 404 user frustration.',
			sampleUrls
		})
	}

	// 2. Redirecting Links (3xx)
	const redirectLinks = [...internal, ...external].filter(
		(l) => (l.httpStatus !== null && l.httpStatus >= 300 && l.httpStatus < 400) || l.state === 'redirect' || Boolean(l.redirectUrl)
	)
	if (redirectLinks.length > 0) {
		issues.push({
			id: 'redirecting-links',
			type: 'redirect',
			severity: 'low',
			title: 'Redirecting links',
			description: `${redirectLinks.length} links point to redirecting URLs (301/302).`,
			count: redirectLinks.length,
			recommendation:
				'Point links directly to their final destination URL to save an extra roundtrip and maximize link equity.',
			sampleUrls: redirectLinks.map((l) => l.destinationUrl).slice(0, 5)
		})
	}

	// 3. Redirect Chains
	const redirectChains = redirectLinks.filter((l) => (l.redirectChain?.length ?? 0) > 1)
	if (redirectChains.length > 0) {
		issues.push({
			id: 'redirect-chains',
			type: 'redirect-chain',
			severity: 'medium',
			title: 'Multi-hop redirect chains',
			description: `${redirectChains.length} links pass through two or more redirect hops.`,
			count: redirectChains.length,
			recommendation:
				'Update links to target the ultimate destination directly to avoid slow response latency and crawl drop-off.',
			sampleUrls: redirectChains.map((l) => l.destinationUrl).slice(0, 5)
		})
	}

	// 4. Empty Anchor Text
	const emptyAnchorLinks = [...internal, ...external].filter(
		(l) => l.linkType !== 'image' && (!l.anchorText || l.anchorText.trim().length === 0)
	)
	if (emptyAnchorLinks.length > 0) {
		issues.push({
			id: 'empty-anchor-text',
			type: 'empty-anchor',
			severity: 'medium',
			title: 'Empty link anchor text',
			description: `${emptyAnchorLinks.length} links have no readable text or accessible label.`,
			count: emptyAnchorLinks.length,
			recommendation:
				'Provide clear, meaningful anchor text or aria-label attributes so search crawlers and screen readers know where links lead.',
			sampleUrls: emptyAnchorLinks.map((l) => l.destinationUrl).slice(0, 5)
		})
	}

	// 5. Generic Anchor Text
	const genericAnchorLinks = [...internal, ...external].filter(
		(l) => l.anchorText && isGenericAnchor(l.anchorText)
	)
	if (genericAnchorLinks.length > 0) {
		issues.push({
			id: 'generic-anchor-text',
			type: 'generic-anchor',
			severity: 'low',
			title: 'Generic anchor text ("read more", "click here")',
			description: `${genericAnchorLinks.length} links use generic phrases that fail to provide topical context.`,
			count: genericAnchorLinks.length,
			recommendation:
				'Replace vague phrases like "click here" or "read more" with descriptive keywords describing the target topic.',
			sampleUrls: genericAnchorLinks.map((l) => `"${l.anchorText}" -> ${l.destinationUrl}`).slice(0, 5)
		})
	}

	// 6. Internal Nofollow Links
	const internalNofollow = internal.filter((l) => !l.isFollow)
	if (internalNofollow.length > 0) {
		issues.push({
			id: 'internal-nofollow',
			type: 'internal-nofollow',
			severity: 'low',
			title: 'Internal links marked nofollow',
			description: `${internalNofollow.length} internal links have rel="nofollow" preventing PageRank distribution.`,
			count: internalNofollow.length,
			recommendation:
				'Remove rel="nofollow" from internal links so search bots can freely discover and distribute authority across your own site.',
			sampleUrls: internalNofollow.map((l) => l.destinationUrl).slice(0, 5)
		})
	}

	// 7. Non-HTTPS Links
	const insecureLinks = [...internal, ...external].filter((l) => !l.isHttps)
	if (insecureLinks.length > 0) {
		issues.push({
			id: 'insecure-http-links',
			type: 'insecure-http',
			severity: 'medium',
			title: 'Insecure (HTTP) destination links',
			description: `${insecureLinks.length} links point to unencrypted http:// addresses.`,
			count: insecureLinks.length,
			recommendation:
				'Migrate all link targets to secure https:// protocols to avoid mixed-content warnings and browser security blocks.',
			sampleUrls: insecureLinks.map((l) => l.destinationUrl).slice(0, 5)
		})
	}

	// 8. Excessive Outgoing Links
	const totalOutgoing = internal.length + external.length
	if (totalOutgoing > 100) {
		issues.push({
			id: 'excessive-links',
			type: 'excessive-links',
			severity: totalOutgoing > 300 ? 'medium' : 'low',
			title: 'Excessive outgoing links on page',
			description: `The page contains ${totalOutgoing} outgoing links, which may dilute link equity and overwhelm users.`,
			count: totalOutgoing,
			recommendation:
				'Streamline on-page navigation and prioritize high-value contextual links over exhaustive link directories.',
			sampleUrls: [url]
		})
	}

	// 9. Orphan Pages (crawl coverage)
	if (input.crawlPages && input.crawlPages.length > 1) {
		const orphanPages = input.crawlPages.filter((p) => p.incomingCount === 0 && p.url !== url)
		if (orphanPages.length > 0) {
			issues.push({
				id: 'orphan-pages',
				type: 'orphan-page',
				severity: 'high',
				title: 'Orphan pages detected',
				description: `${orphanPages.length} pages in the crawl have zero incoming internal links.`,
				count: orphanPages.length,
				recommendation:
					'Link orphan pages from relevant parent or category pages so search engines and visitors can find them.',
				sampleUrls: orphanPages.map((p) => p.url).slice(0, 5)
			})
		}
	}

	// Compute summary statistics
	const uniqueInternal = new Set(internal.map((l) => l.normalizedDestinationUrl)).size
	const uniqueExternal = new Set(external.map((l) => l.destinationDomain)).size
	const uniqueReferring = new Set(backlinks.map((b) => b.referringDomain)).size
	const followBacklinks = backlinks.filter((b) => b.isFollow).length
	const nofollowBacklinks = backlinks.length - followBacklinks

	const summary: LinkSummary = {
		scanId,
		domain,
		url,
		totalInternal: internal.length,
		uniqueInternalDestinations: uniqueInternal,
		brokenInternal: brokenInternal.length,
		totalExternal: external.length,
		uniqueExternalDomains: uniqueExternal,
		brokenExternal: brokenExternal.length,
		totalBacklinks: backlinks.length,
		uniqueReferringDomains: uniqueReferring,
		followBacklinks,
		nofollowBacklinks,
		backlinkProviderConnected,
		backlinkProvider,
		backlinkLastUpdated,
		updatedAt: new Date().toISOString()
	}

	return {
		summary,
		internal,
		external,
		backlinks,
		issues
	}
}

