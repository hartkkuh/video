export type VlcAudioEffects = {
	bands: number[]
	outputGain: number
}

export type VlcVideoEffects = {
	grayscale: number
	contrast: number
	brightness: number
	saturation: number
	sepia: number
	hue: number
	gamma: number
	blur: number
}

export const defaultVlcVideoEffects: VlcVideoEffects = {
	grayscale: 0,
	contrast: 1,
	brightness: 1,
	saturation: 1,
	sepia: 0,
	hue: 0,
	gamma: 1,
	blur: 0,
}

export function isDefaultAudioEffects(effects: VlcAudioEffects) {
	const flatBands = effects.bands.every((band) => Math.abs(band) < 0.01)
	return flatBands && Math.abs(effects.outputGain - 1) < 0.01
}

export function isDefaultVideoEffects(effects: VlcVideoEffects) {
	return (
		effects.grayscale === 0 &&
		Math.abs(effects.contrast - 1) < 0.01 &&
		Math.abs(effects.brightness - 1) < 0.01 &&
		Math.abs(effects.saturation - 1) < 0.01 &&
		effects.sepia === 0 &&
		Math.abs(effects.hue) < 0.01 &&
		Math.abs(effects.gamma - 1) < 0.01 &&
		effects.blur === 0
	)
}

export function outputGainToPreampDb(outputGain: number) {
	const clamped = Math.min(2, Math.max(0.5, outputGain))
	return 20 * Math.log10(clamped)
}

/** libVLC adjust hue is -180..180; the UI uses CSS-style 0..360. */
export function mapHueForVlc(hue: number): number {
	if (Math.abs(hue) <= 180) {
		return hue
	}

	return hue - 360
}

export type VlcVideoAdjustValues = {
	enabled: boolean
	brightness: number
	contrast: number
	saturation: number
	hue: number
	gamma: number
}

export function mapVideoEffectsToAdjust(effects: VlcVideoEffects): VlcVideoAdjustValues {
	const grayscaleFactor = 1 - effects.grayscale / 100
	const sepiaFactor = effects.sepia / 100

	return {
		enabled: !isDefaultVideoEffects(effects),
		brightness: effects.brightness * (1 + sepiaFactor * 0.06),
		contrast: effects.contrast * (1 + sepiaFactor * 0.08),
		saturation: effects.saturation * grayscaleFactor * (1 - sepiaFactor * 0.45),
		hue: mapHueForVlc(effects.hue + sepiaFactor * 55),
		gamma: effects.gamma * (1 - sepiaFactor * 0.04),
	}
}

export function buildBlurMediaOptions(blur: number) {
	if (blur <= 0) {
		return []
	}

	const sigma = Math.max(0.1, blur)
	return [':video-filter=gaussianblur', `:gaussianblur-sigma=${sigma.toFixed(2)}`]
}

export function computeEffectSaturation(effects: VlcVideoEffects): number {
	let saturation = effects.saturation

	if (effects.grayscale > 0) {
		saturation *= 1 - effects.grayscale / 100
	}

	return saturation
}

/** Blur is applied via media options; color adjust uses the libVLC adjust API. */
export function videoEffectsUseMediaFilters(effects: VlcVideoEffects): boolean {
	return effects.blur > 0
}

export function buildVideoEffectMediaOptions(effects: VlcVideoEffects): string[] {
	if (effects.blur <= 0) {
		return []
	}

	return [
		':video-filter=gaussianblur',
		`:gaussianblur-sigma=${Math.max(0.1, effects.blur).toFixed(2)}`,
	]
}

