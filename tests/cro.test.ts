import * as cheerio from 'cheerio'
import { describe, expect, it } from 'vitest'
import { croChecks } from '@server/audit/checks/cro'
import type { AuditContext } from '@server/audit/context'
import { scanCro } from '@server/audit/cro'

function makeContext(html: string, schemaTypes: string[] = []): AuditContext {
	const $ = cheerio.load(html)
	const cro = scanCro(html, $, schemaTypes)

	return {
		html,
		$,
		cro
	} as unknown as AuditContext
}

describe('scanCro', () => {
	it('detects CTAs, low-friction lead form, WhatsApp, phone, live chat, and social proof', () => {
		const html = `
			<html>
				<head>
					<script src="https://client.crisp.chat/l.js"></script>
				</head>
				<body>
					<a href="#quote" class="btn">Get a Quote</a>
					<button>Book a Demo</button>
					<form action="/contact" method="post">
						<input type="text" name="name" />
						<input type="email" name="email" />
						<textarea name="message"></textarea>
						<button type="submit">Send</button>
					</form>
					<a href="tel:+919486772206">Call us</a>
					<a href="https://wa.me/919486772206">Chat on WhatsApp</a>
					<section class="testimonials">What our clients say</section>
				</body>
			</html>
		`
		const result = scanCro(html, cheerio.load(html), ['AggregateRating'])
		expect(result.ctaCount).toBe(2)
		expect(result.leadFormCount).toBe(1)
		expect(result.maxFormFields).toBe(3)
		expect(result.hasPhoneLink).toBe(true)
		expect(result.hasWhatsApp).toBe(true)
		expect(result.liveChatTools).toEqual(['Crisp'])
		expect(result.hasSocialProof).toBe(true)
	})

	it('ignores search forms and flags high-friction forms (> 5 fields)', () => {
		const html = `
			<html>
				<body>
					<form role="search" action="/search">
						<input type="search" name="q" />
					</form>
					<form action="/lead">
						<input name="f1" /><input name="f2" /><input name="f3" />
						<input name="f4" /><input name="f5" /><input name="f6" />
					</form>
				</body>
			</html>
		`
		const result = scanCro(html, cheerio.load(html))
		expect(result.leadFormCount).toBe(1)
		expect(result.maxFormFields).toBe(6)
		const formSignal = result.signals.find((s) => s.id === 'cro-forms')
		expect(formSignal?.status).toBe('warn')
		expect(formSignal?.statusLabel).toContain('High friction')
	})
})

describe('croChecks', () => {
	it('warns when CTAs, lead forms, direct contact, and social proof are missing', () => {
		const checks = croChecks(makeContext('<html><body><p>Hello world</p></body></html>'))
		expect(checks.find((c) => c.id === 'cro-cta')?.status).toBe('warn')
		expect(checks.find((c) => c.id === 'cro-forms')?.status).toBe('warn')
		expect(checks.find((c) => c.id === 'cro-direct-contact')?.status).toBe('warn')
		expect(checks.find((c) => c.id === 'cro-social-proof')?.status).toBe('warn')
		expect(checks.find((c) => c.id === 'cro-inventory')?.details?.[0]?.kind).toBe('table')
	})
})
