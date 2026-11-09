import type { PublicSettings } from '@shared/settings'
import type { IconName } from '@web/components/icon'

export interface ServiceItem {
	id: string
	title: string
	icon: IconName
	badge: string
	description: string
	deliverables: string[]
}

export interface ServicesScreenProps {
	settings: PublicSettings
}
