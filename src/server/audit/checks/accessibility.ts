import type { AuditContext } from '@server/audit/context'
import { formatCount } from '@shared/format'
import type { CheckResult, Detail } from '@shared/types'
import { inCategory, listDetail } from './check'

const check = inCategory('accessibility')

function headingHierarchyCheck(ctx: AuditContext): CheckResult {
	const base = {
		id: 'a11y-heading-order',
		title: 'Heading hierarchy',
		weight: 2,
		priority: 'medium' as const
	}

	const { $ } = ctx
	const headings = $('h1, h2, h3, h4, h5, h6')
		.map((_, el) => {
			const tag = (el.tagName || '').toLowerCase()
			const level = parseInt(tag.replace('h', ''), 10)
			const text = $(el).text().trim().slice(0, 40)

			return { level, tag, text }
		})
		.get()

	if (headings.length === 0) {
		return check({
			...base,
			status: 'warn',
			summary: 'The page has no heading tags (<h1> through <h6>).',
			recommendation: 'Use structured headings to outline your content for screen readers and search engines.'
		})
	}

	const skipped: string[] = []
	let prevLevel = 0

	for (const h of headings) {
		if (prevLevel > 0 && h.level > prevLevel + 1) {
			skipped.push(`Skipped from <${headings[prevLevel - 1]?.tag || `h${prevLevel}`}> to <${h.tag}> ("${h.text}")`)
		}
		prevLevel = h.level
	}

	const h1Count = headings.filter((h) => h.level === 1).length
	const issues: string[] = [...skipped]
	if (h1Count > 1) {
		issues.push(`Found ${h1Count} <h1> tags. A page should ideally have one primary <h1>.`)
	}

	if (issues.length > 0) {
		return check({
			...base,
			status: 'warn',
			summary: `Found ${formatCount(issues.length, 'heading structure issue')}: levels should not be skipped.`,
			recommendation:
				'Ensure headings follow a logical hierarchy (e.g. <h1> followed by <h2>, then <h3>) without jumping levels.',
			details: [listDetail(issues)]
		})
	}

	return check({
		...base,
		status: 'pass',
		summary: `Headings (${formatCount(headings.length, 'heading')}) follow a logical, unskipped hierarchy.`,
		details: [listDetail(headings.slice(0, 8).map((h) => `<${h.tag}> ${h.text}`))]
	})
}

function formLabelsCheck(ctx: AuditContext): CheckResult {
	const base = {
		id: 'a11y-form-labels',
		title: 'Form input labels',
		weight: 2,
		priority: 'high' as const
	}

	const { $ } = ctx
	const inputs = $('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"]), textarea, select').get()

	if (inputs.length === 0) {
		return check({
			...base,
			status: 'pass',
			summary: 'No interactive form inputs on this page.'
		})
	}

	const unlabeled: string[] = []

	for (const el of inputs) {
		const $el = $(el)
		const id = $el.attr('id')
		const name = $el.attr('name') || $el.attr('placeholder') || el.tagName.toLowerCase()
		const hasAriaLabel = Boolean($el.attr('aria-label') || $el.attr('aria-labelledby') || $el.attr('title'))
		const hasWrappingLabel = $el.closest('label').length > 0
		const hasExplicitLabel = id ? $(`label[for="${id}"]`).length > 0 : false

		if (!hasAriaLabel && !hasWrappingLabel && !hasExplicitLabel) {
			unlabeled.push(`<${el.tagName.toLowerCase()} name="${name}"> is missing an associated <label>`)
		}
	}

	if (unlabeled.length > 0) {
		return check({
			...base,
			status: 'fail',
			summary: `${formatCount(unlabeled.length, 'form input')} missing an accessible label.`,
			recommendation:
				'Every form field must have an associated <label for="...">, wrapping <label>, or aria-label so assistive technology can announce it.',
			details: [listDetail(unlabeled)]
		})
	}

	return check({
		...base,
		status: 'pass',
		summary: `All ${formatCount(inputs.length, 'form input')} have accessible labels.`
	})
}

function accessibleControlsCheck(ctx: AuditContext): CheckResult {
	const base = {
		id: 'a11y-controls',
		title: 'Button and link names',
		weight: 2,
		priority: 'medium' as const
	}

	const { $ } = ctx
	const unnamed: string[] = []

	$('button').each((_, el) => {
		const $el = $(el)
		const text = $el.text().trim()
		const aria = $el.attr('aria-label') || $el.attr('aria-labelledby') || $el.attr('title')
		const hasImageAlt = $el.find('img[alt]').length > 0
		if (!text && !aria && !hasImageAlt) {
			unnamed.push('<button> without text or aria-label')
		}
	})

	$('a').each((_, el) => {
		const $el = $(el)
		const text = $el.text().trim()
		const aria = $el.attr('aria-label') || $el.attr('aria-labelledby') || $el.attr('title')
		const hasImageAlt = $el.find('img[alt]').length > 0
		const href = $el.attr('href') || ''
		if (!text && !aria && !hasImageAlt && href && href !== '#') {
			unnamed.push(`<a href="${href.slice(0, 30)}"> without text or aria-label`)
		}
	})

	if (unnamed.length > 0) {
		return check({
			...base,
			status: 'warn',
			summary: `${formatCount(unnamed.length, 'interactive element')} missing an accessible name.`,
			recommendation:
				'Screen readers cannot describe icon-only buttons or empty links. Add text, an aria-label, or image alt text.',
			details: [listDetail(unnamed)]
		})
	}

	return check({
		...base,
		status: 'pass',
		summary: 'Buttons and links have accessible names for screen readers.'
	})
}

function landmarksCheck(ctx: AuditContext): CheckResult {
	const base = {
		id: 'a11y-landmarks',
		title: 'Semantic landmark regions',
		weight: 1,
		priority: 'low' as const
	}

	const { $ } = ctx
	const hasMain = $('main, [role="main"]').length > 0
	const hasNav = $('nav, [role="navigation"]').length > 0
	const hasHeader = $('header, [role="banner"]').length > 0
	const hasFooter = $('footer, [role="contentinfo"]').length > 0

	const found: string[] = []
	if (hasMain) found.push('<main> landmark')
	if (hasNav) found.push('<nav> landmark')
	if (hasHeader) found.push('<header> landmark')
	if (hasFooter) found.push('<footer> landmark')

	const details: Detail[] = found.length ? [listDetail(found)] : []

	if (!hasMain) {
		return check({
			...base,
			status: 'warn',
			summary: 'The page lacks a <main> landmark region.',
			recommendation:
				'Wrap your primary content in a <main> tag (or role="main") so assistive tech users can bypass navigation and jump straight to the content.',
			details
		})
	}

	return check({
		...base,
		status: 'pass',
		summary: `The page uses semantic HTML5 landmarks (${found.join(', ')}).`,
		details
	})
}

/** Runs every Accessibility (WCAG) check on the page. */
export function accessibilityChecks(ctx: AuditContext): CheckResult[] {
	return [
		headingHierarchyCheck(ctx),
		formLabelsCheck(ctx),
		accessibleControlsCheck(ctx),
		landmarksCheck(ctx)
	]
}

