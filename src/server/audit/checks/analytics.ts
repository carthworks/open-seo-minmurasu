import type { AuditContext } from '@server/audit/context'
import type { CheckResult, Detail } from '@shared/types'
import { inCategory, tableDetail } from './check'

const check = inCategory('analytics')

function installedToolsCheck(ctx: AuditContext): CheckResult {
	const base = {
		id: 'analytics-installed',
		title: 'Installed analytics & tracking tools',
		weight: 3,
		priority: 'high' as const
	}

	const { tools } = ctx.analytics
	if (tools.length === 0) {
		return check({
			...base,
			status: 'warn',
			summary: 'No analytics or tracking tools (such as Google Analytics, GTM, or Meta Pixel) were detected in the page HTML.',
			recommendation:
				'Install an analytics platform (e.g. Google Analytics 4, Plausible, or Google Tag Manager) so you can measure traffic, conversions, and SEO performance.'
		})
	}

	const activeCount = tools.filter((t) => t.status === 'active').length
	const issueCount = tools.length - activeCount
	const table: Detail = tableDetail(
		['Tool', 'Category', 'ID(s)', 'Status', 'Implementation'],
		tools.map((t) => [
			t.name,
			t.category,
			t.ids.length > 0 ? t.ids.join(', ') : '—',
			t.statusLabel,
			t.implementation
		])
	)

	if (issueCount > 0 && activeCount === 0) {
		return check({
			...base,
			status: 'warn',
			summary: `Detected ${tools.length} tracking tool(s), but all require attention or migration.`,
			recommendation:
				'Review the implementation notes below to fix missing IDs, incomplete tag setups, or deprecated scripts.',
			details: [table]
		})
	}

	return check({
		...base,
		status: 'pass',
		summary: `Detected ${tools.length} installed tracking tool(s): ${tools.map((t) => t.name).join(', ')}.`,
		details: [table]
	})
}

function googleAnalyticsAndGtmCheck(ctx: AuditContext): CheckResult {
	const base = {
		id: 'analytics-ga-gtm',
		title: 'Google Analytics & Tag Manager setup',
		weight: 2,
		priority: 'medium' as const
	}

	const { tools } = ctx.analytics
	const ga4 = tools.find((t) => t.id === 'ga4')
	const ua = tools.find((t) => t.id === 'universal-analytics')
	const gtm = tools.find((t) => t.id === 'gtm')

	if (ua) {
		return check({
			...base,
			status: 'warn',
			summary: ua.implementation,
			recommendation:
				'Remove deprecated Universal Analytics (UA-) scripts and use Google Analytics 4 (GA4) or Google Tag Manager instead.'
		})
	}

	if (!ga4 && !gtm) {
		const hasOtherAnalytics = tools.some((t) =>
			['Web Analytics', 'Privacy-First Analytics', 'Product Analytics'].includes(t.category)
		)

		return check({
			...base,
			status: 'info',
			summary: hasOtherAnalytics
				? 'Google Analytics / GTM not detected; another analytics platform is installed.'
				: 'Neither Google Analytics 4 nor Google Tag Manager was detected.'
		})
	}

	const warnings = [ga4, gtm].filter((t) => t && t.status !== 'active')
	if (warnings.length > 0) {
		const gtmNoscriptHint =
			gtm && gtm.status !== 'active' && gtm.ids[0]
				? ` Add <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${gtm.ids[0]}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript> immediately after the opening <body> tag.`
				: ''

		return check({
			...base,
			status: 'warn',
			summary: warnings.map((w) => w!.implementation).join(' '),
			recommendation:
				'Ensure GA4 has a single Measurement ID with gtag("config") and GTM includes both the <head> script and <body> <noscript> iframe.' +
				gtmNoscriptHint
		})
	}

	const parts = [ga4 && `GA4 (${ga4.ids.join(', ')})`, gtm && `GTM (${gtm.ids.join(', ')})`].filter(
		Boolean
	)

	return check({
		...base,
		status: 'pass',
		summary: `${parts.join(' and ')} configured cleanly.`
	})
}

function adPixelsCheck(ctx: AuditContext): CheckResult {
	const base = {
		id: 'analytics-ad-pixels',
		title: 'Ad & conversion pixels (Meta, Google Ads, TikTok, LinkedIn)',
		weight: 1,
		priority: 'low' as const
	}

	const pixels = ctx.analytics.tools.filter((t) => t.category === 'Ad Pixel')
	if (pixels.length === 0) {
		return check({
			...base,
			status: 'info',
			summary: 'No ad or retargeting pixels (Meta Pixel, Google Ads, TikTok, LinkedIn, Pinterest, X) were detected.'
		})
	}

	const incomplete = pixels.filter((p) => p.status !== 'active')
	if (incomplete.length > 0) {
		return check({
			...base,
			status: 'warn',
			summary: incomplete.map((p) => `${p.name}: ${p.implementation}`).join(' '),
			recommendation:
				'Verify each ad pixel includes its pixel/account ID and standard PageView initialization.'
		})
	}

	return check({
		...base,
		status: 'pass',
		summary: `Active ad pixel(s) detected: ${pixels.map((p) => `${p.name}${p.ids.length ? ` (${p.ids.join(', ')})` : ''}`).join(', ')}.`
	})
}

function consentSignalsCheck(ctx: AuditContext): CheckResult {
	const base = {
		id: 'analytics-consent',
		title: 'Consent & privacy compliance signals',
		weight: 1,
		priority: 'medium' as const
	}

	const { tools, hasConsentSignal, consentSummary } = ctx.analytics
	const needsConsent = tools.some((t) => t.category !== 'Privacy-First Analytics')

	if (!needsConsent) {
		return check({
			...base,
			status: 'pass',
			summary:
				tools.length === 0
					? 'No third-party tracking scripts requiring consent signals were detected.'
					: 'Only privacy-first analytics detected; no invasive tracking cookies identified.'
		})
	}

	if (hasConsentSignal) {
		return check({
			...base,
			status: 'pass',
			summary: consentSummary
		})
	}

	return check({
		...base,
		status: 'warn',
		summary: `${consentSummary} Third-party tracking is active without an identifiable consent banner or Consent Mode.`,
		recommendation:
			'If you serve visitors in regulated regions (GDPR/CCPA), implement a Consent Management Platform (CMP) or Google Consent Mode v2 before firing analytics/ad pixels.'
	})
}

/** Analytics & tracking checks for the page. */
export function analyticsChecks(ctx: AuditContext): CheckResult[] {
	return [
		installedToolsCheck(ctx),
		googleAnalyticsAndGtmCheck(ctx),
		adPixelsCheck(ctx),
		consentSignalsCheck(ctx)
	]
}
