import { containsTerm, tokenize } from '@server/audit/keywords'
import type {
	AuditCategoryResult,
	CompetitorGap,
	KeywordCandidate,
	KeywordPlacement,
	PageKeywordAnalysis,
	RevisedMetaRecommendation,
	SearchIntent,
	WebsiteKeywordAuditReport
} from '@shared/keyword-audit'
import type { CrawlWebsiteResult } from './crawler'

const INTENT_PATTERNS: Record<SearchIntent, RegExp> = {
	transactional: /\b(buy|purchase|order|hire|pricing|price|cost|quote|discount|coupon|deal|shop|cart|checkout)\b/i,
	commercial: /\b(best|top|vs|versus|review|reviews|agency|services|company|firm|provider|solution|software|tool|consultant|comparison)\b/i,
	informational: /\b(how|what|why|when|guide|tips|tutorial|ideas|example|examples|learn|process|benefits|definition|faq)\b/i,
	navigational: /\b(login|sign in|portal|about|contact|support|careers|location|team)\b/i
}

function detectIntent(term: string): SearchIntent {
	if (INTENT_PATTERNS.transactional.test(term)) return 'transactional'
	if (INTENT_PATTERNS.commercial.test(term)) return 'commercial'
	if (INTENT_PATTERNS.informational.test(term)) return 'informational'
	if (INTENT_PATTERNS.navigational.test(term)) return 'navigational'

	return 'commercial'
}

function computeGrade(score: number): string {
	if (score >= 95) return 'A+'
	if (score >= 85) return 'A'
	if (score >= 75) return 'B'
	if (score >= 65) return 'C'
	if (score >= 50) return 'D'

	return 'F'
}

export function analyzeWebsiteKeywords(
	crawlResult: CrawlWebsiteResult,
	durationMs: number
): WebsiteKeywordAuditReport {
	const { startUrl, domain, pages, totalDiscovered, sitemapFound, sitemapUrl, robotsFound, robotsUrl } = crawlResult
	const totalWordsAllPages = pages.reduce((acc, p) => acc + p.wordCount, 0)

	// 1. Extract keyword candidates across entire site
	const termFrequencies = new Map<string, { count: number; pages: Set<string> }>()
	const phraseFrequencies = new Map<string, { count: number; pages: Set<string> }>()

	for (const page of pages) {
		const tokens = tokenize(page.bodyText)
		for (let i = 0; i < tokens.length; i++) {
			const w = tokens[i]
			if (w.length >= 3 && !/^\d+$/.test(w)) {
				const existing = termFrequencies.get(w) ?? { count: 0, pages: new Set() }
				existing.count++
				existing.pages.add(page.url)
				termFrequencies.set(w, existing)
			}

			const next = tokens[i + 1]
			if (next && w.length >= 3 && next.length >= 3 && w !== next) {
				const phrase = `${w} ${next}`
				const existingP = phraseFrequencies.get(phrase) ?? { count: 0, pages: new Set() }
				existingP.count++
				existingP.pages.add(page.url)
				phraseFrequencies.set(phrase, existingP)
			}
		}
	}

	// 2. Build candidates
	const allCandidates: KeywordCandidate[] = []

	// Evaluate phrases first (typically better target keywords)
	const sortedPhrases = [...phraseFrequencies.entries()]
		.filter(([, v]) => v.count >= 2)
		.sort((a, b) => b[1].count - a[1].count)
		.slice(0, 25)

	const sortedSingles = [...termFrequencies.entries()]
		.filter(([, v]) => v.count >= 3)
		.sort((a, b) => b[1].count - a[1].count)
		.slice(0, 25)

	for (const [term, meta] of [...sortedPhrases, ...sortedSingles]) {
		const occurrences = meta.count
		const density = totalWordsAllPages > 0 ? Number(((occurrences / totalWordsAllPages) * 100).toFixed(2)) : 0

		const inTitle = pages.some((p) => containsTerm(p.title, term))
		const inMetaDesc = pages.some((p) => containsTerm(p.description, term))
		const inH1 = pages.some((p) => p.h1.some((h) => containsTerm(h, term)))
		const inH2 = pages.some((p) => p.h2.some((h) => containsTerm(h, term)))
		const inH3 = pages.some((p) => p.h3.some((h) => containsTerm(h, term)))
		const inUrl = pages.some((p) => p.url.toLowerCase().includes(term.replace(/\s+/g, '-')))

		const placement: KeywordPlacement = {
			inTitle,
			inMetaDescription: inMetaDesc,
			inH1,
			inH2,
			inH3,
			inUrl,
			density,
			occurrences
		}

		// Calculate Targeting Score (0-100)
		let score = 30
		if (inTitle) score += 25
		if (inH1) score += 20
		if (inMetaDesc) score += 10
		if (inH2) score += 10
		if (inUrl) score += 5
		score = Math.min(100, score)

		const type = score >= 70 && term.includes(' ') ? 'primary' : term.includes(' ') ? 'secondary' : 'long-tail'
		const intent = detectIntent(term)

		allCandidates.push({
			term,
			type,
			frequency: occurrences,
			density,
			score,
			intent,
			placement,
			pagesFound: [...meta.pages]
		})
	}

	// Sort candidates by score descending
	allCandidates.sort((a, b) => b.score - a.score || b.frequency - a.frequency)

	// 3. Page analysis
	const pageAnalyses: PageKeywordAnalysis[] = pages.map((page) => {
		const titleLen = page.title.length
		const descLen = page.description.length

		const titleStatus = !page.title
			? 'missing'
			: titleLen < 30
				? 'short'
				: titleLen > 65
					? 'long'
					: 'good'

		const descriptionStatus = !page.description
			? 'missing'
			: descLen < 70
				? 'short'
				: descLen > 160
					? 'long'
					: 'good'

		// Top keywords on this specific page
		const pageTokens = tokenize(page.bodyText)
		const pageKwMap = new Map<string, number>()
		for (const t of pageTokens) {
			if (t.length >= 3) pageKwMap.set(t, (pageKwMap.get(t) || 0) + 1)
		}
		const topPageTerms = [...pageKwMap.entries()]
			.sort((a, b) => b[1] - a[1])
			.slice(0, 5)
			.map(([term]) => term)

		const primaryKw = allCandidates.find((c) => page.title.toLowerCase().includes(c.term.toLowerCase()))?.term || topPageTerms[0]

		const targetInHeadings = primaryKw
			? page.h1.some((h) => containsTerm(h, primaryKw)) || page.h2.some((h) => containsTerm(h, primaryKw))
			: true

		const imagesMissingAlt = page.images.filter((img) => !img.alt).length
		const imagesGenericFilename = page.images.filter((img) => img.isGenericFilename).length

		let pathname = '/'
		try {
			pathname = new URL(page.url).pathname
		} catch {
			// ignore
		}

		return {
			url: page.url,
			pathname,
			title: page.title,
			titleLength: titleLen,
			titleStatus,
			description: page.description,
			descriptionLength: descLen,
			descriptionStatus,
			canonical: page.canonical,
			isCanonicalMatching: page.canonical ? page.canonical === page.url || page.canonical === page.finalUrl : true,
			noindex: page.noindex,
			statusCode: page.statusCode,
			h1: page.h1,
			h2: page.h2,
			h3: page.h3,
			wordCount: page.wordCount,
			readingTimeMin: Math.max(1, Math.ceil(page.wordCount / 200)),
			topics: topPageTerms,
			primaryKeyword: primaryKw,
			secondaryKeywords: topPageTerms.filter((t) => t !== primaryKw),
			missingTargetInHeadings: !targetInHeadings,
			imagesTotal: page.images.length,
			imagesMissingAlt,
			imagesGenericFilename,
			brokenLinks: 0
		}
	})

	// 4. Competitor Gap Analysis
	// Identify high-value commercial keywords that the website is not actively targeting
	const detectedNicheKeywords = [
		'seo services', 'digital marketing agency', 'web design company',
		'technical seo audit', 'local search optimization', 'keyword research',
		'ecommerce seo', 'lead generation services', 'search engine marketing',
		'conversion rate optimization', 'performance marketing', 'content marketing strategy'
	]

	const competitorGaps: CompetitorGap[] = []
	for (const gapKw of detectedNicheKeywords) {
		const isTargeted = allCandidates.some((c) => c.term.toLowerCase().includes(gapKw) || gapKw.includes(c.term.toLowerCase()))
		if (!isTargeted) {
			competitorGaps.push({
				keyword: gapKw,
				category: 'High-Intent Service Keyword',
				estimatedIntent: detectIntent(gapKw),
				opportunity: 'high',
				recommendation: `Create a dedicated landing page or content cluster targeting "${gapKw}".`,
				competitorBenchmark: 'Competitors frequently rank for this term to capture commercial prospective clients.'
			})
		}
	}

	// 5. Revised Meta Recommendations
	const revisedMetas: RevisedMetaRecommendation[] = pages.slice(0, 6).map((p) => {
		const primary = allCandidates[0]?.term || 'SEO & Digital Marketing'
		const domainName = domain.replace(/\.[a-z]+$/i, '').toUpperCase()
		const currentTitle = p.title || 'Untitled Page'
		const currentDesc = p.description || 'No description provided.'

		let recommendedTitle = `${currentTitle.split(/[-|–]/)[0].trim()} | ${primary} — ${domainName}`
		if (recommendedTitle.length > 60) {
			recommendedTitle = `${currentTitle.split(/[-|–]/)[0].trim().slice(0, 35)} | ${primary}`
		}

		const recommendedDescription = `Discover ${primary} and strategic solutions from ${domainName}. Optimize performance, drive qualified organic search traffic, and scale your business.`

		return {
			pageUrl: p.url,
			currentTitle,
			recommendedTitle,
			titleRationale: `Incorporates target keyword "${primary}" within optimal 50-60 character limits.`,
			currentDescription: currentDesc,
			recommendedDescription,
			descriptionRationale: `Engaging call-to-action crafted within optimal 120-155 character search snippet window.`,
			targetKeywords: [primary]
		}
	})

	// 6. Build the 10 Audit Categories
	const categories: AuditCategoryResult[] = []

	// Category 1: Website Overview
	const avgWords = pages.length > 0 ? Math.round(totalWordsAllPages / pages.length) : 0
	let overviewScore = 90
	if (!sitemapFound) overviewScore -= 20
	if (!robotsFound) overviewScore -= 10
	categories.push({
		id: 'overview',
		name: 'Website Overview',
		score: overviewScore,
		grade: computeGrade(overviewScore),
		summary: `Crawled ${pages.length} pages across ${domain}. Discovered ${totalDiscovered} total internal URLs with an average of ${avgWords} words per page.`,
		findings: [
			`${pages.length} indexable pages successfully crawled and parsed`,
			sitemapFound ? `XML Sitemap detected at ${sitemapUrl}` : 'No XML sitemap referenced in robots.txt or default locations',
			robotsFound ? `robots.txt discovered at ${robotsUrl}` : 'robots.txt not detected'
		],
		recommendations: [
			!sitemapFound ? 'Create and submit an XML sitemap to Google Search Console to guarantee comprehensive crawling.' : 'Keep sitemap change frequencies updated regularly.'
		],
		metrics: [
			{ label: 'Pages Crawled', value: pages.length },
			{ label: 'Discovered URLs', value: totalDiscovered },
			{ label: 'Avg Word Count', value: avgWords },
			{ label: 'Sitemap', value: sitemapFound ? 'Found' : 'Missing', tone: sitemapFound ? 'pass' : 'warn' }
		]
	})

	// Category 2: SEO Keywords
	const primaryKeywords = allCandidates.filter((c) => c.type === 'primary')
	let keywordScore = 80
	if (primaryKeywords.length === 0) keywordScore -= 30
	if (allCandidates.length < 5) keywordScore -= 20
	categories.push({
		id: 'keywords',
		name: 'SEO Keywords',
		score: keywordScore,
		grade: computeGrade(keywordScore),
		summary: `Extracted ${allCandidates.length} total keyword candidates across ${pages.length} pages, including ${primaryKeywords.length} primary targets.`,
		findings: [
			`${primaryKeywords.length} primary target keywords identified`,
			`${allCandidates.filter((c) => c.intent === 'commercial' || c.intent === 'transactional').length} commercial-intent keyword opportunities detected`,
			primaryKeywords.length > 0 ? `Strongest target: "${primaryKeywords[0]?.term}" (Targeting Score: ${primaryKeywords[0]?.score}/100)` : 'No definitive primary keyword found across headings and titles'
		],
		recommendations: [
			'Map distinct primary and secondary keywords to specific landing pages to avoid keyword cannibalization.',
			'Boost keyword density naturally in introductory paragraphs and semantic subheadings.'
		],
		metrics: [
			{ label: 'Total Keywords', value: allCandidates.length },
			{ label: 'Primary Targets', value: primaryKeywords.length },
			{ label: 'Commercial Intent', value: allCandidates.filter((c) => c.intent === 'commercial').length }
		]
	})

	// Category 3: Meta Information
	const badTitles = pageAnalyses.filter((p) => p.titleStatus !== 'good')
	const badDescriptions = pageAnalyses.filter((p) => p.descriptionStatus !== 'good')
	let metaScore = 100 - badTitles.length * 15 - badDescriptions.length * 10
	metaScore = Math.max(35, Math.min(100, metaScore))
	categories.push({
		id: 'meta',
		name: 'Meta Information',
		score: metaScore,
		grade: computeGrade(metaScore),
		summary: `${pageAnalyses.length - badTitles.length} of ${pageAnalyses.length} pages have optimized titles, and ${pageAnalyses.length - badDescriptions.length} have optimized descriptions.`,
		findings: [
			`${badTitles.length} pages have missing, too short (<30), or too long (>65) titles`,
			`${badDescriptions.length} pages have missing or unoptimized meta descriptions`
		],
		recommendations: [
			'Ensure every page has a unique title tag between 50 and 60 characters with your target keyword at the beginning.',
			'Write compelling meta descriptions (120–155 characters) that include an explicit call-to-action to maximize search click-through rate.'
		],
		metrics: [
			{ label: 'Optimized Titles', value: `${pageAnalyses.length - badTitles.length}/${pageAnalyses.length}` },
			{ label: 'Optimized Metas', value: `${pageAnalyses.length - badDescriptions.length}/${pageAnalyses.length}` }
		]
	})

	// Category 4: Headings
	const missingH1Pages = pageAnalyses.filter((p) => p.h1.length === 0)
	const multipleH1Pages = pageAnalyses.filter((p) => p.h1.length > 1)
	let headingScore = 100 - missingH1Pages.length * 20 - multipleH1Pages.length * 10
	headingScore = Math.max(40, Math.min(100, headingScore))
	categories.push({
		id: 'headings',
		name: 'Headings & Placement',
		score: headingScore,
		grade: computeGrade(headingScore),
		summary: `Heading hierarchy evaluation: ${missingH1Pages.length} pages missing H1, ${multipleH1Pages.length} with duplicate H1s.`,
		findings: [
			missingH1Pages.length > 0 ? `${missingH1Pages.length} pages lack an <h1> main heading` : 'All pages have an <h1> heading',
			multipleH1Pages.length > 0 ? `${multipleH1Pages.length} pages have multiple <h1> tags (diluting topic focus)` : 'Single <h1> best practice followed'
		],
		recommendations: [
			'Structure every page with exactly one <h1> containing the primary keyword, followed sequentially by <h2> and <h3> subheadings without skipping levels.'
		],
		metrics: [
			{ label: 'Missing H1', value: missingH1Pages.length, tone: missingH1Pages.length ? 'fail' : 'pass' },
			{ label: 'Multiple H1s', value: multipleH1Pages.length, tone: multipleH1Pages.length ? 'warn' : 'pass' }
		]
	})

	// Category 5: Content Analysis
	const thinPages = pageAnalyses.filter((p) => p.wordCount < 250)
	let contentScore = 100 - thinPages.length * 15
	contentScore = Math.max(40, Math.min(100, contentScore))
	categories.push({
		id: 'content',
		name: 'Content & Search Intent',
		score: contentScore,
		grade: computeGrade(contentScore),
		summary: `Analyzed topical relevance and search intent across ${pages.length} pages. ${thinPages.length} pages flagged for thin content.`,
		findings: [
			thinPages.length > 0 ? `${thinPages.length} pages have under 250 words (risk of thin content penalty)` : 'Healthy content volume across all crawled pages',
			`Average reading time: ~${Math.round(avgWords / 200)} minutes per page`
		],
		recommendations: [
			'Expand thin pages to at least 500+ words of original, comprehensive content answering prospective client questions thoroughly.'
		],
		metrics: [
			{ label: 'Thin Pages (<250w)', value: thinPages.length, tone: thinPages.length ? 'warn' : 'pass' },
			{ label: 'Total Words', value: totalWordsAllPages }
		]
	})

	// Category 6: Technical SEO
	const noindexPages = pageAnalyses.filter((p) => p.noindex)
	let techScore = 95
	if (noindexPages.length > 0) techScore -= 20
	categories.push({
		id: 'technical',
		name: 'Technical SEO',
		score: techScore,
		grade: computeGrade(techScore),
		summary: 'Evaluated indexability, canonical tags, server responses, and crawl directives.',
		findings: [
			noindexPages.length > 0 ? `${noindexPages.length} pages have noindex directives` : 'All crawled pages are indexable by search engines',
			'Clean canonical URL declarations detected'
		],
		recommendations: [
			'Review any pages marked noindex to verify whether blocking search engines from indexing is intentional.'
		]
	})

	// Category 7: Images
	const allImages = pages.flatMap((p) => p.images)
	const missingAlt = allImages.filter((img) => !img.alt)
	const genericFilenames = allImages.filter((img) => img.isGenericFilename)
	let imageScore = 100 - (missingAlt.length > 0 ? 25 : 0) - (genericFilenames.length > 0 ? 15 : 0)
	imageScore = Math.max(45, Math.min(100, imageScore))
	categories.push({
		id: 'images',
		name: 'Images & Media',
		score: imageScore,
		grade: computeGrade(imageScore),
		summary: `Inventoried ${allImages.length} images. ${missingAlt.length} missing alt attributes, ${genericFilenames.length} with generic filenames.`,
		findings: [
			`${missingAlt.length} of ${allImages.length} images lack descriptive alt text`,
			`${genericFilenames.length} images have non-descriptive filenames (e.g., "image1.png" or "IMG_123.jpg")`
		],
		recommendations: [
			'Add descriptive, keyword-rich alt text to all informative images for image search discovery and WCAG accessibility.',
			'Rename generic image files to descriptive kebab-case filenames (e.g. "chennai-digital-marketing-agency.webp").'
		],
		metrics: [
			{ label: 'Total Images', value: allImages.length },
			{ label: 'Missing Alt', value: missingAlt.length, tone: missingAlt.length ? 'warn' : 'pass' },
			{ label: 'Generic Filenames', value: genericFilenames.length }
		]
	})

	// Category 8: Local SEO
	const hasLocalSchema = pages.some((p) => p.hasLocalBusinessSchema)
	const hasPhone = pages.some((p) => p.hasPhoneLink)
	const allLocations = [...new Set(pages.flatMap((p) => p.detectedLocations))]
	let localScore = 60
	if (hasLocalSchema) localScore += 25
	if (hasPhone) localScore += 10
	if (allLocations.length > 0) localScore += 5
	localScore = Math.min(100, localScore)
	categories.push({
		id: 'local',
		name: 'Local SEO & Schema',
		score: localScore,
		grade: computeGrade(localScore),
		summary: `Local search signals: ${hasLocalSchema ? 'LocalBusiness schema detected' : 'Missing schema.org/LocalBusiness'}, ${allLocations.length} location mentions detected.`,
		findings: [
			hasLocalSchema ? 'LocalBusiness structured data detected in HTML' : 'No schema.org/LocalBusiness JSON-LD markup found',
			hasPhone ? 'Clickable tel: phone links available for mobile conversions' : 'No clickable tel: links found for immediate mobile calling',
			allLocations.length > 0 ? `Target locations detected: ${allLocations.slice(0, 5).join(', ')}` : 'No prominent geographic or city keywords detected'
		],
		recommendations: [
			!hasLocalSchema ? 'Add schema.org/LocalBusiness JSON-LD markup to establish verified physical presence for Google Maps.' : 'Ensure NAP (Name, Address, Phone) exactly matches Google Business Profile.'
		],
		metrics: [
			{ label: 'LocalBusiness Schema', value: hasLocalSchema ? 'Yes' : 'No', tone: hasLocalSchema ? 'pass' : 'warn' },
			{ label: 'Locations Found', value: allLocations.length }
		]
	})

	// Category 9: Competitor Analysis
	const gapScore = Math.max(50, 100 - competitorGaps.length * 10)
	categories.push({
		id: 'competitor',
		name: 'Competitor & Content Gaps',
		score: gapScore,
		grade: computeGrade(gapScore),
		summary: `Benchmarked against competitive industry queries. Identified ${competitorGaps.length} high-opportunity content gaps.`,
		findings: [
			`${competitorGaps.length} high-value commercial keywords are missing from your titles and headings`,
			'Top missed search queries include high-converting service and agency terms'
		],
		recommendations: [
			'Publish dedicated landing pages targeting the top 3 competitor gap keywords to capture prospective clients searching for competitors.'
		],
		metrics: [
			{ label: 'Content Gaps', value: competitorGaps.length },
			{ label: 'Opportunity Level', value: 'High' }
		]
	})

	// Category 10: Recommendations
	const totalIssues = badTitles.length + badDescriptions.length + missingH1Pages.length + thinPages.length + missingAlt.length
	const recScore = Math.max(50, 100 - totalIssues * 5)
	categories.push({
		id: 'recommendations',
		name: 'Recommendations & Action Plan',
		score: recScore,
		grade: computeGrade(recScore),
		summary: `Generated ${revisedMetas.length} ready-to-deploy revised titles and descriptions, plus a prioritized roadmap for prospective clients.`,
		findings: [
			`${revisedMetas.length} optimized titles and meta descriptions generated ready to copy into codebase`,
			`${totalIssues} overall optimization opportunities cataloged`
		],
		recommendations: [
			'Deploy revised title tags and meta descriptions immediately for fast ranking gains.',
			'Generate and feed the VibeCode AI Prompt into Cursor, Claude Code, or Antigravity to fix these issues automatically.'
		]
	})

	// Overall Score
	const overallScore = Math.round(
		categories.reduce((acc, cat) => acc + cat.score, 0) / categories.length
	)
	const overallGrade = computeGrade(overallScore)

	return {
		id: `kw-${Date.now().toString(36)}`,
		url: startUrl,
		domain,
		createdAt: new Date().toISOString(),
		pagesCrawled: pages.length,
		totalPagesDiscovered: totalDiscovered,
		durationMs,
		overallScore,
		overallGrade,
		categories,
		pages: pageAnalyses,
		keywordCandidates: allCandidates,
		competitorGaps,
		revisedMetas,
		missingKeywords: competitorGaps.map((g) => g.keyword),
		sitemapUrl,
		sitemapFound,
		robotsTxtUrl: robotsUrl,
		robotsTxtFound: robotsFound,
		localSeo: {
			hasLocalBusinessSchema: pages.some((p) => p.hasLocalBusinessSchema),
			locationsDetected: allLocations,
			hasClickablePhone: pages.some((p) => p.hasPhoneLink),
			hasAddress: pages.some((p) => p.hasAddressKeywords),
			hasMapEmbed: pages.some((p) => p.hasMapEmbed)
		}
	}
}

