import { memo } from 'react'
import { StatusMark } from '@web/components/status-mark'
import type { CroScanResult } from '@shared/types'

export interface CroReportProps {
	cro: CroScanResult
}

/** Renders CRO & Lead Capture signals, status badges, and implementation summaries. */
const CroReport = (props: CroReportProps) => {
	const { cro } = props

	return (
		<div className="cro-report">
			<div className="detail-table-wrap">
				<table className="detail-table">
					<thead>
						<tr>
							<th>Signal</th>
							<th>Category</th>
							<th>Status</th>
							<th>Implementation Summary</th>
						</tr>
					</thead>
					<tbody>
						{cro.signals.map((signal) => (
							<tr key={signal.id}>
								<td>
									<strong>{signal.name}</strong>
								</td>
								<td>{signal.category}</td>
								<td>
									<span className={`pill pill--${signal.status}`}>
										<StatusMark status={signal.status} size={13} />
										{signal.statusLabel}
									</span>
								</td>
								<td>{signal.implementation}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	)
}

export default memo(CroReport)
