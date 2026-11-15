import type { IconName } from '@web/components/icon'

export interface HelpGuideStep {
	title: string
	detail: string
}

export interface HelpGuideSection {
	id: string
	title: string
	badge: string
	icon: IconName
	summary: string
	href: string
	ctaLabel: string
	steps: HelpGuideStep[]
	tips?: string[]
}

export interface HelpFaqItem {
	question: string
	answer: string
}
