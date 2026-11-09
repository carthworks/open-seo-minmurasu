import type { PublicSettings } from '@shared/settings'

export interface ChecklistTask {
	id: string
	category: 'technical' | 'onpage' | 'local' | 'ai' | 'speed' | 'a11y'
	categoryLabel: string
	title: string
	description: string
	priority: 'high' | 'medium' | 'low'
}

export interface ChecklistScreenProps {
	settings: PublicSettings
}
