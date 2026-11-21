import type { AuditReport } from '@shared/types'

export type LeadSortKey = 'createdAt' | 'fullName' | 'company' | 'score' | 'priority'
export type SortDir = 'asc' | 'desc'

export interface LeadsScreenProps {
	leads: AuditReport[]
	now: number
}
