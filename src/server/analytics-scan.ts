import { AuditError } from '@server/audit'
import { runAnalyticsScan } from '@server/audit/analytics'
import { takeRateLimit, withSlot } from '@server/limits'
import type { AnalyticsScanPreview } from '@shared/types'

export type AnalyticsScanOutcome =
	| { result: AnalyticsScanPreview }
	| { error: string; status: number }

/** Scans a page for installed analytics and tracking tools within the visitor's hourly allowance. */
export async function scanAnalyticsForVisitor(
	url: string,
	ip: string
): Promise<AnalyticsScanOutcome> {
	if (!url.trim()) return { error: 'Enter a page address to scan.', status: 400 }
	if (!takeRateLimit(`analytics:${ip}`)) {
		return { error: "You've scanned a lot of pages. Try again in an hour.", status: 429 }
	}
	try {
		return { result: await withSlot(() => runAnalyticsScan(url)) }
	} catch (e) {
		const message = e instanceof AuditError ? e.message : "We couldn't scan that page."

		return { error: message, status: 422 }
	}
}
