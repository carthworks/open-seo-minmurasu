'use client'

import { memo, useMemo, useState } from 'react'
import Link from 'next/link'
import { EmptyState } from '@web/components/empty-state'
import { Icon } from '@web/components/icon'
import { Input } from '@web/components/input'
import { PageHeader } from '@web/components/page-header'
import { ToastContainer, useToast } from '@web/components/toast'
import { playSuccess } from '@web/lib/sound'
import { relativeTime } from '@web/lib/time'
import type { AuditDeliveryChannel } from '@shared/types'
import type { LeadSortKey, LeadsScreenProps, SortDir } from './leads-screen.types'

const CHANNEL_LABEL: Record<AuditDeliveryChannel, string> = {
	whatsapp_call: 'WhatsApp + Call',
	email: 'Work Email',
	phone: 'Direct Phone Call'
}

const PAGE_SIZES = [10, 25, 50, 100]

function digitsOnly(phone: string): string {
	return phone.replace(/[^\d]/g, '')
}

function csvCell(value: string | number | undefined): string {
	const s = String(value ?? '').replace(/"/g, '""')

	return `"${s}"`
}

/** Hidden sales & marketing DataGrid of all submitted client audit leads with sorting, filters, and pagination. */
const LeadsScreen = (props: LeadsScreenProps) => {
	const { leads, now } = props
	const [query, setQuery] = useState('')
	const [priorityFilter, setPriorityFilter] = useState('all')
	const [channelFilter, setChannelFilter] = useState<'all' | AuditDeliveryChannel>('all')
	const [sortKey, setSortKey] = useState<LeadSortKey>('createdAt')
	const [sortDir, setSortDir] = useState<SortDir>('desc')
	const [pageSize, setPageSize] = useState(10)
	const [page, setPage] = useState(1)
	const { toasts, push, dismiss } = useToast()

	const priorities = useMemo(
		() => [...new Set(leads.map((r) => r.client?.priority).filter((p): p is string => Boolean(p)))],
		[leads]
	)

	const filtered = useMemo(() => {
		const needle = query.trim().toLowerCase()

		return leads.filter((r) => {
			const c = r.client!
			if (priorityFilter !== 'all' && c.priority !== priorityFilter) return false
			if (channelFilter !== 'all' && c.deliveryChannel !== channelFilter) return false
			if (!needle) return true

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
	}, [leads, query, priorityFilter, channelFilter])

	const sorted = useMemo(() => {
		const copy = [...filtered]
		const factor = sortDir === 'asc' ? 1 : -1
		copy.sort((a, b) => {
			const ca = a.client!
			const cb = b.client!
			switch (sortKey) {
				case 'score':
					return (a.score - b.score) * factor
				case 'fullName':
					return ca.fullName.localeCompare(cb.fullName) * factor
				case 'company':
					return (ca.company || '').localeCompare(cb.company || '') * factor
				case 'priority':
					return ca.priority.localeCompare(cb.priority) * factor
				case 'createdAt':
				default:
					return a.createdAt.localeCompare(b.createdAt) * factor
			}
		})

		return copy
	}, [filtered, sortKey, sortDir])

	const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
	const currentPage = Math.min(page, totalPages)
	const startIdx = (currentPage - 1) * pageSize
	const paged = sorted.slice(startIdx, startIdx + pageSize)

	const toggleSort = (key: LeadSortKey) => {
		if (sortKey === key) {
			setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
		} else {
			setSortKey(key)
			setSortDir(key === 'createdAt' || key === 'score' ? 'desc' : 'asc')
		}
		setPage(1)
	}

	const sortArrow = (key: LeadSortKey) => {
		if (sortKey !== key) return ''

		return sortDir === 'asc' ? ' ▲' : ' ▼'
	}

	const resetFilters = () => {
		setQuery('')
		setPriorityFilter('all')
		setChannelFilter('all')
		setPage(1)
	}

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
		const rows = sorted.map((r) => {
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
		playSuccess()
		push(`Exported ${sorted.length} lead${sorted.length === 1 ? '' : 's'} to CSV.`)
	}

	return (
		<div className="screen">
			<PageHeader
				eyebrow="Sales & Marketing"
				title="Captured Leads"
				description={`${leads.length} client ${leads.length === 1 ? 'lead' : 'leads'} captured from the audit intake form.`}
				actions={
					leads.length > 0 && (
						<button
							type="button"
							className="button button--small"
							onClick={handleExportCsv}
						>
							<Icon name="download" size={14} />
							Export CSV ({sorted.length})
						</button>
					)
				}
			/>

			{leads.length > 0 && (
				<div
					className="report-card"
					style={{
						display: 'flex',
						flexWrap: 'wrap',
						gap: 10,
						alignItems: 'center',
						padding: '12px 16px'
					}}
				>
					<label className="search-field" style={{ flex: '1 1 240px' }}>
						<Icon name="search" size={16} />
						<Input
							type="search"
							placeholder="Search name, company, email, phone, domain, goal..."
							aria-label="Search leads"
							value={query}
							onChange={(e) => {
								setQuery(e.currentTarget.value)
								setPage(1)
							}}
						/>
					</label>
					<select
						aria-label="Filter by priority"
						value={priorityFilter}
						onChange={(e) => {
							setPriorityFilter(e.currentTarget.value)
							setPage(1)
						}}
						style={{
							height: 36,
							padding: '0 10px',
							borderRadius: 8,
							border: '1px solid var(--line-strong)',
							background: 'var(--surface)'
						}}
					>
						<option value="all">All priorities</option>
						{priorities.map((p) => (
							<option key={p} value={p}>
								{p}
							</option>
						))}
					</select>
					<select
						aria-label="Filter by preferred channel"
						value={channelFilter}
						onChange={(e) => {
							setChannelFilter(e.currentTarget.value as 'all' | AuditDeliveryChannel)
							setPage(1)
						}}
						style={{
							height: 36,
							padding: '0 10px',
							borderRadius: 8,
							border: '1px solid var(--line-strong)',
							background: 'var(--surface)'
						}}
					>
						<option value="all">All channels</option>
						<option value="whatsapp_call">WhatsApp + Call</option>
						<option value="email">Work Email</option>
						<option value="phone">Direct Phone Call</option>
					</select>
					<select
						aria-label="Rows per page"
						value={pageSize}
						onChange={(e) => {
							setPageSize(Number(e.currentTarget.value))
							setPage(1)
						}}
						style={{
							height: 36,
							padding: '0 10px',
							borderRadius: 8,
							border: '1px solid var(--line-strong)',
							background: 'var(--surface)'
						}}
					>
						{PAGE_SIZES.map((size) => (
							<option key={size} value={size}>
								{size} / page
							</option>
						))}
					</select>
				</div>
			)}

			{leads.length === 0 ? (
				<EmptyState icon="mail" title="No leads captured yet">
					<p>
						When prospects submit the Free Murasu Score form on the homepage, their
						contact details, growth goals, and audit scores will appear here.
					</p>
				</EmptyState>
			) : sorted.length === 0 ? (
				<EmptyState icon="search" title="No matching leads">
					<p>No leads matched your current search or filter selection.</p>
					<p>
						<button type="button" className="button button--small" onClick={resetFilters}>
							Reset filters
						</button>
					</p>
				</EmptyState>
			) : (
				<div className="report-card" style={{ padding: '12px 14px' }}>
					<table
						className="detail-table"
						style={{ width: '100%', tableLayout: 'fixed', fontSize: 12.5 }}
					>
						<thead>
							<tr>
								<th style={{ width: '21%' }}>
									<button
										type="button"
										onClick={() => toggleSort('fullName')}
										style={{ border: 0, background: 'transparent', font: 'inherit', fontWeight: 700, cursor: 'pointer', padding: 0 }}
									>
										Lead{sortArrow('fullName')}
									</button>
									{' · '}
									<button
										type="button"
										onClick={() => toggleSort('createdAt')}
										style={{ border: 0, background: 'transparent', font: 'inherit', fontWeight: 600, cursor: 'pointer', padding: 0, color: 'var(--ink-3)' }}
									>
										Date{sortArrow('createdAt')}
									</button>
								</th>
								<th style={{ width: '23%' }}>Contact &amp; Delivery</th>
								<th style={{ width: '17%' }}>
									<button
										type="button"
										onClick={() => toggleSort('score')}
										style={{ border: 0, background: 'transparent', font: 'inherit', fontWeight: 700, cursor: 'pointer', padding: 0 }}
									>
										Site &amp; Score{sortArrow('score')}
									</button>
								</th>
								<th style={{ width: '24%' }}>
									<button
										type="button"
										onClick={() => toggleSort('priority')}
										style={{ border: 0, background: 'transparent', font: 'inherit', fontWeight: 700, cursor: 'pointer', padding: 0 }}
									>
										Priority &amp; Goal{sortArrow('priority')}
									</button>
								</th>
								<th style={{ width: '15%' }}>Actions</th>
							</tr>
						</thead>
						<tbody>
							{paged.map((r) => {
								const c = r.client!
								const waDigits = digitsOnly(c.phone)
								const waText = encodeURIComponent(
									`Hi ${c.fullName}, we prepared your Murasu Score audit for ${r.domain} (Score: ${r.score}/100, Grade ${r.grade}). Let's discuss your goals!`
								)
								const mailSubject = encodeURIComponent(
									`Your Murasu Score Report for ${r.domain} (${r.grade} · ${r.score}/100)`
								)
								const mailBody = encodeURIComponent(
									`Hi ${c.fullName},\n\nThank you for requesting a digital audit for ${r.finalUrl}.\nOverall Score: ${r.score}/100 (Grade ${r.grade})\nPrimary Focus: ${c.priority}\n\nLet us know a good time to walk through the findings.`
								)

								return (
									<tr key={r.id}>
										<td style={{ padding: '8px 8px', wordBreak: 'break-word' }}>
											<strong>{c.fullName}</strong>
											{c.company && (
												<div className="muted" style={{ fontSize: 12 }}>
													{c.company}
												</div>
											)}
											<div className="muted" style={{ fontSize: 11.5 }}>
												{relativeTime(r.createdAt, now)}
											</div>
										</td>
										<td style={{ padding: '8px 8px', wordBreak: 'break-word' }}>
											<div className="mono" style={{ fontSize: 12 }}>
												<a href={`tel:${c.phone}`}>{c.phone}</a>
											</div>
											<div style={{ fontSize: 12 }}>
												<a href={`mailto:${c.email}`}>{c.email}</a>
											</div>
											<div className="muted" style={{ fontSize: 11.5 }}>
												{CHANNEL_LABEL[c.deliveryChannel]}
											</div>
										</td>
										<td style={{ padding: '8px 8px', wordBreak: 'break-word' }}>
											<div>
												<a href={r.finalUrl} target="_blank" rel="noreferrer">
													{r.domain}
												</a>
											</div>
											<div className="mono" style={{ fontSize: 12 }}>
												<strong>{r.grade}</strong> · {r.score}/100
											</div>
										</td>
										<td
											style={{ padding: '8px 8px', wordBreak: 'break-word' }}
											title={c.growthGoal || undefined}
										>
											<div style={{ fontWeight: 600 }}>{c.priority}</div>
											{c.growthGoal && (
												<div
													className="muted"
													style={{
														fontSize: 11.5,
														display: '-webkit-box',
														WebkitLineClamp: 2,
														WebkitBoxOrient: 'vertical',
														overflow: 'hidden'
													}}
												>
													{c.growthGoal}
												</div>
											)}
										</td>
										<td style={{ padding: '8px 8px' }}>
											<div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
												{waDigits && (
													<a
														className="button button--small"
														style={{ height: 26, padding: '0 8px', fontSize: 11.5 }}
														href={`https://wa.me/${waDigits}?text=${waText}`}
														target="_blank"
														rel="noreferrer"
													>
														WA
													</a>
												)}
												<a
													className="button button--small"
													style={{ height: 26, padding: '0 8px', fontSize: 11.5 }}
													href={`tel:${c.phone}`}
												>
													Call
												</a>
												<a
													className="button button--small"
													style={{ height: 26, padding: '0 8px', fontSize: 11.5 }}
													href={`mailto:${c.email}?subject=${mailSubject}&body=${mailBody}`}
												>
													Email
												</a>
												<Link
													className="button button--small"
													style={{ height: 26, padding: '0 8px', fontSize: 11.5 }}
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

					<div
						style={{
							display: 'flex',
							flexWrap: 'wrap',
							alignItems: 'center',
							justifyContent: 'space-between',
							gap: 12,
							paddingTop: 14,
							marginTop: 12,
							borderTop: '1px solid var(--line)'
						}}
					>
						<span className="muted mono" style={{ fontSize: 12.5 }}>
							Showing {startIdx + 1}–{Math.min(startIdx + pageSize, sorted.length)} of{' '}
							{sorted.length}
						</span>
						<div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
							<button
								type="button"
								className="button button--small"
								disabled={currentPage <= 1}
								onClick={() => setPage(1)}
							>
								First
							</button>
							<button
								type="button"
								className="button button--small"
								disabled={currentPage <= 1}
								onClick={() => setPage((p) => Math.max(1, p - 1))}
							>
								Prev
							</button>
							<span className="mono" style={{ fontSize: 12.5, padding: '0 6px' }}>
								Page {currentPage} / {totalPages}
							</span>
							<button
								type="button"
								className="button button--small"
								disabled={currentPage >= totalPages}
								onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
							>
								Next
							</button>
							<button
								type="button"
								className="button button--small"
								disabled={currentPage >= totalPages}
								onClick={() => setPage(totalPages)}
							>
								Last
							</button>
						</div>
					</div>
				</div>
			)}
			<ToastContainer toasts={toasts} onDismiss={dismiss} />
		</div>
	)
}

export default memo(LeadsScreen)
