import type { Metadata } from 'next'
import { HelpScreen } from '@web/screens/help-screen'

export const metadata: Metadata = {
	title: 'Help & How-To Guide',
	description:
		'Step-by-step guide to running SEO audits, Website SEO & Keyword Audits, Link Intelligence, WHOIS lookups, and VibeCode AI prompts.'
}

const HelpPage = () => {
	return <HelpScreen />
}

export default HelpPage
