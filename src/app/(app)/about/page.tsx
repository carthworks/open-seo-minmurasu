import type { Metadata } from 'next'
import { getPublicSettings } from '@server/settings'
import { AboutScreen } from '@web/screens/about-screen'

export const metadata: Metadata = {
	title: 'About us',
	description: 'About MIN MURASU — digital marketing, technical SEO, and site audit platform.'
}

const AboutPage = async () => {
	const settings = await getPublicSettings()

	return <AboutScreen settings={settings} />
}

export default AboutPage

