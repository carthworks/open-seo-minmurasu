'use client'

import { memo, useCallback, useState } from 'react'
import { Icon } from '@web/components/icon'
import { StatusMark } from '@web/components/status-mark'
import type { ToastContainerProps, ToastMessage, ToastTone } from './toast.types'

/** Lightweight hook for non-blocking toast notifications. */
export function useToast(durationMs = 3400) {
	const [toasts, setToasts] = useState<ToastMessage[]>([])

	const dismiss = useCallback((id: string) => {
		setToasts((prev) => prev.filter((t) => t.id !== id))
	}, [])

	const push = useCallback(
		(message: string, tone: ToastTone = 'pass') => {
			const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
			setToasts((prev) => [...prev.slice(-3), { id, tone, message }])
			window.setTimeout(() => {
				setToasts((prev) => prev.filter((t) => t.id !== id))
			}, durationMs)
		},
		[durationMs]
	)

	return { toasts, push, dismiss }
}

/** Floating toast stack in the bottom-right corner. */
export const ToastContainer = memo((props: ToastContainerProps) => {
	const { toasts, onDismiss } = props
	if (toasts.length === 0) return null

	return (
		<div className="toast-stack" aria-live="polite">
			{toasts.map((toast) => (
				<div key={toast.id} role="status" className={`toast-item toast-item--${toast.tone}`}>
					<StatusMark status={toast.tone} size={15} />
					<span className="toast-item-text">{toast.message}</span>
					<button
						type="button"
						className="toast-item-close"
						aria-label="Dismiss notification"
						onClick={() => onDismiss(toast.id)}
					>
						<Icon name="close" size={13} />
					</button>
				</div>
			))}
		</div>
	)
})
ToastContainer.displayName = 'ToastContainer'
