import { NextResponse, type NextRequest } from 'next/server'

/**
 * Pages and endpoints anyone may use: the audit and preview tools, and shared reports and
 * comparisons (`/report/<id>` and `/report/<id>/compare/<id>`).
 */
function isPublic(request: NextRequest): boolean {
	const { pathname } = request.nextUrl
	if (
		['/', '/preview', '/analytics', '/cro', '/llm-visibility'].includes(pathname) ||
		pathname.startsWith('/report/')
	) {
		return true
	}
	if (pathname === '/api/audit' || pathname === '/api/preview' || pathname === '/api/llm-visibility') {
		return true
	}

	return (
		request.method === 'GET' &&
		(/^\/api\/reports\/[^/]+$/.test(pathname) || pathname === '/api/compare')
	)
}

/**
 * Endpoints that act for the admin. A page on another site can make a visitor's browser POST plain
 * text or a form, but not JSON, so these only take JSON.
 */
const JSON_ONLY = /^\/api\/(monitors|alerts|mcp)(\/|$)/

function buildCsp(nonce: string): string {
	const isDev = process.env.NODE_ENV !== 'production'
	const scriptSrc = `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`

	return [
		"default-src 'self'",
		scriptSrc,
		"style-src 'self' 'unsafe-inline'",
		"img-src 'self' data: blob: https:",
		"font-src 'self' data:",
		"connect-src 'self' http://localhost:* http://127.0.0.1:*",
		"object-src 'none'",
		"base-uri 'self'",
		"frame-ancestors 'self'"
	].join('; ')
}

function nextWithCsp(request: NextRequest): NextResponse {
	const nonce = btoa(crypto.randomUUID())
	const csp = buildCsp(nonce)
	const requestHeaders = new Headers(request.headers)
	requestHeaders.set('x-nonce', nonce)
	requestHeaders.set('Content-Security-Policy', csp)

	const response = NextResponse.next({ request: { headers: requestHeaders } })
	response.headers.set('Content-Security-Policy', csp)

	return response
}

/**
 * With ADMIN_PASSWORD set, history, crawls and settings ask for a password (user "admin").
 * Without it everything is open, which is fine on your own computer.
 */
export function proxy(request: NextRequest): NextResponse {
	const json = request.headers.get('content-type')?.includes('application/json')
	if (request.method === 'POST' && JSON_ONLY.test(request.nextUrl.pathname) && !json) {
		return NextResponse.json(
			{ error: 'Send JSON, with Content-Type: application/json.' },
			{ status: 415 }
		)
	}
	const password = process.env.ADMIN_PASSWORD
	if (!password || isPublic(request)) return nextWithCsp(request)
	const header = request.headers.get('authorization') ?? ''
	const [scheme, encoded] = header.split(' ')
	if (scheme === 'Basic' && encoded && atob(encoded) === `admin:${password}`) {
		return nextWithCsp(request)
	}

	return new NextResponse('Sign in to manage OpenSEO.', {
		status: 401,
		headers: { 'www-authenticate': 'Basic realm="OpenSEO admin", charset="UTF-8"' }
	})
}

export const config = {
	matcher: ['/((?!_next/|favicon.ico|icon.svg).*)']
}
