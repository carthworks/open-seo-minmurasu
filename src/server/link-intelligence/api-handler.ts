import type {
	BacklinkRecord,
	LinkFilter,
	LinkRecord,
	LinkSortField,
	PaginatedResult,
	SortOrder
} from '@shared/link-intelligence'
import { exportBacklinksCsv, exportExternalLinksCsv, exportInternalLinksCsv } from './export'
import { getLinkInventory } from './store'

export async function handleGetSummary(scanId: string): Promise<Response> {
	const inventory = await getLinkInventory(scanId)
	if (!inventory) {
		return Response.json({ error: 'Scan or report link inventory not found.' }, { status: 404 })
	}

	return Response.json({
		summary: inventory.summary,
		issues: inventory.issues
	})
}

export function filterAndSortLinks(
	records: LinkRecord[],
	params: {
		filter?: LinkFilter
		search?: string
		sort?: LinkSortField
		order?: SortOrder
		page?: number
		pageSize?: number
	}
): PaginatedResult<LinkRecord> {
	let list = [...records]

	// 1. Filter
	const filter = params.filter || 'all'
	if (filter === 'follow') {
		list = list.filter((l) => l.isFollow)
	} else if (filter === 'nofollow') {
		list = list.filter((l) => !l.isFollow)
	} else if (filter === 'broken') {
		list = list.filter(
			(l) => l.state === 'broken' || (l.httpStatus !== null && l.httpStatus >= 400)
		)
	} else if (filter === 'redirects') {
		list = list.filter(
			(l) =>
				l.state === 'redirect' ||
				(l.httpStatus !== null && l.httpStatus >= 300 && l.httpStatus < 400)
		)
	} else if (filter === 'internal') {
		list = list.filter((l) => l.isInternal)
	} else if (filter === 'external') {
		list = list.filter((l) => !l.isInternal)
	} else if (filter === 'unique-domains') {
		const seenDomains = new Set<string>()
		list = list.filter((l) => {
			if (seenDomains.has(l.destinationDomain)) return false
			seenDomains.add(l.destinationDomain)

			return true
		})
	}

	// 2. Search
	if (params.search) {
		const q = params.search.toLowerCase().trim()
		list = list.filter(
			(l) =>
				l.sourceUrl.toLowerCase().includes(q) ||
				l.destinationUrl.toLowerCase().includes(q) ||
				l.destinationDomain.toLowerCase().includes(q) ||
				l.anchorText.toLowerCase().includes(q)
		)
	}

	// 3. Sort
	const sort = params.sort || 'url'
	const order = params.order === 'desc' ? -1 : 1
	list.sort((a, b) => {
		let valA: string | number = ''
		let valB: string | number = ''

		if (sort === 'status') {
			valA = a.httpStatus ?? 0
			valB = b.httpStatus ?? 0
		} else if (sort === 'type') {
			valA = a.linkType
			valB = b.linkType
		} else if (sort === 'anchor') {
			valA = a.anchorText.toLowerCase()
			valB = b.anchorText.toLowerCase()
		} else {
			// default: destinationUrl
			valA = a.destinationUrl.toLowerCase()
			valB = b.destinationUrl.toLowerCase()
		}

		if (valA < valB) return -1 * order
		if (valA > valB) return 1 * order

		return 0
	})

	const total = list.length
	const pageSize = Math.max(1, Math.min(params.pageSize || 25, 200))
	const totalPages = Math.max(1, Math.ceil(total / pageSize))
	const page = Math.max(1, Math.min(params.page || 1, totalPages))
	const offset = (page - 1) * pageSize
	const items = list.slice(offset, offset + pageSize)

	return {
		items,
		total,
		page,
		pageSize,
		totalPages
	}
}

export function filterAndSortBacklinks(
	records: BacklinkRecord[],
	params: {
		filter?: LinkFilter
		search?: string
		sort?: LinkSortField
		order?: SortOrder
		page?: number
		pageSize?: number
	}
): PaginatedResult<BacklinkRecord> {
	let list = [...records]

	const filter = params.filter || 'all'
	if (filter === 'follow') {
		list = list.filter((b) => b.isFollow)
	} else if (filter === 'nofollow') {
		list = list.filter((b) => !b.isFollow)
	} else if (filter === 'unique-domains') {
		const seen = new Set<string>()
		list = list.filter((b) => {
			if (seen.has(b.referringDomain)) return false
			seen.add(b.referringDomain)

			return true
		})
	}

	if (params.search) {
		const q = params.search.toLowerCase().trim()
		list = list.filter(
			(b) =>
				b.referringDomain.toLowerCase().includes(q) ||
				b.referringPageUrl.toLowerCase().includes(q) ||
				b.targetPageUrl.toLowerCase().includes(q) ||
				b.anchorText.toLowerCase().includes(q)
		)
	}

	const sort = params.sort || 'url'
	const order = params.order === 'desc' ? -1 : 1
	list.sort((a, b) => {
		let valA: string = ''
		let valB: string = ''

		if (sort === 'anchor') {
			valA = a.anchorText.toLowerCase()
			valB = b.anchorText.toLowerCase()
		} else {
			valA = a.referringPageUrl.toLowerCase()
			valB = b.referringPageUrl.toLowerCase()
		}

		if (valA < valB) return -1 * order
		if (valA > valB) return 1 * order

		return 0
	})

	const total = list.length
	const pageSize = Math.max(1, Math.min(params.pageSize || 25, 200))
	const totalPages = Math.max(1, Math.ceil(total / pageSize))
	const page = Math.max(1, Math.min(params.page || 1, totalPages))
	const offset = (page - 1) * pageSize
	const items = list.slice(offset, offset + pageSize)

	return {
		items,
		total,
		page,
		pageSize,
		totalPages
	}
}

export async function handleGetLinks(
	scanId: string,
	kind: 'internal' | 'external',
	url: URL
): Promise<Response> {
	const inventory = await getLinkInventory(scanId)
	if (!inventory) {
		return Response.json({ error: 'Scan or report link inventory not found.' }, { status: 404 })
	}

	const records = kind === 'internal' ? inventory.internal : inventory.external
	const filter = (url.searchParams.get('filter') as LinkFilter) || 'all'
	const search = url.searchParams.get('search') || url.searchParams.get('q') || undefined
	const sort = (url.searchParams.get('sort') as LinkSortField) || 'url'
	const order = (url.searchParams.get('order') as SortOrder) || 'asc'
	const page = Number(url.searchParams.get('page')) || 1
	const pageSize = Number(url.searchParams.get('pageSize')) || 25

	const result = filterAndSortLinks(records, {
		filter,
		search,
		sort,
		order,
		page,
		pageSize
	})

	return Response.json(result)
}

export async function handleGetBacklinks(scanId: string, url: URL): Promise<Response> {
	const inventory = await getLinkInventory(scanId)
	if (!inventory) {
		return Response.json({ error: 'Scan or report link inventory not found.' }, { status: 404 })
	}

	const filter = (url.searchParams.get('filter') as LinkFilter) || 'all'
	const search = url.searchParams.get('search') || url.searchParams.get('q') || undefined
	const sort = (url.searchParams.get('sort') as LinkSortField) || 'url'
	const order = (url.searchParams.get('order') as SortOrder) || 'asc'
	const page = Number(url.searchParams.get('page')) || 1
	const pageSize = Number(url.searchParams.get('pageSize')) || 25

	const result = filterAndSortBacklinks(inventory.backlinks, {
		filter,
		search,
		sort,
		order,
		page,
		pageSize
	})

	return Response.json({
		...result,
		providerConnected: inventory.summary.backlinkProviderConnected,
		provider: inventory.summary.backlinkProvider,
		lastUpdated: inventory.summary.backlinkLastUpdated
	})
}

export async function handleGetIssues(scanId: string): Promise<Response> {
	const inventory = await getLinkInventory(scanId)
	if (!inventory) {
		return Response.json({ error: 'Scan or report link inventory not found.' }, { status: 404 })
	}

	return Response.json({ issues: inventory.issues })
}

export async function handleExport(scanId: string, url: URL): Promise<Response> {
	const inventory = await getLinkInventory(scanId)
	if (!inventory) {
		return Response.json({ error: 'Scan or report link inventory not found.' }, { status: 404 })
	}

	const type = url.searchParams.get('type') || 'internal'
	const filter = (url.searchParams.get('filter') as LinkFilter) || 'all'
	const search = url.searchParams.get('search') || url.searchParams.get('q') || undefined
	const domain = inventory.summary.domain || 'website'

	if (type === 'external') {
		const filtered = filterAndSortLinks(inventory.external, {
			filter,
			search,
			page: 1,
			pageSize: 100_000
		}).items
		const csv = exportExternalLinksCsv(filtered)

		return new Response(csv, {
			headers: {
				'Content-Type': 'text/csv; charset=utf-8',
				'Content-Disposition': `attachment; filename="${domain}-external-links.csv"`
			}
		})
	}

	if (type === 'backlinks') {
		const filtered = filterAndSortBacklinks(inventory.backlinks, {
			filter,
			search,
			page: 1,
			pageSize: 100_000
		}).items
		const csv = exportBacklinksCsv(filtered)

		return new Response(csv, {
			headers: {
				'Content-Type': 'text/csv; charset=utf-8',
				'Content-Disposition': `attachment; filename="${domain}-backlinks.csv"`
			}
		})
	}

	// Default: internal links
	const filtered = filterAndSortLinks(inventory.internal, {
		filter,
		search,
		page: 1,
		pageSize: 100_000
	}).items
	const csv = exportInternalLinksCsv(filtered)

	return new Response(csv, {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="${domain}-internal-links.csv"`
		}
	})
}
