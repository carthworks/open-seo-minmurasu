import { memo } from 'react'
import { displayUrl } from '@shared/format'
import { absoluteDate } from '@web/lib/time'
import type { ReportCoverProps } from './report-cover.types'

/** A branded first page, shown only when the report is printed or saved as PDF. */
const ReportCover = (props: ReportCoverProps) => {
	const { report, brandName, brandLogo, ctaUrl, contactPhone, contactEmail } = props

	return (
		<section className="report-cover" aria-hidden="true">
			<div className="report-cover-brand">
				{brandLogo && <img className="report-cover-logo" src={brandLogo} alt="" />}
				<span className="report-cover-name">{brandName}</span>
			</div>
			<div className="report-cover-body">
				<span className="report-cover-eyebrow">SEO audit report</span>
				<h1 className="report-cover-title">{report.domain}</h1>
				<p className="report-cover-url">{displayUrl(report.finalUrl)}</p>
				<div className="report-cover-score">
					<span className="report-cover-grade">{report.grade}</span>
					<span>
						<strong>{report.score}/100</strong> overall score
					</span>
				</div>
				<div className="report-cover-categories">
					{report.categories.map((c) => (
						<div key={c.id} className="report-cover-cat-pill">
							<span className="report-cover-cat-name">{c.name}</span>
							<span className="report-cover-cat-score mono">
								{c.grade} · {c.score}%
							</span>
						</div>
					))}
				</div>
				<p className="report-cover-date">
					Prepared by {brandName} · {absoluteDate(report.createdAt)}
				</p>
			</div>
			<div className="report-cover-contact">
				{ctaUrl && <span>{displayUrl(ctaUrl)}</span>}
				{contactPhone && <span>📞 {contactPhone}</span>}
				{contactEmail && <span>📧 {contactEmail}</span>}
			</div>
		</section>
	)
}

export default memo(ReportCover)

