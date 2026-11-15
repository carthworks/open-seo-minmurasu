import type { WebsiteKeywordAuditReport } from '@shared/keyword-audit'

function escapeCsvField(val: string | number | boolean | null | undefined): string {
	if (val === null || val === undefined) return ''
	const str = String(val)
	if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
		return `"${str.replace(/"/g, '""')}"`
	}

	return str
}

export function exportKeywordsToCsv(report: WebsiteKeywordAuditReport): string {
	const headers = [
		'Keyword',
		'Type',
		'Intent',
		'Score',
		'Frequency',
		'Density %',
		'In Title',
		'In Meta Description',
		'In H1',
		'In H2',
		'In URL',
		'Pages Found Count',
	]

	const rows = report.keywordCandidates.map((k) => [
		escapeCsvField(k.term),
		escapeCsvField(k.type),
		escapeCsvField(k.intent),
		escapeCsvField(k.score),
		escapeCsvField(k.frequency),
		escapeCsvField(k.density),
		escapeCsvField(k.placement.inTitle ? 'Yes' : 'No'),
		escapeCsvField(k.placement.inMetaDescription ? 'Yes' : 'No'),
		escapeCsvField(k.placement.inH1 ? 'Yes' : 'No'),
		escapeCsvField(k.placement.inH2 ? 'Yes' : 'No'),
		escapeCsvField(k.placement.inUrl ? 'Yes' : 'No'),
		escapeCsvField(k.pagesFound.length),
	])

	return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
}

export function exportPagesToCsv(report: WebsiteKeywordAuditReport): string {
	const headers = [
		'URL',
		'Pathname',
		'Status Code',
		'Title',
		'Title Length',
		'Title Status',
		'Meta Description',
		'Description Length',
		'Description Status',
		'Canonical',
		'Noindex',
		'Word Count',
		'H1 Count',
		'H1 Text',
		'Primary Keyword',
		'Missing Target in Headings',
		'Images Total',
		'Images Missing Alt',
		'Broken Links',
	]

	const rows = report.pages.map((p) => [
		escapeCsvField(p.url),
		escapeCsvField(p.pathname),
		escapeCsvField(p.statusCode),
		escapeCsvField(p.title),
		escapeCsvField(p.titleLength),
		escapeCsvField(p.titleStatus),
		escapeCsvField(p.description),
		escapeCsvField(p.descriptionLength),
		escapeCsvField(p.descriptionStatus),
		escapeCsvField(p.canonical ?? ''),
		escapeCsvField(p.noindex ? 'Yes' : 'No'),
		escapeCsvField(p.wordCount),
		escapeCsvField(p.h1.length),
		escapeCsvField(p.h1.join(' | ')),
		escapeCsvField(p.primaryKeyword ?? ''),
		escapeCsvField(p.missingTargetInHeadings ? 'Yes' : 'No'),
		escapeCsvField(p.imagesTotal),
		escapeCsvField(p.imagesMissingAlt),
		escapeCsvField(p.brokenLinks),
	])

	return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
}
