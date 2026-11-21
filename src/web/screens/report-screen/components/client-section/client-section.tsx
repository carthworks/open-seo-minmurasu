import { memo } from 'react'
import type { AuditDeliveryChannel } from '@shared/types'
import type { ClientSectionProps } from './client-section.types'

const CHANNEL_LABEL: Record<AuditDeliveryChannel, string> = {
	whatsapp_call: 'WhatsApp + Call',
	email: 'Work Email',
	phone: 'Direct Phone Call'
}

/** Client lead details collected before starting the audit, shown on the report and in PDF. */
const ClientSection = (props: ClientSectionProps) => {
	const { client } = props

	return (
		<section className="report-card" id="client" aria-labelledby="client-title">
			<div className="report-card-head">
				<h2 id="client-title">Client details</h2>
				<span className="muted">{CHANNEL_LABEL[client.deliveryChannel]}</span>
			</div>
			<div className="detail-table-wrap">
				<table className="detail-table">
					<tbody>
						<tr>
							<th>Full Name</th>
							<td>
								<strong>{client.fullName}</strong>
							</td>
							<th>Phone / WhatsApp</th>
							<td className="mono">
								<a href={`tel:${client.phone}`}>{client.phone}</a>
							</td>
						</tr>
						<tr>
							<th>Email</th>
							<td>
								<a href={`mailto:${client.email}`}>{client.email}</a>
							</td>
							<th>Company / Brand</th>
							<td>{client.company || '—'}</td>
						</tr>
						<tr>
							<th>Primary Priority</th>
							<td>{client.priority}</td>
							<th>Preferred Delivery</th>
							<td>{CHANNEL_LABEL[client.deliveryChannel]}</td>
						</tr>
						{client.growthGoal && (
							<tr>
								<th>Growth Goal</th>
								<td colSpan={3}>{client.growthGoal}</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</section>
	)
}

export default memo(ClientSection)
