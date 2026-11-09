import { memo } from 'react'
import { Icon } from '@web/components/icon'
import { absoluteDate } from '@web/lib/time'
import type { ReportFooterProps } from './report-footer.types'
import { telHref, whatsappHref } from './report-footer.utils'

/** The call to action, ways to get in touch and the brand's footer line. */
const ReportFooter = (props: ReportFooterProps) => {
	const { brandName, footer, ctaText, ctaUrl, contactPhone, contactEmail, createdAt } = props

	return (
		<footer className="report-footer">
			{ctaText && ctaUrl && (
				<div className="report-cta">
					<div>
						<h2>Want these fixed?</h2>
						<p>{brandName} can take care of the issues in this report for you.</p>
					</div>
					<a
						className="button button--accent"
						href={ctaUrl}
						target="_blank"
						rel="noreferrer"
					>
						{ctaText}
						<Icon name="arrowRight" size={15} />
					</a>
				</div>
			)}
			{(contactPhone || contactEmail) && (
				<div className="report-contact">
					<span className="report-contact-label">Talk to {brandName}</span>
					<div className="report-contact-actions">
						{contactPhone && (
							<a className="button button--small" href={telHref(contactPhone)}>
								📞 Call {contactPhone}
							</a>
						)}
						{contactPhone && (
							<a
								className="button button--small"
								href={whatsappHref(contactPhone)}
								target="_blank"
								rel="noreferrer"
							>
								💬 WhatsApp
							</a>
						)}
						{contactEmail && (
							<a className="button button--small" href={`mailto:${contactEmail}`}>
								📧 {contactEmail}
							</a>
						)}
					</div>
				</div>
			)}
			<p className="report-footer-line muted">
				{footer || `Prepared by ${brandName}`} · Generated {absoluteDate(createdAt)} with
				OpenSEO
			</p>
		</footer>
	)
}

export default memo(ReportFooter)
