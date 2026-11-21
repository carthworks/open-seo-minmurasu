'use client'

import { memo, useState } from 'react'
import Link from 'next/link'
import { EmptyState } from '@web/components/empty-state'
import { Icon } from '@web/components/icon'
import { Input } from '@web/components/input'
import { PageHeader } from '@web/components/page-header'
import { ToastContainer, useToast } from '@web/components/toast'
import { relativeTime } from '@web/lib/time'
import type { AuditDeliveryChannel } from '@shared/types'
import type { LeadsScreenProps } from './leads-screen.types'

const CHANNEL_LABEL: Record<AuditDeliveryChannel, string> = {
	whatsapp_call: 'WhatsApp + Call',
	email: 'Work Email',
	phone: 'Direct Phone Call'
}

function digitsOnly(phone: string): string {
	return phone.replace(/[^\d]/g, '')
}

function csvCell(value: string | number | undefined): string {
	const s = String(value ?? '').replace(/"/g, '""')

	return `"${s}"`
}

/** Hidden sales & marketing CRM table of all submitted client audit leads. */
const LeadsScreen = (props: LeadsScreenProps) => {
	const { leads, now } = props
	const [query, setQuery] = useState('')
	const { toasts, push, dismiss } = useToast()
	const needle = query.trim().toLowerCase()

	const filtered = needle
		? leads.filter((r) => {
				const c = r.client!

				return (
					c.fullName.toLowerCase().includes(needle) ||
					c.email.toLowerCase().includes(needle) ||
					c.phone.toLowerCase().includes(needle) ||
					(c.company || '').toLowerCase().includes(needle) ||
					r.domain.toLowerCase().includes(needle) ||
					c.priority.toLowerCase().includes(needle) ||
					c.growthGoal.toLowerCase().includes(needle)
				)
			})
		: leads

	const handleExportCsv = () => {
		const header = [
			'Date',
			'Full Name',
			'Company',
			'Phone',
			'Email',
			'Website',
			'Score',
			'Grade',
			'Primary Priority',
			'Preferred Channel',
			'Growth Goal',
			'Report Path'
		]
		const rows = filtered.map((r) => {
			const c = r.client!

			return [
				r.createdAt,
				c.fullName,
				c.company ?? '',
				c.phone,
				c.email,
				r.finalUrl,
				r.score,
				r.grade,
				c.priority,
				CHANNEL_LABEL[c.deliveryChannel],
				c.growthGoal,
				`/report/${r.id}`
			]
				.map(csvCell)
				.join(',')
		})
		const blob = new Blob([[header.join(','), ...rows].join('\n')], {
			type: 'text/csv;charset=utf-8;'
		})
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = `openseo-leads-${new Date().toISOString().slice(0, 10)}.csv`
		a.click()
		URL.revokeObjectURL(url)
		push(`Exported ${filtered.length} lead${filtered.length === 1 ? '' : 's'} to CSV.`)
	}

	return (
		<div className="screen">
			<PageHeader
				eyebrow="Sales & Marketing"
				title="Captured Leads"
				description={`${leads.length} client ${leads.length === 1 ? 'lead' : 'leads'} captured from the audit intake form.`}
				actions={
					<div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
						{leads.length > 0 && (
							<>
								<label className="search-field">
									<Icon name="search" size={16} />
									<Input
										type="search"
										placeholder="Search name, company, email, domain..."
										aria-label="Search leads"
										value={query}
										onChange={(e) => setQuery(e.currentTarget.value)}
									/>
								</label>
								<button
									type="button"
									className="button button--small"
									onClick={handleExportCsv}
								>
									<Icon name="download" size={14} />
									Export CSV
								</button>
							</>
						)}
					</div>
				}
			/>

			{leads.length === 0 ? (
				<EmptyState icon="mail" title="No leads captured yet">
					<p>
						When prospects submit the Free Digital Audit form on the homepage, their
						contact details, growth goals, and audit scores will appear here.
					</p>
				</EmptyState>
			) : filtered.length === 0 ? (
				<EmptyState icon="search" title="No matching leads">
					<p>No leads matched &ldquo;{query}&rdquo;.</p>
					<p>
						<button
							type="button"
							className="button button--small"
							onClick={() => setQuery('')}
						>
							Clear search
						</button>
					</p>
				</EmptyState>
			) : (
				<div className="report-card">
					<div className="detail-table-wrap">
						<table className="detail-table">
							<thead>
								<tr>
									<th>Submitted</th>
									<th>Client</th>
									<th>Contact</th>
									<th>Website &amp; Score</th>
									<th>Priority &amp; Goal</th>
									<th>Actions</th>
								</tr>
							</thead>
							<tbody>
								{filtered.map((r) => {
									const c = r.client!
									const waDigits = digitsOnly(c.phone)
									const waText = encodeURIComponent(
										`Hi ${c.fullName}, we prepared your Digital Presence Audit for ${r.domain} (Score: ${r.score}/100, Grade ${r.grade}). Let's discuss your goals!`
									)
									const mailSubject = encodeURIComponent(
										`Your Digital Audit Report for ${r.domain} (${r.grade} · ${r.score}/100)`
									)
									const mailBody = encodeURIComponent(
										`Hi ${c.fullName},\n\nThank you for requesting a digital audit for ${r.finalUrl}.\nOverall Score: ${r.score}/100 (Grade ${r.grade})\nPrimary Focus: ${c.priority}\n\nLet us know a good time to walk through the findings.`
									)

									return (
										<tr key={r.id}>
											<td className="muted" style={{ whiteSpace: 'nowrap' }}>
												{relativeTime(r.createdAt, now)}
											</td>
											<td>
												<strong>{c.fullName}</strong>
												{c.company && (
													<div className="muted">{c.company}</div>
												)}
												<div className="muted" style={{ fontSize: 12 }}>
													Prefers: {CHANNEL_LABEL[c.deliveryChannel]}
												</div>
											</td>
											<td>
												<div className="mono" style={{ fontSize: 12.5 }}>
													<a href={`tel:${c.phone}`}>{c.phone}</a>
												</div>
												<div style={{ fontSize: 12.5 }}>
													<a href={`mailto:${c.email}`}>{c.email}</a>
												</div>
											</td>
											<td>
												<div>
													<a
														href={r.finalUrl}
														target="_blank"
														rel="noreferrer"
													>
														{r.domain}
													</a>
												</div>
												<div className="mono" style={{ fontSize: 12.5 }}>
													<strong>{r.grade}</strong> · {r.score}/100
												</div>
											</td>
											<td style={{ maxWidth: 280 }}>
												<div>
													<strong>{c.priority}</strong>
												</div>
												{c.growthGoal && (
													<div className="muted" style={{ fontSize: 12.5 }}>
														{c.growthGoal}
													</div>
												)}
											</td>
											<td>
												<div
													style={{
														display: 'flex',
														flexWrap: 'wrap',
														gap: 6
													}}
												>
													{waDigits && (
														<a
															className="button button--small"
															href={`https://wa.me/${waDigits}?text=${waText}`}
															target="_blank"
															rel="noreferrer"
														>
															WhatsApp
														</a>
													)}
													<a
														className="button button--small"
														href={`tel:${c.phone}`}
													>
														Call
													</a>
													<a
														className="button button--small"
														href={`mailto:${c.email}?subject=${mailSubject}&body=${mailBody}`}
													>
														Email
													</a>
													<Link
														className="button button--small"
														href={`/report/${r.id}`}
													>
														Report
													</Link>
												</div>
											</td>
										</tr>
									)
								})}
							</tbody>
						</table>
					</div>
				</div>
			)}
			<ToastContainer toasts={toasts} onDismiss={dismiss} />
		</div>
	)
}

export default memo(LeadsScreen)
