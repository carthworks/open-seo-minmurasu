import type { Metadata } from 'next'
import { getPublicSettings } from '@server/settings'
import { ToolsScreen } from '@web/screens/tools-screen'

export const metadata: Metadata = {
	title: 'SEO Utilities & Tools',
	description: 'Free SEO tools: SERP preview simulator, Schema.org JSON-LD generator, and robots.txt tester.'
}

const ToolsPage = async () => {
	const settings = await getPublicSettings()

	return <ToolsScreen settings={settings} />
}

export default ToolsPage

