import type { Metadata } from 'next'
import { getPublicSettings } from '@server/settings'
import { SitemapScreen } from '@web/screens/sitemap-screen'

export const metadata: Metadata = {
	title: 'Sitemap Explorer',
	description: 'Inspect XML sitemaps, discover page URLs, and queue automated SEO audits.'
}

const SitemapPage = async () => {
	const settings = await getPublicSettings()

	return <SitemapScreen settings={settings} />
}

export default SitemapPage

