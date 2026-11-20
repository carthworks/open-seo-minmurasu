import type { Metadata } from 'next'
import { listLeadReports } from '@server/store'
import { LeadsScreen } from '@web/screens/leads-screen'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
	title: 'Captured Leads',
	robots: { index: false, follow: false }
}

const LeadsPage = async () => {
	const leads = await listLeadReports()

	return <LeadsScreen leads={leads} now={Date.now()} />
}

export default LeadsPage
