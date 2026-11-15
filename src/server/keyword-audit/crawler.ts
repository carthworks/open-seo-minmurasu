import * as cheerio from 'cheerio'
import { decodeHtml, normalizeInputUrl, safeFetch, stripWww } from '@server/audit/http'
import { countWords, extractText } from '@server/audit/parse'
import { resolveUrl } from '@server/audit/url'

const SKIPPED_EXTENSIONS =
	/\.(jpe?g|png|gif|webp|avif|svg|ico|bmp|tiff?|pdf|zip|gz|rar|7z|mp4|mov|webm|mp3|wav|ogg|css|js|mjs|json|xml|txt|csv|docx?|xlsx?|pptx?|woff2?|ttf|eot|exe|dmg)$/i

export interface RawPageData {
	url: string
	finalUrl: string
	statusCode: number
	title: string
	description: string
	canonical?: string
	noindex: boolean
	h1: string[]
	h2: string[]
	h3: string[]
	bodyText: string
	wordCount: number
	internalLinks: string[]
	externalLinks: string[]
	images: { src: string; alt: string | null; filename: string; isGenericFilename: boolean }[]
	hasLocalBusinessSchema: boolean
	hasPhoneLink: boolean
	hasAddressKeywords: boolean
	hasMapEmbed: boolean
	detectedLocations: string[]
	responseMs: number
}

export interface CrawlWebsiteResult {
	startUrl: string
	domain: string
	pages: RawPageData[]
	totalDiscovered: number
	sitemapFound: boolean
	sitemapUrl?: string
	robotsFound: boolean
	robotsUrl?: string
}

function extractFilename(url: string): string {
	try {
		const u = new URL(url)
		const parts = u.pathname.split('/')

		return parts[parts.length - 1] || ''
	} catch {
		return ''
	}
}

const GENERIC_IMAGE_PATTERN = /^(img|image|photo|picture|screenshot|banner|logo|icon|graphic|asset|untitled|dsc|scan)[-_0-9]*\.(jpe?g|png|webp|avif|svg|gif)$/i

function isGenericFilename(filename: string): boolean {
	return GENERIC_IMAGE_PATTERN.test(filename) || /^([0-9a-f]{8,}|[0-9]{4,})\.[a-z]{3,4}$/i.test(filename)
}

const COMMON_LOCATION_KEYWORDS = new Set([
	'chennai', 'tamil nadu', 'mumbai', 'delhi', 'bangalore', 'bengaluru', 'hyderabad',
	'coimbatore', 'madurai', 'trichy', 'salem', 'tirunelveli', 'india', 'usa', 'uk',
	'london', 'new york', 'california', 'texas', 'florida', 'toronto', 'canada',
	'dubai', 'uae', 'singapore', 'sydney', 'australia'
])

export async function crawlWebsiteForKeywords(
	input: string,
	options: {
		maxPages?: number
		onProgress?: (progress: { step: string; label: string; pct: number }) => void
	} = {}
): Promise<CrawlWebsiteResult> {
	const maxPages = Math.max(1, Math.min(options.maxPages || 15, 50))
	const startUrl = normalizeInputUrl(input)
	const startObj = new URL(startUrl)
	const host = stripWww(startObj.hostname).toLowerCase()
	const domain = host

	options.onProgress?.({ step: 'init', label: 'Checking robots.txt & sitemap', pct: 5 })

	let sitemapFound = false
	let sitemapUrl: string | undefined
	let robotsFound = false
	const robotsUrl = `${startObj.origin}/robots.txt`

	try {
		const robotsRes = await safeFetch(robotsUrl, { timeoutMs: 5000, maxBytes: 256 * 1024 })
		if (robotsRes.status === 200 && !robotsRes.contentType.includes('text/html')) {
			robotsFound = true
			const match = robotsRes.body.toString('utf8').match(/Sitemap:\s*(\S+)/i)
			if (match) {
				sitemapUrl = match[1]
				sitemapFound = true
			}
		}
	} catch {
		// robots not available
	}

	if (!sitemapFound) {
		const candidates = ['sitemap.xml', 'sitemap_index.xml']
		for (const c of candidates) {
			try {
				const sRes = await safeFetch(`${startObj.origin}/${c}`, { timeoutMs: 5000, maxBytes: 512 * 1024 })
				if (sRes.status === 200 && !sRes.contentType.includes('text/html')) {
					sitemapFound = true
					sitemapUrl = `${startObj.origin}/${c}`
					break
				}
			} catch {
				// try next
			}
		}
	}

	const queue: string[] = [startUrl]
	const visited = new Set<string>()
	const discoveredUrls = new Set<string>([startUrl])
	const pages: RawPageData[] = []

	while (queue.length > 0 && pages.length < maxPages) {
		const currentUrl = queue.shift()!
		const cleanCurrent = currentUrl.split('#')[0]
		if (visited.has(cleanCurrent)) continue
		visited.add(cleanCurrent)

		const pct = Math.min(85, Math.round(10 + (pages.length / maxPages) * 75))
		options.onProgress?.({
			step: 'crawl',
			label: `Crawling page ${pages.length + 1} of ${maxPages}: ${cleanCurrent.replace(/^https?:\/\//, '')}`,
			pct
		})

		try {
			const res = await safeFetch(currentUrl, {
				timeoutMs: 12_000,
				maxBytes: 3 * 1024 * 1024
			})

			if (res.status >= 400 || !res.contentType.includes('html')) {
				continue
			}

			const finalUrl = res.url
			const finalObj = new URL(finalUrl)
			if (stripWww(finalObj.hostname).toLowerCase() !== host) {
				continue
			}

			const $ = cheerio.load(decodeHtml(res.body, res.contentType))

			// Meta Information
			const title = $('title').first().text().replace(/\s+/g, ' ').trim()
			const description = ($('meta[name="description" i]').attr('content') || '').replace(/\s+/g, ' ').trim()
			const canonicalRaw = $('link[rel="canonical" i]').attr('href')
			const canonical = canonicalRaw ? resolveUrl(canonicalRaw, finalObj) || canonicalRaw : undefined
			const robotsMeta = [
				$('meta[name="robots" i]').attr('content') || '',
				res.headers.get('x-robots-tag') || ''
			].join(',')
			const noindex = /noindex|none/i.test(robotsMeta)

			// Headings
			const h1: string[] = []
			$('h1').each((_, el) => {
				const text = $(el).text().replace(/\s+/g, ' ').trim()
				if (text) h1.push(text)
			})

			const h2: string[] = []
			$('h2').each((_, el) => {
				const text = $(el).text().replace(/\s+/g, ' ').trim()
				if (text) h2.push(text)
			})

			const h3: string[] = []
			$('h3').each((_, el) => {
				const text = $(el).text().replace(/\s+/g, ' ').trim()
				if (text) h3.push(text)
			})

			// Content
			const bodyText = extractText($)
			const wordCount = countWords(bodyText)

			// Images
			const images: RawPageData['images'] = []
			$('img').each((_, el) => {
				const src = $(el).attr('src') || $(el).attr('data-src') || ''
				const alt = $(el).attr('alt') ?? null
				const filename = extractFilename(src)
				if (src) {
					images.push({
						src,
						alt: alt ? alt.trim() : null,
						filename,
						isGenericFilename: isGenericFilename(filename)
					})
				}
			})

			// Links
			const internalLinks: string[] = []
			const externalLinks: string[] = []
			$('a[href]').each((_, el) => {
				const raw = ($(el).attr('href') || '').trim()
				if (!raw || raw.startsWith('#') || /^(javascript|sms|data|mailto):/i.test(raw)) return

				const resolved = resolveUrl(raw, finalObj)
				if (!resolved) return

				try {
					const target = new URL(resolved)
					if (target.protocol !== 'http:' && target.protocol !== 'https:') return
					if (SKIPPED_EXTENSIONS.test(target.pathname)) return

					const targetHost = stripWww(target.hostname).toLowerCase()
					if (targetHost === host) {
						internalLinks.push(resolved)
						const targetClean = resolved.split('#')[0]
						discoveredUrls.add(targetClean)
						if (!visited.has(targetClean) && !queue.includes(targetClean)) {
							queue.push(targetClean)
						}
					} else {
						externalLinks.push(resolved)
					}
				} catch {
					// invalid target
				}
			})

			// Local SEO signals
			const htmlLower = res.body.toString('utf8').toLowerCase()
			const hasLocalBusinessSchema =
				/schema\.org\/(localbusiness|restaurant|dentist|legalbusiness|store|automotivebusiness|medicalbusiness)/i.test(
					htmlLower
				)
			const hasPhoneLink = $('a[href^="tel:" i]').length > 0
			const hasAddressKeywords = /address|location|pincode|postal|headquarters|contact us/i.test(bodyText)
			const hasMapEmbed = $('iframe[src*="google.com/maps" i], iframe[src*="maps.google" i]').length > 0

			const detectedLocations: string[] = []
			const textTokens = bodyText.toLowerCase()
			for (const loc of COMMON_LOCATION_KEYWORDS) {
				if (new RegExp(`\\b${loc}\\b`, 'i').test(textTokens)) {
					detectedLocations.push(loc.charAt(0).toUpperCase() + loc.slice(1))
				}
			}

			pages.push({
				url: currentUrl,
				finalUrl,
				statusCode: res.status,
				title,
				description,
				canonical,
				noindex,
				h1,
				h2,
				h3,
				bodyText,
				wordCount,
				internalLinks,
				externalLinks,
				images,
				hasLocalBusinessSchema,
				hasPhoneLink,
				hasAddressKeywords,
				hasMapEmbed,
				detectedLocations: [...new Set(detectedLocations)],
				responseMs: res.ttfbMs
			})
		} catch {
			// failed page fetch, continue crawl
		}
	}

	return {
		startUrl,
		domain,
		pages,
		totalDiscovered: discoveredUrls.size,
		sitemapFound,
		sitemapUrl,
		robotsFound,
		robotsUrl
	}
}
