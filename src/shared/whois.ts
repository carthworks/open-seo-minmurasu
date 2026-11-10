export interface WhoisRecord {
	domain: string
	registrar?: string
	registeredAt?: string
	expiresAt?: string
	updatedAt?: string
	ageYears?: number
	ageText?: string
	daysUntilExpiration?: number
	isExpiringSoon?: boolean
	nameservers: string[]
	status: string[]
	dnssec?: boolean
	ip?: string
	country?: string
	whoisServer?: string
	organization?: string
	fetchedAt: string
	source: 'rdap' | 'dns' | 'fallback'
}

export interface WhoisLookupResult {
	ok: boolean
	domain: string
	data?: WhoisRecord
	error?: string
}

