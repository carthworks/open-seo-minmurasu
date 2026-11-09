import type { AuditReport } from '@shared/types'

export interface VibecodeModalProps {
	report: AuditReport
	open: boolean
	onClose: () => void
}
