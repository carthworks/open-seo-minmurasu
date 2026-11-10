import type { BacklinkRecord, LinkRecord } from '@shared/link-intelligence'

function escapeCsv(value: string | number | null | undefined): string {
	if (value === null || value === undefined) return '""'
	const str = String(value)
	if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
		return `"${str.replace(/"/g, '""')}"`
	}

	return `"${str}"`
}

/**
 * Generates CSV string for internal links inventory.
 */
export function exportInternalLinksCsv(links: LinkRecord[]): string {
	const headers = [
		'Source Page URL',
		'Destination URL',
		'Normalized Destination URL',
		'Anchor Text',
		'HTTP Status Code',
		'Follow/Nofollow',
		'Link Type',
		'Discovery Date'
	]

	const rows = links.map((l) => [
		escapeCsv(l.sourceUrl),
		escapeCsv(l.destinationUrl),
		escapeCsv(l.normalizedDestinationUrl),
		escapeCsv(l.anchorText),
		escapeCsv(l.httpStatus ?? 'Unknown'),
		escapeCsv(l.isFollow ? 'follow' : 'nofollow'),
		escapeCsv(l.linkType),
		escapeCsv(l.discoveredAt)
	])

	return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n')
}

/**
 * Generates CSV string for external links inventory.
 */
export function exportExternalLinksCsv(links: LinkRecord[]): string {
	const headers = [
		'Source Page URL',
		'Destination Domain',
		'Destination URL',
		'Anchor Text',
		'HTTP Status Code',
		'Follow/Nofollow',
		'Link Type',
		'Discovery Date'
	]

	const rows = links.map((l) => [
		escapeCsv(l.sourceUrl),
		escapeCsv(l.destinationDomain),
		escapeCsv(l.destinationUrl),
		escapeCsv(l.anchorText),
		escapeCsv(l.httpStatus ?? 'Unknown'),
		escapeCsv(l.isFollow ? 'follow' : 'nofollow'),
		escapeCsv(l.linkType),
		escapeCsv(l.discoveredAt)
	])

	return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n')
}

/**
 * Generates CSV string for backlinks inventory.
 */
export function exportBacklinksCsv(backlinks: BacklinkRecord[]): string {
	const headers = [
		'Referring Domain',
		'Referring Page URL',
		'Target Page URL',
		'Anchor Text',
		'Follow/Nofollow',
		'First Seen Date',
		'Last Seen Date',
		'Backlink Data Provider'
	]

	const rows = backlinks.map((b) => [
		escapeCsv(b.referringDomain),
		escapeCsv(b.referringPageUrl),
		escapeCsv(b.targetPageUrl),
		escapeCsv(b.anchorText),
		escapeCsv(b.isFollow ? 'follow' : 'nofollow'),
		escapeCsv(b.firstSeen),
		escapeCsv(b.lastSeen),
		escapeCsv(b.provider.toUpperCase())
	])

	return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n')
}

