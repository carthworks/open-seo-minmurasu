import type { WebsiteKeywordAuditReport } from '@shared/keyword-audit'
import type { AuditReport } from '@shared/types'

/** Compacts a single-page AuditReport into a concise prompt-friendly summary. */
export function buildAuditContext(report: AuditReport): string {
	const failed = report.checks.filter((c) => c.status === 'fail')
	const warnings = report.checks.filter((c) => c.status === 'warn')

	const categoryLines = report.categories
		.map(
			(c) =>
				`- ${c.name}: ${c.grade} (${c.score}/100) [pass:${c.counts.pass}, warn:${c.counts.warn}, fail:${c.counts.fail}]`
		)
		.join('\n')

	const issueLines = [...failed, ...warnings]
		.slice(0, 28)
		.map(
			(c) =>
				`- [${c.status.toUpperCase()} | ${c.priority} | ${c.category}] ${c.title}: ${c.summary}${c.recommendation ? ` | Fix: ${c.recommendation}` : ''}`
		)
		.join('\n')

	const overview = report.overview
	const techList = (overview.technologies ?? []).map((t) => t.name).join(', ')

	return `## Site Audit Summary
Domain: ${report.domain}
URL: ${report.finalUrl}
Overall Grade: ${report.grade} (${report.score}/100)
Word Count: ${overview.wordCount ?? 'N/A'} | Response Time: ${overview.responseTimeMs ?? 'N/A'}ms
Detected Stack: ${techList || 'Unknown'}

### 10 Category Grades
${categoryLines}

### Failed & Warning Checks (${failed.length} failed, ${warnings.length} warnings)
${issueLines || 'No failed or warning checks.'}`
}

/** Compacts a multi-page WebsiteKeywordAuditReport into a concise prompt-friendly summary. */
export function buildKeywordAuditContext(report: WebsiteKeywordAuditReport): string {
	const categoryLines = report.categories
		.map((c) => `- ${c.name}: ${c.grade} (${c.score}%) — ${c.summary}`)
		.join('\n')

	const topKeywords = report.keywordCandidates
		.slice(0, 15)
		.map(
			(k) =>
				`- "${k.term}" (${k.type}, ${k.intent}, score:${k.score}, density:${k.density}%, title:${k.placement.inTitle}, h1:${k.placement.inH1})`
		)
		.join('\n')

	// Older reports' gaps came from a fixed keyword list, not real competitors, so leave them out
	const gaps = (report.competitors ? report.competitorGaps : [])
		.slice(0, 8)
		.map(
			(g) =>
				`- "${g.keyword}" [${g.opportunity.toUpperCase()} | ${g.estimatedIntent}] — ${g.recommendation}`
		)
		.join('\n')

	const revisedMetas = report.revisedMetas
		.slice(0, 6)
		.map(
			(m) =>
				`- ${m.pageUrl}\n  Title: "${m.recommendedTitle}"\n  Description: "${m.recommendedDescription}"`
		)
		.join('\n')

	return `## Website SEO & Keyword Audit Summary
Domain: ${report.domain}
URL: ${report.url}
Overall Grade: ${report.overallGrade} (${report.overallScore}/100)
Pages Crawled: ${report.pagesCrawled} (Discovered: ${report.totalPagesDiscovered})
Sitemap Found: ${report.sitemapFound} | Robots.txt Found: ${report.robotsTxtFound}
LocalBusiness Schema: ${report.localSeo.hasLocalBusinessSchema} | Clickable Phone: ${report.localSeo.hasClickablePhone} | Locations: ${report.localSeo.locationsDetected.join(', ') || 'None'}

### 10 Audit Categories
${categoryLines}

### Top Discovered Keywords
${topKeywords || 'None'}

### Missing High-Value Keywords
${(report.competitors ? report.missingKeywords : []).slice(0, 12).join(', ') || 'None'}

### Competitor Content Gaps
${gaps || 'None'}

### Sample Recommended Titles & Meta Descriptions
${revisedMetas || 'None'}`
}
