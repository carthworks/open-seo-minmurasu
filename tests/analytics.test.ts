import * as cheerio from 'cheerio'
import { describe, expect, it } from 'vitest'
import { scanAnalytics } from '@server/audit/analytics'
import { analyticsChecks } from '@server/audit/checks/analytics'
import type { AuditContext } from '@server/audit/context'

function makeContext(html: string): AuditContext {
	const $ = cheerio.load(html)
	const analytics = scanAnalytics(html, $)

	return {
		html,
		$,
		analytics
	} as unknown as AuditContext
}

describe('scanAnalytics', () => {
	it('detects Google Analytics 4 (GA4) and Meta Pixel with active status', () => {
		const html = `
			<html>
				<head>
					<script async src="https://www.googletagmanager.com/gtag/js?id=G-ABC123XYZ"></script>
					<script>
						window.dataLayer = window.dataLayer || [];
						function gtag(){dataLayer.push(arguments);}
						gtag('consent', 'default', { analytics_storage: 'denied' });
						gtag('config', 'G-ABC123XYZ');
					</script>
					<script src="https://connect.facebook.net/en_US/fbevents.js"></script>
					<script>
						fbq('init', '123456789012345');
						fbq('track', 'PageView');
					</script>
				</head>
				<body>
					<noscript><img src="https://www.facebook.com/tr?id=123456789012345&ev=PageView" /></noscript>
				</body>
			</html>
		`
		const result = scanAnalytics(html, cheerio.load(html))
		expect(result.hasConsentSignal).toBe(true)
		expect(result.consentSummary).toContain('Google Consent Mode')

		const ga4 = result.tools.find((t) => t.id === 'ga4')
		expect(ga4).toBeDefined()
		expect(ga4?.status).toBe('active')
		expect(ga4?.ids).toEqual(['G-ABC123XYZ'])
		expect(ga4?.implementation).toContain('<head>')

		const meta = result.tools.find((t) => t.id === 'meta-pixel')
		expect(meta).toBeDefined()
		expect(meta?.status).toBe('active')
		expect(meta?.ids).toEqual(['123456789012345'])
		expect(meta?.implementation).toContain('PageView')
	})

	it('flags deprecated Universal Analytics and incomplete GTM', () => {
		const html = `
			<html>
				<head>
					<script src="https://www.googletagmanager.com/gtm.js?id=GTM-XYZ987"></script>
					<script>
						(function(i,s,o,g,r,a,m){})(window,document,'script','https://www.google-analytics.com/analytics.js','ga');
						ga('create', 'UA-123456-1', 'auto');
					</script>
				</head>
				<body></body>
			</html>
		`
		const result = scanAnalytics(html, cheerio.load(html))
		const ua = result.tools.find((t) => t.id === 'universal-analytics')
		expect(ua?.status).toBe('deprecated')
		expect(ua?.ids).toEqual(['UA-123456-1'])

		const gtm = result.tools.find((t) => t.id === 'gtm')
		expect(gtm?.status).toBe('warning')
		expect(gtm?.statusLabel).toBe('Missing noscript fallback')
	})

	it('detects Clarity, Hotjar, TikTok, LinkedIn, and Plausible', () => {
		const html = `
			<html>
				<head>
					<script src="https://www.clarity.ms/tag/abcd1234"></script>
					<script src="https://static.hotjar.com/c/hotjar-998877.js"></script>
					<script defer data-domain="example.com" src="https://plausible.io/js/script.js"></script>
					<script>
						ttq.load('TIKTOK123');
						_linkedin_partner_id = "554433";
					</script>
				</head>
				<body></body>
			</html>
		`
		const result = scanAnalytics(html, cheerio.load(html))
		expect(result.tools.map((t) => t.id)).toEqual([
			'clarity',
			'hotjar',
			'tiktok-pixel',
			'linkedin-insight',
			'plausible'
		])
		expect(result.tools.every((t) => t.status === 'active')).toBe(true)
	})
})

describe('analyticsChecks', () => {
	it('produces a table of detected tools and warns when consent is missing for third-party tracking', () => {
		const checks = analyticsChecks(
			makeContext(`
				<html>
					<head>
						<script async src="https://www.googletagmanager.com/gtag/js?id=G-TEST1234"></script>
						<script>gtag('config', 'G-TEST1234');</script>
					</head>
					<body></body>
				</html>
			`)
		)
		const installed = checks.find((c) => c.id === 'analytics-installed')
		expect(installed?.status).toBe('pass')
		expect(installed?.details?.[0]?.kind).toBe('table')

		const consent = checks.find((c) => c.id === 'analytics-consent')
		expect(consent?.status).toBe('warn')
	})

	it('warns when no analytics tools are installed', () => {
		const checks = analyticsChecks(makeContext('<html><head></head><body>Hello</body></html>'))
		const installed = checks.find((c) => c.id === 'analytics-installed')
		expect(installed?.status).toBe('warn')
	})
})
