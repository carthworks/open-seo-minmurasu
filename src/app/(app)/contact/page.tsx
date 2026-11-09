import type { Metadata } from 'next'
import { getPublicSettings } from '@server/settings'
import { ContactScreen } from '@web/screens/contact-screen'

export const metadata: Metadata = {
	title: 'Contact Us',
	description: 'Contact MIN MURASU — digital marketing, technical SEO, and site audit agency.'
}

const ContactPage = async () => {
	const settings = await getPublicSettings()

	return <ContactScreen settings={settings} />
}

export default ContactPage

