import type { AuditContext } from '@server/audit/context'
import type { CheckResult, Detail } from '@shared/types'
import { inCategory, listDetail } from './check'

const check = inCategory('local')

const LOCAL_TYPES = new Set([
	'LocalBusiness',
	'Store',
	'Restaurant',
	'ProfessionalService',
	'Dentist',
	'MedicalBusiness',
	'RealEstateAgent',
	'FinancialService',
	'AutomotiveBusiness',
	'LegalService',
	'HomeAndConstructionBusiness',
	'LodgingBusiness',
	'FoodEstablishment',
	'HealthAndBeautyBusiness',
	'TouristAttraction',
	'DryCleaningOrLaundry',
	'EmergencyService',
	'EmploymentAgency',
	'EntertainmentBusiness',
	'GovernmentOffice',
	'Library',
	'RecyclingCenter',
	'SelfStorage',
	'ShoppingCenter',
	'SportsActivityLocation',
	'TravelAgency'
])

function localSchemaCheck(ctx: AuditContext): CheckResult {
	const base = {
		id: 'local-schema',
		title: 'LocalBusiness structured data',
		weight: 3,
		priority: 'high' as const
	}

	const allTypes = [...new Set([...ctx.jsonLd.types, ...ctx.microdataTypes])]
	const localMatch = allTypes.filter((t) => LOCAL_TYPES.has(t) || t.endsWith('Business'))

	if (localMatch.length > 0) {
		return check({
			...base,
			status: 'pass',
			summary: `The page declares LocalBusiness structured data (${localMatch.join(', ')}).`,
			details: [{ kind: 'list', items: localMatch.map((t) => `schema.org/${t}`) }]
		})
	}

	if (allTypes.includes('Organization') || allTypes.includes('Corporation')) {
		return check({
			...base,
			status: 'warn',
			summary: 'Organization structured data was found, but not a specific LocalBusiness schema.',
			recommendation:
				'For physical locations or local service companies, specialize your schema to schema.org/LocalBusiness (or a subtype like ProfessionalService, Store) with address and telephone to qualify for Google Maps and Local Pack highlights.'
		})
	}

	return check({
		...base,
		status: 'warn',
		summary: 'No LocalBusiness structured data found on the page.',
		recommendation:
			'Add schema.org/LocalBusiness JSON-LD markup with your business name, address, telephone, opening hours and coordinates to appear in local search results and map packs.'
	})
}

function napContactCheck(ctx: AuditContext): CheckResult {
	const base = {
		id: 'local-nap',
		title: 'NAP & telephone contact',
		weight: 2,
		priority: 'medium' as const
	}

	const { $, mailtoLinks } = ctx
	const telLinks = $('a[href^="tel:" i]')
		.map((_, el) => ($(el).attr('href') || '').replace(/^tel:/i, '').trim())
		.get()
		.filter(Boolean)
	const hasAddressTag = $('address').length > 0 || $('[itemprop="address"]').length > 0
	const hasPostalIndicator = /\b\d{5,6}\b/.test(ctx.text) // 5-6 digit postal / pin code
	const hasAddress = hasAddressTag || hasPostalIndicator
	const hasEmail = mailtoLinks.length > 0

	const foundDetails: string[] = []
	if (telLinks.length > 0) foundDetails.push(`Phone: ${telLinks[0]}`)
	if (hasEmail) foundDetails.push(`Email: ${mailtoLinks[0]}`)
	if (hasAddressTag) foundDetails.push('HTML <address> tag detected')
	else if (hasPostalIndicator) foundDetails.push('Postal/PIN code detected in page content')

	const details: Detail[] = foundDetails.length > 0 ? [listDetail(foundDetails)] : []

	if (telLinks.length > 0 && hasAddress) {
		return check({
			...base,
			status: 'pass',
			summary: 'Clickable telephone link and physical address details are clearly accessible.',
			details
		})
	}

	if (telLinks.length > 0) {
		return check({
			...base,
			status: 'warn',
			summary: 'Clickable telephone link found, but no clear physical address or <address> tag was detected.',
			recommendation:
				'Ensure your full physical address, city, and postal code are displayed in the footer or contact section so search engines can verify your location.',
			details
		})
	}

	if (hasAddress) {
		return check({
			...base,
			status: 'warn',
			summary: 'Address information detected, but no clickable telephone link (tel:) was found.',
			recommendation:
				'Wrap your contact phone number in a <a href="tel:..."> link so mobile visitors can tap to call immediately.',
			details
		})
	}

	return check({
		...base,
		status: 'fail',
		summary: 'No clickable telephone number (tel:) or physical address detected.',
		recommendation:
			'Local search engines prioritize businesses with clear Name, Address, and Phone (NAP) details. Add a clickable telephone number and your physical address in the footer.'
	})
}

function googleMapsCheck(ctx: AuditContext): CheckResult {
	const base = {
		id: 'local-maps',
		title: 'Google Maps presence',
		weight: 2,
		priority: 'medium' as const
	}

	const { $, links } = ctx
	const hasMapIframe = $('iframe[src*="google.com/maps"], iframe[src*="maps.google"]').length > 0
	const hasMapLink = links.some((l) =>
		/maps\.google\.|google\.com\/maps|goo\.gl\/maps|maps\.app\.goo\.gl/i.test(l.href)
	)

	if (hasMapIframe || hasMapLink) {
		return check({
			...base,
			status: 'pass',
			summary: hasMapIframe
				? 'The page embeds an interactive Google Map for customer directions.'
				: 'The page links directly to its Google Maps location or Google Business Profile.'
		})
	}

	return check({
		...base,
		status: 'warn',
		summary: 'No Google Maps embed or Google Business Profile link detected.',
		recommendation:
			'Embed a Google Map or link directly to your Google Business Profile to build local trust and make it easy for customers to get driving directions.'
	})
}

/** Runs every Local SEO check on the page. */
export function localChecks(ctx: AuditContext): CheckResult[] {
	return [localSchemaCheck(ctx), napContactCheck(ctx), googleMapsCheck(ctx)]
}
