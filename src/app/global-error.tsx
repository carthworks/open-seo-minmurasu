'use client'

export interface GlobalErrorProps {
	error: Error & { digest?: string }
	reset: () => void
}

const GlobalError = (props: GlobalErrorProps) => {
	const { reset } = props

	return (
		<html lang="en">
			<body
				style={{
					margin: 0,
					minHeight: '100vh',
					display: 'grid',
					placeItems: 'center',
					fontFamily: 'system-ui, sans-serif',
					padding: 24
				}}
			>
				<div style={{ maxWidth: 440, textAlign: 'center' }}>
					<h1 style={{ fontSize: 22, marginBottom: 8 }}>Something went wrong</h1>
					<p style={{ color: '#555', marginBottom: 18 }}>
						An unexpected application error occurred. Please try reloading the page.
					</p>
					<button
						type="button"
						onClick={reset}
						style={{
							padding: '10px 18px',
							borderRadius: 8,
							border: '1px solid #222',
							background: '#111',
							color: '#fff',
							cursor: 'pointer'
						}}
					>
						Try again
					</button>
				</div>
			</body>
		</html>
	)
}

export default GlobalError
