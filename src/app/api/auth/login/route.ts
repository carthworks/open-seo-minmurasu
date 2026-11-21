import { NextResponse } from 'next/server'
import {
	ADMIN_COOKIE_NAME,
	ADMIN_SESSION_TTL_SECONDS,
	createAdminToken
} from '@shared/auth'

export const dynamic = 'force-dynamic'

/** POST /api/auth/login { password } — sets an HttpOnly signed session cookie. */
export async function POST(request: Request): Promise<Response> {
	const expected = process.env.ADMIN_PASSWORD?.trim()
	if (!expected) {
		return NextResponse.json({ ok: true })
	}

	const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
	const password = typeof body.password === 'string' ? body.password.trim() : ''

	if (!password || password !== expected) {
		return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 })
	}

	const isHttps =
		request.headers.get('x-forwarded-proto') === 'https' || request.url.startsWith('https://')
	const token = await createAdminToken(expected)
	const response = NextResponse.json({ ok: true })
	response.cookies.set(ADMIN_COOKIE_NAME, token, {
		httpOnly: true,
		sameSite: 'lax',
		secure: isHttps,
		path: '/',
		maxAge: ADMIN_SESSION_TTL_SECONDS
	})

	return response
}
