import { getReport } from '@server/store'
import { lookupDomainWhois } from '@server/whois/lookup'

export const dynamic = 'force-dynamic'

export async function GET(
	_request: Request,
	context: { params: Promise<{ id: string }> }
): Promise<Response> {
	const { id } = await context.params
	const report = await getReport(id)

	if (!report) {
		return Response.json({ error: 'Report not found' }, { status: 404 })
	}

	const result = await lookupDomainWhois(report.domain)

	return Response.json(result)
}

