'use client'

import {
	BACKLINK_PROVIDER_OPTIONS,
	BROKEN_LINK_OPTIONS,
	CRAWL_PAGE_OPTIONS,
	KEYWORD_AUDIT_PAGE_OPTIONS,
	VIBECODE_STACK_OPTIONS,
	type BacklinkProvider,
	type PublicSettings,
	type Settings,
	type VibecodeTargetStack
} from '@shared/settings'
import { Icon } from '@web/components/icon'
import { PageHeader } from '@web/components/page-header'
import { useRouter } from 'next/navigation'
import { memo, useCallback, useState } from 'react'
import { AppUrlField } from './components/app-url-field'
import { isWebAddress } from './components/app-url-field/app-url-field.utils'
import { EmailsField } from './components/emails-field'
import { Row } from './components/row'
import { SecretField } from './components/secret-field'
import { Section } from './components/section'
import { SettingSelect } from './components/setting-select'
import { SettingToggle } from './components/setting-toggle'
import { TestAlert } from './components/test-alert'
import { TestLocalAi } from './components/test-local-ai'
import { TextSettingField } from './components/text-setting-field'
import { ThemeOption } from './components/theme-option'
import { SETTINGS_TABS, THEMES } from './settings-screen.constants'
import type { SettingsScreenProps, SettingsTabId } from './settings-screen.types'

/** Appearance, audit options and where alerts go. Every change saves straight away. */
const SettingsScreen = (props: SettingsScreenProps) => {
	const { settings: initial, version } = props

	const router = useRouter()
	const [settings, setSettings] = useState<PublicSettings>(initial)
	const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
	const [activeTab, setActiveTab] = useState<SettingsTabId>('general')

	const update = useCallback(
		async (patch: Partial<Settings>) => {
			setStatus('saving')
			const res = await fetch('/api/settings', {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(patch)
			})
			if (!res.ok) {
				setStatus('error')

				return
			}
			setSettings(await res.json())
			setStatus('saved')
			router.refresh()
		},
		[router]
	)

	return (
		<div className="screen settings">
			<PageHeader
				eyebrow="Workspace"
				title="Settings"
				description="Changes save as you make them."
				actions={
					status !== 'idle' && (
						<span className={`save-status is-${status}`} role="status">
							{status === 'saving' && 'Saving…'}
							{status === 'saved' && (
								<>
									<Icon name="check" size={14} /> Saved
								</>
							)}
							{status === 'error' && "Couldn't save. Try again."}
						</span>
					)
				}
			/>

			<div className="settings-tabs" role="tablist" aria-label="Settings sections">
				{SETTINGS_TABS.map((tab) => {
					const isActive = activeTab === tab.id

					return (
						<button
							key={tab.id}
							type="button"
							role="tab"
							aria-selected={isActive}
							className={`settings-tab ${isActive ? 'is-active' : ''}`}
							onClick={() => setActiveTab(tab.id)}
						>
							<Icon name={tab.icon} size={15} />
							<span>{tab.label}</span>
						</button>
					)
				})}
			</div>

			{activeTab === 'general' && (
				<>
					<Section title="Appearance">
				<Row label="Theme" note="Applies to the app and shared reports.">
					<div className="segmented" role="radiogroup" aria-label="Theme">
						{THEMES.map((t) => (
							<ThemeOption
								key={t.value}
								value={t.value}
								label={t.label}
								checked={settings.theme === t.value}
								onSelect={(theme) => update({ theme })}
							/>
						))}
					</div>
				</Row>
			</Section>

			<Section
				title="Branding"
				description="Custom branding displayed in the sidebar, browser tab, and reports."
			>
				<Row
					label="Brand name"
					note="Shown on reports and in the browser tab."
					htmlFor="s-brand-name"
				>
					<TextSettingField
						id="s-brand-name"
						setting="brandName"
						value={settings.brandName}
						placeholder="MIN MURASU"
						validate={(v) => (v ? null : 'Enter a brand name.')}
						onChange={update}
					/>
				</Row>
				<Row
					label="Brand logo"
					note="Image URL or /brand/logo.png path shown in the sidebar and PDF cover."
					htmlFor="s-brand-logo"
				>
					<TextSettingField
						id="s-brand-logo"
						setting="brandLogo"
						value={settings.brandLogo}
						placeholder="/brand/logo.png"
						onChange={update}
					/>
				</Row>
				<Row
					label="Brand accent color"
					note="Hex color used for buttons, highlights, and PDF cover accents."
					htmlFor="s-brand-color"
				>
					<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
						<input
							type="color"
							aria-label="Pick brand accent color"
							value={/^#[0-9a-f]{6}$/i.test(settings.brandColor) ? settings.brandColor : '#c8f135'}
							onChange={(e) => update({ brandColor: e.currentTarget.value })}
							style={{ width: 38, height: 38, padding: 2, borderRadius: 6, border: '1px solid var(--border, #e5e7eb)', cursor: 'pointer', background: 'transparent' }}
						/>
						<TextSettingField
							key={settings.brandColor}
							id="s-brand-color"
							setting="brandColor"
							value={settings.brandColor}
							placeholder="#c8f135"
							validate={(v) =>
								/^#[0-9a-f]{6}$/i.test(v) ? null : 'Enter a 6-digit hex color, like #c8f135.'
							}
							onChange={update}
						/>
					</div>
				</Row>
				<Row
					label="Website & CTA link"
					note="Where visitors go when clicking your brand or call-to-action button on reports."
					htmlFor="s-cta-url"
				>
					<TextSettingField
						id="s-cta-url"
						setting="ctaUrl"
						type="url"
						value={settings.ctaUrl}
						placeholder="https://www.minmurasu.digital/"
						validate={(v) =>
							isWebAddress(v) ? null : 'Enter a full address, like https://www.minmurasu.digital/.'
						}
						onChange={update}
					/>
				</Row>
				<Row
					label="Call-to-action button"
					note="Button text shown on reports. Empty hides the button."
					htmlFor="s-cta-text"
				>
					<TextSettingField
						id="s-cta-text"
						setting="ctaText"
						value={settings.ctaText}
						placeholder="Visit MIN MURASU"
						onChange={update}
					/>
				</Row>
				<Row
					label="Contact phone (Call & WhatsApp)"
					note="Shown on reports for Call and WhatsApp buttons. Empty hides them."
					htmlFor="s-contact-phone"
				>
					<TextSettingField
						id="s-contact-phone"
						setting="contactPhone"
						type="tel"
						value={settings.contactPhone}
						placeholder="+91 9486772206"
						validate={(v) =>
							!v || /^\+?[\d\s\-()]{5,25}$/.test(v)
								? null
								: 'Enter a valid phone number or leave empty.'
						}
						onChange={update}
					/>
				</Row>
				<Row
					label="Contact email"
					note="Shown on reports for the Email button. Empty hides it."
					htmlFor="s-contact-email"
				>
					<TextSettingField
						id="s-contact-email"
						setting="contactEmail"
						type="email"
						value={settings.contactEmail}
						placeholder="minmurasu.digital@gmail.com"
						validate={(v) =>
							!v || /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(v)
								? null
								: 'Enter a valid email address or leave empty.'
						}
						onChange={update}
					/>
				</Row>
				<Row
					label="Report footer & contact"
					note="Contact details and footer line shown on every audit report."
					htmlFor="s-report-footer"
				>
					<TextSettingField
						id="s-report-footer"
						setting="reportFooter"
						value={settings.reportFooter}
						placeholder="📞 Contact: 9486772206 · 📧 Email: minmurasu.digital@gmail.com"
						onChange={update}
					/>
				</Row>
			</Section>
				</>
			)}

			{activeTab === 'audits' && (
				<Section title="Audits">
				<Row
					label="Core Web Vitals"
					note="Runs Google PageSpeed Insights for real-browser speed scores and screenshots. Adds about 20 seconds."
					htmlFor="s-pagespeed"
				>
					<SettingToggle
						id="s-pagespeed"
						setting="pagespeedEnabled"
						settings={settings}
						onChange={update}
					/>
				</Row>
				<Row
					label="PageSpeed API key"
					note="Free from Google Cloud. Without one, Google often turns requests away."
					htmlFor="s-key"
				>
					<SecretField
						id="s-key"
						setting="pagespeedApiKey"
						isSet={settings.hasPagespeedKey}
						fromEnv={settings.pagespeedKeyFromEnv ? 'PAGESPEED_API_KEY' : undefined}
						placeholder="Paste your API key"
						onChange={update}
					/>
				</Row>
				<Row
					label="Links to check per audit"
					note="Each one is a request to the linked site."
					htmlFor="s-links"
				>
					<SettingSelect
						id="s-links"
						setting="brokenLinkLimit"
						options={BROKEN_LINK_OPTIONS}
						settings={settings}
						onChange={update}
					/>
				</Row>
				<Row label="Most pages per crawl" htmlFor="s-crawl">
					<SettingSelect
						id="s-crawl"
						setting="crawlPageLimit"
						options={CRAWL_PAGE_OPTIONS}
						settings={settings}
						onChange={update}
					/>
				</Row>
				<Row
					label="Keyword audit default pages"
					note="Default page depth for the 10-area Website SEO & Keyword Audit Tool."
					htmlFor="s-ka-pages"
				>
					<SettingSelect
						id="s-ka-pages"
						setting="keywordAuditPageLimit"
						options={KEYWORD_AUDIT_PAGE_OPTIONS}
						settings={settings}
						onChange={update}
					/>
				</Row>
				<Row
					label="Default target locations"
					note="Comma-separated cities or regions to prioritize in Local SEO checks."
					htmlFor="s-target-locations"
				>
					<TextSettingField
						id="s-target-locations"
						setting="defaultTargetLocations"
						value={settings.defaultTargetLocations}
						placeholder="Chennai, Coimbatore, Bengaluru"
						onChange={update}
					/>
				</Row>
				<Row
					label="VibeCode prompt target stack"
					note="Framework hint included in generated VibeCode AI fix prompts."
					htmlFor="s-vibecode-stack"
				>
					<select
						id="s-vibecode-stack"
						className="select"
						value={settings.vibecodeTargetStack}
						onChange={(e) =>
							update({ vibecodeTargetStack: e.currentTarget.value as VibecodeTargetStack })
						}
					>
						{VIBECODE_STACK_OPTIONS.map((opt) => (
							<option key={opt.value} value={opt.value}>
								{opt.label}
							</option>
						))}
					</select>
				</Row>
			</Section>
			)}

			{activeTab === 'links' && (
				<Section
					title="Link Intelligence & Backlinks"
				description="Configure domain WHOIS lookups and connect a genuine backlink provider API."
			>
				<Row
					label="Domain WHOIS / RDAP lookup"
					note="Fetches registrar, domain age, expiry, and DNS records in Link Intelligence."
					htmlFor="s-whois"
				>
					<SettingToggle
						id="s-whois"
						setting="whoisEnabled"
						settings={settings}
						onChange={update}
					/>
				</Row>
				<Row
					label="Backlink data provider"
					note="Select your verified backlink API source. Never scrapes or fabricates data."
					htmlFor="s-backlink-provider"
				>
					<select
						id="s-backlink-provider"
						className="select"
						value={settings.backlinkProvider}
						onChange={(e) =>
							update({ backlinkProvider: e.currentTarget.value as BacklinkProvider })
						}
					>
						{BACKLINK_PROVIDER_OPTIONS.map((opt) => (
							<option key={opt.value} value={opt.value}>
								{opt.label}
							</option>
						))}
					</select>
				</Row>
				<Row
					label="Backlink provider API key"
					note="Stored securely on the server and never sent back to the browser."
					htmlFor="s-backlink-key"
				>
					<SecretField
						id="s-backlink-key"
						setting="backlinkApiKey"
						isSet={settings.hasBacklinkKey}
						placeholder="Paste provider API key or token"
						onChange={update}
					/>
				</Row>
			</Section>
			)}

			{activeTab === 'ai' && (
				<Section
					title="Local AI (Ollama / LM Studio)"
				description="Run private AI analysis locally to generate performance reports, development roadmaps, VibeCode prompts, and SEO strategy."
			>
				<Row
					label="Enable Local AI"
					note="Enables AI Strategist generation on audit and keyword reports."
					htmlFor="s-local-ai-enabled"
				>
					<SettingToggle
						id="s-local-ai-enabled"
						setting="localAiEnabled"
						settings={settings}
						onChange={update}
					/>
				</Row>
				<Row
					label="Local AI endpoint URL"
					note="OpenAI-compatible base URL (Ollama default: http://127.0.0.1:11434/v1)."
					htmlFor="s-local-ai-url"
				>
					<TextSettingField
						id="s-local-ai-url"
						setting="localAiBaseUrl"
						type="url"
						value={settings.localAiBaseUrl}
						placeholder="http://127.0.0.1:11434/v1"
						validate={(v) =>
							isWebAddress(v) ? null : 'Enter a valid URL, like http://127.0.0.1:11434/v1.'
						}
						onChange={update}
					/>
				</Row>
				<Row
					label="Local model name"
					note="Model tag installed in Ollama or LM Studio (e.g. qwen2.5:14b, deepseek-coder:6.7b)."
					htmlFor="s-local-ai-model"
				>
					<TextSettingField
						key={settings.localAiModel}
						id="s-local-ai-model"
						setting="localAiModel"
						value={settings.localAiModel}
						placeholder="qwen2.5:14b"
						validate={(v) => (v ? null : 'Enter a local model name.')}
						onChange={update}
					/>
				</Row>
				<Row
					label="Test connection & models"
					note="Verifies Ollama/LM Studio is reachable and lets you pick an installed model."
				>
					<TestLocalAi selectedModel={settings.localAiModel} onSelectModel={update} />
				</Row>
			</Section>
			)}

			{activeTab === 'alerts' && (
				<Section
					id="alerts"
				title="Alerts"
				description="Where monitors send alerts. Each alert goes to every channel set up here."
			>
				<Row
					label="Email"
					note={
						settings.emailReady
							? 'Separate addresses with commas.'
							: 'Email needs SMTP_URL to be set; see the README. Addresses saved now are used once it is.'
					}
					htmlFor="s-emails"
				>
					<EmailsField id="s-emails" emails={settings.alertEmails} onChange={update} />
				</Row>
				<Row label="Slack" note="An incoming webhook from a Slack app." htmlFor="s-slack">
					<SecretField
						id="s-slack"
						setting="slackWebhookUrl"
						isSet={settings.hasSlackWebhook}
						placeholder="https://hooks.slack.com/services/…"
						onChange={update}
					/>
				</Row>
				<Row
					label="Discord"
					note="In the channel's settings, under Integrations, then Webhooks."
					htmlFor="s-discord"
				>
					<SecretField
						id="s-discord"
						setting="discordWebhookUrl"
						isSet={settings.hasDiscordWebhook}
						placeholder="https://discord.com/api/webhooks/…"
						onChange={update}
					/>
				</Row>
				<Row
					label="Webhook"
					note="Gets every alert as JSON, for Zapier, n8n, Make or your own code."
					htmlFor="s-webhook"
				>
					<SecretField
						id="s-webhook"
						setting="webhookUrl"
						isSet={settings.hasWebhook}
						placeholder="https://"
						onChange={update}
					/>
				</Row>
				<Row
					label="Links in alerts"
					note="The address you open OpenSEO at, so links in alerts work. Empty means http://localhost:3000."
					htmlFor="s-app-url"
				>
					<AppUrlField id="s-app-url" value={settings.appUrl} onChange={update} />
				</Row>
				<Row label="Try it" note="Sends a test alert to every channel above.">
					<TestAlert
						ready={
							settings.alertEmails.length > 0 ||
							settings.hasSlackWebhook ||
							settings.hasDiscordWebhook ||
							settings.hasWebhook
						}
					/>
				</Row>
			</Section>
			)}

			{activeTab === 'about' && (
				<Section title="About">
				<Row
					label={settings.brandName}
					note="📞 Contact: 9486772206 · 📧 Email: minmurasu.digital@gmail.com"
				>
					<a
						className="button"
						href="https://www.minmurasu.digital/"
						target="_blank"
						rel="noreferrer"
					>
						<Icon name="external" size={15} />
						minmurasu.digital
					</a>
				</Row>
				<Row
					label="Storage mode"
					note={
						settings.storageMode === 'redis'
							? 'Upstash Redis is active — reports, crawls, and settings persist across Vercel serverless functions.'
							: 'Local JSON files in the data/ folder. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN for Vercel.'
					}
				>
					<span className="badge badge-accent">
						{settings.storageMode === 'redis' ? 'Upstash Redis' : 'Local JSON'}
					</span>
				</Row>
				<Row
					label={`OpenSEO ${version}`}
					note="Free and open source under the MIT license. Reports, crawls and settings are JSON files in the data folder."
				>
					<a
						className="button"
						href="https://github.com/alexsilver8/open-seo"
						target="_blank"
						rel="noreferrer"
					>
						<Icon name="code" size={15} />
						Source code
					</a>
				</Row>
			</Section>
			)}
		</div>
	)
}

export default memo(SettingsScreen)
