import { memo } from 'react'
import { StatusMark } from '@web/components/status-mark'
import type { Status, TrackingToolStatus } from '@shared/types'
import type { AnalyticsReportProps } from './analytics-report.types'

function statusToTone(status: TrackingToolStatus): Status {
	if (status === 'active') return 'pass'
	if (status === 'warning') return 'warn'

	return 'fail'
}

/** Renders detected analytics and tracking tools, their IDs, status, and implementation summary. */
const AnalyticsReport = (props: AnalyticsReportProps) => {
	const { analytics } = props
	const { tools, hasConsentSignal, consentSummary } = analytics

	return (
		<div className="analytics-report">
			{tools.length === 0 ? (
				<p className="muted">
					No analytics or tracking tools (such as Google Analytics, Google Tag Manager, or
					Meta Pixel) were detected in the page HTML.
				</p>
			) : (
				<div className="detail-table-wrap">
					<table className="detail-table">
						<thead>
							<tr>
								<th>Tool</th>
								<th>Category</th>
								<th>ID(s)</th>
								<th>Status</th>
								<th>Implementation Summary</th>
							</tr>
						</thead>
						<tbody>
							{tools.map((tool) => {
								const tone = statusToTone(tool.status)

								return (
									<tr key={tool.id}>
										<td>
											<strong>{tool.name}</strong>
										</td>
										<td>{tool.category}</td>
										<td className="mono">
											{tool.ids.length > 0 ? tool.ids.join(', ') : '—'}
										</td>
										<td>
											<span className={`pill pill--${tone}`}>
												<StatusMark status={tone} size={13} />
												{tool.statusLabel}
											</span>
										</td>
										<td>{tool.implementation}</td>
									</tr>
								)
							})}
						</tbody>
					</table>
				</div>
			)}
			<p className="muted" style={{ marginTop: 12, marginBottom: 0 }}>
				<StatusMark status={hasConsentSignal ? 'pass' : 'info'} size={13} />{' '}
				{consentSummary}
			</p>
		</div>
	)
}

export default memo(AnalyticsReport)
