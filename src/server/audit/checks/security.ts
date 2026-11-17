import type { AuditContext, CheerioRoot } from '@server/audit/context'
import { formatCount } from '@shared/format'
import type { CheckResult, Detail } from '@shared/types'
import { inCategory, listDetail, tableDetail } from './check'

const check = inCategory('security')

/** HSTS shorter than this (180 days) leaves long gaps where a first visit can be downgraded. */
const HSTS_MIN_SECONDS = 15_552_000
/** One year: the minimum the browser preload list accepts. */
const HSTS_PRELOAD_SECONDS = 31_536_000

/** Public CDNs that serve fixed library files, where Subresource Integrity is practical. */
const PUBLIC_CDNS = [
	'cdnjs.cloudflare.com',
	'cdn.jsdelivr.net',
	'unpkg.com',
	'code.jquery.com',
	'ajax.googleapis.com',
	'ajax.aspnetcdn.com',
	'stackpath.bootstrapcdn.com',
	'maxcdn.bootstrapcdn.com',
	'netdna.bootstrapcdn.com',
	'cdn.rawgit.com'
]

// ---------------------------------------------------------------------------------------------
// Small parsers
// ---------------------------------------------------------------------------------------------

/** Directive name → lower-cased source list. Only the first policy of a comma-joined set. */
export function parseCsp(policy: string): Map<string, string[]> {
	const directives = new Map<string, string[]>()
	for (const part of policy.split(',')[0].split(';')) {
		const [name, ...values] = part.trim().split(/\s+/)
		if (name && !directives.has(name.toLowerCase())) {
			directives.set(
				name.toLowerCase(),
				values.map((v) => v.toLowerCase())
			)
		}
	}

	return directives
}

/** The policy from the header, or from a <meta http-equiv> tag when there is no header. */
function findCsp(ctx: AuditContext): { policy: string; source: 'header' | 'meta' } | undefined {
	const header = ctx.page.headers.get('content-security-policy')
	if (header) return { policy: header, source: 'header' }
	const meta = ctx
		.$('meta[http-equiv]')
		.filter(
			(_, el) =>
				(ctx.$(el).attr('http-equiv') || '').toLowerCase() === 'content-security-policy'
		)
		.first()
		.attr('content')

	return meta ? { policy: meta, source: 'meta' } : undefined
}

/** "1.2.3" < "1.10.0" → -1. Missing parts count as 0. */
export function compareVersions(a: string, b: string): number {
	const pa = a.split('.').map(Number)
	const pb = b.split('.').map(Number)
	for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
		const d = (pa[i] || 0) - (pb[i] || 0)
		if (d !== 0) return d < 0 ? -1 : 1
	}

	return 0
}

function hostOf(url: string, base: URL): string | undefined {
	try {
		return new URL(url, base).hostname.toLowerCase()
	} catch {
		return undefined
	}
}

interface ParsedCookie {
	name: string
	secure: boolean
	httpOnly: boolean
	sameSite?: string
}

function parseCookie(raw: string): ParsedCookie {
	const [pair, ...attrs] = raw.split(';').map((s) => s.trim())
	const has = (name: string) => attrs.some((a) => a.toLowerCase() === name)
	const sameSite = attrs.find((a) => /^samesite=/i.test(a))?.split('=')[1]

	return {
		name: pair.split('=')[0],
		secure: has('secure'),
		httpOnly: has('httponly'),
		sameSite: sameSite?.toLowerCase()
	}
}

// ---------------------------------------------------------------------------------------------
// Transport: HTTPS, redirect, certificate, HSTS, mixed content
// ---------------------------------------------------------------------------------------------

function httpsCheck(ctx: AuditContext): CheckResult {
	const base = { id: 'https', title: 'HTTPS', weight: 3, priority: 'high' as const }
	if (ctx.finalUrl.protocol !== 'https:') {
		const hasPassword = ctx.$('input[type="password"]').length > 0

		return check({
			...base,
			status: 'fail',
			summary: hasPassword
				? 'The page is served over plain HTTP and has a password field, so passwords travel unencrypted.'
				: 'The page is served over plain HTTP.',
			recommendation:
				'Serve the site over HTTPS. Browsers mark HTTP pages "Not secure", anything typed into forms can be read on the network, and Google uses HTTPS as a ranking signal. Certificates from Let\'s Encrypt or your host are free.'
		})
	}

	return check({ ...base, status: 'pass', summary: 'The page is served over HTTPS.' })
}

function httpsRedirectCheck(ctx: AuditContext): CheckResult {
	const { httpRedirect } = ctx
	const base = {
		id: 'https-redirect',
		title: 'HTTP redirects to HTTPS',
		weight: 2,
		priority: 'high' as const
	}
	if (!httpRedirect.checked) {
		return check({
			...base,
			status: 'info',
			weight: 0,
			summary: 'The http:// version was not checked.'
		})
	}
	if (httpRedirect.redirectsToHttps) {
		const temporary = httpRedirect.status != null && ![301, 308].includes(httpRedirect.status)
		if (temporary) {
			return check({
				...base,
				status: 'warn',
				summary: `http:// sends visitors to https://, but with a temporary ${httpRedirect.status} redirect.`,
				recommendation:
					'Use a permanent redirect (301 or 308) so browsers and search engines remember the secure address and pass ranking signals to it.'
			})
		}

		return check({
			...base,
			status: 'pass',
			summary: 'Visitors who type http:// are permanently sent to the secure version.'
		})
	}
	if (httpRedirect.error) {
		return check({
			...base,
			status: 'pass',
			summary:
				"The site doesn't answer on plain HTTP, so there's no insecure version to reach."
		})
	}

	return check({
		...base,
		status: 'fail',
		summary: 'The http:// version of the page does not redirect to https://.',
		recommendation:
			'Add a permanent (301 or 308) redirect from HTTP to HTTPS so there is one secure version of every page.',
		details: httpRedirect.finalUrl ? [{ kind: 'code', text: httpRedirect.finalUrl }] : undefined
	})
}

function certificateCheck(ctx: AuditContext): CheckResult {
	const { tls } = ctx
	const base = {
		id: 'ssl-certificate',
		title: 'SSL certificate',
		weight: 2,
		priority: 'high' as const
	}
	if (ctx.finalUrl.protocol !== 'https:' || !tls) {
		return check({
			...base,
			status: 'fail',
			summary: 'There is no SSL certificate to check.',
			recommendation:
				"Install a certificate (free from Let's Encrypt or your host) and serve the site over HTTPS."
		})
	}
	const details: Detail[] = [
		{
			kind: 'kv',
			items: [
				['Issued by', tls.issuer || 'Unknown'],
				['Issued to', tls.subject || 'Unknown'],
				['Valid until', tls.validTo ? new Date(tls.validTo).toDateString() : 'Unknown'],
				['Days left', tls.daysLeft != null ? String(tls.daysLeft) : 'Unknown'],
				['Protocol', tls.protocol || 'Unknown'],
				['HTTP/2', tls.alpn === 'h2' ? 'Yes' : 'No']
			]
		}
	]
	if (!tls.ok) {
		const expired = (tls.daysLeft ?? 1) < 0 || /expired/i.test(tls.error || '')
		const wrongName = /altname|hostname|does not match/i.test(tls.error || '')

		return check({
			...base,
			status: 'fail',
			summary: expired
				? 'The certificate has expired, so browsers show a full-page security warning.'
				: wrongName
					? `The certificate doesn't cover ${ctx.finalUrl.hostname}.`
					: `The certificate isn't trusted: ${tls.error || 'unknown error'}.`,
			recommendation: expired
				? 'Renew the certificate now and turn on automatic renewal.'
				: wrongName
					? `Issue a certificate that lists ${ctx.finalUrl.hostname} (and the www / non-www variant you use).`
					: 'Use a certificate from a trusted authority and make sure the server sends the full certificate chain (including intermediates).',
			details
		})
	}
	if (tls.protocol && /^TLSv1(\.[01])?$/.test(tls.protocol)) {
		return check({
			...base,
			status: 'warn',
			summary: `The connection used ${tls.protocol}, which browsers no longer trust.`,
			recommendation: 'Turn on TLS 1.2 and 1.3 and turn off TLS 1.0 and 1.1 on the server.',
			details
		})
	}
	if ((tls.daysLeft ?? 0) <= 14) {
		return check({
			...base,
			status: 'warn',
			summary: `The certificate expires in ${formatCount(tls.daysLeft ?? 0, 'day')}.`,
			recommendation: 'Renew it now, and set up automatic renewal so it never lapses.',
			details
		})
	}

	return check({
		...base,
		status: 'pass',
		summary: `The certificate is valid for another ${formatCount(tls.daysLeft ?? 0, 'day')}.`,
		details
	})
}

function hstsCheck(ctx: AuditContext): CheckResult {
	const base = { id: 'hsts', title: 'HSTS', weight: 1, priority: 'medium' as const }
	const recommended = `Strict-Transport-Security: max-age=${HSTS_PRELOAD_SECONDS}; includeSubDomains`
	if (ctx.finalUrl.protocol !== 'https:') {
		return check({
			...base,
			status: 'info',
			weight: 0,
			summary: 'Only applies to sites served over HTTPS.'
		})
	}
	const hsts = ctx.page.headers.get('strict-transport-security')
	if (!hsts) {
		return check({
			...base,
			status: 'warn',
			summary: 'The site does not send a Strict-Transport-Security header.',
			recommendation: `Send ${recommended} so browsers always use HTTPS, even when someone types http:// or follows an old link.`
		})
	}
	const maxAge = Number(hsts.match(/max-age\s*=\s*"?(\d+)/i)?.[1] ?? NaN)
	const subdomains = /includesubdomains/i.test(hsts)
	const preload = /\bpreload\b/i.test(hsts)
	const details: Detail[] = [{ kind: 'code', text: hsts }]
	if (!Number.isFinite(maxAge) || maxAge === 0) {
		return check({
			...base,
			status: 'warn',
			summary: Number.isFinite(maxAge)
				? 'The HSTS header has max-age=0, which turns HSTS off.'
				: 'The HSTS header has no valid max-age, so browsers ignore it.',
			recommendation: `Send ${recommended}.`,
			details
		})
	}
	if (maxAge < HSTS_MIN_SECONDS) {
		return check({
			...base,
			status: 'warn',
			summary: `HSTS is on, but only for ${formatCount(Math.round(maxAge / 86_400), 'day')}.`,
			recommendation: `Raise max-age to at least six months; one year is standard: ${recommended}.`,
			details
		})
	}
	const preloadReady = preload && subdomains && maxAge >= HSTS_PRELOAD_SECONDS

	return check({
		...base,
		status: 'pass',
		summary: preloadReady
			? 'Browsers are told to always use HTTPS, and the header qualifies for the preload list.'
			: subdomains
				? 'Browsers are told to always use HTTPS, including on subdomains.'
				: 'Browsers are told to always use HTTPS (subdomains are not included).',
		details
	})
}

function mixedContentCheck(ctx: AuditContext): CheckResult {
	const base = {
		id: 'mixed-content',
		title: 'Mixed content',
		weight: 2,
		priority: 'high' as const
	}
	if (ctx.finalUrl.protocol !== 'https:') {
		return check({
			...base,
			status: 'info',
			weight: 0,
			summary: 'Only applies to pages served over HTTPS.'
		})
	}
	const { $ } = ctx
	const insecure = (url: string | undefined) => Boolean(url && /^http:\/\//i.test(url.trim()))
	const active = new Set<string>()
	const passive = new Set<string>()
	const forms = new Set<string>()

	$('script[src], iframe[src], frame[src], embed[src]').each((_, el) => {
		const url = $(el).attr('src')
		if (insecure(url)) active.add(url!.trim())
	})
	$('object[data]').each((_, el) => {
		const url = $(el).attr('data')
		if (insecure(url)) active.add(url!.trim())
	})
	$('link[href]').each((_, el) => {
		const rel = ($(el).attr('rel') || '').toLowerCase()
		const url = $(el).attr('href')
		if (!insecure(url)) return
		if (/stylesheet|preload|modulepreload|manifest/.test(rel)) active.add(url!.trim())
		else if (/icon/.test(rel)) passive.add(url!.trim())
	})
	$('img[src], audio[src], video[src], source[src], track[src]').each((_, el) => {
		const url = $(el).attr('src')
		if (insecure(url)) passive.add(url!.trim())
	})
	$('video[poster]').each((_, el) => {
		const url = $(el).attr('poster')
		if (insecure(url)) passive.add(url!.trim())
	})
	$('img[srcset], source[srcset]').each((_, el) => {
		for (const candidate of ($(el).attr('srcset') || '').split(',')) {
			const url = candidate.trim().split(/\s+/)[0]
			if (insecure(url)) passive.add(url)
		}
	})
	$('form[action]').each((_, el) => {
		const url = $(el).attr('action')
		if (insecure(url)) forms.add(url!.trim())
	})

	if (!active.size && !passive.size && !forms.size) {
		return check({
			...base,
			status: 'pass',
			summary: 'Everything on the page loads over HTTPS.'
		})
	}
	const csp = findCsp(ctx)
	const upgrades = csp ? parseCsp(csp.policy).has('upgrade-insecure-requests') : false
	const parts = [
		forms.size &&
			`${formatCount(forms.size, 'form sends', 'forms send')} data over insecure HTTP`,
		active.size &&
			`${formatCount(active.size, 'script, stylesheet or frame', 'scripts, stylesheets or frames')} load over HTTP and will be blocked`,
		passive.size &&
			`${formatCount(passive.size, 'image or media file', 'images or media files')} load over HTTP`
	].filter(Boolean)
	const severe = forms.size > 0 || active.size > 0

	return check({
		...base,
		status: severe && !upgrades ? 'fail' : 'warn',
		summary: `${parts.join('; ')}.${upgrades ? ' The CSP upgrade-insecure-requests directive asks browsers to fetch them over HTTPS instead.' : ''}`,
		recommendation:
			'Change these URLs to https:// (or make them relative). Browsers block insecure scripts and frames, warn on insecure images, and anything a form sends over HTTP can be read on the network.',
		details: [listDetail([...forms, ...active, ...passive])]
	})
}

// ---------------------------------------------------------------------------------------------
// Browser protections: CSP, other headers, cookies
// ---------------------------------------------------------------------------------------------

export function cspFindings(directives: Map<string, string[]>): {
	problems: string[]
	notes: string[]
} {
	const problems: string[] = []
	const notes: string[] = []
	const scriptSrc = directives.get('script-src') ?? directives.get('default-src')
	if (!scriptSrc) {
		problems.push('No script-src or default-src, so scripts from any site may run.')
	} else {
		const hasNonceOrHash = scriptSrc.some((v) => /^'(nonce-|sha(256|384|512)-)/.test(v))
		const strictDynamic = scriptSrc.includes("'strict-dynamic'")
		if (scriptSrc.includes("'unsafe-inline'") && !hasNonceOrHash) {
			problems.push("script-src allows 'unsafe-inline', so injected inline scripts can run.")
		}
		if (!strictDynamic) {
			const broad = scriptSrc.filter((v) => ['*', 'http:', 'https:', 'data:'].includes(v))
			if (broad.length)
				problems.push(
					`script-src allows ${broad.join(', ')}, which covers almost any script.`
				)
		}
		if (scriptSrc.includes("'unsafe-eval'")) notes.push("script-src allows 'unsafe-eval'.")
	}
	const objectSrc = directives.get('object-src') ?? directives.get('default-src')
	if (!objectSrc?.includes("'none'")) notes.push("object-src is not 'none'.")
	if (!directives.has('base-uri')) notes.push('base-uri is not set.')
	if (!directives.has('frame-ancestors')) notes.push('frame-ancestors is not set.')

	return { problems, notes }
}

function cspCheck(ctx: AuditContext): CheckResult {
	const base = {
		id: 'content-security-policy',
		title: 'Content Security Policy',
		weight: 1,
		priority: 'medium' as const
	}
	const starter =
		"Start with Content-Security-Policy-Report-Only to find what the site loads, then enforce a policy such as: default-src 'self'; script-src 'self' 'nonce-…' 'strict-dynamic'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'."
	const csp = findCsp(ctx)
	if (!csp) {
		const reportOnly = ctx.page.headers.get('content-security-policy-report-only')

		return check({
			...base,
			status: 'warn',
			summary: reportOnly
				? 'A CSP is only in report-only mode, so it records problems but blocks nothing.'
				: 'The site has no Content Security Policy.',
			recommendation: reportOnly
				? 'Once the reports are clean, send the same policy as Content-Security-Policy so it is enforced.'
				: `A CSP limits where scripts can load from, which stops most cross-site scripting (XSS) attacks. ${starter}`,
			details: reportOnly ? [{ kind: 'code', text: reportOnly }] : undefined
		})
	}
	const { problems, notes } = cspFindings(parseCsp(csp.policy))
	const details: Detail[] = []
	if (problems.length || notes.length) details.push(listDetail([...problems, ...notes]))
	details.push({
		kind: 'code',
		text: csp.policy.length > 600 ? `${csp.policy.slice(0, 600)}…` : csp.policy
	})
	const where = csp.source === 'meta' ? ' (set in a <meta> tag)' : ''
	if (problems.length) {
		return check({
			...base,
			status: 'warn',
			summary: `The site has a CSP${where}, but it doesn't stop injected scripts.`,
			recommendation: `Remove 'unsafe-inline' and broad sources from script-src; use nonces or hashes with 'strict-dynamic' instead. ${starter}`,
			details
		})
	}

	return check({
		...base,
		status: 'pass',
		summary: notes.length
			? `The site has a CSP${where} that restricts scripts; ${formatCount(notes.length, 'smaller gap')} remain.`
			: `The site has a strong CSP${where}.`,
		details
	})
}

type Verdict = 'ok' | 'weak' | 'missing'

function headersCheck(ctx: AuditContext): CheckResult {
	const { headers } = ctx.page
	const csp = findCsp(ctx)
	const frameAncestors = csp?.source === 'header' && parseCsp(csp.policy).has('frame-ancestors')
	const rows: { label: string; verdict: Verdict; note: string; core: boolean }[] = []

	const nosniff = headers.get('x-content-type-options')
	rows.push({
		label: 'X-Content-Type-Options',
		core: true,
		verdict: !nosniff ? 'missing' : /^\s*nosniff\s*$/i.test(nosniff) ? 'ok' : 'weak',
		note: nosniff
			? /nosniff/i.test(nosniff)
				? 'nosniff'
				: `"${nosniff}" is not valid; use nosniff`
			: 'Send nosniff'
	})

	const xfo = headers.get('x-frame-options')
	const xfoOk = xfo ? /^\s*(deny|sameorigin)\s*$/i.test(xfo) : false
	rows.push({
		label: 'Clickjacking (X-Frame-Options or frame-ancestors)',
		core: true,
		verdict: frameAncestors || xfoOk ? 'ok' : xfo ? 'weak' : 'missing',
		note: frameAncestors
			? 'CSP frame-ancestors'
			: xfoOk
				? `X-Frame-Options: ${xfo}`
				: xfo
					? `"${xfo}" is not supported; use DENY or SAMEORIGIN`
					: 'Send X-Frame-Options: SAMEORIGIN or CSP frame-ancestors'
	})

	const referrer = headers.get('referrer-policy')
	const leaky = referrer ? /unsafe-url|no-referrer-when-downgrade/i.test(referrer) : false
	rows.push({
		label: 'Referrer-Policy',
		core: false,
		verdict: !referrer ? 'missing' : leaky ? 'weak' : 'ok',
		note: !referrer
			? 'Send strict-origin-when-cross-origin'
			: leaky
				? `"${referrer}" sends full URLs to other sites`
				: referrer
	})

	const permissions = headers.get('permissions-policy')
	rows.push({
		label: 'Permissions-Policy',
		core: false,
		verdict: permissions ? 'ok' : 'missing',
		note: permissions
			? 'Set'
			: 'Turn off features you do not use, e.g. camera=(), microphone=(), geolocation=()'
	})

	const xss = headers.get('x-xss-protection')
	if (xss && !/^\s*0\s*$/.test(xss)) {
		rows.push({
			label: 'X-XSS-Protection (obsolete)',
			core: false,
			verdict: 'weak',
			note: `"${xss}" can cause problems in old browsers; send 0 or remove it`
		})
	}

	const coreMissing = rows.filter((r) => r.core && r.verdict !== 'ok').length
	const extraMissing = rows.filter((r) => !r.core && r.verdict !== 'ok').length
	const okCount = rows.filter((r) => r.verdict === 'ok').length
	const label: Record<Verdict, string> = { ok: 'Yes', weak: 'Weak', missing: 'No' }
	const details = [
		tableDetail(
			['Protection', 'Sent', 'Notes'],
			rows.map((r) => [r.label, label[r.verdict], r.note])
		)
	]
	const base = {
		id: 'security-headers',
		title: 'Security headers',
		weight: 1,
		priority: 'medium' as const
	}
	const summary = `The site sends ${okCount} of ${rows.length} recommended security headers correctly.`
	if (coreMissing === 0 && extraMissing <= 1)
		return check({ ...base, status: 'pass', summary, details })

	return check({
		...base,
		status: coreMissing === 2 ? 'fail' : 'warn',
		summary,
		recommendation:
			'Add or fix the headers marked No or Weak at your server, framework or CDN. They protect visitors from clickjacking, content sniffing and leaking page addresses to other sites.',
		details
	})
}

function cookiesCheck(ctx: AuditContext): CheckResult {
	const cookies = ctx.page.headers.getSetCookie().map(parseCookie)
	const https = ctx.finalUrl.protocol === 'https:'
	const base = { id: 'cookies', title: 'Cookie security', weight: 0.5, priority: 'low' as const }
	if (!cookies.length) {
		return check({
			...base,
			status: 'pass',
			summary: "The page doesn't set cookies when it loads."
		})
	}
	const problems = (c: ParsedCookie): string[] =>
		[
			https && !c.secure && 'not Secure',
			!c.httpOnly && 'not HttpOnly',
			c.sameSite === 'none' &&
				!c.secure &&
				'SameSite=None without Secure (browsers reject it)'
		].filter(Boolean) as string[]
	const weak = cookies.filter((c) => problems(c).length)
	const details = [
		tableDetail(
			['Cookie', 'Secure', 'HttpOnly', 'SameSite'],
			cookies.map((c) => [
				c.name,
				c.secure ? 'Yes' : 'No',
				c.httpOnly ? 'Yes' : 'No',
				c.sameSite || 'Not set (Lax)'
			])
		)
	]
	if (!weak.length) {
		return check({
			...base,
			status: 'pass',
			summary: 'Cookies are marked Secure and HttpOnly.',
			details
		})
	}

	return check({
		...base,
		status: 'warn',
		summary: `${formatCount(weak.length, 'cookie')} ${weak.length === 1 ? 'is' : 'are'} missing protection: ${weak
			.slice(0, 3)
			.map((c) => `${c.name} (${problems(c).join(', ')})`)
			.join('; ')}.`,
		recommendation:
			'Mark cookies Secure (sent over HTTPS only), HttpOnly (hidden from scripts, essential for session cookies) and SameSite=Lax unless they are needed cross-site.',
		details
	})
}

// ---------------------------------------------------------------------------------------------
// Third-party code: outdated libraries, Subresource Integrity
// ---------------------------------------------------------------------------------------------

interface LibraryRule {
	name: string
	pattern: RegExp
	/** The first version without the listed problem, or null when every version is affected. */
	fixedIn: (version: string) => string | null
	why: string
}

const LIBRARY_RULES: LibraryRule[] = [
	{
		name: 'jQuery',
		pattern: /jquery[@/-]v?(\d+\.\d+\.\d+)/i,
		fixedIn: () => '3.5.0',
		why: 'cross-site scripting in HTML handling (CVE-2020-11022, CVE-2020-11023)'
	},
	{
		name: 'jQuery UI',
		pattern: /jquery-?ui[@/-]v?(\d+\.\d+\.\d+)/i,
		fixedIn: () => '1.13.2',
		why: 'cross-site scripting (CVE-2021-41184, CVE-2022-31160)'
	},
	{
		name: 'Bootstrap',
		pattern: /bootstrap[@/-]v?(\d+\.\d+\.\d+)/i,
		fixedIn: (v) =>
			compareVersions(v, '4.0.0') < 0
				? '3.4.1'
				: compareVersions(v, '5.0.0') < 0
					? '4.3.1'
					: '0',
		why: 'cross-site scripting in tooltips and popovers (CVE-2019-8331)'
	},
	{
		name: 'AngularJS',
		pattern: /angular(?:\.?js)?[@/-]v?(1\.\d+\.\d+)/i,
		fixedIn: () => null,
		why: 'AngularJS reached end of life in January 2022 and gets no security fixes'
	},
	{
		name: 'Lodash',
		pattern: /lodash(?:\.?js)?[@/-]v?(\d+\.\d+\.\d+)/i,
		fixedIn: () => '4.17.21',
		why: 'command injection and prototype pollution (CVE-2021-23337, CVE-2020-8203)'
	},
	{
		name: 'Moment.js',
		pattern: /moment(?:\.?js)?[@/-]v?(\d+\.\d+\.\d+)/i,
		fixedIn: () => '2.29.4',
		why: 'slow regular expression denial of service (CVE-2022-31129)'
	}
]

/** Libraries whose version can be read from a script address, with any known problem. */
export function findLibraries(
	urls: string[]
): { name: string; version: string; fixedIn: string | null; why: string; vulnerable: boolean }[] {
	const found = new Map<string, ReturnType<typeof findLibraries>[number]>()
	for (const url of urls) {
		for (const rule of LIBRARY_RULES) {
			const version = url.match(rule.pattern)?.[1]
			if (!version || found.has(`${rule.name}@${version}`)) continue
			const fixedIn = rule.fixedIn(version)
			const vulnerable = fixedIn === null || compareVersions(version, fixedIn) < 0
			found.set(`${rule.name}@${version}`, {
				name: rule.name,
				version,
				fixedIn,
				why: rule.why,
				vulnerable
			})
		}
	}

	return [...found.values()]
}

function scriptUrls($: CheerioRoot): string[] {
	return $('script[src]')
		.map((_, el) => $(el).attr('src') || '')
		.get()
		.filter(Boolean)
}

function librariesCheck(ctx: AuditContext): CheckResult {
	const base = {
		id: 'vulnerable-libraries',
		title: 'Outdated JavaScript libraries',
		weight: 1,
		priority: 'high' as const
	}
	const libraries = findLibraries(scriptUrls(ctx.$))
	if (!libraries.length) {
		return check({
			...base,
			status: 'info',
			weight: 0,
			summary: 'No well-known libraries with a version in their address were found.'
		})
	}
	const vulnerable = libraries.filter((l) => l.vulnerable)
	const details = [
		tableDetail(
			['Library', 'Version', 'Status'],
			libraries.map((l) => [
				l.name,
				l.version,
				!l.vulnerable ? 'OK' : l.fixedIn ? `Update to ${l.fixedIn}+: ${l.why}` : l.why
			])
		)
	]
	if (!vulnerable.length) {
		return check({
			...base,
			status: 'pass',
			summary: `${formatCount(libraries.length, 'library', 'libraries')} found, none with known security problems.`,
			details
		})
	}

	return check({
		...base,
		status: 'fail',
		summary: `${vulnerable.map((l) => `${l.name} ${l.version}`).join(', ')} ${vulnerable.length === 1 ? 'has' : 'have'} known security problems.`,
		recommendation:
			'Update these libraries to a fixed version (or replace end-of-life ones) and retest the pages that use them. Attackers scan for these versions automatically.',
		details
	})
}

function subresourceIntegrityCheck(ctx: AuditContext): CheckResult {
	const { $ } = ctx
	const base = {
		id: 'subresource-integrity',
		title: 'Subresource Integrity on CDN files',
		weight: 0.5,
		priority: 'low' as const
	}
	const fromCdn: { url: string; integrity: boolean }[] = []
	$('script[src], link[rel~="stylesheet"][href]').each((_, el) => {
		const url = $(el).attr('src') || $(el).attr('href') || ''
		const host = hostOf(url, ctx.finalUrl)
		if (host && PUBLIC_CDNS.includes(host))
			fromCdn.push({ url, integrity: Boolean($(el).attr('integrity')) })
	})
	if (!fromCdn.length) {
		return check({
			...base,
			status: 'info',
			weight: 0,
			summary: 'No scripts or stylesheets are loaded from public CDNs.'
		})
	}
	const missing = fromCdn.filter((f) => !f.integrity)
	if (!missing.length) {
		return check({
			...base,
			status: 'pass',
			summary: `All ${formatCount(fromCdn.length, 'file')} from public CDNs are pinned with an integrity hash.`
		})
	}

	return check({
		...base,
		status: 'warn',
		summary: `${formatCount(missing.length, 'file')} from public CDNs ${missing.length === 1 ? 'has' : 'have'} no integrity hash.`,
		recommendation:
			'Add integrity="sha384-…" and crossorigin="anonymous" to these tags (cdnjs and jsDelivr show the hash), so a compromised CDN cannot swap in malicious code.',
		details: [listDetail(missing.map((m) => m.url))]
	})
}

// ---------------------------------------------------------------------------------------------
// Domain and disclosure: email authentication, security.txt, version leaks, server
// ---------------------------------------------------------------------------------------------

function emailAuthCheck(ctx: AuditContext): CheckResult {
	const { dns } = ctx
	const base = {
		id: 'email-auth',
		title: 'Email authentication (SPF and DMARC)',
		weight: 1,
		priority: 'low' as const
	}
	if (!dns) {
		return check({
			...base,
			status: 'info',
			weight: 0,
			summary: "The domain's DNS records could not be looked up."
		})
	}
	const spfRecords = dns.spfRecords ?? (dns.spf ? [dns.spf] : [])
	const spf = spfRecords[0]
	const dmarc = dns.dmarc
	const sendsMail = dns.mx.length > 0
	const severe: string[] = []
	const weak: string[] = []

	if (spfRecords.length > 1) {
		severe.push(
			`${spfRecords.length} SPF records were found; receivers treat that as an error and ignore SPF.`
		)
	} else if (!spf) {
		weak.push('There is no SPF record.')
	} else {
		const all = spf.match(/(?:^|\s)([+~?-]?)all(?:\s|$)/i)
		const redirect = /(?:^|\s)redirect=/i.test(spf)
		if (all && (all[1] === '+' || all[1] === ''))
			severe.push('SPF ends in +all, which lets anyone send mail as this domain.')
		else if (all?.[1] === '?') weak.push('SPF ends in ?all, which tells receivers nothing.')
		else if (!all && !redirect) weak.push("SPF doesn't end in ~all or -all.")
	}

	if (!dmarc) {
		weak.push('There is no DMARC record.')
	} else {
		const policy = dmarc.match(/(?:^|;)\s*p\s*=\s*(\w+)/i)?.[1]?.toLowerCase()
		const pct = Number(dmarc.match(/(?:^|;)\s*pct\s*=\s*(\d+)/i)?.[1] ?? 100)
		if (!policy) weak.push('The DMARC record has no p= policy, so it is invalid.')
		else if (policy === 'none')
			weak.push('DMARC is p=none (monitoring only), so spoofed mail is still delivered.')
		if (policy && policy !== 'none' && pct < 100)
			weak.push(`DMARC only applies to ${pct}% of mail (pct=${pct}).`)
		if (!/(?:^|;)\s*rua\s*=/i.test(dmarc))
			weak.push('DMARC has no rua= address, so you get no reports.')
	}

	const details: Detail[] = [
		{
			kind: 'kv',
			items: [
				['SPF', spfRecords.join(' | ') || 'Not found'],
				['DMARC', dmarc || 'Not found'],
				['Mail servers', dns.mx.slice(0, 3).join(', ') || 'None']
			]
		}
	]
	if (!severe.length && !weak.length) {
		return check({
			...base,
			status: 'pass',
			summary: 'SPF and an enforced DMARC policy protect the domain from email spoofing.',
			details
		})
	}
	details.unshift(listDetail([...severe, ...weak]))
	const nothing = !spf && !dmarc

	return check({
		...base,
		status: severe.length || nothing ? 'fail' : 'warn',
		summary: severe[0] ?? (nothing ? 'The domain has no SPF or DMARC record.' : weak[0]),
		recommendation: sendsMail
			? 'Publish one SPF record ending in ~all or -all that lists every service that sends your mail, set up DKIM signing, then publish DMARC with a rua= address and move from p=none to p=quarantine or p=reject once reports are clean.'
			: 'This domain has no mail servers. Publish v=spf1 -all and v=DMARC1; p=reject so nobody can send email pretending to be it.',
		details
	})
}

function securityTxtCheck(ctx: AuditContext): CheckResult {
	const base = {
		id: 'security-txt',
		title: 'security.txt',
		weight: 0.5,
		priority: 'low' as const
	}
	const file = ctx.securityTxt
	const recommendation =
		'Publish /.well-known/security.txt with a Contact: (email or form) and an Expires: date within a year, so people who find a vulnerability know how to tell you (RFC 9116).'
	if (!file?.found) {
		return check({
			...base,
			status: 'info',
			weight: 0,
			summary: 'The site has no security.txt file.',
			recommendation
		})
	}
	const expires = file.expires ? new Date(file.expires) : undefined
	const expired = expires && !Number.isNaN(expires.getTime()) && expires.getTime() < Date.now()
	const problems = [
		!file.contact?.length && 'has no Contact: field',
		!file.expires && 'has no Expires: field',
		expired && `expired on ${expires!.toDateString()}`
	].filter(Boolean) as string[]
	const details: Detail[] = [
		{
			kind: 'kv',
			items: [
				['File', file.url],
				['Contact', file.contact?.join(', ') || 'Missing'],
				['Expires', file.expires || 'Missing']
			]
		}
	]
	if (problems.length) {
		return check({
			...base,
			status: 'warn',
			summary: `security.txt ${problems.join(' and ')}.`,
			recommendation,
			details
		})
	}

	return check({
		...base,
		status: 'pass',
		summary: 'security.txt tells researchers how to report a vulnerability.',
		details
	})
}

function serverSignatureCheck(ctx: AuditContext): CheckResult {
	const { headers } = ctx.page
	const server = headers.get('server') || ''
	const leaks = [
		/\d/.test(server) && `Server: ${server}`,
		headers.get('x-powered-by') && `X-Powered-By: ${headers.get('x-powered-by')}`,
		headers.get('x-aspnet-version') && `X-AspNet-Version: ${headers.get('x-aspnet-version')}`,
		headers.get('x-aspnetmvc-version') &&
			`X-AspNetMvc-Version: ${headers.get('x-aspnetmvc-version')}`,
		/\d/.test(ctx.generator || '') && `<meta name="generator" content="${ctx.generator}">`
	].filter(Boolean) as string[]
	const base = {
		id: 'server-signature',
		title: 'Software version exposure',
		weight: 0.5,
		priority: 'low' as const
	}
	if (!leaks.length) {
		return check({
			...base,
			status: 'pass',
			summary: "Headers and meta tags don't reveal software versions."
		})
	}

	return check({
		...base,
		status: 'warn',
		summary: 'The site reveals which software (and often which version) it runs.',
		recommendation:
			"Remove X-Powered-By and version headers, hide the server version (e.g. server_tokens off in nginx) and remove the generator meta tag, so attackers can't match the site to known weaknesses. Keeping the software updated matters more.",
		details: [listDetail(leaks)]
	})
}

function serverInfoCheck(ctx: AuditContext): CheckResult {
	const hosting = ctx.tech.filter((t) => ['CDN', 'Hosting', 'Web server'].includes(t.category))

	return check({
		id: 'server',
		title: 'Server',
		status: 'info',
		weight: 0,
		priority: 'low',
		summary: hosting.length
			? `Served by ${hosting.map((t) => t.name).join(', ')}.`
			: 'Where the site is served from.',
		details: [
			{
				kind: 'kv',
				items: [
					['IP address', ctx.dns?.ip || 'Unknown'],
					['IPv6', ctx.dns?.ipv6 || 'Not available'],
					['Server', ctx.page.headers.get('server') || 'Not disclosed']
				]
			}
		]
	})
}

export function securityChecks(ctx: AuditContext): CheckResult[] {
	return [
		httpsCheck(ctx),
		httpsRedirectCheck(ctx),
		certificateCheck(ctx),
		mixedContentCheck(ctx),
		hstsCheck(ctx),
		cspCheck(ctx),
		headersCheck(ctx),
		librariesCheck(ctx),
		subresourceIntegrityCheck(ctx),
		cookiesCheck(ctx),
		emailAuthCheck(ctx),
		securityTxtCheck(ctx),
		serverSignatureCheck(ctx),
		serverInfoCheck(ctx)
	]
}
