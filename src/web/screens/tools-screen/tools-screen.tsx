'use client'

import { memo, useMemo, useState } from 'react'
import Link from 'next/link'
import { Icon } from '@web/components/icon'
import { PageHeader } from '@web/components/page-header'
import type { ActiveTool, ToolsScreenProps } from './tools-screen.types'

const ToolsScreen = (_props: ToolsScreenProps) => {
	const [activeTool, setActiveTool] = useState<ActiveTool>('serp')
	const [copied, setCopied] = useState(false)

	// SERP Simulator State
	const [serpTitle, setSerpTitle] = useState('MIN MURASU — Strategic Digital Marketing & SEO Services')
	const [serpUrl, setSerpUrl] = useState('https://www.minmurasu.digital/seo-services')
	const [serpDesc, setSerpDesc] = useState(
		'Grow your business with data-driven SEO, local search dominance, speed optimization, and AI search readiness. Contact our experts today for a free website audit.'
	)

	// Schema Generator State
	const [schemaType, setSchemaType] = useState<'LocalBusiness' | 'Organization' | 'FAQPage'>('LocalBusiness')
	const [bizName, setBizName] = useState('MIN MURASU')
	const [bizUrl, setBizUrl] = useState('https://www.minmurasu.digital/')
	const [bizPhone, setBizPhone] = useState('+919486772206')
	const [bizCity, setBizCity] = useState('Tamil Nadu')

	// FAQ state
	const [faqQ, setFaqQ] = useState('How long does SEO take to show results?')
	const [faqA, setFaqA] = useState(
		'Technical fixes and indexing updates can reflect in 2 to 4 weeks, while competitive ranking and organic traffic growth typically scale within 3 to 6 months.'
	)

	// Generated JSON-LD
	const generatedSchema = useMemo(() => {
		if (schemaType === 'LocalBusiness') {
			return JSON.stringify(
				{
					'@context': 'https://schema.org',
					'@type': 'LocalBusiness',
					name: bizName,
					url: bizUrl,
					telephone: bizPhone,
					address: {
						'@type': 'PostalAddress',
						addressRegion: bizCity,
						addressCountry: 'IN'
					},
					priceRange: '₹₹'
				},
				null,
				2
			)
		}
		if (schemaType === 'FAQPage') {
			return JSON.stringify(
				{
					'@context': 'https://schema.org',
					'@type': 'FAQPage',
					mainEntity: [
						{
							'@type': 'Question',
							name: faqQ,
							acceptedAnswer: {
								'@type': 'Answer',
								text: faqA
							}
						}
					]
				},
				null,
				2
			)
		}

		return JSON.stringify(
			{
				'@context': 'https://schema.org',
				'@type': 'Organization',
				name: bizName,
				url: bizUrl,
				contactPoint: {
					'@type': 'ContactPoint',
					telephone: bizPhone,
					contactType: 'customer service'
				}
			},
			null,
			2
		)
	}, [schemaType, bizName, bizUrl, bizPhone, bizCity, faqQ, faqA])

	// Generated robots / llms.txt
	const robotsTxt = `# robots.txt
User-agent: *
Allow: /

# AI Assistants & Answer Engines
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

Sitemap: ${bizUrl}sitemap.xml
`

	const copyCode = (text: string) => {
		navigator.clipboard.writeText(text)
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}

	return (
		<div className="screen tools-screen">
			<PageHeader
				eyebrow="Toolkit"
				title="SEO Utilities"
				description="Browser-based tools to simulate search appearance, generate clean Schema.org markup, and validate AI crawler directives."
				actions={
					<Link href="/" className="button button--primary button--small">
						<Icon name="audit" size={14} />
						<span>Run full audit</span>
					</Link>
				}
			/>

			{/* Tool Selector Tabs */}
			<div className="filter-tabs">
				<button
					type="button"
					className="filter-tab"
					aria-selected={activeTool === 'serp'}
					onClick={() => setActiveTool('serp')}
				>
					<Icon name="search" size={15} />
					<span>SERP Snippet Simulator</span>
				</button>
				<button
					type="button"
					className="filter-tab"
					aria-selected={activeTool === 'schema'}
					onClick={() => setActiveTool('schema')}
				>
					<Icon name="code" size={15} />
					<span>Schema JSON-LD Generator</span>
				</button>
				<button
					type="button"
					className="filter-tab"
					aria-selected={activeTool === 'robots'}
					onClick={() => setActiveTool('robots')}
				>
					<Icon name="ai" size={15} />
					<span>Robots & AI Directives</span>
				</button>
			</div>

			{/* Tool 1: SERP Simulator */}
			{activeTool === 'serp' && (
				<div className="tool-card">
					<div className="tool-card-head">
						<h2>Google SERP Snippet Simulator</h2>
						<p className="muted">
							Preview how your web page appears in Google desktop search results in real time.
						</p>
					</div>

					<div className="tool-editor-grid">
						<div className="tool-inputs">
							<label className="contact-field-group">
								<div className="tool-label-row">
									<span className="contact-field-label">Page Title (&lt;title&gt;)</span>
									<span
										className={`mono tool-counter ${serpTitle.length > 60 ? 'is-warning' : 'is-good'}`}
									>
										{serpTitle.length} / 60 chars
									</span>
								</div>
								<input
									type="text"
									className="text-input"
									value={serpTitle}
									onChange={(e) => setSerpTitle(e.target.value)}
								/>
							</label>

							<label className="contact-field-group">
								<span className="contact-field-label">Target URL</span>
								<input
									type="url"
									className="text-input"
									value={serpUrl}
									onChange={(e) => setSerpUrl(e.target.value)}
								/>
							</label>

							<label className="contact-field-group">
								<div className="tool-label-row">
									<span className="contact-field-label">Meta Description</span>
									<span
										className={`mono tool-counter ${serpDesc.length > 160 ? 'is-warning' : 'is-good'}`}
									>
										{serpDesc.length} / 160 chars
									</span>
								</div>
								<textarea
									rows={3}
									className="text-input contact-textarea"
									value={serpDesc}
									onChange={(e) => setSerpDesc(e.target.value)}
								/>
							</label>
						</div>

						{/* Preview Output Box */}
						<div className="tool-preview-box">
							<span className="tool-preview-heading">Google Search Preview</span>
							<div className="serp-google-card">
								<div className="serp-google-url-row">
									<span className="serp-google-fav">🌐</span>
									<div className="serp-google-url-text">
										<span className="serp-google-site">
											{new URL(serpUrl || 'https://example.com').hostname}
										</span>
										<span className="serp-google-path">{serpUrl}</span>
									</div>
								</div>
								<h3 className="serp-google-title">{serpTitle || 'Page Title'}</h3>
								<p className="serp-google-desc">
									{serpDesc || 'Provide a compelling description summarizing your page content.'}
								</p>
							</div>

							<div className="tool-feedback">
								{serpTitle.length < 30 && (
									<p className="tool-tip is-warn">⚠️ Title is short ({serpTitle.length} chars). Aim for 50–60 characters.</p>
								)}
								{serpTitle.length >= 30 && serpTitle.length <= 60 && (
									<p className="tool-tip is-pass">✓ Optimal title length. Will not be truncated by Google.</p>
								)}
								{serpTitle.length > 60 && (
									<p className="tool-tip is-warn">⚠️ Title exceeds 60 characters. Google will truncate the end.</p>
								)}
								{serpDesc.length > 160 && (
									<p className="tool-tip is-warn">⚠️ Description exceeds 160 characters and may be clipped.</p>
								)}
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Tool 2: Schema Generator */}
			{activeTool === 'schema' && (
				<div className="tool-card">
					<div className="tool-card-head">
						<h2>Schema.org JSON-LD Generator</h2>
						<p className="muted">Generate structured data to qualify for Google Rich Results.</p>
					</div>

					<div className="tool-editor-grid">
						<div className="tool-inputs">
							<label className="contact-field-group">
								<span className="contact-field-label">Schema Type</span>
								<select
									className="select"
									value={schemaType}
									onChange={(e) => setSchemaType(e.target.value as any)}
								>
									<option value="LocalBusiness">LocalBusiness (Stores, Agencies, Clinics)</option>
									<option value="Organization">Organization (Companies, Brands)</option>
									<option value="FAQPage">FAQPage (Q&A Rich Results)</option>
								</select>
							</label>

							{schemaType !== 'FAQPage' ? (
								<>
									<label className="contact-field-group">
										<span className="contact-field-label">Business / Brand Name</span>
										<input
											type="text"
											className="text-input"
											value={bizName}
											onChange={(e) => setBizName(e.target.value)}
										/>
									</label>

									<label className="contact-field-group">
										<span className="contact-field-label">Website URL</span>
										<input
											type="url"
											className="text-input"
											value={bizUrl}
											onChange={(e) => setBizUrl(e.target.value)}
										/>
									</label>

									<label className="contact-field-group">
										<span className="contact-field-label">Phone Number</span>
										<input
											type="tel"
											className="text-input"
											value={bizPhone}
											onChange={(e) => setBizPhone(e.target.value)}
										/>
									</label>

									{schemaType === 'LocalBusiness' && (
										<label className="contact-field-group">
											<span className="contact-field-label">City / State</span>
											<input
												type="text"
												className="text-input"
												value={bizCity}
												onChange={(e) => setBizCity(e.target.value)}
											/>
										</label>
									)}
								</>
							) : (
								<>
									<label className="contact-field-group">
										<span className="contact-field-label">Question</span>
										<input
											type="text"
											className="text-input"
											value={faqQ}
											onChange={(e) => setFaqQ(e.target.value)}
										/>
									</label>

									<label className="contact-field-group">
										<span className="contact-field-label">Answer</span>
										<textarea
											rows={4}
											className="text-input contact-textarea"
											value={faqA}
											onChange={(e) => setFaqA(e.target.value)}
										/>
									</label>
								</>
							)}
						</div>

						{/* JSON Code Output */}
						<div className="tool-preview-box">
							<div className="tool-code-header">
								<span className="tool-preview-heading">JSON-LD Output</span>
								<button
									type="button"
									className="button button--small button--primary"
									onClick={() => copyCode(`<script type="application/ld+json">\n${generatedSchema}\n</script>`)}
								>
									<span>{copied ? '✓ Copied!' : 'Copy <script> Tag'}</span>
								</button>
							</div>
							<pre className="tool-code-pre mono">
								<code>{`<script type="application/ld+json">\n${generatedSchema}\n</script>`}</code>
							</pre>
						</div>
					</div>
				</div>
			)}

			{/* Tool 3: Robots & AI Directives */}
			{activeTool === 'robots' && (
				<div className="tool-card">
					<div className="tool-card-head">
						<h2>Robots.txt & AI Agent Directives</h2>
						<p className="muted">
							Configure crawler permissions for search bots and AI answer engines.
						</p>
					</div>

					<div className="tool-editor-grid">
						<div className="tool-inputs">
							<div className="callout">
								<div>
									<strong>AI Engine Optimization (GEO)</strong>
									<p className="muted">
										Explicitly declaring permissions for GPTBot, ClaudeBot, and PerplexityBot
										ensures AI assistants can retrieve and cite your brand in answer summaries.
									</p>
								</div>
							</div>
							<label className="contact-field-group">
								<span className="contact-field-label">Sitemap URL</span>
								<input
									type="url"
									className="text-input"
									value={`${bizUrl}sitemap.xml`}
									onChange={(e) => setBizUrl(e.target.value.replace(/sitemap\.xml$/, ''))}
								/>
							</label>
						</div>

						<div className="tool-preview-box">
							<div className="tool-code-header">
								<span className="tool-preview-heading">robots.txt Directives</span>
								<button
									type="button"
									className="button button--small button--primary"
									onClick={() => copyCode(robotsTxt)}
								>
									<span>{copied ? '✓ Copied!' : 'Copy Directives'}</span>
								</button>
							</div>
							<pre className="tool-code-pre mono">
								<code>{robotsTxt}</code>
							</pre>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}

export default memo(ToolsScreen)
