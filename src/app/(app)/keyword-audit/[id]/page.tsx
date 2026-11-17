import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getKeywordAudit } from '@server/keyword-audit'
import { getPublicSettings } from '@server/settings'
import { KeywordAuditReportView } from '@web/screens/keyword-audit-screen'

interface PageProps {
	params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const { id } = await params
	const report = await getKeywordAudit(id)

	return {
		title: report ? `Keyword Audit · ${report.domain}` : 'Keyword Audit Report',
		robots: { index: false }
	}
}

const KeywordAuditDetailPage = async ({ params }: PageProps) => {
	const { id } = await params
	const [report, settings] = await Promise.all([getKeywordAudit(id), getPublicSettings()])

	if (!report) notFound()

	return <KeywordAuditReportView report={report} settings={settings} />
}

export default KeywordAuditDetailPage
