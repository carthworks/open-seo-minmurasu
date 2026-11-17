import type { ThemeSetting } from '@shared/settings'
import type { IconName } from '@web/components/icon'
import type { SettingsTabId } from './settings-screen.types'

export const THEMES: { value: ThemeSetting; label: string }[] = [
	{ value: 'light', label: 'Light' },
	{ value: 'dark', label: 'Dark' },
	{ value: 'system', label: 'Match system' }
]

export const SETTINGS_TABS: { id: SettingsTabId; label: string; icon: IconName }[] = [
	{ id: 'general', label: 'General & Branding', icon: 'image' },
	{ id: 'audits', label: 'Audits & Keywords', icon: 'audit' },
	{ id: 'links', label: 'Links & Backlinks', icon: 'compare' },
	{ id: 'ai', label: 'Local AI', icon: 'sparkline' },
	{ id: 'alerts', label: 'Alerts', icon: 'bell' },
	{ id: 'about', label: 'About & Storage', icon: 'info' }
]
