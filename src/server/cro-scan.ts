import { AuditError } from '@server/audit'
import { runCroScan } from '@server/audit/cro'
import { takeRateLimit, withSlot } from '@server/limits'
import type { CroScanPreview } from '@shared/types'

export type CroScanOutcome = { result: CroScanPreview } | { error: string; status: number }

/** Scans a page for CRO and lead capture signals within the visitor's hourly allowance. */
export async function scanCroForVisitor(url: string, ip: string): Promise<CroScanOutcome> {
	if (!url.trim()) return { error: 'Enter a page address to scan.', status: 400 }
	if (!takeRateLimit(`cro:${ip}`)) {
		return { error: "You've scanned a lot of pages. Try again in an hour.", status: 429 }
	}
	try {
		return { result: await withSlot(() => runCroScan(url)) }
	} catch (e) {
		const message = e instanceof AuditError ? e.message : "We couldn't scan that page."

		return { error: message, status: 422 }
	}
}
