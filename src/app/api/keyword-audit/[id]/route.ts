import { deleteKeywordAudit, getKeywordAudit } from '@server/keyword-audit'

export const dynamic = 'force-dynamic'

interface Params {
	params: Promise<{ id: string }>
}

/** GET /api/keyword-audit/[id]: returns the complete 10-category keyword audit report */
export async function GET(_request: Request, { params }: Params): Promise<Response> {
	const { id } = await params
	const report = await getKeywordAudit(id)

	if (!report) {
		return Response.json({ error: 'Keyword audit report not found.' }, { status: 404 })
	}

	return Response.json(report)
}

/** DELETE /api/keyword-audit/[id]: deletes the report */
export async function DELETE(_request: Request, { params }: Params): Promise<Response> {
	const { id } = await params
	const ok = await deleteKeywordAudit(id)

	if (!ok) {
		return Response.json({ error: 'Report not found' }, { status: 404 })
	}

	return Response.json({ ok: true })
}
