export type SearchIntent =
	| 'informational'
	| 'commercial'
	| 'transactional'
	| 'navigational'

export type KeywordType = 'primary' | 'secondary' | 'long-tail'

export interface KeywordPlacement {
	inTitle: boolean
	inMetaDescription: boolean
	inH1: boolean
	inH2: boolean
	inH3: boolean
	inUrl: boolean
	density: number
	occurrences: number
}

export interface KeywordCandidate {
	term: string
	type: KeywordType
	frequency: number
	density: number
	score: number
	intent: SearchIntent
	placement: KeywordPlacement
	pagesFound: string[]
}

export type MetaStatus = 'good' | 'short' | 'long' | 'missing'

export interface PageKeywordAnalysis {
	url: string
	pathname: string
	title: string
	titleLength: number
	titleStatus: MetaStatus
	description: string
	descriptionLength: number
	descriptionStatus: MetaStatus
	canonical?: string
	isCanonicalMatching: boolean
	noindex: boolean
	statusCode: number
	h1: string[]
	h2: string[]
	h3: string[]
	wordCount: number
	readingTimeMin: number
	topics: string[]
	primaryKeyword?: string
	secondaryKeywords: string[]
	missingTargetInHeadings: boolean
	imagesTotal: number
	imagesMissingAlt: number
	imagesGenericFilename: number
	brokenLinks: number
}

export interface CompetitorGap {
	keyword: string
	category: string
	estimatedIntent: SearchIntent
	opportunity: 'high' | 'medium' | 'low'
	recommendation: string
	competitorBenchmark: string
}

export type KeywordAuditCategoryId =
	| 'overview'
	| 'keywords'
	| 'meta'
	| 'headings'
	| 'content'
	| 'technical'
	| 'images'
	| 'local'
	| 'competitor'
	| 'recommendations'

export interface AuditCategoryResult {
	id: KeywordAuditCategoryId
	name: string
	score: number
	grade: string
	summary: string
	findings: string[]
	recommendations: string[]
	metrics?: { label: string; value: string | number; tone?: 'pass' | 'warn' | 'fail' }[]
}

export interface RevisedMetaRecommendation {
	pageUrl: string
	currentTitle: string
	recommendedTitle: string
	titleRationale: string
	currentDescription: string
	recommendedDescription: string
	descriptionRationale: string
	targetKeywords: string[]
}

export interface LocalSeoSummary {
	hasLocalBusinessSchema: boolean
	locationsDetected: string[]
	hasClickablePhone: boolean
	hasAddress: boolean
	hasMapEmbed: boolean
}

export interface WebsiteKeywordAuditReport {
	id: string
	url: string
	domain: string
	createdAt: string
	pagesCrawled: number
	totalPagesDiscovered: number
	durationMs: number
	overallScore: number
	overallGrade: string
	categories: AuditCategoryResult[]
	pages: PageKeywordAnalysis[]
	keywordCandidates: KeywordCandidate[]
	competitorGaps: CompetitorGap[]
	revisedMetas: RevisedMetaRecommendation[]
	missingKeywords: string[]
	sitemapUrl?: string
	sitemapFound: boolean
	robotsTxtUrl?: string
	robotsTxtFound: boolean
	localSeo: LocalSeoSummary
}

export interface KeywordAuditSummary {
	id: string
	url: string
	domain: string
	createdAt: string
	pagesCrawled: number
	overallScore: number
	overallGrade: string
	primaryKeywordCount: number
	criticalIssuesCount: number
}
