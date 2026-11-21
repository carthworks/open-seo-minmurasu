export const ADMIN_COOKIE_NAME = 'openseo_admin'
export const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 days

const encoder = new TextEncoder()

async function hmacSign(payload: string, secret: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		'raw',
		encoder.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	)
	const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))

	return Array.from(new Uint8Array(sig))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('')
}

function timingSafeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false
	let diff = 0
	for (let i = 0; i < a.length; i++) {
		diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
	}

	return diff === 0
}

/** Creates a signed session token valid for 7 days. */
export async function createAdminToken(secret: string): Promise<string> {
	const exp = Math.floor(Date.now() / 1000) + ADMIN_SESSION_TTL_SECONDS
	const payload = String(exp)
	const sig = await hmacSign(payload, secret)

	return `${payload}.${sig}`
}

/** Verifies a signed session token against ADMIN_PASSWORD. */
export async function verifyAdminToken(token: string | undefined, secret: string): Promise<boolean> {
	if (!token) return false
	const dot = token.indexOf('.')
	if (dot <= 0) return false
	const payload = token.slice(0, dot)
	const sig = token.slice(dot + 1)
	const exp = Number(payload)
	if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false
	const expected = await hmacSign(payload, secret)

	return timingSafeEqual(sig, expected)
}
