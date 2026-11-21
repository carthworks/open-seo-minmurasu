'use client'

import { memo, useState, type SubmitEvent } from 'react'
import { Button } from '@web/components/button'
import { Icon } from '@web/components/icon'
import { PageHeader } from '@web/components/page-header'
import type { LoginScreenProps } from './login-screen.types'

/** In-app password sign-in screen for protected admin pages (/leads, /history, /settings). */
const LoginScreen = (props: LoginScreenProps) => {
	const { nextPath } = props

	const [password, setPassword] = useState('')
	const [pending, setPending] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
		e.preventDefault()
		if (!password || pending) return
		setPending(true)
		setError(null)
		try {
			const res = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ password })
			})
			const data = (await res.json().catch(() => ({}))) as { error?: string }
			if (!res.ok) {
				setError(data.error || 'Incorrect password.')
				setPending(false)

				return
			}
			const safeNext =
				nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/leads'
			window.location.assign(safeNext)
		} catch {
			setError('Could not verify password. Please try again.')
			setPending(false)
		}
	}

	return (
		<div className="screen" style={{ maxWidth: 460 }}>
			<PageHeader
				eyebrow="Admin Access"
				title="Sign in"
				description="Enter the admin password to access leads, audit history, crawls, monitors, and settings."
			/>
			<form className="panel-form" onSubmit={handleSubmit}>
				<div className="lead-field">
					<span>ADMIN PASSWORD</span>
					<input
						type="password"
						autoFocus
						required
						placeholder="Enter password"
						value={password}
						onChange={(e) => setPassword(e.currentTarget.value)}
					/>
				</div>
				{error && (
					<p className="callout callout--error" role="alert" style={{ marginTop: 12 }}>
						<Icon name="alert" size={16} />
						{error}
					</p>
				)}
				<div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
					<Button type="submit" variant="primary" disabled={!password || pending}>
						{pending ? 'Signing in…' : 'Continue'}
					</Button>
				</div>
			</form>
		</div>
	)
}

export default memo(LoginScreen)
