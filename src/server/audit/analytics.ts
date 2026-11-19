import type { AnalyticsScanPreview, AnalyticsScanResult, DetectedTrackingTool } from '@shared/types'
import type { CheerioRoot } from './context'
import { fetchPage } from './fetch-page'
import { normalizeInputUrl } from './http'
import { parsePage } from './parse'

function uniqueMatches(text: string, pattern: RegExp): string[] {
	const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`
	const re = new RegExp(pattern.source, flags)
	const found = new Set<string>()
	for (const match of text.matchAll(re)) {
		const value = match[1] ?? match[0]
		if (value) found.add(value.trim())
	}

	return [...found]
}

function detectConsentSignals(html: string): { hasConsentSignal: boolean; consentSummary: string } {
	const signals: string[] = []
	if (/gtag\s*\(\s*['"]consent['"]/i.test(html)) signals.push('Google Consent Mode')
	if (/cookiebot\.com/i.test(html)) signals.push('Cookiebot')
	if (/onetrust\.com|optanon/i.test(html)) signals.push('OneTrust')
	if (/cookieyes\.com|cky-consent/i.test(html)) signals.push('CookieYes')
	if (/complianz|cmplz-/i.test(html)) signals.push('Complianz')
	if (/osano\.com/i.test(html)) signals.push('Osano')
	if (/klaro/i.test(html)) signals.push('Klaro')
	if (/termly\.io/i.test(html)) signals.push('Termly')
	if (/trustarc\.com/i.test(html)) signals.push('TrustArc')
	if (/__tcfapi/i.test(html)) signals.push('IAB TCF')

	if (signals.length === 0) {
		return {
			hasConsentSignal: false,
			consentSummary: 'No Consent Management Platform (CMP) or Google Consent Mode signal detected in HTML.'
		}
	}

	return {
		hasConsentSignal: true,
		consentSummary: `Detected consent signal(s): ${signals.join(', ')}.`
	}
}

/** Scans parsed HTML for installed analytics, tag managers, ad pixels, and tracking tools. */
export function scanAnalytics(html: string, $: CheerioRoot): AnalyticsScanResult {
	const tools: DetectedTrackingTool[] = []
	const headHtml = $('head').html() ?? ''
	const inHead = (re: RegExp) => re.test(headHtml)

	// 1. Google Analytics 4 (GA4)
	const ga4Ids = uniqueMatches(
		html,
		/(?:googletagmanager\.com\/gtag\/js\?id=|gtag\s*\(\s*['"]config['"]\s*,\s*['"])(G-[A-Z0-9]{4,})/gi
	)
	const hasGtagScript = /googletagmanager\.com\/gtag\/js/i.test(html)
	const hasGa4Config = /gtag\s*\(\s*['"]config['"]\s*,\s*['"]G-[A-Z0-9]{4,}/i.test(html)
	if (ga4Ids.length > 0) {
		const placement = inHead(/G-[A-Z0-9]{4,}/i) ? '<head>' : '<body>'
		const multiple = ga4Ids.length > 1
		tools.push({
			id: 'ga4',
			name: 'Google Analytics 4 (GA4)',
			category: 'Web Analytics',
			status: multiple || !hasGa4Config ? 'warning' : 'active',
			statusLabel: multiple
				? 'Multiple IDs'
				: hasGa4Config
					? 'Active'
					: 'Missing config call',
			ids: ga4Ids,
			implementation: multiple
				? `Multiple GA4 Measurement IDs (${ga4Ids.join(', ')}) found in ${placement}; verify duplicate tracking is not inflating pageviews.`
				: hasGa4Config
					? `Loaded via ${hasGtagScript ? 'gtag.js' : 'inline gtag'} in ${placement} with gtag('config', '${ga4Ids[0]}').`
					: `gtag.js references ${ga4Ids[0]} in ${placement}, but no explicit gtag('config') initialization was found in HTML.`
		})
	}

	// 2. Legacy Universal Analytics (UA)
	const uaIds = uniqueMatches(html, /(UA-\d{4,}-\d+)/gi)
	const hasLegacyGaScript = /google-analytics\.com\/(analytics|ga)\.js/i.test(html)
	if (uaIds.length > 0 || hasLegacyGaScript) {
		tools.push({
			id: 'universal-analytics',
			name: 'Universal Analytics (Legacy GA)',
			category: 'Web Analytics',
			status: 'deprecated',
			statusLabel: 'Deprecated',
			ids: uaIds,
			implementation:
				uaIds.length > 0
					? `Legacy Universal Analytics (${uaIds.join(', ')}) is still present; Google sunset standard UA properties, so migrate to GA4.`
					: 'Legacy analytics.js / ga.js script detected; migrate to Google Analytics 4 (GA4).'
		})
	}

	// 3. Google Tag Manager (GTM)
	const gtmIds = uniqueMatches(html, /(GTM-[A-Z0-9]{4,})/gi)
	if (gtmIds.length > 0) {
		const hasNoscript = /googletagmanager\.com\/ns\.html\?id=GTM-/i.test(html)
		const placement = inHead(/GTM-[A-Z0-9]{4,}/i) ? '<head>' : '<body>'
		tools.push({
			id: 'gtm',
			name: 'Google Tag Manager',
			category: 'Tag Manager',
			status: hasNoscript ? 'active' : 'warning',
			statusLabel: hasNoscript ? 'Active' : 'Missing noscript fallback',
			ids: gtmIds,
			implementation: hasNoscript
				? `Container ${gtmIds.join(', ')} installed in ${placement} with <noscript> iframe fallback.`
				: `Container ${gtmIds.join(', ')} loaded via script in ${placement}, but the <noscript> iframe fallback is missing.`
		})
	}

	// 4. Meta Pixel (Facebook Pixel)
	const hasFbEvents = /connect\.facebook\.net\/[^"']*\/fbevents\.js/i.test(html)
	const metaInitIds = uniqueMatches(html, /fbq\s*\(\s*['"]init['"]\s*,\s*['"](\d{8,})['"]/gi)
	const metaNoscriptIds = uniqueMatches(html, /facebook\.com\/tr\?id=(\d{8,})/gi)
	const metaIds = [...new Set([...metaInitIds, ...metaNoscriptIds])]
	if (hasFbEvents || metaIds.length > 0) {
		const hasPageView = /fbq\s*\(\s*['"]track['"]\s*,\s*['"]PageView['"]/i.test(html)
		const hasNoscriptImg = metaNoscriptIds.length > 0
		const ok = metaIds.length > 0 && (hasPageView || hasNoscriptImg)
		tools.push({
			id: 'meta-pixel',
			name: 'Meta Pixel (Facebook)',
			category: 'Ad Pixel',
			status: ok ? 'active' : 'warning',
			statusLabel: ok ? 'Active' : metaIds.length === 0 ? 'Missing Pixel ID' : 'Incomplete setup',
			ids: metaIds,
			implementation:
				metaIds.length === 0
					? 'fbevents.js script detected, but no fbq("init", "<PIXEL_ID>") call was found in HTML.'
					: `Pixel ${metaIds.join(', ')} initialized via ${hasFbEvents ? 'fbevents.js' : 'pixel endpoint'}${hasPageView ? ' with PageView tracking' : ''}${hasNoscriptImg ? ' and <noscript> fallback' : ''}.`
		})
	}

	// 5. Google Ads Conversion / Remarketing
	const gadsIds = uniqueMatches(html, /(AW-\d{6,})/gi)
	const hasGadsScript = /googleadservices\.com\/pagead\/conversion/i.test(html)
	if (gadsIds.length > 0 || hasGadsScript) {
		tools.push({
			id: 'google-ads',
			name: 'Google Ads Tag',
			category: 'Ad Pixel',
			status: gadsIds.length > 0 ? 'active' : 'warning',
			statusLabel: gadsIds.length > 0 ? 'Active' : 'Legacy conversion script',
			ids: gadsIds,
			implementation:
				gadsIds.length > 0
					? `Google Ads conversion/remarketing tag ${gadsIds.join(', ')} configured via gtag.`
					: 'Legacy googleadservices.com conversion script detected.'
		})
	}

	// 6. Microsoft Clarity
	const clarityIds = uniqueMatches(html, /clarity\.ms\/tag\/([a-z0-9]+)/gi)
	if (clarityIds.length > 0 || /window\.clarity\s*=/i.test(html)) {
		tools.push({
			id: 'clarity',
			name: 'Microsoft Clarity',
			category: 'Behavior & Heatmaps',
			status: clarityIds.length > 0 ? 'active' : 'warning',
			statusLabel: clarityIds.length > 0 ? 'Active' : 'Missing Project ID',
			ids: clarityIds,
			implementation:
				clarityIds.length > 0
					? `Clarity heatmap & session recording active for project ${clarityIds.join(', ')}.`
					: 'Clarity stub detected without a project tag URL.'
		})
	}

	// 7. Hotjar
	const hotjarIds = [
		...new Set([
			...uniqueMatches(html, /static\.hotjar\.com\/c\/hotjar-(\d+)\.js/gi),
			...uniqueMatches(html, /hjid\s*:\s*(\d+)/gi)
		])
	]
	if (hotjarIds.length > 0) {
		tools.push({
			id: 'hotjar',
			name: 'Hotjar',
			category: 'Behavior & Heatmaps',
			status: 'active',
			statusLabel: 'Active',
			ids: hotjarIds,
			implementation: `Hotjar tracking snippet installed for Site ID ${hotjarIds.join(', ')}.`
		})
	}

	// 8. TikTok Pixel
	const tiktokIds = uniqueMatches(html, /ttq\.load\s*\(\s*['"]([A-Z0-9]+)['"]\s*\)/gi)
	if (tiktokIds.length > 0 || /analytics\.tiktok\.com\/i18n\/pixel\/events\.js/i.test(html)) {
		tools.push({
			id: 'tiktok-pixel',
			name: 'TikTok Pixel',
			category: 'Ad Pixel',
			status: tiktokIds.length > 0 ? 'active' : 'warning',
			statusLabel: tiktokIds.length > 0 ? 'Active' : 'Missing Pixel ID',
			ids: tiktokIds,
			implementation:
				tiktokIds.length > 0
					? `TikTok Pixel ${tiktokIds.join(', ')} loaded via events.js and ttq.load().`
					: 'TikTok Pixel script detected without a ttq.load() pixel ID.'
		})
	}

	// 9. LinkedIn Insight Tag
	const linkedinIds = uniqueMatches(html, /_linkedin_partner_id\s*=\s*["']?(\d+)["']?/gi)
	if (linkedinIds.length > 0 || /snap\.licdn\.com\/li\.lms-analytics\/insight\.min\.js/i.test(html)) {
		tools.push({
			id: 'linkedin-insight',
			name: 'LinkedIn Insight Tag',
			category: 'Ad Pixel',
			status: linkedinIds.length > 0 ? 'active' : 'warning',
			statusLabel: linkedinIds.length > 0 ? 'Active' : 'Missing Partner ID',
			ids: linkedinIds,
			implementation:
				linkedinIds.length > 0
					? `LinkedIn Insight Tag active for Partner ID ${linkedinIds.join(', ')}.`
					: 'LinkedIn Insight script detected without _linkedin_partner_id.'
		})
	}

	// 10. Pinterest Tag
	const pinterestIds = uniqueMatches(html, /pintrk\s*\(\s*['"]load['"]\s*,\s*['"](\d+)['"]/gi)
	if (pinterestIds.length > 0 || /s\.pinimg\.com\/ct\/core\.js/i.test(html)) {
		tools.push({
			id: 'pinterest-tag',
			name: 'Pinterest Tag',
			category: 'Ad Pixel',
			status: pinterestIds.length > 0 ? 'active' : 'warning',
			statusLabel: pinterestIds.length > 0 ? 'Active' : 'Missing Tag ID',
			ids: pinterestIds,
			implementation:
				pinterestIds.length > 0
					? `Pinterest Tag ${pinterestIds.join(', ')} initialized via core.js.`
					: 'Pinterest Tag script detected without pintrk("load") ID.'
		})
	}

	// 11. X (Twitter) Pixel
	const xIds = uniqueMatches(html, /twq\s*\(\s*['"]init['"]\s*,\s*['"]([a-z0-9]+)['"]/gi)
	if (xIds.length > 0 || /static\.ads-twitter\.com\/uwt\.js/i.test(html)) {
		tools.push({
			id: 'x-pixel',
			name: 'X (Twitter) Pixel',
			category: 'Ad Pixel',
			status: xIds.length > 0 ? 'active' : 'warning',
			statusLabel: xIds.length > 0 ? 'Active' : 'Missing Pixel ID',
			ids: xIds,
			implementation:
				xIds.length > 0
					? `X Pixel ${xIds.join(', ')} initialized via uwt.js and twq("init").`
					: 'X Pixel script (uwt.js) detected without twq("init") ID.'
		})
	}

	// 12. Plausible Analytics
	if (/plausible\.io\/js/i.test(html)) {
		const domains = uniqueMatches(html, /data-domain=["']([^"']+)["']/gi)
		tools.push({
			id: 'plausible',
			name: 'Plausible Analytics',
			category: 'Privacy-First Analytics',
			status: 'active',
			statusLabel: 'Active',
			ids: domains,
			implementation:
				domains.length > 0
					? `Privacy-friendly Plausible script configured for domain ${domains.join(', ')}.`
					: 'Plausible Analytics script loaded.'
		})
	}

	// 13. Fathom Analytics
	if (/cdn\.usefathom\.com\/script\.js/i.test(html)) {
		const siteIds = uniqueMatches(html, /data-site=["']([A-Z0-9]+)["']/gi)
		tools.push({
			id: 'fathom',
			name: 'Fathom Analytics',
			category: 'Privacy-First Analytics',
			status: siteIds.length > 0 ? 'active' : 'warning',
			statusLabel: siteIds.length > 0 ? 'Active' : 'Missing Site ID',
			ids: siteIds,
			implementation:
				siteIds.length > 0
					? `Fathom script active with Site ID ${siteIds.join(', ')}.`
					: 'Fathom script loaded without a data-site attribute.'
		})
	}

	// 14. Matomo
	if (/matomo\.js|piwik\.js|_paq\.push/i.test(html)) {
		tools.push({
			id: 'matomo',
			name: 'Matomo Analytics',
			category: 'Web Analytics',
			status: 'active',
			statusLabel: 'Active',
			ids: [],
			implementation: 'Matomo (_paq / matomo.js) tracking snippet detected.'
		})
	}

	// 15. PostHog / Mixpanel / HubSpot
	if (/posthog\.init|app\.posthog\.com|us\.i\.posthog\.com/i.test(html)) {
		tools.push({
			id: 'posthog',
			name: 'PostHog',
			category: 'Product Analytics',
			status: 'active',
			statusLabel: 'Active',
			ids: [],
			implementation: 'PostHog product analytics & event tracking snippet detected.'
		})
	}

	if (/cdn\.mxpnl\.com|mixpanel\.init/i.test(html)) {
		tools.push({
			id: 'mixpanel',
			name: 'Mixpanel',
			category: 'Product Analytics',
			status: 'active',
			statusLabel: 'Active',
			ids: [],
			implementation: 'Mixpanel event tracking snippet detected.'
		})
	}

	const hubspotIds = uniqueMatches(html, /js\.hs-scripts\.com\/(\d+)\.js/gi)
	if (hubspotIds.length > 0) {
		tools.push({
			id: 'hubspot',
			name: 'HubSpot Tracking',
			category: 'Marketing Automation',
			status: 'active',
			statusLabel: 'Active',
			ids: hubspotIds,
			implementation: `HubSpot tracking code installed for Hub ID ${hubspotIds.join(', ')}.`
		})
	}

	const { hasConsentSignal, consentSummary } = detectConsentSignals(html)

	return {
		tools,
		hasConsentSignal,
		consentSummary
	}
}

/** Fetches a single URL and runs only the analytics & tracking scanner. */
export async function runAnalyticsScan(input: string): Promise<AnalyticsScanPreview> {
	const explicitScheme = /^https?:\/\//i.test(input.trim())
	const url = normalizeInputUrl(input)
	const page = await fetchPage(url, explicitScheme)
	const parsed = parsePage(page)

	return {
		url,
		finalUrl: page.url,
		title: parsed.title,
		analytics: parsed.analytics
	}
}
