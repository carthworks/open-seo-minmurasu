import type { Metadata } from 'next'
import { getPublicSettings } from '@server/settings'
import { ServicesScreen } from '@web/screens/services-screen'

export const metadata: Metadata = {
	title: 'Our Services',
	description:
		'MIN MURASU digital marketing and SEO services: technical SEO, local SEO, AI search optimization, speed, and content strategy.'
}

const ServicesPage = async () => {
	const settings = await getPublicSettings()

	return <ServicesScreen settings={settings} />
}

export default ServicesPage

