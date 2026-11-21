import type { AuditReport } from '@shared/types'

export interface LeadsScreenProps {
	leads: AuditReport[]
	now: number
}
