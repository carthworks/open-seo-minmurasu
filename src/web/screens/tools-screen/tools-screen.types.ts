import type { PublicSettings } from '@shared/settings'

export type ActiveTool = 'serp' | 'schema' | 'robots' | 'whois'

export interface ToolsScreenProps {
	settings: PublicSettings
}
