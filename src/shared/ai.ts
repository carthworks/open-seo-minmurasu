export type AiAnalysisMode = 'performance' | 'roadmap' | 'vibecode' | 'strategy'

export interface AiAnalyzeRequest {
	reportId?: string
	keywordAuditId?: string
	mode: AiAnalysisMode
}

export interface AiStatusResponse {
	ok: boolean
	enabled: boolean
	baseUrl: string
	selectedModel: string
	models: string[]
	error?: string
}

export const AI_ANALYSIS_MODES: {
	id: AiAnalysisMode
	label: string
	description: string
}[] = [
	{
		id: 'performance',
		label: 'Performance Report',
		description: 'Executive summary explaining scores, bottlenecks, and business impact.'
	},
	{
		id: 'roadmap',
		label: 'Development Roadmap',
		description: 'Prioritized Sprint 1 / 2 / 3 action plan grouped by impact and effort.'
	},
	{
		id: 'vibecode',
		label: 'AI VibeCode Prompt',
		description: 'Stack-specific prompt engineered for Cursor, Claude Code, or Antigravity.'
	},
	{
		id: 'strategy',
		label: 'Strategic Recommendations',
		description: 'SEO growth, keyword targeting, CRO, and lead-generation strategy.'
	}
]
