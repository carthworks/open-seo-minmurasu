'use client'

import { memo, useState } from 'react'
import Link from 'next/link'
import { Icon } from '@web/components/icon'
import { PageHeader } from '@web/components/page-header'
import type { ContactScreenProps } from './contact-screen.types'

const SERVICES_LIST = [
	'Technical SEO Audit & Fixes',
	'Local SEO & Google Maps Ranking',
	'AI Search / GEO Optimization (ChatGPT, Gemini)',
	'Page Speed & Core Web Vitals',
	'Content Strategy & Keywords',
	'Accessibility (WCAG 2.1 AA) Compliance'
]

const ContactScreen = (props: ContactScreenProps) => {
	const { settings } = props
	const brandName = settings.brandName || 'MIN MURASU'
	const phone = settings.contactPhone || '9486772206'
	const email = settings.contactEmail || 'minmurasu.digital@gmail.com'
	const website = 'https://www.minmurasu.digital/'

	const [name, setName] = useState('')
	const [url, setUrl] = useState('')
	const [selectedService, setSelectedService] = useState(SERVICES_LIST[0])
	const [message, setMessage] = useState('')

	const cleanPhone = phone.replace(/\D/g, '')

	// Build direct inquiry text
	const inquiryText = [
		`Hi ${brandName}, I would like to inquire about your services.`,
		name ? `• Name: ${name}` : null,
		url ? `• Website: ${url}` : null,
		`• Service Needed: ${selectedService}`,
		message ? `• Notes: ${message}` : null
	]
		.filter(Boolean)
		.join('\n')

	const whatsappLink = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(inquiryText)}`
	const emailSubject = encodeURIComponent(`Inquiry from ${name || 'Prospective Client'} — ${selectedService}`)
	const emailBody = encodeURIComponent(inquiryText)
	const mailtoLink = `mailto:${email}?subject=${emailSubject}&body=${emailBody}`

	return (
		<div className="screen contact-screen">
			<PageHeader
				eyebrow="Get in Touch"
				title="Contact MIN MURASU"
				description="Talk directly with our SEO strategists and technical engineers. Fast turnaround on all project inquiries."
				actions={
					<Link href="/" className="button button--primary button--small">
						<Icon name="audit" size={14} />
						<span>Run audit</span>
					</Link>
				}
			/>

			<div className="contact-layout">
				{/* Inquiry Form */}
				<div className="contact-form-card">
					<h2>Send an Inquiry</h2>
					<p className="contact-form-sub">
						Fill out your site details and connect instantly via WhatsApp or direct email.
					</p>

					<div className="contact-fields">
						<label className="contact-field-group">
							<span className="contact-field-label">Your Name</span>
							<input
								type="text"
								className="text-input"
								placeholder="e.g. Ramesh Kumar"
								value={name}
								onChange={(e) => setName(e.target.value)}
							/>
						</label>

						<label className="contact-field-group">
							<span className="contact-field-label">Website or Domain URL</span>
							<input
								type="url"
								className="text-input"
								placeholder="https://example.com"
								value={url}
								onChange={(e) => setUrl(e.target.value)}
							/>
						</label>

						<label className="contact-field-group">
							<span className="contact-field-label">Service of Interest</span>
							<select
								className="select"
								value={selectedService}
								onChange={(e) => setSelectedService(e.target.value)}
							>
								{SERVICES_LIST.map((s) => (
									<option key={s} value={s}>
										{s}
									</option>
								))}
							</select>
						</label>

						<label className="contact-field-group">
							<span className="contact-field-label">Project Details / Goals</span>
							<textarea
								className="text-input contact-textarea"
								rows={4}
								placeholder="Tell us about your current rankings, organic traffic goals, or issues..."
								value={message}
								onChange={(e) => setMessage(e.target.value)}
							/>
						</label>

						<div className="contact-submit-row">
							<a
								href={whatsappLink}
								target="_blank"
								rel="noreferrer"
								className="button button--accent"
							>
								<span>💬 Send via WhatsApp</span>
							</a>
							<a href={mailtoLink} className="button button--primary">
								<Icon name="mail" size={15} />
								<span>Send via Email</span>
							</a>
						</div>
					</div>
				</div>

				{/* Contact Details & Office Card */}
				<div className="contact-info-column">
					<div className="contact-info-card">
						<h3>Direct Channels</h3>
						<div className="contact-channel-list">
							<a href={`tel:${phone}`} className="contact-channel-item">
								<span className="contact-channel-icon">📞</span>
								<div>
									<strong>Phone / Call</strong>
									<span>+91 {phone}</span>
								</div>
							</a>

							<a
								href={`https://wa.me/91${cleanPhone}`}
								target="_blank"
								rel="noreferrer"
								className="contact-channel-item"
							>
								<span className="contact-channel-icon">💬</span>
								<div>
									<strong>WhatsApp Support</strong>
									<span>+91 {phone}</span>
								</div>
							</a>

							<a href={`mailto:${email}`} className="contact-channel-item">
								<span className="contact-channel-icon">✉️</span>
								<div>
									<strong>Official Email</strong>
									<span>{email}</span>
								</div>
							</a>

							<a
								href={website}
								target="_blank"
								rel="noreferrer"
								className="contact-channel-item"
							>
								<span className="contact-channel-icon">🌐</span>
								<div>
									<strong>Agency Website</strong>
									<span>minmurasu.digital</span>
								</div>
							</a>
						</div>
					</div>

					<div className="contact-info-card">
						<h3>Location & Hours</h3>
						<div className="contact-meta-list">
							<div>
								<strong>Headquarters</strong>
								<p className="muted">Tamil Nadu, India</p>
							</div>
							<div>
								<strong>Business Hours</strong>
								<p className="muted">Monday – Saturday: 9:00 AM – 7:00 PM IST</p>
							</div>
							<div>
								<strong>Response Time</strong>
								<p className="muted">Inquiries answered within 2 business hours.</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

export default memo(ContactScreen)

