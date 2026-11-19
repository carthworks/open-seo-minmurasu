import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { scanAnalyticsForVisitor } from '@server/analytics-scan'
import { ipFromHeaders } from '@server/limits'
import { AnalyticsScreen } from '@web/screens/analytics-screen'

export const metadata: Metadata = { title: 'Analytics & Tracking' }

const AnalyticsPage = async (props: PageProps<'/analytics'>) => {
	const { url } = await props.searchParams
	const input = typeof url === 'string' ? url.trim() : ''
	if (!input) return <AnalyticsScreen initialUrl="" />
	const outcome = await scanAnalyticsForVisitor(input, ipFromHeaders(await headers()))

	return (
		<AnalyticsScreen
			initialUrl={input}
			result={'result' in outcome ? outcome.result : undefined}
			error={'error' in outcome ? outcome.error : undefined}
		/>
	)
}

export default AnalyticsPage
