import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { DATA_DIR, getReport, isValidId } from '@server/store'
import { redis, redisConfig } from '@server/redis'
import type { LinkInventory, LinkRecord } from '@shared/link-intelligence'
import { analyzeLinkInventory } from './analyze'
import { extractDomain, isInternalLink, normalizeLinkUrl } from './normalize'

const remote = redisConfig()
const KEY_PREFIX = 'openseo:'

async function readText(name: string): Promise<string | null> {
	if (remote) {
		const text = await redis(remote, 'GET', KEY_PREFIX + name)

		return typeof text === 'string' ? text : null
	}
	try {
		return await readFile(join(DATA_DIR, name), 'utf8')
	} catch {
		return null
	}
}

async function writeJson(name: string, data: unknown): Promise<void> {
	const text = JSON.stringify(data)
	if (remote) {
		await redis(remote, 'SET', KEY_PREFIX + name, text)

		return
	}
	const file = join(DATA_DIR, name)
	await mkdir(dirname(file), { recursive: true })
	const temp = `${file}.${randomUUID()}.tmp`
	await writeFile(temp, text)
	await rename(temp, file)
}

/**
 * Saves a complete link inventory for a scan ID.
 */
export async function saveLinkInventory(inventory: LinkInventory): Promise<void> {
	if (!isValidId(inventory.summary.scanId)) return
	await writeJson(`links/${inventory.summary.scanId}.json`, inventory)
}

/**
 * Retrieves the link inventory for a scan ID.
 * If not yet saved as a standalone file, reconstructs it from the saved report.
 */
export async function getLinkInventory(scanId: string): Promise<LinkInventory | null> {
	if (!isValidId(scanId)) return null

	const raw = await readText(`links/${scanId}.json`)
	if (raw) {
		try {
			return JSON.parse(raw) as LinkInventory
		} catch {
			// fall back to rebuilding from report
		}
	}

	// Fallback: build from existing saved report if available
	const report = await getReport(scanId)
	if (!report) return null

	const internal: LinkRecord[] = []
	const external: LinkRecord[] = []

	// Discover links from checks details
	const brokenCheck = report.checks.find((c) => c.id === 'broken-links')
	const anchorCheck = report.checks.find((c) => c.id === 'anchor-text')
	const nofollowCheck = report.checks.find((c) => c.id === 'internal-nofollow')

	const sourceUrl = report.finalUrl || report.url
	const domain = report.domain

	// Extract broken links
	if (brokenCheck?.details) {
		for (const detail of brokenCheck.details) {
			if (detail.kind === 'table') {
				for (const row of detail.rows) {
					const dest = String(row[0])
					const status = Number(row[1]) || (typeof row[1] === 'number' ? row[1] : 404)
					const isInternal = isInternalLink(dest, domain)
					const norm = normalizeLinkUrl(dest, sourceUrl) || dest

					const rec: LinkRecord = {
						id: `${scanId}-brk-${randomUUID().slice(0, 6)}`,
						scanId,
						sourceUrl,
						destinationUrl: dest,
						normalizedDestinationUrl: norm,
						destinationDomain: extractDomain(dest),
						anchorText: '',
						linkType: 'html',
						relAttributes: [],
						isInternal,
						isFollow: true,
						httpStatus: status,
						state: 'broken',
						isHttps: dest.startsWith('https://'),
						discoveredAt: report.createdAt
					}

					if (isInternal) internal.push(rec)
					else external.push(rec)
				}
			}
		}
	}

	// Extract anchor text issues
	if (anchorCheck?.details) {
		for (const detail of anchorCheck.details) {
			if (detail.kind === 'list') {
				for (const item of detail.items) {
					let anchor = ''
					let href = item
					if (item.startsWith('"') && item.includes('": ')) {
						const parts = item.split('": ')
						anchor = parts[0].slice(1)
						href = parts[1] || ''
					} else if (item.startsWith('No text: ')) {
						href = item.replace('No text: ', '')
					}
					if (!href) continue

					const isInternal = isInternalLink(href, domain)
					const norm = normalizeLinkUrl(href, sourceUrl) || href

					const rec: LinkRecord = {
						id: `${scanId}-anc-${randomUUID().slice(0, 6)}`,
						scanId,
						sourceUrl,
						destinationUrl: href,
						normalizedDestinationUrl: norm,
						destinationDomain: extractDomain(href),
						anchorText: anchor,
						linkType: 'html',
						relAttributes: [],
						isInternal,
						isFollow: true,
						httpStatus: 200,
						state: 'ok',
						isHttps: href.startsWith('https://'),
						discoveredAt: report.createdAt
					}

					if (isInternal) internal.push(rec)
					else external.push(rec)
				}
			}
		}
	}

	// Extract nofollow internal links
	if (nofollowCheck?.details) {
		for (const detail of nofollowCheck.details) {
			if (detail.kind === 'list') {
				for (const href of detail.items) {
					const norm = normalizeLinkUrl(href, sourceUrl) || href
					internal.push({
						id: `${scanId}-nf-${randomUUID().slice(0, 6)}`,
						scanId,
						sourceUrl,
						destinationUrl: href,
						normalizedDestinationUrl: norm,
						destinationDomain: extractDomain(href),
						anchorText: 'Internal Page',
						linkType: 'html',
						relAttributes: ['nofollow'],
						isInternal: true,
						isFollow: false,
						httpStatus: 200,
						state: 'ok',
						isHttps: href.startsWith('https://'),
						discoveredAt: report.createdAt
					})
				}
			}
		}
	}

	// Ensure there are at least sample representative links if page had internal/external counts
	if (internal.length === 0) {
		internal.push({
			id: `${scanId}-int-1`,
			scanId,
			sourceUrl,
			destinationUrl: sourceUrl,
			normalizedDestinationUrl: sourceUrl,
			destinationDomain: domain,
			anchorText: report.overview.title || 'Home',
			linkType: 'canonical',
			relAttributes: ['canonical'],
			isInternal: true,
			isFollow: true,
			httpStatus: 200,
			state: 'ok',
			isHttps: sourceUrl.startsWith('https://'),
			discoveredAt: report.createdAt
		})
	}

	const inventory = analyzeLinkInventory({
		scanId,
		domain,
		url: sourceUrl,
		internal,
		external,
		backlinkProviderConnected: false
	})

	// Cache inventory for subsequent calls
	await saveLinkInventory(inventory).catch(() => {})

	return inventory
}

/**
 * Deletes link inventory for a scan ID.
 */
export async function deleteLinkInventory(scanId: string): Promise<boolean> {
	if (!isValidId(scanId)) return false
	if (remote) {
		await redis(remote, 'DEL', `${KEY_PREFIX}links/${scanId}.json`)

		return true
	}
	try {
		await rm(join(DATA_DIR, `links/${scanId}.json`), { force: true })

		return true
	} catch {
		return false
	}
}

