import type { Metadata } from 'next'
import { LlmVisibilityScreen } from '@web/screens/llm-visibility-screen'

export const metadata: Metadata = { title: 'LLM Visibility' }

const LlmVisibilityPage = () => <LlmVisibilityScreen />

export default LlmVisibilityPage
