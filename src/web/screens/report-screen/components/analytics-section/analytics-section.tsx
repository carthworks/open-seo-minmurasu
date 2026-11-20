import { memo } from 'react'
import { AnalyticsReport } from '@web/components/analytics-report'
import type { AnalyticsScanResult } from '@shared/types'

export interface AnalyticsSectionProps {
	analytics: AnalyticsScanResult
}

/** Installed analytics & tracking tools detected on the audited page (included in web & PDF reports). */
const AnalyticsSection = (props: AnalyticsSectionProps) => {
	const { analytics } = props

	return (
		<section className="report-card" id="analytics" aria-labelledby="analytics-title">
			<div className="report-card-head">
				<h2 id="analytics-title">Installed analytics &amp; tracking</h2>
				<span className="muted">
					{analytics.tools.length}{' '}
					{analytics.tools.length === 1 ? 'tool detected' : 'tools detected'}
				</span>
			</div>
			<AnalyticsReport analytics={analytics} />
		</section>
	)
}

export default memo(AnalyticsSection)
