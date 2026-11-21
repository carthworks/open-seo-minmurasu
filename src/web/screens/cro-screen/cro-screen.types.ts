import type { CroScanPreview } from '@shared/types'

export interface CroScreenProps {
	initialUrl: string
	result?: CroScanPreview
	error?: string
}
