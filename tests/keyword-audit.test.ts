import { describe, expect, it } from 'vitest'
import {
	analyzeWebsiteKeywords,
	exportKeywordsToCsv,
	exportPagesToCsv,
	deleteKeywordAudit,
	getKeywordAudit,
	listKeywordAudits,
	saveKeywordAudit
} from '@server/keyword-audit'
import type { CrawlWebsiteResult, RawPageData } from '@server/keyword-audit/crawler'

describe('Website SEO & Keyword Audit Tool', () => {
	const mockPage1: RawPageData = {
		url: 'https://example.com/',
		finalUrl: 'https://example.com/',
		statusCode: 200,
		title: 'Best Digital Marketing Agency & SEO Services Company',
		description:
			'Hire top rated digital marketing agency for professional SEO services, content strategy, and online growth solutions.',
		canonical: 'https://example.com/',
		noindex: false,
		h1: ['Premier Digital Marketing Agency and SEO Services'],
		h2: ['Our Core SEO Services', 'Why Hire Our Marketing Company', 'Client Growth Reviews'],
		h3: ['Technical SEO Audits', 'Local SEO Packages', 'Content Marketing'],
		bodyText:
			'Looking for the best digital marketing agency? We offer comprehensive SEO services, local business optimization in London and Manchester, link building, and organic traffic growth. Contact our marketing team to hire dedicated specialists today and request a custom pricing quote.',
		wordCount: 380,
		internalLinks: ['https://example.com/services', 'https://example.com/contact'],
		externalLinks: ['https://google.com'],
		images: [
			{ src: '/banner.jpg', alt: 'Digital marketing agency team in London', filename: 'digital-marketing-agency-banner.jpg', isGenericFilename: false },
			{ src: '/logo.png', alt: null, filename: 'IMG_0001.png', isGenericFilename: true }
		],
		hasLocalBusinessSchema: true,
		hasPhoneLink: true,
		hasAddressKeywords: true,
		hasMapEmbed: true,
		detectedLocations: ['London', 'Manchester'],
		responseMs: 180
	}

	const mockPage2: RawPageData = {
		url: 'https://example.com/services',
		finalUrl: 'https://example.com/services',
		statusCode: 200,
		title: 'Professional SEO Services & Pricing Plans',
		description:
			'Explore transparent SEO pricing, enterprise packages, and guaranteed keyword ranking improvements for your brand.',
		canonical: 'https://example.com/services',
		noindex: false,
		h1: ['Affordable SEO Services and ROI-Driven Search Marketing'],
		h2: ['SEO Pricing Packages', 'Enterprise Search Optimization'],
		h3: ['Keyword Research', 'Technical Fixing'],
		bodyText:
			'Our SEO services help e-commerce stores and B2B enterprises rank higher on Google search results. Compare our monthly pricing plans, order an audit, and buy custom optimization packages designed for maximum conversions.',
		wordCount: 420,
		internalLinks: ['https://example.com/', 'https://example.com/contact'],
		externalLinks: [],
		images: [
			{ src: '/chart.webp', alt: 'Keyword ranking improvement chart', filename: 'seo-rank-chart.webp', isGenericFilename: false }
		],
		hasLocalBusinessSchema: false,
		hasPhoneLink: true,
		hasAddressKeywords: false,
		hasMapEmbed: false,
		detectedLocations: [],
		responseMs: 140
	}

	const mockCrawlResult: CrawlWebsiteResult = {
		startUrl: 'https://example.com/',
		domain: 'example.com',
		pages: [mockPage1, mockPage2],
		totalDiscovered: 4,
		sitemapFound: true,
		sitemapUrl: 'https://example.com/sitemap.xml',
		robotsFound: true,
		robotsUrl: 'https://example.com/robots.txt'
	}

	it('extracts and scores all 10 required audit categories', () => {
		const report = analyzeWebsiteKeywords(mockCrawlResult, 1500)

		expect(report.domain).toBe('example.com')
		expect(report.pagesCrawled).toBe(2)
		expect(report.totalPagesDiscovered).toBe(4)
		expect(report.categories).toHaveLength(10)

		const categoryIds = report.categories.map((c) => c.id)
		expect(categoryIds).toContain('overview')
		expect(categoryIds).toContain('keywords')
		expect(categoryIds).toContain('meta')
		expect(categoryIds).toContain('headings')
		expect(categoryIds).toContain('content')
		expect(categoryIds).toContain('technical')
		expect(categoryIds).toContain('images')
		expect(categoryIds).toContain('local')
		expect(categoryIds).toContain('competitor')
		expect(categoryIds).toContain('recommendations')

		for (const cat of report.categories) {
			expect(cat.score).toBeGreaterThanOrEqual(0)
			expect(cat.score).toBeLessThanOrEqual(100)
			// Competitor gaps aren't graded when no competitor URLs were given
			expect(['A+', 'A', 'B', 'C', 'D', 'F', 'N/A']).toContain(cat.grade)
			expect(cat.summary.length).toBeGreaterThan(0)
			expect(cat.recommendations.length).toBeGreaterThanOrEqual(1)
		}
	})

	it('correctly discovers keyword candidates with intent and placement metadata', () => {
		const report = analyzeWebsiteKeywords(mockCrawlResult, 1200)

		expect(report.keywordCandidates.length).toBeGreaterThan(0)

		const seoServiceCandidate = report.keywordCandidates.find((k) =>
			k.term.includes('seo') || k.term.includes('marketing')
		)
		expect(seoServiceCandidate).toBeDefined()
		if (seoServiceCandidate) {
			expect(seoServiceCandidate.score).toBeGreaterThan(0)
			expect(['commercial', 'transactional', 'informational', 'navigational']).toContain(
				seoServiceCandidate.intent
			)
			expect(seoServiceCandidate.placement).toBeDefined()
			expect(typeof seoServiceCandidate.placement.density).toBe('number')
			expect(typeof seoServiceCandidate.placement.inTitle).toBe('boolean')
			expect(typeof seoServiceCandidate.placement.inH1).toBe('boolean')
		}
	})

	const competitorSite = (domain: string, bodyText: string): CrawlWebsiteResult => ({
		startUrl: `https://${domain}/`,
		domain,
		pages: [
			{
				...mockPage2,
				url: `https://${domain}/`,
				finalUrl: `https://${domain}/`,
				title: '',
				description: '',
				h1: [],
				h2: [],
				h3: [],
				bodyText
			}
		],
		totalDiscovered: 1,
		sitemapFound: false,
		robotsFound: false
	})

	it('finds no competitor gaps and leaves the area unscored without competitors', () => {
		const report = analyzeWebsiteKeywords(mockCrawlResult, 1000)
		const competitor = report.categories.find((c) => c.id === 'competitor')

		expect(report.competitorGaps).toEqual([])
		expect(report.missingKeywords).toEqual([])
		expect(report.competitors).toEqual([])
		expect(competitor?.grade).toBe('N/A')
		const scored = report.categories.filter((c) => c.id !== 'competitor')
		const average = Math.round(scored.reduce((sum, c) => sum + c.score, 0) / scored.length)
		expect(report.overallScore).toBe(average)
	})

	it('lists phrases competitors use that the site never mentions', () => {
		const rival = competitorSite(
			'rival.com',
			'Wedding photography packages and wedding photography prices. Our seo services are great, seo services everywhere.'
		)
		const report = analyzeWebsiteKeywords(mockCrawlResult, 1000, [rival])
		const keywords = report.competitorGaps.map((g) => g.keyword)

		expect(keywords).toContain('wedding photography')
		// The audited site already talks about SEO services, so that isn't a gap
		expect(keywords).not.toContain('seo services')
		const gap = report.competitorGaps.find((g) => g.keyword === 'wedding photography')
		expect(gap?.competitors).toEqual(['rival.com'])
		expect(gap?.competitorBenchmark).toBe('rival.com (2×)')
		expect(report.competitors).toEqual([
			{ url: 'https://rival.com/', domain: 'rival.com', pagesCrawled: 1 }
		])
		expect(report.categories.find((c) => c.id === 'competitor')?.grade).not.toBe('N/A')
	})

	it('ranks phrases used by several competitors first, as high opportunity', () => {
		const a = competitorSite('a.com', 'Drone surveys and drone surveys. Roof repair, roof repair, roof repair.')
		const b = competitorSite('b.com', 'We do drone surveys. Drone surveys daily.')
		const report = analyzeWebsiteKeywords(mockCrawlResult, 1000, [a, b])

		expect(report.competitorGaps[0].keyword).toBe('drone surveys')
		expect(report.competitorGaps[0].opportunity).toBe('high')
		expect(report.competitorGaps.find((g) => g.keyword === 'roof repair')?.opportunity).toBe('low')
	})

	it('ignores competitors that could not be crawled', () => {
		const empty: CrawlWebsiteResult = { ...competitorSite('down.com', ''), pages: [] }
		const report = analyzeWebsiteKeywords(mockCrawlResult, 1000, [empty])

		expect(report.competitorGaps).toEqual([])
		expect(report.categories.find((c) => c.id === 'competitor')?.grade).toBe('N/A')
	})

	it('generates turnkey revised titles and meta descriptions with rationales', () => {
		const report = analyzeWebsiteKeywords(mockCrawlResult, 1000)

		expect(report.revisedMetas.length).toBe(2)
		for (const rev of report.revisedMetas) {
			expect(rev.pageUrl).toBeDefined()
			expect(rev.recommendedTitle.length).toBeGreaterThan(15)
			expect(rev.recommendedDescription.length).toBeGreaterThan(30)
			expect(rev.titleRationale.length).toBeGreaterThan(0)
			expect(rev.descriptionRationale.length).toBeGreaterThan(0)
			expect(rev.targetKeywords.length).toBeGreaterThan(0)
		}
	})

	it('evaluates local SEO signals accurately', () => {
		const report = analyzeWebsiteKeywords(mockCrawlResult, 1000)

		expect(report.localSeo.hasLocalBusinessSchema).toBe(true)
		expect(report.localSeo.hasClickablePhone).toBe(true)
		expect(report.localSeo.hasAddress).toBe(true)
		expect(report.localSeo.hasMapEmbed).toBe(true)
		expect(report.localSeo.locationsDetected).toContain('London')
		expect(report.localSeo.locationsDetected).toContain('Manchester')
	})

	it('exports CSV files for keywords and pages with valid RFC headers', () => {
		const report = analyzeWebsiteKeywords(mockCrawlResult, 1000)

		const keywordsCsv = exportKeywordsToCsv(report)
		expect(keywordsCsv).toContain('Keyword,Type,Intent,Score,Frequency,Density %')
		expect(keywordsCsv.split('\n').length).toBeGreaterThan(2)

		const pagesCsv = exportPagesToCsv(report)
		expect(pagesCsv).toContain('URL,Pathname,Status Code,Title')
		expect(pagesCsv).toContain('https://example.com/')
		expect(pagesCsv).toContain('https://example.com/services')
	})

	it('persists, lists, retrieves, and deletes keyword audit reports in store', async () => {
		const report = analyzeWebsiteKeywords(mockCrawlResult, 1000)
		report.id = `test-${Date.now()}`

		await saveKeywordAudit(report)

		const retrieved = await getKeywordAudit(report.id)
		expect(retrieved).not.toBeNull()
		expect(retrieved?.id).toBe(report.id)
		expect(retrieved?.domain).toBe('example.com')
		expect(retrieved?.categories).toHaveLength(10)

		const list = await listKeywordAudits()
		const foundInList = list.find((item) => item.id === report.id)
		expect(foundInList).toBeDefined()
		expect(foundInList?.domain).toBe('example.com')

		const deleted = await deleteKeywordAudit(report.id)
		expect(deleted).toBe(true)

		const afterDelete = await getKeywordAudit(report.id)
		expect(afterDelete).toBeNull()
	})
})
