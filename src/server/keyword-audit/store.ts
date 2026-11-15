import type { KeywordAuditSummary, WebsiteKeywordAuditReport } from '@shared/keyword-audit'
import { isValidId, readJson, removeJson, updateJson, writeJson } from '../store'

const INDEX_FILE = 'keyword-audits.json'

export async function saveKeywordAudit(report: WebsiteKeywordAuditReport): Promise<void> {
	await writeJson(`keyword-audits/${report.id}.json`, report)

	const primaryKeywords = report.keywordCandidates.filter((k) => k.type === 'primary').length
	const criticalIssues = report.categories.reduce(
		(sum, c) => sum + (c.grade === 'F' || c.grade === 'D' ? 1 : 0),
		0
	)

	const summary: KeywordAuditSummary = {
		id: report.id,
		url: report.url,
		domain: report.domain,
		createdAt: report.createdAt,
		pagesCrawled: report.pagesCrawled,
		overallScore: report.overallScore,
		overallGrade: report.overallGrade,
		primaryKeywordCount: primaryKeywords,
		criticalIssuesCount: criticalIssues,
	}

	await updateJson<KeywordAuditSummary[]>(INDEX_FILE, [], (list) => {
		const filtered = list.filter((item) => item.id !== report.id)

		return [summary, ...filtered].slice(0, 50)
	})
}

export async function getKeywordAudit(id: string): Promise<WebsiteKeywordAuditReport | null> {
	if (!isValidId(id)) return null

	return readJson<WebsiteKeywordAuditReport | null>(`keyword-audits/${id}.json`, null)
}

export function listKeywordAudits(): Promise<KeywordAuditSummary[]> {
	return readJson<KeywordAuditSummary[]>(INDEX_FILE, [])
}

export async function deleteKeywordAudit(id: string): Promise<boolean> {
	if (!isValidId(id)) return false
	await removeJson(`keyword-audits/${id}.json`)
	let found = false
	await updateJson<KeywordAuditSummary[]>(INDEX_FILE, [], (list) => {
		found = list.some((item) => item.id === id)

		return list.filter((item) => item.id !== id)
	})

	return found
}
