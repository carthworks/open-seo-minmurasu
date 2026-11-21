import type { Metadata } from 'next'
import { LoginScreen } from '@web/screens/login-screen'

export const metadata: Metadata = {
	title: 'Admin Sign In',
	robots: { index: false, follow: false }
}

const LoginPage = async (props: PageProps<'/login'>) => {
	const { next } = await props.searchParams
	const nextPath = typeof next === 'string' && next.startsWith('/') ? next : '/leads'

	return <LoginScreen nextPath={nextPath} />
}

export default LoginPage
