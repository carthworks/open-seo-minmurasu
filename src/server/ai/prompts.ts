import type { AiAnalysisMode } from '@shared/ai'
import type { VibecodeTargetStack } from '@shared/settings'

const STACK_LABELS: Record<VibecodeTargetStack, string> = {
	generic: 'Generic web codebase (HTML/CSS/JS or any modern framework)',
	nextjs: 'Next.js App Router (metadata API, Server Components, next/image)',
	wordpress: 'WordPress (Yoast/RankMath, theme templates, functions.php)',
	shopify: 'Shopify (Liquid templates, theme.liquid, metafields)',
	html: 'Static HTML5 / CSS / Vanilla JS'
}

export function buildAiPrompts(
	mode: AiAnalysisMode,
	context: string,
	targetStack: VibecodeTargetStack = 'generic',
	brandName = 'MIN MURASU'
): { systemPrompt: string; userPrompt: string } {
	const stackDescription = STACK_LABELS[targetStack] || STACK_LABELS.generic

	const baseSystem = `You are a Principal SEO Architect and Conversion Strategist at ${brandName}.
Analyze ONLY the provided audit data. Never invent URLs, scores, or metrics that are not in the data.
Respond in clean, scannable GitHub-flavored Markdown.`

	switch (mode) {
		case 'performance':
			return {
				systemPrompt: baseSystem,
				userPrompt: `Generate a client-ready **Executive Performance & SEO Report** from the audit data below.

Include:
1. **Executive Summary**: Overall health, what is working well, and the top 3 business risks.
2. **Score & Bottleneck Breakdown**: Highlight the weakest categories and their direct impact on rankings, speed, crawlability, and Trust & E-E-A-T.
3. **Immediate Quick Wins**: 3–5 high-impact fixes that can be shipped this week.

${context}`
			}

		case 'roadmap':
			return {
				systemPrompt: baseSystem,
				userPrompt: `Create an **Actionable Development & SEO Roadmap** from the audit data below.
Target Tech Stack: ${stackDescription}

Structure the roadmap into:
- **Sprint 1 (Days 1–14 · Critical Fixes & Quick Wins)**: High-impact failed checks, broken links, indexing/canonical issues, meta tags.
- **Sprint 2 (Days 15–30 · Structure, Speed & Schema)**: Headings hierarchy, image optimization, Core Web Vitals, Schema.org / LocalBusiness JSON-LD, Trust & E-E-A-T signals.
- **Sprint 3 (Days 31–60 · Content, Keywords & AI Search)**: Missing keywords, competitor content gaps, \`/llms.txt\` & AI Search readiness, CRO/lead generation improvements.

For each task include: **Task**, **Priority**, **Estimated Effort (Low/Med/High)**, and **Expected Outcome**.

${context}`
			}

		case 'vibecode':
			return {
				systemPrompt: `You are an expert AI Prompt Engineer specializing in code-remediation prompts for AI coding agents (Cursor, Claude Code, Antigravity, v0).
Generate a single, ready-to-paste markdown prompt that an engineer can feed directly into their coding agent to fix every issue in the audit data.
Only output the prompt itself—no extra preamble.`,
				userPrompt: `Engineer a **VibeCode AI Fix Prompt** for the following tech stack: **${stackDescription}**.

Requirements for the generated prompt:
1. State the target domain, current score/grade, and stack constraints.
2. Group all failed checks, warnings, missing keywords, and revised meta titles/descriptions into concrete file-level implementation instructions.
3. Include explicit acceptance criteria and verification commands (typecheck, lint, structured data / meta check).
4. Keep instructions crisp, deterministic, and directly executable by an AI coding agent.

Audit Data:
${context}`
			}

		case 'strategy':
			return {
				systemPrompt: baseSystem,
				userPrompt: `Develop **Strategic SEO, Keyword & Growth Recommendations** based on the audit data below.

Include:
1. **Keyword & Search Intent Strategy**: How to map Commercial, Transactional, Informational, and Local keywords across pages without cannibalization.
2. **Competitor Gap Capture Plan**: Concrete landing pages or content hubs to build for the missing keywords and competitor gaps.
3. **Lead Generation & Conversion Rate Optimization (CRO)**: Specific improvements to CTAs, Trust & E-E-A-T proof, local signals, and friction reduction.
4. **AI Answer Engine (GEO) Positioning**: How to structure content, schema, and crawler access so ChatGPT, Gemini, and Perplexity cite this domain.

${context}`
			}
	}
}
