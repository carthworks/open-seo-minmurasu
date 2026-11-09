import type { Metadata } from 'next'
import { getPublicSettings } from '@server/settings'
import { ChecklistScreen } from '@web/screens/checklist-screen'

export const metadata: Metadata = {
	title: '2027 SEO Checklist',
	description: 'Interactive SEO checklist for Technical SEO, Local Maps, AI search, Speed, and WCAG accessibility.'
}

const ChecklistPage = async () => {
	const settings = await getPublicSettings()

	return <ChecklistScreen settings={settings} />
}

export default ChecklistPage

