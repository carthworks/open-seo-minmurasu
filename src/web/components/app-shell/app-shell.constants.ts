import type { NavGroup } from './app-shell.types'

export const NAV: NavGroup[] = [
	{
		title: 'Audit',
		items: [
			{ href: '/', label: 'New audit', icon: 'audit' },
			{ href: '/preview', label: 'Share preview', icon: 'image' },
			{ href: '/history', label: 'History', icon: 'clock' },
			{ href: '/compare', label: 'Compare', icon: 'compare' }
		]
	},
	{
		title: 'Site',
		items: [
			{ href: '/crawls', label: 'Crawler', icon: 'crawl' },
			{ href: '/sitemap', label: 'Sitemap', icon: 'sitemap' },
			{ href: '/monitors', label: 'Monitors', icon: 'bell' }
		]
	},
	{
		title: 'Tools',
		items: [
			{ href: '/tools', label: 'SEO Utilities', icon: 'tools' },
			{ href: '/checklist', label: 'SEO Checklist', icon: 'checklist' }
		]
	},
	{
		title: 'Agency',
		items: [
			{ href: '/services', label: 'Services', icon: 'sparkline' },
			{ href: '/contact', label: 'Contact', icon: 'mail' },
			{ href: '/about', label: 'About us', icon: 'info' }
		]
	},
	{
		title: 'Workspace',
		items: [{ href: '/settings', label: 'Settings', icon: 'settings' }]
	}
]

export const REPOSITORY_URL = 'https://github.com/alexsilver8/open-seo'
