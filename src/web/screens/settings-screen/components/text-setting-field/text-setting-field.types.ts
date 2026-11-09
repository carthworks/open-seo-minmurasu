import type { UpdateSettings } from '@web/screens/settings-screen'

export interface TextSettingFieldProps {
	id: string
	setting: 'brandName' | 'ctaText' | 'ctaUrl' | 'reportFooter'
	value: string
	type?: 'text' | 'url'
	placeholder?: string
	/** Returns an error message when the draft can't be saved. */
	validate?: (value: string) => string | null
	onChange: UpdateSettings
}

