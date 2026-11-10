export type LinkType = 'html' | 'image' | 'canonical' | 'navigation' | 'other'

export type LinkState = 'ok' | 'broken' | 'redirect' | 'blocked' | 'unreachable'

export interface LinkRecord {
	id: string
	scanId: string
	sourceUrl: string
	destinationUrl: string
	normalizedDestinationUrl: string
	destinationDomain: string
	anchorText: string
	linkType: LinkType
	relAttributes: string[]
	isInternal: boolean
	isFollow: boolean
	httpStatus: number | null
	state: LinkState
	redirectUrl?: string
	redirectChain?: string[]
	isHttps: boolean
	discoveredAt: string
	checkedAt?: string
}

export type BacklinkProvider = 'gsc' | 'ahrefs' | 'semrush' | 'moz' | 'manual'

export interface BacklinkRecord {
	id: string
	scanId: string
	targetDomain: string
	targetPageUrl: string
	referringDomain: string
	referringPageUrl: string
	anchorText: string
	isFollow: boolean
	firstSeen: string
	lastSeen: string
	fetchedAt: string
	provider: BacklinkProvider
}

export type LinkIssueType =
	| 'broken'
	| 'redirect'
	| 'redirect-chain'
	| 'empty-anchor'
	| 'generic-anchor'
	| 'internal-nofollow'
	| 'insecure-http'
	| 'excessive-links'
	| 'orphan-page'
	| 'no-incoming'

export interface LinkIssue {
	id: string
	type: LinkIssueType
	severity: 'high' | 'medium' | 'low'
	title: string
	description: string
	count: number
	recommendation: string
	sampleUrls: string[]
}

export interface LinkSummary {
	scanId: string
	domain: string
	url: string
	totalInternal: number
	uniqueInternalDestinations: number
	brokenInternal: number
	totalExternal: number
	uniqueExternalDomains: number
	brokenExternal: number
	totalBacklinks: number
	uniqueReferringDomains: number
	followBacklinks: number
	nofollowBacklinks: number
	backlinkProviderConnected: boolean
	backlinkProvider?: string
	backlinkLastUpdated?: string
	updatedAt: string
}

export interface LinkInventory {
	summary: LinkSummary
	internal: LinkRecord[]
	external: LinkRecord[]
	backlinks: BacklinkRecord[]
	issues: LinkIssue[]
}

export type LinkFilter =
	| 'all'
	| 'follow'
	| 'nofollow'
	| 'broken'
	| 'redirects'
	| 'unique-domains'
	| 'internal'
	| 'external'

export type LinkSortField = 'url' | 'status' | 'type' | 'anchor'

export type SortOrder = 'asc' | 'desc'

export interface PaginatedResult<T> {
	items: T[]
	total: number
	page: number
	pageSize: number
	totalPages: number
}

/** Generic anchor texts that convey no descriptive destination context. */
export const GENERIC_ANCHOR_TEXTS = new Set([
	'click here',
	'here',
	'read more',
	'more',
	'learn more',
	'link',
	'this',
	'click',
	'go',
	'details',
	'continue',
	'website',
	'source',
	'visit'
])

