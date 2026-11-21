import type { AnalyticsScanPreview } from '@shared/types'

export interface AnalyticsScreenProps {
	initialUrl: string
	result?: AnalyticsScanPreview
	error?: string
}
