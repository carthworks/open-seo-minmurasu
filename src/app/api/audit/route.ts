import { AuditError, runAudit } from '@server/audit'
import { clientIp, takeRateLimit, withSlot } from '@server/limits'
import { pagespeedConfig } from '@server/settings'
import { getSettings, saveReport } from '@server/store'
import { jsonError, streamEvents } from '@server/stream'
import type { AuditDeliveryChannel, AuditProgress, ClientLeadDetails, ReportSource } from '@shared/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const SOURCES: ReportSource[] = ['web', 'api']
const CHANNELS: AuditDeliveryChannel[] = ['whatsapp_call', 'email', 'phone']

function parseClientLead(raw: unknown): ClientLeadDetails | undefined {
	if (!raw || typeof raw !== 'object') return undefined
	const obj = raw as Record<string, unknown>
	const fullName = typeof obj.fullName === 'string' ? obj.fullName.trim().slice(0, 120) : ''
	const phone = typeof obj.phone === 'string' ? obj.phone.trim().slice(0, 40) : ''
	const email = typeof obj.email === 'string' ? obj.email.trim().slice(0, 120) : ''
	if (!fullName || !phone || !email) return undefined

	const deliveryChannel = CHANNELS.includes(obj.deliveryChannel as AuditDeliveryChannel)
		? (obj.deliveryChannel as AuditDeliveryChannel)
		: 'whatsapp_call'

	return {
		fullName,
		phone,
		email,
		company: typeof obj.company === 'string' ? obj.company.trim().slice(0, 120) || undefined : undefined,
		priority:
			typeof obj.priority === 'string' && obj.priority.trim()
				? obj.priority.trim().slice(0, 120)
				: 'Complete 360° Digital Presence',
		growthGoal: typeof obj.growthGoal === 'string' ? obj.growthGoal.trim().slice(0, 600) : '',
		deliveryChannel,
		consent: Boolean(obj.consent)
	}
}

/**
 * POST /api/audit { url, source?, stream? }
 *
 * Streams progress as newline-delimited JSON and ends with { type: "done", id }. Send
 * stream: false to wait for the whole report as JSON instead.
 */
export async function POST(request: Request): Promise<Response> {
	const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
	const url = typeof body.url === 'string' ? body.url : ''
	const source = SOURCES.includes(body.source as ReportSource)
		? (body.source as ReportSource)
		: 'api'
	const client = parseClientLead(body.client)
	const settings = await getSettings()

	if (!url.trim()) return jsonError('Enter a website address to audit.', 400)
	if (!takeRateLimit(clientIp(request))) {
		return jsonError("You've run a lot of audits. Try again in an hour.", 429)
	}

	const audit = (onProgress?: (progress: AuditProgress) => void) =>
		withSlot(async () => {
			const report = await runAudit(url, {
				source,
				onProgress,
				pagespeed: pagespeedConfig(settings),
				brokenLinkLimit: settings.brokenLinkLimit,
				client
			})
			await saveReport(report)

			return report
		})

	if (body.stream === false) {
		try {
			return Response.json(await audit())
		} catch (e) {
			return jsonError(e instanceof AuditError ? e.message : 'The audit failed.', 422)
		}
	}

	return streamEvents(async (send) => {
		send({ type: 'progress', step: 'queued', label: 'Starting the audit', pct: 1 })
		const report = await audit((p) => send({ type: 'progress', ...p }))
		send({ type: 'done', id: report.id, score: report.score, grade: report.grade })
	})
}
