import type { MetadataRoute } from 'next'
import { getSettings } from '@server/store'

export const dynamic = 'force-dynamic'

const PUBLIC_PATHS = [
	'/',
	'/keyword-audit',
	'/analytics',
	'/cro',
	'/llm-visibility',
	'/preview',
	'/tools',
	'/checklist',
	'/services',
	'/contact',
	'/about',
	'/help'
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const settings = await getSettings()
	const base = (settings.appUrl || 'http://localhost:3000').replace(/\/+$/, '')
	const now = new Date()

	return PUBLIC_PATHS.map((path) => ({
		url: `${base}${path}`,
		lastModified: now,
		changeFrequency: path === '/' ? 'daily' : 'weekly',
		priority: path === '/' ? 1 : 0.7
	}))
}
