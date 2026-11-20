import type { AuditContext } from '@server/audit/context'
import type { CheckResult } from '@shared/types'
import { inCategory, listDetail, tableDetail } from './check'

const check = inCategory('cro')

function ctaCheck(ctx: AuditContext): CheckResult {
	const base = {
		id: 'cro-cta',
		title: 'Clear action-oriented Calls-to-Action (CTAs)',
		weight: 3,
		priority: 'high' as const
	}

	const { ctaCount, ctaSamples } = ctx.cro
	if (ctaCount > 0) {
		return check({
			...base,
			status: 'pass',
			summary: `Detected ${ctaCount} action-oriented CTA(s): ${ctaSamples.map((s) => `"${s}"`).join(', ')}.`,
			details: [listDetail(ctaSamples)]
		})
	}

	return check({
		...base,
		status: 'warn',
		summary: 'No clear action-oriented CTA buttons or links were detected on the page.',
		recommendation:
			'Add a prominent primary CTA above the fold (e.g. "Get a Free Audit", "Book a Call", "Start Free Trial") so visitors know the next step.'
	})
}

function leadFormsCheck(ctx: AuditContext): CheckResult {
	const base = {
		id: 'cro-forms',
		title: 'Lead capture forms & field friction',
		weight: 2,
		priority: 'high' as const
	}

	const { leadFormCount, maxFormFields } = ctx.cro
	const formSignal = ctx.cro.signals.find((s) => s.id === 'cro-forms')

	if (leadFormCount === 0) {
		return check({
			...base,
			status: 'warn',
			summary: formSignal?.implementation ?? 'No lead capture form or booking embed was found.',
			recommendation:
				'Include a short lead form or booking embed (such as HubSpot, Calendly, or Typeform) to capture high-intent visitors directly.'
		})
	}

	if (maxFormFields > 5) {
		return check({
			...base,
			status: 'warn',
			summary: `Lead form has ${maxFormFields} visible fields, which can create conversion friction.`,
			recommendation:
				'Trim non-essential fields (aim for 3–5 fields like Name, Email, and Message/Phone) to boost form completion rates.'
		})
	}

	return check({
		...base,
		status: 'pass',
		summary: formSignal?.implementation ?? `${leadFormCount} low-friction lead form(s) detected.`
	})
}

function directContactCheck(ctx: AuditContext): CheckResult {
	const base = {
		id: 'cro-direct-contact',
		title: 'Direct contact & instant messaging (Phone, WhatsApp, Chat)',
		weight: 2,
		priority: 'medium' as const
	}

	const { hasPhoneLink, hasWhatsApp, liveChatTools } = ctx.cro
	const channels = [
		hasPhoneLink && 'Click-to-call (tel:)',
		hasWhatsApp && 'WhatsApp',
		...liveChatTools
	].filter(Boolean) as string[]

	if (channels.length > 0) {
		return check({
			...base,
			status: 'pass',
			summary: `Instant conversion channel(s) available: ${channels.join(', ')}.`
		})
	}

	return check({
		...base,
		status: 'warn',
		summary: 'No clickable phone link (tel:), WhatsApp link, or live chat widget was detected.',
		recommendation:
			'Add a clickable tel: phone link, WhatsApp button, or lightweight live chat widget so mobile and high-intent visitors can reach you immediately.'
	})
}

function socialProofCheck(ctx: AuditContext): CheckResult {
	const base = {
		id: 'cro-social-proof',
		title: 'Social proof (testimonials, reviews & client trust)',
		weight: 1,
		priority: 'medium' as const
	}

	const signal = ctx.cro.signals.find((s) => s.id === 'cro-social-proof')
	if (ctx.cro.hasSocialProof) {
		return check({
			...base,
			status: 'pass',
			summary: signal?.implementation ?? 'Social proof elements detected.'
		})
	}

	return check({
		...base,
		status: 'warn',
		summary: signal?.implementation ?? 'No testimonials, client logos, or review markup detected.',
		recommendation:
			'Add customer testimonials, star ratings (AggregateRating schema), client logos, or case studies near your CTAs to increase conversion trust.'
	})
}

function croInventoryCheck(ctx: AuditContext): CheckResult {
	return check({
		id: 'cro-inventory',
		title: 'CRO & Lead Capture summary',
		weight: 0,
		priority: 'low',
		status: 'info',
		summary: `Evaluated ${ctx.cro.signals.length} conversion & lead capture signals.`,
		details: [
			tableDetail(
				['Signal', 'Category', 'Status', 'Implementation'],
				ctx.cro.signals.map((s) => [s.name, s.category, s.statusLabel, s.implementation])
			)
		]
	})
}

/** Conversion Rate Optimization & Lead Capture checks for the page. */
export function croChecks(ctx: AuditContext): CheckResult[] {
	return [
		ctaCheck(ctx),
		leadFormsCheck(ctx),
		directContactCheck(ctx),
		socialProofCheck(ctx),
		croInventoryCheck(ctx)
	]
}
