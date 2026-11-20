'use client'

import { memo, useState, type SubmitEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { AuditDeliveryChannel, AuditProgress, ClientLeadDetails } from '@shared/types'
import { AuditProgressView } from '@web/components/audit-progress-view'
import { Icon } from '@web/components/icon'
import { postForEvents } from '@web/lib/stream'
import type { AuditFormProps } from './audit-form.types'

const PRIORITIES = [
	'Complete 360° Digital Presence',
	'SEO & Organic Traffic',
	'Paid Ads & Lead Generation',
	'Website Speed & Conversion (CRO)',
	'Local SEO & Google Maps',
	'Analytics & Tracking Setup'
]

/** Compact client intake form + URL scanner. Only Name, Phone, Email, and Website URL are mandatory. */
const AuditForm = (props: AuditFormProps) => {
	const { pagespeedEnabled, brandName = 'MIN MURASU' } = props

	const router = useRouter()
	const [fullName, setFullName] = useState('')
	const [phone, setPhone] = useState('')
	const [email, setEmail] = useState('')
	const [url, setUrl] = useState('')
	const [showOptional, setShowOptional] = useState(false)
	const [company, setCompany] = useState('')
	const [priority, setPriority] = useState(PRIORITIES[0])
	const [growthGoal, setGrowthGoal] = useState('')
	const [deliveryChannel, setDeliveryChannel] = useState<AuditDeliveryChannel>('whatsapp_call')
	const [progress, setProgress] = useState<AuditProgress | null>(null)
	const [error, setError] = useState<string | null>(null)
	const running = progress !== null

	const canSubmit =
		Boolean(fullName.trim()) &&
		Boolean(phone.trim()) &&
		Boolean(email.trim()) &&
		Boolean(url.trim()) &&
		!running

	const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
		e.preventDefault()
		if (running) return
		if (!fullName.trim() || !phone.trim() || !email.trim() || !url.trim()) {
			setError('Please enter your Name, Phone, Email, and Website URL.')

			return
		}

		const client: ClientLeadDetails = {
			fullName: fullName.trim(),
			phone: phone.trim(),
			email: email.trim(),
			company: company.trim() || undefined,
			priority,
			growthGoal: growthGoal.trim(),
			deliveryChannel,
			consent: true
		}

		setError(null)
		setProgress({ step: 'start', label: 'Starting the audit', pct: 1 })
		await postForEvents('/api/audit', { url: url.trim(), source: 'web', client }, (event) => {
			if (event.type === 'progress') setProgress(event)
			else if (event.type === 'done') router.push(`/report/${event.id}`)
			else {
				setError(event.message)
				setProgress(null)
			}
		})
	}

	return (
		<form
			className={`lead-audit-card${running ? ' is-running' : ''}`}
			onSubmit={handleSubmit}
			noValidate
		>
			<div className="lead-audit-head">
				<span className="lead-audit-eyebrow">
					<Icon name="clock" size={14} />
					Takes 15 Seconds • Live Audit + Custom Report
				</span>
				<h2>Request Your Free Digital Audit</h2>
			</div>

			{progress ? (
				<div className="lead-audit-progress">
					<AuditProgressView progress={progress} />
				</div>
			) : (
				<>
					<div className="lead-form-grid">
						<label className="lead-field">
							<span>
								FULL NAME <em>*</em>
							</span>
							<input
								type="text"
								required
								placeholder="e.g. Anand Murugesan"
								value={fullName}
								onChange={(e) => setFullName(e.currentTarget.value)}
							/>
						</label>

						<label className="lead-field">
							<span>
								PHONE / WHATSAPP <em>*</em>
							</span>
							<input
								type="tel"
								required
								placeholder="+91 98765 43210"
								value={phone}
								onChange={(e) => setPhone(e.currentTarget.value)}
							/>
						</label>

						<label className="lead-field">
							<span>
								EMAIL <em>*</em>
							</span>
							<input
								type="email"
								required
								placeholder="anand@company.com"
								value={email}
								onChange={(e) => setEmail(e.currentTarget.value)}
							/>
						</label>

						<label className="lead-field">
							<span>
								WEBSITE URL <em>*</em>
							</span>
							<input
								type="text"
								inputMode="url"
								spellCheck={false}
								required
								placeholder="https://yourcompany.com"
								value={url}
								onChange={(e) => setUrl(e.currentTarget.value)}
							/>
						</label>
					</div>

					<button
						type="button"
						className="lead-more-toggle"
						aria-expanded={showOptional}
						onClick={() => setShowOptional((v) => !v)}
					>
						<Icon
							name="chevronDown"
							size={14}
							style={{
								transform: showOptional ? 'rotate(180deg)' : 'rotate(0deg)',
								transition: 'transform 0.15s ease'
							}}
						/>
						<span>{showOptional ? 'Hide optional details' : 'Add company & growth goals (optional)'}</span>
					</button>

					{showOptional && (
						<div className="lead-optional-box">
							<div className="lead-form-grid">
								<label className="lead-field">
									<span>COMPANY / BRAND NAME</span>
									<input
										type="text"
										placeholder="e.g. Murugesan Industrial"
										value={company}
										onChange={(e) => setCompany(e.currentTarget.value)}
									/>
								</label>

								<label className="lead-field">
									<span>PRIMARY PRIORITY</span>
									<select
										value={priority}
										onChange={(e) => setPriority(e.currentTarget.value)}
									>
										{PRIORITIES.map((p) => (
											<option key={p} value={p}>
												{p}
											</option>
										))}
									</select>
								</label>
							</div>

							<label className="lead-field lead-field--full">
								<span>#1 GROWTH GOAL</span>
								<textarea
									rows={2}
									placeholder="e.g. More qualified B2B enquiries from Google, lower ad CPA, or faster site speed..."
									value={growthGoal}
									onChange={(e) => setGrowthGoal(e.currentTarget.value)}
								/>
							</label>

							<fieldset className="lead-radios">
								<legend>PREFERRED SUMMARY DELIVERY</legend>
								<div className="lead-radio-row">
									<label className="lead-radio">
										<input
											type="radio"
											name="deliveryChannel"
											value="whatsapp_call"
											checked={deliveryChannel === 'whatsapp_call'}
											onChange={() => setDeliveryChannel('whatsapp_call')}
										/>
										<span>WhatsApp + Call</span>
									</label>
									<label className="lead-radio">
										<input
											type="radio"
											name="deliveryChannel"
											value="email"
											checked={deliveryChannel === 'email'}
											onChange={() => setDeliveryChannel('email')}
										/>
										<span>Work Email</span>
									</label>
									<label className="lead-radio">
										<input
											type="radio"
											name="deliveryChannel"
											value="phone"
											checked={deliveryChannel === 'phone'}
											onChange={() => setDeliveryChannel('phone')}
										/>
										<span>Direct Phone Call</span>
									</label>
								</div>
							</fieldset>
						</div>
					)}

					<button type="submit" className="lead-submit-btn" disabled={!canSubmit}>
						<Icon name="audit" size={16} />
						<span>Get My Free Digital Presence Audit</span>
					</button>

					<div className="lead-footer">
						<span className="lead-footer-safe">
							<Icon name="security" size={14} />
							100% Confidential · By {brandName}{' '}
							<Link href="/about">Privacy</Link>
						</span>
						<span className={`chip${pagespeedEnabled ? ' chip--pass' : ''}`}>
							<span className="chip-dot" />
							{pagespeedEnabled ? 'Core Web Vitals on' : 'Core Web Vitals off'}
						</span>
						<a
							className="lead-footer-wa"
							href="https://wa.me/919486772206"
							target="_blank"
							rel="noreferrer"
						>
							<Icon name="mail" size={14} />
							Or request via WhatsApp
						</a>
					</div>
				</>
			)}

			{error && (
				<p className="callout callout--error" role="alert">
					<Icon name="alert" size={16} />
					{error}
				</p>
			)}
		</form>
	)
}

export default memo(AuditForm)
