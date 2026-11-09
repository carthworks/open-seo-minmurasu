'use client'

import { memo, useEffect, useState } from 'react'
import Link from 'next/link'
import { Icon } from '@web/components/icon'
import { PageHeader } from '@web/components/page-header'
import type { ChecklistScreenProps, ChecklistTask } from './checklist-screen.types'

const CHECKLIST_ITEMS: ChecklistTask[] = [
	{
		id: 'tech-1',
		category: 'technical',
		categoryLabel: 'Technical SEO',
		title: 'Ensure XML sitemap is submitted to Google Search Console',
		description: 'Verify sitemap.xml is clean, returns HTTP 200, and is linked in robots.txt.',
		priority: 'high'
	},
	{
		id: 'tech-2',
		category: 'technical',
		categoryLabel: 'Technical SEO',
		title: 'Verify self-referencing canonical tag on every indexable page',
		description: 'Prevents duplicate content splitting link equity across HTTP/HTTPS or trailing slash variants.',
		priority: 'high'
	},
	{
		id: 'local-1',
		category: 'local',
		categoryLabel: 'Local SEO',
		title: 'Implement LocalBusiness Schema with NAP coordinates',
		description: 'Declare name, telephone, streetAddress, and geo latitude/longitude for local map indexing.',
		priority: 'high'
	},
	{
		id: 'local-2',
		category: 'local',
		categoryLabel: 'Local SEO',
		title: 'Embed Google Maps or place CID reference in footer',
		description: 'Connects website entity directly to your verified Google Business Profile.',
		priority: 'medium'
	},
	{
		id: 'ai-1',
		category: 'ai',
		categoryLabel: 'AI Search (GEO)',
		title: 'Deploy /llms.txt at root with plain-markdown summary',
		description: 'Provides AI models (ChatGPT, Gemini, Claude) a concise guide to your services.',
		priority: 'high'
	},
	{
		id: 'ai-2',
		category: 'ai',
		categoryLabel: 'AI Search (GEO)',
		title: 'Allow AI search bots in robots.txt (GPTBot, PerplexityBot)',
		description: 'Prevents unintentional blocking of next-generation answer engines.',
		priority: 'high'
	},
	{
		id: 'speed-1',
		category: 'speed',
		categoryLabel: 'Performance',
		title: 'Explicit width and height on all <img> elements',
		description: 'Eliminates Cumulative Layout Shift (CLS) so page elements do not jump as images load.',
		priority: 'high'
	},
	{
		id: 'speed-2',
		category: 'speed',
		categoryLabel: 'Performance',
		title: 'Compress and serve images in WebP or AVIF format',
		description: 'Reduces image payload by 40–80% without visible quality loss.',
		priority: 'medium'
	},
	{
		id: 'onpage-1',
		category: 'onpage',
		categoryLabel: 'On-Page SEO',
		title: 'Write unique title tags between 50–60 characters',
		description: 'Front-load your primary keyword and avoid truncation in search snippets.',
		priority: 'high'
	},
	{
		id: 'onpage-2',
		category: 'onpage',
		categoryLabel: 'On-Page SEO',
		title: 'Exactly one descriptive <h1> tag per page',
		description: 'Clear hierarchy tells crawlers the single primary subject of the document.',
		priority: 'high'
	},
	{
		id: 'a11y-1',
		category: 'a11y',
		categoryLabel: 'Accessibility',
		title: 'Every form control has an associated <label>',
		description: 'Allows screen readers and voice assistants to describe form inputs accurately.',
		priority: 'medium'
	},
	{
		id: 'a11y-2',
		category: 'a11y',
		categoryLabel: 'Accessibility',
		title: 'All buttons and links have accessible text content',
		description: 'Eliminate icon-only buttons missing aria-label or accessible text.',
		priority: 'medium'
	}
]

const STORAGE_KEY = 'openseo_checklist_state'

const ChecklistScreen = (_props: ChecklistScreenProps) => {
	const [completed, setCompleted] = useState<Record<string, boolean>>({})
	const [filter, setFilter] = useState<string>('all')

	useEffect(() => {
		try {
			const saved = localStorage.getItem(STORAGE_KEY)
			if (saved) setCompleted(JSON.parse(saved))
		} catch {}
	}, [])

	const toggle = (id: string) => {
		setCompleted((prev) => {
			const next = { ...prev, [id]: !prev[id] }
			try {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
			} catch {}

			return next
		})
	}

	const doneCount = Object.values(completed).filter(Boolean).length
	const totalCount = CHECKLIST_ITEMS.length
	const percent = Math.round((doneCount / totalCount) * 100)

	const filteredItems = CHECKLIST_ITEMS.filter((item) =>
		filter === 'all' ? true : item.category === filter
	)

	return (
		<div className="screen checklist-screen">
			<PageHeader
				eyebrow="Optimization Roadmap"
				title="2027 SEO Checklist"
				description="Actionable, high-impact checklist across Technical SEO, Local Maps, AI Answer Engines, Speed, and WCAG accessibility."
				actions={
					<Link href="/" className="button button--primary button--small">
						<Icon name="audit" size={14} />
						<span>Verify with audit</span>
					</Link>
				}
			/>

			{/* Progress Banner */}
			<div className="checklist-progress-card">
				<div className="checklist-progress-head">
					<div>
						<h3>Checklist Completion</h3>
						<p className="muted">
							{doneCount} of {totalCount} optimizations completed
						</p>
					</div>
					<span className="checklist-percent mono">{percent}%</span>
				</div>
				<div className="checklist-progress-bar">
					<div className="checklist-progress-fill" style={{ width: `${percent}%` }} />
				</div>
			</div>

			{/* Category Filter Tabs */}
			<div className="filter-tabs">
				<button
					type="button"
					className="filter-tab"
					aria-selected={filter === 'all'}
					onClick={() => setFilter('all')}
				>
					<span>All ({CHECKLIST_ITEMS.length})</span>
				</button>
				<button
					type="button"
					className="filter-tab"
					aria-selected={filter === 'technical'}
					onClick={() => setFilter('technical')}
				>
					<span>Technical</span>
				</button>
				<button
					type="button"
					className="filter-tab"
					aria-selected={filter === 'local'}
					onClick={() => setFilter('local')}
				>
					<span>Local SEO</span>
				</button>
				<button
					type="button"
					className="filter-tab"
					aria-selected={filter === 'ai'}
					onClick={() => setFilter('ai')}
				>
					<span>AI Search</span>
				</button>
				<button
					type="button"
					className="filter-tab"
					aria-selected={filter === 'speed'}
					onClick={() => setFilter('speed')}
				>
					<span>Speed</span>
				</button>
				<button
					type="button"
					className="filter-tab"
					aria-selected={filter === 'a11y'}
					onClick={() => setFilter('a11y')}
				>
					<span>Accessibility</span>
				</button>
			</div>

			{/* Task List */}
			<div className="checklist-items-container">
				{filteredItems.map((task) => {
					const isDone = Boolean(completed[task.id])

					return (
						<div
							key={task.id}
							className={`checklist-item-card ${isDone ? 'is-completed' : ''}`}
							onClick={() => toggle(task.id)}
						>
							<button
								type="button"
								className={`checklist-checkbox ${isDone ? 'is-checked' : ''}`}
								aria-label={`Mark "${task.title}" as ${isDone ? 'incomplete' : 'complete'}`}
							>
								{isDone ? '✓' : ''}
							</button>

							<div className="checklist-item-body">
								<div className="checklist-item-top">
									<span className="checklist-category-badge">{task.categoryLabel}</span>
									<span className={`checklist-priority-badge is-${task.priority}`}>
										{task.priority.toUpperCase()}
									</span>
								</div>
								<h4 className={`checklist-item-title ${isDone ? 'is-strike' : ''}`}>
									{task.title}
								</h4>
								<p className="checklist-item-desc">{task.description}</p>
							</div>
						</div>
					)
				})}
			</div>
		</div>
	)
}

export default memo(ChecklistScreen)
