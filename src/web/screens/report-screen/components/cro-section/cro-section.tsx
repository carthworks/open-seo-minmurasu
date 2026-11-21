import { memo } from 'react'
import { CroReport } from '@web/components/cro-report'
import type { CroSectionProps } from './cro-section.types'

/** CRO & Lead Capture summary card (included in web & PDF reports). */
const CroSection = (props: CroSectionProps) => {
	const { cro } = props

	return (
		<section className="report-card" id="cro" aria-labelledby="cro-title">
			<div className="report-card-head">
				<h2 id="cro-title">CRO &amp; Lead Capture</h2>
				<span className="muted">
					{cro.ctaCount} CTA{cro.ctaCount === 1 ? '' : 's'} · {cro.leadFormCount} form
					{cro.leadFormCount === 1 ? '' : 's'}
				</span>
			</div>
			<CroReport cro={cro} />
		</section>
	)
}

export default memo(CroSection)
