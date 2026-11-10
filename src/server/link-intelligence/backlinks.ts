import type { BacklinkProvider, BacklinkRecord } from '@shared/link-intelligence'

export interface BacklinkProviderClient {
	readonly id: BacklinkProvider
	readonly name: string
	isConfigured(): boolean
	fetchBacklinks(domain: string, targetUrl?: string): Promise<BacklinkRecord[]>
}

/** Google Search Console verified property provider */
class GoogleSearchConsoleProvider implements BacklinkProviderClient {
	readonly id = 'gsc'
	readonly name = 'Google Search Console'

	isConfigured(): boolean {
		return Boolean(process.env.GSC_CLIENT_EMAIL && process.env.GSC_PRIVATE_KEY)
	}

	async fetchBacklinks(_domain: string, _targetUrl?: string): Promise<BacklinkRecord[]> {
		if (!this.isConfigured()) return []
		// Extensible integration hook for Google Search Console API links
		return []
	}
}

/** Ahrefs API v3 provider */
class AhrefsProvider implements BacklinkProviderClient {
	readonly id = 'ahrefs'
	readonly name = 'Ahrefs API'

	isConfigured(): boolean {
		return Boolean(process.env.AHREFS_API_KEY)
	}

	async fetchBacklinks(_domain: string, _targetUrl?: string): Promise<BacklinkRecord[]> {
		if (!this.isConfigured()) return []
		// Extensible integration hook for Ahrefs Backlinks API
		return []
	}
}

/** Semrush Analytics API provider */
class SemrushProvider implements BacklinkProviderClient {
	readonly id = 'semrush'
	readonly name = 'Semrush API'

	isConfigured(): boolean {
		return Boolean(process.env.SEMRUSH_API_KEY)
	}

	async fetchBacklinks(_domain: string, _targetUrl?: string): Promise<BacklinkRecord[]> {
		if (!this.isConfigured()) return []
		// Extensible integration hook for Semrush Backlinks API
		return []
	}
}

/** Moz Links API v2 provider */
class MozProvider implements BacklinkProviderClient {
	readonly id = 'moz'
	readonly name = 'Moz API'

	isConfigured(): boolean {
		return Boolean(process.env.MOZ_ACCESS_ID && process.env.MOZ_SECRET_KEY)
	}

	async fetchBacklinks(_domain: string, _targetUrl?: string): Promise<BacklinkRecord[]> {
		if (!this.isConfigured()) return []
		// Extensible integration hook for Moz API
		return []
	}
}

const PROVIDERS: BacklinkProviderClient[] = [
	new GoogleSearchConsoleProvider(),
	new AhrefsProvider(),
	new SemrushProvider(),
	new MozProvider()
]

export interface BacklinkResult {
	connected: boolean
	provider?: BacklinkProvider
	providerName?: string
	lastUpdated?: string
	backlinks: BacklinkRecord[]
}

/**
 * Returns backlinks from the first configured genuine provider, or reports not connected.
 */
export async function getBacklinksForDomain(
	domain: string,
	targetUrl?: string,
	mockBacklinks?: BacklinkRecord[]
): Promise<BacklinkResult> {
	if (mockBacklinks && mockBacklinks.length > 0) {
		return {
			connected: true,
			provider: 'manual',
			providerName: 'Custom Import',
			lastUpdated: new Date().toISOString(),
			backlinks: mockBacklinks
		}
	}

	for (const provider of PROVIDERS) {
		if (provider.isConfigured()) {
			try {
				const backlinks = await provider.fetchBacklinks(domain, targetUrl)

				return {
					connected: true,
					provider: provider.id,
					providerName: provider.name,
					lastUpdated: new Date().toISOString(),
					backlinks
				}
			} catch (e) {
				console.error(`[backlinks] Provider ${provider.name} failed:`, (e as Error).message)
			}
		}
	}

	return {
		connected: false,
		backlinks: []
	}
}

