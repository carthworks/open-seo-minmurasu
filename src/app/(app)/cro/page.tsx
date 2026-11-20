import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { scanCroForVisitor } from '@server/cro-scan'
import { ipFromHeaders } from '@server/limits'
import { CroScreen } from '@web/screens/cro-screen'

export const metadata: Metadata = { title: 'CRO & Lead Capture' }

const CroPage = async (props: PageProps<'/cro'>) => {
	const { url } = await props.searchParams
	const input = typeof url === 'string' ? url.trim() : ''
	if (!input) return <CroScreen initialUrl="" />
	const outcome = await scanCroForVisitor(input, ipFromHeaders(await headers()))

	return (
		<CroScreen
			initialUrl={input}
			result={'result' in outcome ? outcome.result : undefined}
			error={'error' in outcome ? outcome.error : undefined}
		/>
	)
}

export default CroPage
