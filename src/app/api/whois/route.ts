import { cleanDomainName, lookupDomainWhois } from '@server/whois/lookup'

export const dynamic = 'force-dynamic'

export async function GET(request: Request): Promise<Response> {
	const url = new URL(request.url)
	const domain = url.searchParams.get('domain') || url.searchParams.get('q') || ''
	const clean = cleanDomainName(domain)

	if (!clean) {
		return Response.json({ error: 'Please provide a valid domain name query parameter.' }, { status: 400 })
	}

	const result = await lookupDomainWhois(clean)

	return Response.json(result)
}

