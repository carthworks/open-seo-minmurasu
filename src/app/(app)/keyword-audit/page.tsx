import { listKeywordAudits } from '@server/keyword-audit'
import { getSettings } from '@server/store'
import { KeywordAuditLauncher } from '@web/screens/keyword-audit-screen'
import type { Metadata } from 'next'

export const metadata: Metadata = {
	title: 'Website SEO & Keyword Audit Tool',
	description:
		'Audit prospective client websites for keyword targeting, headings hierarchy, technical SEO, and 10 vital audit areas.'
}

const KeywordAuditPage = async () => {
	const [audits, settings] = await Promise.all([listKeywordAudits(), getSettings()])

	return (
		<KeywordAuditLauncher
			audits={audits}
			pageLimit={settings.crawlPageLimit || 50}
			defaultMaxPages={settings.keywordAuditPageLimit || 15}
		/>
	)
}

export default KeywordAuditPage
