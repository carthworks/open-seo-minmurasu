export type ToastTone = 'pass' | 'fail' | 'info'

export interface ToastMessage {
	id: string
	tone: ToastTone
	message: string
}

export interface ToastContainerProps {
	toasts: ToastMessage[]
	onDismiss: (id: string) => void
}
