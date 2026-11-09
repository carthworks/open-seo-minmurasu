import type { AuditContext } from '@server/audit/context'
import type { CheckResult, Detail } from '@shared/types'
import { inCategory, listDetail } from './check'

const check = inCategory('trust')

function trustAuthorCheck(ctx: AuditContext): CheckResult {
	const base = {
		id: 'trust-author',
		title: 'Author & editorial transparency',
		weight: 2,
		priority: 'high' as const
	}

	const { $ } = ctx

	// 1. Meta author
	const metaAuthor =
		$('meta[name="author" i]').attr('content')?.trim() ||
		$('meta[property="article:author" i]').attr('content')?.trim() ||
		$('meta[name="twitter:creator" i]').attr('content')?.trim()

	// 2. Link rel="author"
	const relAuthor = $('a[rel*="author" i]').text().trim() || $('a[rel*="author" i]').attr('href')

	// 3. Schema Person / author
	const hasAuthorSchema = ctx.jsonLd.types.some((t) => /Person|ProfilePage/.test(t)) ||
		ctx.microdataTypes.some((t) => /Person|ProfilePage/.test(t))

	// 4. Byline CSS classes
	const bylineText = $('[itemprop="author"], .author, .byline, .entry-author, [class*="author-name" i]')
		.first()
		.text()
		.trim()

	const authorName = metaAuthor || relAuthor || bylineText

	if (authorName || hasAuthorSchema) {
		const display = authorName ? `("${authorName}")` : 'via structured data'

		return check({
			...base,
			status: 'pass',
			summary: `The page declares clear author attribution ${display} for E-E-A-T transparency.`,
			details: authorName ? [{ kind: 'code', text: authorName }] : undefined
		})
	}

	const isArticle = ctx.jsonLd.types.some((t) => /Article|BlogPosting|NewsArticle/.test(t))

	if (isArticle) {
		return check({
			...base,
			status: 'warn',
			summary: 'The page is structured as an article but has no visible author byline or author markup.',
			recommendation:
				'Add an author byline with credentials (or schema.org/author) to establish Expertise and Trustworthiness (E-E-A-T).'
		})
	}

	return check({
		...base,
		status: 'pass',
		summary: 'No specific article author required for this page type, or author credentials are not applicable.'
	})
}

function trustPoliciesCheck(ctx: AuditContext): CheckResult {
	const base = {
		id: 'trust-policies',
		title: 'Privacy policy & terms of service',
		weight: 2,
		priority: 'high' as const
	}

	const { $ } = ctx
	const links = $('a[href]')

	let hasPrivacy = false
	let hasTerms = false
	const found: string[] = []

	links.each((_, el) => {
		const href = $(el).attr('href') || ''
		const text = $(el).text().toLowerCase()
		const normHref = href.toLowerCase()

		if (!hasPrivacy && (normHref.includes('privacy') || text.includes('privacy'))) {
			hasPrivacy = true
			found.push(`Privacy Policy: ${href}`)
		}

		if (!hasTerms && (normHref.includes('terms') || normHref.includes('tos') || text.includes('terms') || text.includes('conditions'))) {
			hasTerms = true
			found.push(`Terms of Service: ${href}`)
		}
	})

	const details: Detail[] = found.length > 0 ? [listDetail(found)] : []

	if (hasPrivacy && hasTerms) {
		return check({
			...base,
			status: 'pass',
			summary: 'The site links to both its Privacy Policy and Terms of Service.',
			details
		})
	}

	if (hasPrivacy && !hasTerms) {
		return check({
			...base,
			status: 'warn',
			summary: 'Privacy policy link found, but Terms of Service or Terms & Conditions link is missing.',
			recommendation: 'Add a clear link to your Terms of Service in the footer for legal clarity and search trust.',
			details
		})
	}

	if (!hasPrivacy && hasTerms) {
		return check({
			...base,
			status: 'warn',
			summary: 'Terms of Service link found, but Privacy Policy link is missing.',
			recommendation:
				'Link a comprehensive Privacy Policy in the footer. Most search engines and privacy frameworks require it.',
			details
		})
	}

	return check({
		...base,
		status: 'fail',
		summary: 'No links to a Privacy Policy or Terms of Service were found on the page.',
		recommendation:
			'Add direct links to your Privacy Policy and Terms of Service in the footer. Search engines consider these primary baseline trust signals.'
	})
}

function trustContactAboutCheck(ctx: AuditContext): CheckResult {
	const base = {
		id: 'trust-contact-about',
		title: 'About & contact transparency',
		weight: 2,
		priority: 'high' as const
	}

	const { $ } = ctx
	const links = $('a[href]')

	let hasAbout = false
	let hasContact = false
	const found: string[] = []

	// Check direct tel or mailto links
	if ($('a[href^="tel:" i], a[href^="mailto:" i]').length > 0) {
		hasContact = true
		found.push('Direct contact link (tel: or mailto:)')
	}

	links.each((_, el) => {
		const href = $(el).attr('href') || ''
		const text = $(el).text().toLowerCase()
		const normHref = href.toLowerCase()

		if (!hasAbout && (normHref.includes('about') || text.includes('about us') || text.includes('who we are') || text.includes('our story'))) {
			hasAbout = true
			found.push(`About page: ${href}`)
		}

		if (!hasContact && (normHref.includes('contact') || text.includes('contact us') || text.includes('get in touch') || text.includes('support'))) {
			hasContact = true
			found.push(`Contact page: ${href}`)
		}
	})

	const details: Detail[] = found.length > 0 ? [listDetail(found)] : []

	if (hasAbout && hasContact) {
		return check({
			...base,
			status: 'pass',
			summary: 'The site provides accessible links to both About and Contact pages.',
			details
		})
	}

	if (hasContact && !hasAbout) {
		return check({
			...base,
			status: 'warn',
			summary: 'Contact information is present, but an About Us or Company overview link was not detected.',
			recommendation: 'Provide an About page explaining your business background, credentials, and mission.',
			details
		})
	}

	if (hasAbout && !hasContact) {
		return check({
			...base,
			status: 'warn',
			summary: 'About page is linked, but direct Contact information or a Contact page link is missing.',
			recommendation: 'Add a clear Contact page, phone number, or email link in your header or footer.',
			details
		})
	}

	return check({
		...base,
		status: 'warn',
		summary: 'No links to an About or Contact page were detected.',
		recommendation:
			'Link both an About Us page and a Contact page prominently to prove entity accountability and boost E-E-A-T.'
	})
}

function trustCopyrightCheck(ctx: AuditContext): CheckResult {
	const base = {
		id: 'trust-copyright',
		title: 'Copyright & freshness',
		weight: 1,
		priority: 'medium' as const
	}

	const pageText = ctx.$('footer, [class*="footer" i], body').text()
	const match = pageText.match(/(?:©|&copy;|copyright)\s*(?:(?:19|20)\d{2}\s*[-–—]\s*)?((?:19|20)\d{2})/i)

	if (!match) {
		return check({
			...base,
			status: 'warn',
			summary: 'No copyright notice or year was detected in the footer.',
			recommendation: 'Include an up-to-date copyright notice (e.g. "© 2026 Your Company") in the site footer.'
		})
	}

	const foundYear = parseInt(match[1], 10)
	const currentYear = new Date().getFullYear()

	if (foundYear >= currentYear - 1) {
		return check({
			...base,
			status: 'pass',
			summary: `The page features an up-to-date copyright statement (year ${foundYear}).`,
			details: [{ kind: 'code', text: match[0].trim() }]
		})
	}

	const yearsOld = currentYear - foundYear

	return check({
		...base,
		status: 'warn',
		summary: `The copyright year (${foundYear}) is ${yearsOld} years behind the current year.`,
		recommendation:
			'Update your footer copyright statement to the current year. Outdated copyright years can signal an abandoned site to crawlers.',
		details: [{ kind: 'code', text: match[0].trim() }]
	})
}

export function trustChecks(ctx: AuditContext): CheckResult[] {
	return [
		trustAuthorCheck(ctx),
		trustPoliciesCheck(ctx),
		trustContactAboutCheck(ctx),
		trustCopyrightCheck(ctx)
	]
}

