import { describe, expect, it } from 'vitest'
import {
	analyzeLinkInventory,
	exportBacklinksCsv,
	exportExternalLinksCsv,
	exportInternalLinksCsv,
	extractDomain,
	getBacklinksForDomain,
	isFollowRel,
	isGenericAnchor,
	isInternalLink,
	normalizeLinkUrl
} from '@server/link-intelligence'
import { filterAndSortBacklinks, filterAndSortLinks } from '@server/link-intelligence/api-handler'
import type { BacklinkRecord, LinkRecord } from '@shared/link-intelligence'

describe('Link Intelligence: URL Normalization & Classification', () => {
	it('classifies internal vs external links correctly', () => {
		expect(isInternalLink('https://example.com/about', 'example.com')).toBe(true)
		expect(isInternalLink('https://www.example.com/contact', 'example.com')).toBe(true)
		expect(isInternalLink('https://example.com/services', 'https://www.example.com')).toBe(true)
		expect(isInternalLink('https://google.com', 'example.com')).toBe(false)
		expect(isInternalLink('https://otherdomain.org/path', 'example.com')).toBe(false)
	})

	it('resolves relative URLs against base and strips fragments', () => {
		const base = new URL('https://example.com/blog/article')
		expect(normalizeLinkUrl('/contact', base)).toBe('https://example.com/contact')
		expect(normalizeLinkUrl('../services#pricing', base)).toBe('https://example.com/services')
		expect(normalizeLinkUrl('page?sort=asc#heading', base)).toBe('https://example.com/blog/page?sort=asc')
	})

	it('preserves meaningful query parameters and lowercases hostnames', () => {
		const base = 'https://EXAMPLE.COM/'
		const normalized = normalizeLinkUrl('/shop?category=shoes&size=10#reviews', base)
		expect(normalized).toBe('https://example.com/shop?category=shoes&size=10')
	})

	it('rejects invalid or malicious protocols', () => {
		expect(normalizeLinkUrl('javascript:alert(1)', 'https://example.com')).toBeNull()
		expect(normalizeLinkUrl('data:text/html,evil', 'https://example.com')).toBeNull()
		expect(normalizeLinkUrl('file:///etc/passwd', 'https://example.com')).toBeNull()
		expect(normalizeLinkUrl('tel:+1234567890', 'https://example.com')).toBeNull()
		expect(normalizeLinkUrl('#just-hash', 'https://example.com')).toBeNull()
	})

	it('extracts domains cleanly without www', () => {
		expect(extractDomain('https://www.example.com/page')).toBe('example.com')
		expect(extractDomain('https://sub.domain.co.uk/path')).toBe('sub.domain.co.uk')
		expect(extractDomain('invalid')).toBe('')
	})
})

describe('Link Intelligence: Anchor Text & Relation Detection', () => {
	it('detects generic anchor text accurately', () => {
		expect(isGenericAnchor('click here')).toBe(true)
		expect(isGenericAnchor('Read More')).toBe(true)
		expect(isGenericAnchor('learn more')).toBe(true)
		expect(isGenericAnchor('continue')).toBe(true)
		expect(isGenericAnchor('Professional SEO Services in Chennai')).toBe(false)
	})

	it('detects follow vs nofollow attributes', () => {
		expect(isFollowRel('')).toBe(true)
		expect(isFollowRel('noopener noreferrer')).toBe(true)
		expect(isFollowRel('nofollow')).toBe(false)
		expect(isFollowRel(['ugc', 'external'])).toBe(false)
		expect(isFollowRel('sponsored')).toBe(false)
	})
})

describe('Link Intelligence: Issue Analysis & Recommendation Engine', () => {
	it('detects broken links, redirects, and empty anchors', () => {
		const internal: LinkRecord[] = [
			{
				id: '1',
				scanId: 'scan-1',
				sourceUrl: 'https://example.com',
				destinationUrl: 'https://example.com/broken-page',
				normalizedDestinationUrl: 'https://example.com/broken-page',
				destinationDomain: 'example.com',
				anchorText: 'Broken',
				linkType: 'html',
				relAttributes: [],
				isInternal: true,
				isFollow: true,
				httpStatus: 404,
				state: 'broken',
				isHttps: true,
				discoveredAt: '2026-11-10T00:00:00Z'
			},
			{
				id: '2',
				scanId: 'scan-1',
				sourceUrl: 'https://example.com',
				destinationUrl: 'https://example.com/redirect',
				normalizedDestinationUrl: 'https://example.com/redirect',
				destinationDomain: 'example.com',
				anchorText: '',
				linkType: 'html',
				relAttributes: [],
				isInternal: true,
				isFollow: true,
				httpStatus: 301,
				state: 'redirect',
				redirectUrl: 'https://example.com/final',
				redirectChain: ['https://example.com/redirect', 'https://example.com/final'],
				isHttps: true,
				discoveredAt: '2026-11-10T00:00:00Z'
			}
		]

		const external: LinkRecord[] = [
			{
				id: '3',
				scanId: 'scan-1',
				sourceUrl: 'https://example.com',
				destinationUrl: 'http://insecure-partner.com',
				normalizedDestinationUrl: 'http://insecure-partner.com',
				destinationDomain: 'insecure-partner.com',
				anchorText: 'read more',
				linkType: 'html',
				relAttributes: ['nofollow'],
				isInternal: false,
				isFollow: false,
				httpStatus: 200,
				state: 'ok',
				isHttps: false,
				discoveredAt: '2026-11-10T00:00:00Z'
			}
		]

		const inventory = analyzeLinkInventory({
			scanId: 'scan-1',
			domain: 'example.com',
			url: 'https://example.com',
			internal,
			external
		})

		expect(inventory.summary.totalInternal).toBe(2)
		expect(inventory.summary.brokenInternal).toBe(1)
		expect(inventory.summary.totalExternal).toBe(1)

		const brokenIssue = inventory.issues.find((i) => i.type === 'broken')
		expect(brokenIssue).toBeDefined()
		expect(brokenIssue?.severity).toBe('high')

		const redirectIssue = inventory.issues.find((i) => i.type === 'redirect')
		expect(redirectIssue).toBeDefined()

		const emptyAnchorIssue = inventory.issues.find((i) => i.type === 'empty-anchor')
		expect(emptyAnchorIssue).toBeDefined()

		const genericAnchorIssue = inventory.issues.find((i) => i.type === 'generic-anchor')
		expect(genericAnchorIssue).toBeDefined()

		const insecureIssue = inventory.issues.find((i) => i.type === 'insecure-http')
		expect(insecureIssue).toBeDefined()
	})
})

describe('Link Intelligence: Backlink Provider Safety', () => {
	it('safely handles unconfigured backlink providers without crashing or faking data', async () => {
		const res = await getBacklinksForDomain('example.com')
		expect(res.connected).toBe(false)
		expect(res.backlinks).toEqual([])
	})

	it('accepts custom verified backlink imports when explicitly provided', async () => {
		const mockBacklinks: BacklinkRecord[] = [
			{
				id: 'bl-1',
				scanId: 'scan-1',
				targetDomain: 'example.com',
				targetPageUrl: 'https://example.com/seo',
				referringDomain: 'partner.org',
				referringPageUrl: 'https://partner.org/links',
				anchorText: 'Best SEO Agency',
				isFollow: true,
				firstSeen: '2026-01-01',
				lastSeen: '2026-11-01',
				fetchedAt: '2026-11-10',
				provider: 'manual'
			}
		]

		const res = await getBacklinksForDomain('example.com', undefined, mockBacklinks)
		expect(res.connected).toBe(true)
		expect(res.backlinks.length).toBe(1)
		expect(res.backlinks[0].referringDomain).toBe('partner.org')
	})
})

describe('Link Intelligence: Filtering, Sorting, and Pagination', () => {
	const sampleLinks: LinkRecord[] = [
		{
			id: 'a',
			scanId: 's',
			sourceUrl: 'https://example.com',
			destinationUrl: 'https://example.com/zebra',
			normalizedDestinationUrl: 'https://example.com/zebra',
			destinationDomain: 'example.com',
			anchorText: 'Zebra Service',
			linkType: 'html',
			relAttributes: [],
			isInternal: true,
			isFollow: true,
			httpStatus: 200,
			state: 'ok',
			isHttps: true,
			discoveredAt: '2026-11-10'
		},
		{
			id: 'b',
			scanId: 's',
			sourceUrl: 'https://example.com',
			destinationUrl: 'https://example.com/apple',
			normalizedDestinationUrl: 'https://example.com/apple',
			destinationDomain: 'example.com',
			anchorText: 'Apple Orchard',
			linkType: 'html',
			relAttributes: ['nofollow'],
			isInternal: true,
			isFollow: false,
			httpStatus: 404,
			state: 'broken',
			isHttps: true,
			discoveredAt: '2026-11-10'
		}
	]

	it('filters by broken status', () => {
		const result = filterAndSortLinks(sampleLinks, { filter: 'broken' })
		expect(result.items.length).toBe(1)
		expect(result.items[0].id).toBe('b')
	})

	it('filters by nofollow', () => {
		const result = filterAndSortLinks(sampleLinks, { filter: 'nofollow' })
		expect(result.items.length).toBe(1)
		expect(result.items[0].id).toBe('b')
	})

	it('searches by anchor text', () => {
		const result = filterAndSortLinks(sampleLinks, { search: 'zebra' })
		expect(result.items.length).toBe(1)
		expect(result.items[0].id).toBe('a')
	})

	it('sorts alphabetically by destination URL', () => {
		const result = filterAndSortLinks(sampleLinks, { sort: 'url', order: 'asc' })
		expect(result.items[0].destinationUrl).toContain('apple')
		expect(result.items[1].destinationUrl).toContain('zebra')
	})

	it('paginates results accurately', () => {
		const result = filterAndSortLinks(sampleLinks, { page: 1, pageSize: 1 })
		expect(result.items.length).toBe(1)
		expect(result.total).toBe(2)
		expect(result.totalPages).toBe(2)
	})

	it('filters and sorts backlinks correctly', () => {
		const backlinks: BacklinkRecord[] = [
			{
				id: 'bl-1',
				scanId: 's',
				targetDomain: 'example.com',
				targetPageUrl: 'https://example.com/target',
				referringDomain: 'partner.com',
				referringPageUrl: 'https://partner.com/links',
				anchorText: 'Partner Link',
				isFollow: true,
				firstSeen: '2026-01-01',
				lastSeen: '2026-11-01',
				fetchedAt: '2026-11-10',
				provider: 'gsc'
			},
			{
				id: 'bl-2',
				scanId: 's',
				targetDomain: 'example.com',
				targetPageUrl: 'https://example.com/target',
				referringDomain: 'sponsor.com',
				referringPageUrl: 'https://sponsor.com/list',
				anchorText: 'Sponsor Link',
				isFollow: false,
				firstSeen: '2026-02-01',
				lastSeen: '2026-11-02',
				fetchedAt: '2026-11-10',
				provider: 'gsc'
			}
		]

		const followOnly = filterAndSortBacklinks(backlinks, { filter: 'follow' })
		expect(followOnly.items.length).toBe(1)
		expect(followOnly.items[0].referringDomain).toBe('partner.com')

		const searched = filterAndSortBacklinks(backlinks, { search: 'sponsor' })
		expect(searched.items.length).toBe(1)
		expect(searched.items[0].referringDomain).toBe('sponsor.com')
	})
})

describe('Link Intelligence: CSV Export', () => {
	it('formats internal links into valid RFC CSV lines', () => {
		const records: LinkRecord[] = [
			{
				id: '1',
				scanId: 's',
				sourceUrl: 'https://example.com',
				destinationUrl: 'https://example.com/contact,us',
				normalizedDestinationUrl: 'https://example.com/contact,us',
				destinationDomain: 'example.com',
				anchorText: 'Contact, "Support"',
				linkType: 'html',
				relAttributes: [],
				isInternal: true,
				isFollow: true,
				httpStatus: 200,
				state: 'ok',
				isHttps: true,
				discoveredAt: '2026-11-10'
			}
		]

		const csv = exportInternalLinksCsv(records)
		expect(csv).toContain('Source Page URL,Destination URL')
		expect(csv).toContain('"Contact, ""Support"""')

		const extCsv = exportExternalLinksCsv(records)
		expect(extCsv).toContain('Destination Domain,Destination URL')
	})

	it('formats external links and backlinks into valid CSV', () => {
		const backlinks: BacklinkRecord[] = [
			{
				id: 'bl-1',
				scanId: 's',
				targetDomain: 'example.com',
				targetPageUrl: 'https://example.com',
				referringDomain: 'external.com',
				referringPageUrl: 'https://external.com/links',
				anchorText: 'Partner',
				isFollow: true,
				firstSeen: '2026-01-01',
				lastSeen: '2026-11-01',
				fetchedAt: '2026-11-10',
				provider: 'gsc'
			}
		]

		const csv = exportBacklinksCsv(backlinks)
		expect(csv).toContain('Referring Domain,Referring Page URL')
		expect(csv).toContain('"external.com"')
	})
})
