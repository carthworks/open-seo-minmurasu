import { NextResponse, type NextRequest } from 'next/server'
import { ADMIN_COOKIE_NAME, verifyAdminToken } from '@shared/auth'

/**
 * Pages and endpoints anyone may use: the audit and preview tools, and shared reports and
 * comparisons (`/report/<id>` and `/report/<id>/compare/<id>`).
 */
const PUBLIC_PAGES = new Set([
	'/',
	'/login',
	'/preview',
	'/analytics',
	'/cro',
	'/llm-visibility',
	'/tools',
	'/checklist',
	'/services',
	'/contact',
	'/about',
	'/help',
	'/sitemap',
	'/compare',
	'/sitemap.xml',
	'/robots.txt'
])

function isPublic(request: NextRequest): boolean {
	const { pathname } = request.nextUrl
	if (PUBLIC_PAGES.has(pathname) || pathname.startsWith('/report/')) {
		return true
	}
	if (
		pathname === '/api/audit' ||
		pathname === '/api/preview' ||
		pathname === '/api/llm-visibility' ||
		pathname === '/api/auth/login' ||
		pathname === '/api/auth/logout'
	) {
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
 * With ADMIN_PASSWORD set, leads, history, crawls and settings ask for the password via `/login`.
 * Without it everything is open, which is fine on your own computer.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
	const json = request.headers.get('content-type')?.includes('application/json')
	if (request.method === 'POST' && JSON_ONLY.test(request.nextUrl.pathname) && !json) {
		return NextResponse.json(
			{ error: 'Send JSON, with Content-Type: application/json.' },
			{ status: 415 }
		)
	}
	const password = process.env.ADMIN_PASSWORD
	if (!password || isPublic(request)) return nextWithCsp(request)

	const sessionToken = request.cookies.get(ADMIN_COOKIE_NAME)?.value
	if (await verifyAdminToken(sessionToken, password)) {
		return nextWithCsp(request)
	}

	const header = request.headers.get('authorization') ?? ''
	const [scheme, encoded] = header.split(' ')
	if (scheme === 'Basic' && encoded && atob(encoded) === `admin:${password}`) {
		return nextWithCsp(request)
	}

	if (request.nextUrl.pathname.startsWith('/api/')) {
		return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 })
	}

	const loginUrl = request.nextUrl.clone()
	loginUrl.pathname = '/login'
	loginUrl.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`)

	return NextResponse.redirect(loginUrl)
}

export const config = {
	matcher: ['/((?!_next/|favicon.ico|icon.svg).*)']
}
