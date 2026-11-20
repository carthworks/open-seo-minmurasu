import type { CroScanPreview, CroScanResult, CroSignal } from '@shared/types'
import type { CheerioRoot } from './context'
import { fetchPage } from './fetch-page'
import { normalizeInputUrl } from './http'
import { parsePage } from './parse'

const CTA_ACTION_PATTERN =
	/\b(get started|start free|free trial|free audit|book (?:a )?(?:call|demo|meeting|consultation)|schedule|request (?:a )?(?:quote|demo)|get (?:a )?quote|contact us|talk to|speak with|sign up|join now|buy now|shop now|order now|subscribe|download|claim|try (?:it )?free|apply now)\b/i

const LIVE_CHAT_SIGNATURES: [string, RegExp][] = [
	['Intercom', /widget\.intercom\.io|intercomSettings/i],
	['Drift', /js\.driftt\.com|drift\.load/i],
	['Tawk.to', /embed\.tawk\.to|Tawk_API/i],
	['Crisp', /client\.crisp\.chat|\$crisp/i],
	['Zendesk Chat', /static\.zdassets\.com|zE\(/i],
	['HubSpot Chat', /js\.usemessages\.com|HubSpotConversations/i],
	['Tidio', /code\.tidio\.co|tidioChatApi/i],
	['LiveChat', /cdn\.livechatinc\.com|__lc/i],
	['Freshchat', /wchat\.freshchat\.com|fcWidget/i]
]

const EMBEDDED_FORM_SIGNATURES: [string, RegExp][] = [
	['HubSpot Forms', /js\.hsforms\.net|hbspt\.forms\.create/i],
	['Calendly', /assets\.calendly\.com|calendly\.com\//i],
	['Typeform', /embed\.typeform\.com|typeform\.com\/to\//i],
	['Jotform', /form\.jotform\.com/i],
	['Tally', /tally\.so\/embed/i],
	['Google Forms', /docs\.google\.com\/forms/i]
]

/** Scans parsed HTML for Conversion Rate Optimization (CRO) and lead capture signals. */
export function scanCro(html: string, $: CheerioRoot, schemaTypes: string[] = []): CroScanResult {
	const signals: CroSignal[] = []

	// 1. Primary Calls-to-Action (CTAs)
	const ctaLabels = new Set<string>()
	$('a, button, input[type="submit"]').each((_, el) => {
		const $el = $(el)
		const text = ($el.is('input') ? $el.attr('value') : $el.text())?.replace(/\s+/g, ' ').trim() || ''
		if (text && text.length <= 60 && CTA_ACTION_PATTERN.test(text)) {
			ctaLabels.add(text)
		}
	})
	const ctaSamples = [...ctaLabels].slice(0, 6)
	const ctaCount = ctaLabels.size

	signals.push({
		id: 'cro-cta',
		name: 'Calls-to-Action (CTAs)',
		category: 'Conversion Triggers',
		status: ctaCount > 0 ? 'pass' : 'warn',
		statusLabel: ctaCount > 0 ? `${ctaCount} detected` : 'None found',
		implementation:
			ctaCount > 0
				? `Found ${ctaCount} action-oriented CTA(s): ${ctaSamples.map((s) => `"${s}"`).join(', ')}.`
				: 'No clear action-oriented CTA buttons/links (e.g. "Get started", "Book a call", "Request quote") were detected.'
	})

	// 2. Lead Capture Forms & Friction
	let leadFormCount = 0
	let maxFormFields = 0
	let hasEmailField = false
	let hasPhoneField = false

	$('form').each((_, form) => {
		const $form = $(form)
		const role = ($form.attr('role') || '').toLowerCase()
		const action = ($form.attr('action') || '').toLowerCase()
		const inputs = $form.find('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]), select, textarea')
		const fieldCount = inputs.length

		const isSearchForm =
			role === 'search' ||
			action.includes('search') ||
			(fieldCount === 1 &&
				(inputs.first().attr('type') === 'search' ||
					/^(q|s|search|query)$/i.test(inputs.first().attr('name') || '')))

		if (isSearchForm || fieldCount === 0) return

		leadFormCount++
		if (fieldCount > maxFormFields) maxFormFields = fieldCount

		inputs.each((__, input) => {
			const type = ($(input).attr('type') || '').toLowerCase()
			const name = ($(input).attr('name') || '').toLowerCase()
			if (type === 'email' || name.includes('email')) hasEmailField = true
			if (type === 'tel' || name.includes('phone') || name.includes('tel')) hasPhoneField = true
		})
	})

	const embeddedForms = EMBEDDED_FORM_SIGNATURES.filter(([, re]) => re.test(html)).map(([name]) => name)
	const totalLeadForms = leadFormCount + embeddedForms.length
	const highFriction = maxFormFields > 5

	signals.push({
		id: 'cro-forms',
		name: 'Lead Capture Forms',
		category: 'Lead Capture',
		status: totalLeadForms === 0 ? 'warn' : highFriction ? 'warn' : 'pass',
		statusLabel:
			totalLeadForms === 0
				? 'No lead form'
				: highFriction
					? `High friction (${maxFormFields} fields)`
					: `${totalLeadForms} low-friction`,
		implementation:
			totalLeadForms === 0
				? 'No HTML lead/contact forms or embedded form tools (HubSpot, Calendly, Typeform) detected.'
				: [
						leadFormCount > 0
							? `${leadFormCount} HTML lead form(s) (max ${maxFormFields} visible field${maxFormFields === 1 ? '' : 's'}${hasEmailField ? ', email' : ''}${hasPhoneField ? ', phone' : ''}).`
							: '',
						embeddedForms.length > 0 ? `Embedded: ${embeddedForms.join(', ')}.` : ''
					]
						.filter(Boolean)
						.join(' ')
	})

	// 3. Direct Contact (Click-to-Call & WhatsApp)
	const hasPhoneLink = $('a[href^="tel:" i]').length > 0
	const hasWhatsApp = $('a[href*="wa.me/" i], a[href*="api.whatsapp.com" i], a[href^="whatsapp:" i]').length > 0
	const contactChannels = [hasPhoneLink && 'Click-to-call (tel:)', hasWhatsApp && 'WhatsApp'].filter(
		Boolean
	) as string[]

	signals.push({
		id: 'cro-direct-contact',
		name: 'Direct Contact (Phone & WhatsApp)',
		category: 'Instant Contact',
		status: contactChannels.length > 0 ? 'pass' : 'info',
		statusLabel: contactChannels.length > 0 ? contactChannels.join(' + ') : 'Not detected',
		implementation:
			contactChannels.length > 0
				? `Clickable ${contactChannels.join(' and ')} link(s) available for instant mobile conversion.`
				: 'No clickable tel: phone link or WhatsApp chat link found on the page.'
	})

	// 4. Live Chat / Chatbot Widgets
	const liveChatTools = LIVE_CHAT_SIGNATURES.filter(([, re]) => re.test(html)).map(([name]) => name)
	signals.push({
		id: 'cro-live-chat',
		name: 'Live Chat & Chatbots',
		category: 'Instant Contact',
		status: liveChatTools.length > 0 ? 'pass' : 'info',
		statusLabel: liveChatTools.length > 0 ? liveChatTools.join(', ') : 'None detected',
		implementation:
			liveChatTools.length > 0
				? `Detected live chat widget(s): ${liveChatTools.join(', ')}.`
				: 'No third-party live chat or conversational bot widget detected in HTML.'
	})

	// 5. Social Proof & Trust Boosters
	const hasReviewSchema = schemaTypes.some((t) => /Review|AggregateRating/i.test(t))
	const hasTestimonialMarkup =
		$('[class*="testimonial" i], [id*="testimonial" i], [class*="review" i], [id*="review" i], [class*="client-logo" i], [class*="trusted-by" i]').length > 0 ||
		/\b(trusted by|what our clients say|customer reviews|testimonials|case studies)\b/i.test($('body').text())

	const hasSocialProof = hasReviewSchema || hasTestimonialMarkup
	signals.push({
		id: 'cro-social-proof',
		name: 'Social Proof & Reviews',
		category: 'Trust & Persuasion',
		status: hasSocialProof ? 'pass' : 'warn',
		statusLabel: hasSocialProof ? 'Present' : 'Missing',
		implementation: hasSocialProof
			? `Detected social proof signals${hasReviewSchema ? ' (including Review/AggregateRating schema)' : ''} to reinforce buyer confidence.`
			: 'No testimonials, client logos, reviews, or Review/AggregateRating structured data detected.'
	})

	return {
		signals,
		ctaCount,
		ctaSamples,
		leadFormCount: totalLeadForms,
		maxFormFields,
		hasPhoneLink,
		hasWhatsApp,
		liveChatTools,
		hasSocialProof
	}
}

/** Fetches a single URL and runs only the CRO & Lead Capture scanner. */
export async function runCroScan(input: string): Promise<CroScanPreview> {
	const explicitScheme = /^https?:\/\//i.test(input.trim())
	const url = normalizeInputUrl(input)
	const page = await fetchPage(url, explicitScheme)
	const parsed = parsePage(page)

	return {
		url,
		finalUrl: page.url,
		title: parsed.title,
		cro: parsed.cro
	}
}
