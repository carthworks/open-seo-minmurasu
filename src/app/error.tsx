'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { EmptyState } from '@web/components/empty-state'

export interface ErrorPageProps {
	error: Error & { digest?: string }
	reset: () => void
}

const ErrorPage = (props: ErrorPageProps) => {
	const { error, reset } = props

	useEffect(() => {
		console.error(error)
	}, [error])

	return (
		<div className="not-found">
			<EmptyState icon="alert" title="Something went wrong">
				<p>An unexpected error occurred while loading this page. Try again or return home.</p>
				<p style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
					<button type="button" className="button button--primary" onClick={reset}>
						Try again
					</button>
					<Link className="button" href="/">
						Run a new audit
					</Link>
				</p>
			</EmptyState>
		</div>
	)
}

export default ErrorPage
