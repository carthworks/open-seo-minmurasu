import { stripWww } from '@server/audit/http'
import { resolveUrl } from '@server/audit/url'
import { GENERIC_ANCHOR_TEXTS } from '@shared/link-intelligence'

/**
 * Normalizes a URL for link intelligence:
 * - Resolves relative URLs against a base URL
 * - Strips fragments (#anchor) so links to different sections of the same page are deduplicated
 * - Normalizes host to lowercase
 * - Strips trailing slash on path (unless it is just "/")
 * - Preserves query parameters
 */
export function normalizeLinkUrl(url: string, base?: URL | string): string | null {
	if (!url) return null
	const trimmed = url.trim()
	if (!trimmed || trimmed.startsWith('#') || /^(javascript|tel|sms|data|mailto|blob):/i.test(trimmed)) {
		return null
	}

	try {
		const baseUrl = base ? (typeof base === 'string' ? new URL(base) : base) : undefined
		const resolved = baseUrl ? resolveUrl(trimmed, baseUrl) : trimmed
		if (!resolved) return null

		const u = new URL(resolved)
		if (u.protocol !== 'http:' && u.protocol !== 'https:') {
			return null
		}

		u.hash = ''
		u.hostname = u.hostname.toLowerCase()

		// Normalize pathname: remove duplicate slashes and trailing slash if not root
		if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
			u.pathname = u.pathname.slice(0, -1)
		}

		return u.href
	} catch {
		return null
	}
}

/**
 * Checks whether a destination URL belongs to the internal scope of the source website domain.
 */
export function isInternalLink(destinationUrl: string, baseDomainOrUrl: string): boolean {
	try {
		const destUrl = new URL(destinationUrl)
		let baseHost: string

		if (baseDomainOrUrl.includes('://')) {
			baseHost = new URL(baseDomainOrUrl).hostname
		} else {
			baseHost = baseDomainOrUrl.split('/')[0]
		}

		const cleanDestHost = stripWww(destUrl.hostname).toLowerCase()
		const cleanBaseHost = stripWww(baseHost).toLowerCase()

		return cleanDestHost === cleanBaseHost
	} catch {
		return false
	}
}

/**
 * Extracts the clean domain from a URL (e.g. "blog.example.com" or "example.com").
 */
export function extractDomain(url: string): string {
	try {
		const u = new URL(url)

		return stripWww(u.hostname).toLowerCase()
	} catch {
		return ''
	}
}

/**
 * Evaluates whether an anchor text is considered generic (e.g., "click here", "read more").
 */
export function isGenericAnchor(text: string): boolean {
	const clean = text.toLowerCase().replace(/\s+/g, ' ').trim()

	return GENERIC_ANCHOR_TEXTS.has(clean)
}

/**
 * Determines whether a link relation string contains follow vs nofollow.
 */
export function isFollowRel(rel: string | string[]): boolean {
	const relStr = Array.isArray(rel) ? rel.join(' ') : (rel || '')

	return !/\b(nofollow|ugc|sponsored)\b/i.test(relStr)
}
