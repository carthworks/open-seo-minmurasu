import type {
	BacklinkRecord,
	LinkIssue,
	LinkRecord,
	LinkSummary
} from '@shared/link-intelligence'
import type { ReportSummary } from '@shared/types'

export type LinkIntelligenceTab = 'internal' | 'external' | 'backlinks'

export interface LinkIntelligenceProps {
	/** Recent scans available to inspect. */
	recentReports: ReportSummary[]
	/** Pre-fetched initial link summary or null if no scans. */
	initialSummary?: LinkSummary | null
	/** Pre-fetched initial issues. */
	initialIssues?: LinkIssue[]
	/** Initial internal links preview. */
	initialInternal?: LinkRecord[]
	/** Initial external links preview. */
	initialExternal?: LinkRecord[]
	/** Initial backlinks preview. */
	initialBacklinks?: BacklinkRecord[]
}

