'use client'

import { memo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BrandMark } from '@web/components/brand-mark'
import { Icon } from '@web/components/icon'
import { NavItem } from './components/nav-item'
import { NAV, REPOSITORY_URL } from './app-shell.constants'
import type { AppShellProps } from './app-shell.types'
import { isActive } from './app-shell.utils'

/** The app window: a sidebar of sections on the left, the current page in a panel on the right. */
const AppShell = (props: AppShellProps) => {
	const { children, brandName, brandLogo } = props

	const pathname = usePathname()
	const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

	const toggleGroup = (title: string) => {
		setCollapsed((prev) => ({ ...prev, [title]: !prev[title] }))
	}

	return (
		<div className="app-shell">
			<aside className="sidebar">
				<Link href="/" className="sidebar-brand">
					<BrandMark name={brandName} logo={brandLogo} />
				</Link>
				<nav className="sidebar-nav" aria-label="Sections">
					{NAV.map((group) => {
						const hasActive = group.items.some((item) => isActive(item.href, pathname))
						const isCollapsed = Boolean(collapsed[group.title]) && !hasActive

						return (
							<div key={group.title} className="sidebar-group">
								<button
									type="button"
									className="sidebar-group-toggle"
									aria-expanded={!isCollapsed}
									onClick={() => toggleGroup(group.title)}
								>
									<span>{group.title}</span>
									<Icon
										name="chevronDown"
										size={12}
										style={{
											transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
											transition: 'transform 0.16s ease'
										}}
									/>
								</button>
								{!isCollapsed &&
									group.items.map((item) => (
										<NavItem
											key={item.href}
											href={item.href}
											label={item.label}
											icon={item.icon}
											active={isActive(item.href, pathname)}
										/>
									))}
							</div>
						)
					})}
				</nav>
				<div className="sidebar-footers">
					<a
						className="sidebar-footer"
						href="https://www.minmurasu.digital/"
						target="_blank"
						rel="noreferrer"
						title="📞 9486772206 · 📧 minmurasu.digital@gmail.com"
					>
						<Icon name="external" size={15} />
						<span>MIN MURASU</span>
					</a>
					<a
						className="sidebar-footer"
						href={REPOSITORY_URL}
						target="_blank"
						rel="noreferrer"
					>
						<Icon name="code" size={15} />
						<span>Powered by OpenSEO · MIT</span>
					</a>
				</div>
			</aside>
			<main className="app-panel">{children}</main>
		</div>
	)
}

export default memo(AppShell)
