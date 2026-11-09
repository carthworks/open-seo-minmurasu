/** Digits for tel: links, keeping a leading +. */
export function telHref(phone: string): string {
	return `tel:${phone.replace(/[^\d+]/g, '')}`
}

/** A WhatsApp chat link. Ten-digit numbers are taken as Indian (+91). */
export function whatsappHref(phone: string): string {
	const digits = phone.replace(/\D/g, '')
	const international = digits.length === 10 ? `91${digits}` : digits

	return `https://wa.me/${international}`
}

