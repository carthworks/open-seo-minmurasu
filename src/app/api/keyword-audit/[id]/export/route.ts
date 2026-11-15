import { exportKeywordsToCsv, exportPagesToCsv, getKeywordAudit } from '@server/keyword-audit'

export const dynamic = 'force-dynamic'

interface Params {
	params: Promise<{ id: string }>
}

/** GET /api/keyword-audit/[id]/export?type=keywords|pages: downloads CSV */
export async function GET(request: Request, { params }: Params): Promise<Response> {
	const { id } = await params
	const report = await getKeywordAudit(id)

	if (!report) {
		return Response.json({ error: 'Keyword audit report not found.' }, { status: 404 })
	}

	const url = new URL(request.url)
	const type = url.searchParams.get('type') ?? 'keywords'

	if (type === 'pages') {
		const csv = exportPagesToCsv(report)

		return new Response(csv, {
			headers: {
				'Content-Type': 'text/csv; charset=utf-8',
				'Content-Disposition': `attachment; filename="${report.domain}-pages-audit.csv"`
			}
		})
	}

	const csv = exportKeywordsToCsv(report)

	return new Response(csv, {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="${report.domain}-keywords-audit.csv"`
		}
	})
}
