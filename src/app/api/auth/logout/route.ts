import { NextResponse } from 'next/server'
import { ADMIN_COOKIE_NAME } from '@shared/auth'

export const dynamic = 'force-dynamic'

/** POST /api/auth/logout — clears the admin session cookie. */
export async function POST(request: Request): Promise<Response> {
	const isHttps =
		request.headers.get('x-forwarded-proto') === 'https' || request.url.startsWith('https://')
	const response = NextResponse.json({ ok: true })
	response.cookies.set(ADMIN_COOKIE_NAME, '', {
		httpOnly: true,
		sameSite: 'lax',
		secure: isHttps,
		path: '/',
		maxAge: 0
	})

	return response
}
