'use client'

let sharedCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
	if (typeof window === 'undefined') return null
	if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return null
	try {
		if (window.localStorage.getItem('openseo_sound') === 'off') return null
	} catch {
		// ignore storage restrictions
	}
	const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
	if (!AudioCtx) return null
	if (!sharedCtx) sharedCtx = new AudioCtx()
	if (sharedCtx.state === 'suspended') {
		sharedCtx.resume().catch(() => {})
	}

	return sharedCtx
}

function tone(freqStart: number, freqEnd: number, durationSec: number, gainPeak: number, delaySec = 0) {
	const ctx = getAudioContext()
	if (!ctx) return
	try {
		const now = ctx.currentTime + delaySec
		const osc = ctx.createOscillator()
		const gain = ctx.createGain()
		osc.type = 'sine'
		osc.frequency.setValueAtTime(freqStart, now)
		if (freqEnd !== freqStart) {
			osc.frequency.exponentialRampToValueAtTime(freqEnd, now + durationSec)
		}
		gain.gain.setValueAtTime(0.0001, now)
		gain.gain.linearRampToValueAtTime(gainPeak, now + 0.012)
		gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec)
		osc.connect(gain)
		gain.connect(ctx.destination)
		osc.start(now)
		osc.stop(now + durationSec + 0.01)
	} catch {
		// ignore audio errors
	}
}

/** Tiny tactile tick when starting an audit or scan. */
export function playClick() {
	tone(520, 620, 0.045, 0.025)
	if (typeof navigator !== 'undefined') navigator.vibrate?.(8)
}

/** Gentle two-note ascending chime when a scan, export, or sign-in completes. */
export function playSuccess() {
	tone(523.25, 523.25, 0.09, 0.03, 0)
	tone(659.25, 659.25, 0.13, 0.032, 0.075)
	if (typeof navigator !== 'undefined') navigator.vibrate?.([10, 25, 10])
}

/** Soft low cue when validation or a request fails. */
export function playError() {
	tone(210, 155, 0.12, 0.03)
	if (typeof navigator !== 'undefined') navigator.vibrate?.(20)
}
