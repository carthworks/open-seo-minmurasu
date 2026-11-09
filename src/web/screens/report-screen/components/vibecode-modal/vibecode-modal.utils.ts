import type { AuditReport, Detail } from '@shared/types'

function formatDetails(details?: Detail[]): string {
	if (!details || details.length === 0) return ''

	const lines: string[] = []
	for (const d of details) {
		if (d.kind === 'code') {
			lines.push(`Code: ${d.text}`)
		} else if (d.kind === 'list') {
			lines.push(`Items: ${d.items.slice(0, 5).join(', ')}${d.items.length > 5 ? ` (+${d.items.length - 5} more)` : ''}`)
		} else if (d.kind === 'tags') {
			lines.push(`Tags: ${d.items.map((t) => t.label).join(', ')}`)
		} else if (d.kind === 'kv') {
			lines.push(d.items.map(([k, v]) => `${k}: ${v}`).join(' | '))
		}
	}

	return lines.join('; ')
}

export function generateVibecodePrompt(report: AuditReport): string {
	const failed = report.checks.filter((c) => c.status === 'fail')
	const warnings = report.checks.filter((c) => c.status === 'warn')

	const failedSection =
		failed.length > 0
			? failed
					.map(
						(c, i) =>
							`[${i + 1}] Category: ${c.category.toUpperCase()} | Check: ${c.title}
• Status: FAILED (Weight: ${c.weight}, Priority: ${c.priority.toUpperCase()})
• Problem: ${c.summary}
• Recommendation: ${c.recommendation || 'Implement required fix.'}${
								c.details && c.details.length > 0 ? `\n• Details: ${formatDetails(c.details)}` : ''
							}`
					)
					.join('\n\n')
			: 'No failed checks. All critical checks passed!'

	const warningsSection =
		warnings.length > 0
			? warnings
					.map(
						(c, i) =>
							`[${i + 1}] Category: ${c.category.toUpperCase()} | Check: ${c.title}
• Status: WARNING (Priority: ${c.priority.toUpperCase()})
• Problem: ${c.summary}
• Recommendation: ${c.recommendation || 'Improve according to best practices.'}${
								c.details && c.details.length > 0 ? `\n• Details: ${formatDetails(c.details)}` : ''
							}`
					)
					.join('\n\n')
			: 'No warnings found. Optimization is in excellent shape!'

	return `# TASK: Fix All Technical SEO & Accessibility Issues
Target Website: ${report.finalUrl}
Current Audit Score: ${report.score}/100 (${report.grade})
Audited by OpenSEO · MIN MURASU across 10 areas (81 automated checks).

You are an expert full-stack developer and technical SEO specialist ("Vibecoding" mode).
Inspect the project files in this repository and apply targeted, high-quality code edits to fix all the following issues so the site achieves an A+ (100/100) audit score.

================================================================================
1. CRITICAL & HIGH PRIORITY FAILURES (${failed.length} issues)
================================================================================
${failedSection}

================================================================================
2. WARNINGS & IMPROVEMENT OPPORTUNITIES (${warnings.length} issues)
================================================================================
${warningsSection}

================================================================================
3. EXECUTION CHECKLIST FOR CODEBASE FIXES
================================================================================
- [ ] 1. Metadata: Ensure <title> is 50-60 chars, <meta name="description"> is 120-160 chars, and canonical link <link rel="canonical"> is set.
- [ ] 2. Headings: Exactly one <h1>, followed by logical <h2>-<h6> without skipping levels.
- [ ] 3. Images: Add descriptive alt attributes, explicit width and height, and modern formats (WebP/AVIF).
- [ ] 4. Performance: Eliminate render-blocking resources, defer non-critical scripts, and enable lazy loading.
- [ ] 5. Schema: Inject valid schema.org JSON-LD (<script type="application/ld+json">) for Organization/LocalBusiness.
- [ ] 6. AI Search: Configure /llms.txt and update robots.txt to allow GPTBot, ClaudeBot, and PerplexityBot.
- [ ] 7. Accessibility: Associate all <input> controls with <label> tags, add accessible text to all buttons/links, and use semantic landmarks (<header>, <nav>, <main>, <footer>).
- [ ] 8. Trust & Policies: Ensure footer links to /privacy-policy, /terms-of-service, /about, and /contact with up-to-date copyright.

Please provide concise, drop-in code diffs for all modified files.
`
}

