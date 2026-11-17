import { describe, expect, it } from 'vitest'
import {
	compareVersions,
	cspFindings,
	findLibraries,
	parseCsp,
	securityChecks
} from '@server/audit/checks/security'
import type { AuditContext, Gathered } from '@server/audit/context'
import type { SafeFetchResult } from '@server/audit/http'
import { parsePage } from '@server/audit/parse'
import type { CheckResult, SharingReport } from '@shared/types'

const URL_ = 'https://shop.example.com/'
const PAGE = '<!doctype html><html><head><title>Shop</title></head><body><p>Hello</p></body></html>'

const STRONG_HEADERS = {
	'strict-transport-security': 'max-age=63072000; includeSubDomains; preload',
	'content-security-policy':
		"default-src 'self'; script-src 'self' 'nonce-abc' 'strict-dynamic'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'",
	'x-content-type-options': 'nosniff',
	'referrer-policy': 'strict-origin-when-cross-origin',
	'permissions-policy': 'camera=(), microphone=()'
}

function fakePage(html: string, headers: Record<string, string>, url = URL_): SafeFetchResult {
	return {
		url,
		status: 200,
		ok: true,
		headers: new Headers({ 'content-type': 'text/html; charset=utf-8', ...headers }),
		redirects: [],
		body: Buffer.from(html),
		bytes: Buffer.byteLength(html),
		truncated: false,
		ttfbMs: 100,
		totalMs: 200,
		contentType: 'text/html; charset=utf-8'
	}
}

function ctxFor(
	html = PAGE,
	headers: Record<string, string> = STRONG_HEADERS,
	gathered: Partial<Gathered> = {},
	url = URL_
): AuditContext {
	const page = fakePage(html, headers, url)
	const parsed = parsePage(page)

	return {
		...parsed,
		robots: { url: `${url}robots.txt`, found: false },
		sitemap: { found: false, tried: [] },
		llmsTxt: { url: `${url}llms.txt`, found: false },
		sharing: {} as SharingReport,
		httpRedirect: { checked: true, redirectsToHttps: true, status: 301 },
		tls: {
			ok: true,
			protocol: 'TLSv1.3',
			alpn: 'h2',
			issuer: "Let's Encrypt",
			subject: 'shop.example.com',
			daysLeft: 60
		},
		dns: {
			spf: 'v=spf1 include:_spf.google.com -all',
			spfRecords: ['v=spf1 include:_spf.google.com -all'],
			dmarc: 'v=DMARC1; p=reject; rua=mailto:dmarc@example.com',
			mx: ['mx.example.com']
		},
		securityTxt: {
			url: `${url}.well-known/security.txt`,
			found: true,
			contact: ['mailto:security@example.com'],
			expires: '2099-01-01T00:00:00Z'
		},
		resources: [],
		resourcesDiscovered: 0,
		inlineScriptBytes: 0,
		inlineStyleBytes: 0,
		linkChecks: [],
		linksDiscovered: 0,
		...gathered,
		inputUrl: url,
		page,
		pagespeedEnabled: false
	}
}

function find(ctx: AuditContext, id: string): CheckResult {
	const result = securityChecks(ctx).find((c) => c.id === id)
	if (!result) throw new Error(`No check ${id}`)

	return result
}

describe('a well-secured site', () => {
	const checks = securityChecks(ctxFor())

	it('passes every scored security check', () => {
		const problems = checks.filter((c) => c.status === 'fail' || c.status === 'warn')
		expect(problems.map((c) => `${c.id}: ${c.summary}`)).toEqual([])
	})

	it('notices HSTS preload eligibility', () => {
		expect(checks.find((c) => c.id === 'hsts')?.summary).toMatch(/preload list/)
	})
})

describe('a poorly secured site', () => {
	const ctx = ctxFor(
		`<html><head><title>x</title><meta name="generator" content="WordPress 5.2.1"></head><body>
			<script src="https://code.jquery.com/jquery-1.12.4.min.js"></script>
			<form action="http://shop.example.com/login"><input type="password"></form>
		</body></html>`,
		{ 'x-powered-by': 'PHP/7.2.1', 'set-cookie': 'session=abc; Path=/' },
		{
			httpRedirect: { checked: true, redirectsToHttps: true, status: 302 },
			dns: { spf: 'v=spf1 +all', spfRecords: ['v=spf1 +all'], mx: ['mx.example.com'] },
			securityTxt: { url: `${URL_}.well-known/security.txt`, found: false }
		}
	)
	const checks = securityChecks(ctx)

	it.each([
		['https-redirect', 'warn'],
		['mixed-content', 'fail'],
		['hsts', 'warn'],
		['content-security-policy', 'warn'],
		['security-headers', 'fail'],
		['vulnerable-libraries', 'fail'],
		['subresource-integrity', 'warn'],
		['cookies', 'warn'],
		['email-auth', 'fail'],
		['security-txt', 'info'],
		['server-signature', 'warn']
	])('flags %s as %s', (id, status) => {
		expect(checks.find((c) => c.id === id)?.status).toBe(status)
	})

	it('says how to fix every problem', () => {
		const problems = checks.filter((c) => c.status === 'fail' || c.status === 'warn')
		expect(problems.every((c) => Boolean(c.recommendation))).toBe(true)
	})
})

describe('transport', () => {
	it('fails plain HTTP and warns about passwords', () => {
		const ctx = ctxFor(
			'<html><body><input type="password"></body></html>',
			{},
			{},
			'http://shop.example.com/'
		)
		const https = find(ctx, 'https')
		expect(https.status).toBe('fail')
		expect(https.summary).toMatch(/password/)
		expect(find(ctx, 'hsts').status).toBe('info')
	})

	it('names an expired certificate', () => {
		const ctx = ctxFor(PAGE, STRONG_HEADERS, {
			tls: { ok: false, error: 'certificate has expired', daysLeft: -3 }
		})
		expect(find(ctx, 'ssl-certificate').summary).toMatch(/expired/)
	})

	it('warns about a short HSTS max-age and max-age=0', () => {
		const short = ctxFor(PAGE, {
			...STRONG_HEADERS,
			'strict-transport-security': 'max-age=300'
		})
		expect(find(short, 'hsts').status).toBe('warn')
		const off = ctxFor(PAGE, { ...STRONG_HEADERS, 'strict-transport-security': 'max-age=0' })
		expect(find(off, 'hsts').summary).toMatch(/turns HSTS off/)
	})

	it('treats insecure images as a warning and reads srcset', () => {
		const ctx = ctxFor(
			'<html><body><img srcset="http://x.com/a.jpg 1x, https://x.com/b.jpg 2x"></body></html>'
		)
		const result = find(ctx, 'mixed-content')
		expect(result.status).toBe('warn')
		expect(result.details?.[0]).toMatchObject({ items: ['http://x.com/a.jpg'] })
	})

	it('softens insecure scripts when CSP upgrades requests', () => {
		const ctx = ctxFor('<html><body><script src="http://x.com/a.js"></script></body></html>', {
			...STRONG_HEADERS,
			'content-security-policy': `${STRONG_HEADERS['content-security-policy']}; upgrade-insecure-requests`
		})
		expect(find(ctx, 'mixed-content').status).toBe('warn')
	})
})

describe('Content Security Policy', () => {
	it("flags 'unsafe-inline' without nonces and broad sources", () => {
		const { problems } = cspFindings(parseCsp("script-src 'self' 'unsafe-inline' https:"))
		expect(problems).toHaveLength(2)
	})

	it("ignores 'unsafe-inline' when nonces and strict-dynamic are present", () => {
		const { problems } = cspFindings(
			parseCsp(
				"script-src 'nonce-x' 'strict-dynamic' 'unsafe-inline' https:; object-src 'none'"
			)
		)
		expect(problems).toEqual([])
	})

	it('reads a policy from a meta tag', () => {
		const { 'content-security-policy': _, ...rest } = STRONG_HEADERS
		const ctx = ctxFor(
			`<html><head><meta http-equiv="Content-Security-Policy" content="default-src 'self'; object-src 'none'; base-uri 'self'"></head><body></body></html>`,
			rest
		)
		const result = find(ctx, 'content-security-policy')
		expect(result.status).toBe('pass')
		expect(result.summary).toMatch(/meta/)
	})

	it('warns when the policy is report-only', () => {
		const { 'content-security-policy': policy, ...rest } = STRONG_HEADERS
		const ctx = ctxFor(PAGE, { ...rest, 'content-security-policy-report-only': policy })
		expect(find(ctx, 'content-security-policy').summary).toMatch(/report-only/)
	})
})

describe('security headers', () => {
	it('accepts X-Frame-Options in place of frame-ancestors', () => {
		const ctx = ctxFor(PAGE, {
			...STRONG_HEADERS,
			'content-security-policy': "default-src 'self'",
			'x-frame-options': 'SAMEORIGIN'
		})
		expect(find(ctx, 'security-headers').status).toBe('pass')
	})

	it('marks a leaky referrer policy and obsolete X-XSS-Protection as weak', () => {
		const ctx = ctxFor(PAGE, {
			...STRONG_HEADERS,
			'referrer-policy': 'unsafe-url',
			'x-xss-protection': '1; mode=block'
		})
		const result = find(ctx, 'security-headers')
		expect(result.status).toBe('warn')
		expect(JSON.stringify(result.details)).toMatch(/Weak/)
	})
})

describe('email authentication', () => {
	const withDns = (dns: Gathered['dns']) =>
		find(ctxFor(PAGE, STRONG_HEADERS, { dns }), 'email-auth')

	it('fails on two SPF records', () => {
		expect(
			withDns({
				spfRecords: ['v=spf1 -all', 'v=spf1 ~all'],
				dmarc: 'v=DMARC1; p=reject; rua=mailto:a@b.c',
				mx: []
			}).status
		).toBe('fail')
	})

	it('warns when DMARC only monitors', () => {
		const result = withDns({
			spf: 'v=spf1 -all',
			spfRecords: ['v=spf1 -all'],
			dmarc: 'v=DMARC1; p=none; rua=mailto:a@b.c',
			mx: ['mx.example.com']
		})
		expect(result.status).toBe('warn')
		expect(result.summary).toMatch(/p=none/)
	})

	it('suggests a null policy for domains without mail servers', () => {
		const result = withDns({ mx: [] })
		expect(result.status).toBe('fail')
		expect(result.recommendation).toMatch(/v=spf1 -all/)
	})

	it('is information only when DNS could not be read', () => {
		expect(find(ctxFor(PAGE, STRONG_HEADERS, { dns: undefined }), 'email-auth').status).toBe(
			'info'
		)
	})
})

describe('libraries', () => {
	it('reads versions from common CDN and file name patterns', () => {
		const found = findLibraries([
			'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.4.1/jquery.min.js',
			'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.min.js',
			'/js/jquery-ui-1.12.1.min.js',
			'https://cdnjs.cloudflare.com/ajax/libs/angular.js/1.8.2/angular.min.js',
			'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.30.1/moment.min.js'
		])
		const byName = Object.fromEntries(found.map((l) => [l.name, l]))
		expect(byName.jQuery).toMatchObject({ version: '3.4.1', vulnerable: true })
		expect(byName.Bootstrap).toMatchObject({ version: '5.3.2', vulnerable: false })
		expect(byName['jQuery UI']).toMatchObject({ version: '1.12.1', vulnerable: true })
		expect(byName.AngularJS).toMatchObject({ vulnerable: true, fixedIn: null })
		expect(byName['Moment.js']).toMatchObject({ vulnerable: false })
	})

	it('compares versions numerically', () => {
		expect(compareVersions('1.10.0', '1.9.9')).toBe(1)
		expect(compareVersions('3.5', '3.5.0')).toBe(0)
	})

	it('accepts CDN files pinned with integrity', () => {
		const ctx = ctxFor(
			'<html><body><script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.min.js" integrity="sha384-x" crossorigin="anonymous"></script></body></html>'
		)
		expect(find(ctx, 'subresource-integrity').status).toBe('pass')
		expect(find(ctx, 'vulnerable-libraries').status).toBe('pass')
	})
})

describe('security.txt and cookies', () => {
	it('warns about an expired security.txt', () => {
		const ctx = ctxFor(PAGE, STRONG_HEADERS, {
			securityTxt: {
				url: `${URL_}.well-known/security.txt`,
				found: true,
				contact: ['mailto:a@b.c'],
				expires: '2020-01-01T00:00:00Z'
			}
		})
		expect(find(ctx, 'security-txt').summary).toMatch(/expired/)
	})

	it('flags SameSite=None without Secure', () => {
		const ctx = ctxFor(PAGE, {
			...STRONG_HEADERS,
			'set-cookie': 'track=1; HttpOnly; SameSite=None'
		})
		const result = find(ctx, 'cookies')
		expect(result.status).toBe('warn')
		expect(result.summary).toMatch(/SameSite=None/)
	})
})
