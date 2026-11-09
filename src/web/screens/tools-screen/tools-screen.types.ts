import type { PublicSettings } from '@shared/settings'

export type ActiveTool = 'serp' | 'schema' | 'robots'

export interface ToolsScreenProps {
	settings: PublicSettings
}
