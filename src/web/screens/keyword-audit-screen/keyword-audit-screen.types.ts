import type {
	KeywordAuditCategoryId,
	KeywordAuditSummary,
	SearchIntent,
	WebsiteKeywordAuditReport
} from '@shared/keyword-audit'
import type { PublicSettings } from '@shared/settings'

export interface KeywordAuditLauncherProps {
	audits: KeywordAuditSummary[]
	pageLimit: number
	defaultMaxPages?: number
}

export interface KeywordAuditReportViewProps {
	report: WebsiteKeywordAuditReport
	settings?: PublicSettings
}

export type KeywordFilterType = 'all' | 'primary' | 'secondary' | 'long-tail'
export type IntentFilterType = 'all' | SearchIntent

export interface KeywordFilterState {
	search: string
	type: KeywordFilterType
	intent: IntentFilterType
	sortBy: 'score' | 'frequency' | 'density' | 'term'
	sortDir: 'asc' | 'desc'
}

export interface PageFilterState {
	search: string
	status: 'all' | 'good' | 'warning' | 'missing'
	sortBy: 'pathname' | 'wordCount' | 'titleLength' | 'issues'
	sortDir: 'asc' | 'desc'
}

export type CategoryTabOption = {
	id: KeywordAuditCategoryId
	label: string
	badge?: number | string
}
