'use client'

import { memo, useState } from 'react'
import { Input } from '@web/components/input'
import type { TextSettingFieldProps } from './text-setting-field.types'

/** A text setting that saves when the field loses focus, not on every keystroke. */
const TextSettingField = (props: TextSettingFieldProps) => {
	const { id, setting, value, type = 'text', placeholder, validate, onChange } = props

	const [draft, setDraft] = useState(value)
	const [error, setError] = useState<string | null>(null)

	const save = () => {
		const next = draft.trim()
		const problem = validate?.(next) ?? null
		setError(problem)
		if (problem) return
		setDraft(next)
		if (next !== value) onChange({ [setting]: next })
	}

	return (
		<div className="field-pair">
			<Input
				id={id}
				type={type}
				spellCheck={type === 'url' ? false : undefined}
				placeholder={placeholder}
				value={draft}
				aria-invalid={error !== null}
				onChange={(e) => setDraft(e.currentTarget.value)}
				onBlur={save}
			/>
			{error && (
				<span className="field-error" role="alert">
					{error}
				</span>
			)}
		</div>
	)
}

export default memo(TextSettingField)

