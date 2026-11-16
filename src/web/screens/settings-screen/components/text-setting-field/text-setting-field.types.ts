import type { UpdateSettings } from '@web/screens/settings-screen'

export interface TextSettingFieldProps {
	id: string
	setting:
		| 'brandName'
		| 'brandLogo'
		| 'brandColor'
		| 'ctaText'
		| 'ctaUrl'
		| 'contactPhone'
		| 'contactEmail'
		| 'reportFooter'
		| 'defaultTargetLocations'
	value: string
	type?: 'text' | 'url' | 'email' | 'tel'
	placeholder?: string
	/** Returns an error message when the draft can't be saved. */
	validate?: (value: string) => string | null
	onChange: UpdateSettings
}

