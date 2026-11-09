import type { PublicSettings } from '@shared/settings'

export interface SitemapUrlEntry {
	loc: string
	lastmod?: string
	changefreq?: string
	priority?: string
}

export interface SitemapScreenProps {
	settings: PublicSettings
}
