import { handleGetLinks } from '@server/link-intelligence/api-handler'

export const dynamic = 'force-dynamic'

export async function GET(
	request: Request,
	context: { params: Promise<{ id: string }> }
): Promise<Response> {
	const { id } = await context.params
	const url = new URL(request.url)

	return handleGetLinks(id, 'internal', url)
}

