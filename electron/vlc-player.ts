import fsPromises from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { app, BrowserWindow, screen } from 'electron'

const require = createRequire(import.meta.url)
const koffi = require('koffi')

export type VlcPlayerState = {
	playing: boolean
	paused: boolean
	ended: boolean
	currentTimeMs: number
	durationMs: number
}

export type ViewportBounds = {
	x: number
	y: number
	width: number
	height: number
}

import {
	buildRecordingAudioFilter,
	buildRecordingVideoFilter,
	buildVideoEffectMediaOptions,
	defaultVlcVideoEffects,
	isDefaultAudioEffects,
	isDefaultVideoEffects,
	mapVideoEffectsToAdjust,
	outputGainToPreampDb,
	videoEffectsUseMediaFilters,
	type VlcAudioEffects,
	type VlcVideoEffects,
} from './vlc-effects.js'
import { HWND_TOP, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE, getWin32User32, hwndFromBuffer, hwndToNumber } from './win32-api.js'

export type { VlcAudioEffects, VlcVideoEffects } from './vlc-effects.js'

const LIBVLC_STATE_PLAYING = 3
const LIBVLC_STATE_PAUSED = 4
const LIBVLC_STATE_ENDED = 6

const LIBVLC_VOLUME_CALIBRATION = 1.5
const LIBVLC_MAX_VOLUME = 200

// Simple mux names only — nested avformat{...} inside duplicate{...} is unstable.
const SOUT_MUX_BY_EXTENSION: Record<string, string> = {
	'.mp4': 'mp4',
	'.m4v': 'mp4',
	'.m4a': 'mp4',
	'.m4b': 'mp4',
	'.mov': 'mp4',
	'.qt': 'mp4',
	'.3gp': 'mp4',
	'.3g2': 'mp4',
	'.3gpp': 'mp4',
	'.mkv': 'mkv',
	'.mka': 'mkv',
	'.webm': 'webm',
	'.avi': 'avi',
	'.ts': 'ts',
	'.m2ts': 'ts',
	'.mts': 'ts',
	'.m2t': 'ts',
	'.tts': 'ts',
	'.mpg': 'ps',
	'.mpeg': 'ps',
	'.ps': 'ps',
	'.vob': 'ps',
	'.ogg': 'ogg',
	'.oga': 'ogg',
	'.ogv': 'ogg',
	'.ogm': 'ogg',
	'.ogx': 'ogg',
	'.opus': 'ogg',
	'.spx': 'ogg',
	'.wav': 'wav',
	'.asf': 'asf',
	'.wmv': 'asf',
	'.wma': 'asf',
	'.wm': 'asf',
	'.flv': 'flv',
	'.f4v': 'flv',
	'.mp3': 'raw',
	'.mp2': 'raw',
	'.mp1': 'raw',
	'.mpga': 'raw',
	'.mpa': 'raw',
	'.aac': 'raw',
	'.adts': 'raw',
	'.adt': 'raw',
	'.ac3': 'raw',
	'.a52': 'raw',
	'.dts': 'raw',
	'.flac': 'raw',
}

const AUDIO_ONLY_EXTENSIONS = new Set([
	'.mp3',
	'.mp2',
	'.mp1',
	'.mpga',
	'.mpa',
	'.aac',
	'.adts',
	'.adt',
	'.ac3',
	'.a52',
	'.dts',
	'.flac',
	'.wav',
	'.wma',
	'.m4a',
	'.m4b',
	'.oga',
	'.opus',
	'.spx',
	'.mka',
])

type RecordingCodecProfile = {
	mux: string | null
	/** Inner transcode{...} body, or null for stream-copy. */
	transcode: string | null
}

function selectSoutMux(destPath: string): string | null {
	const ext = path.extname(destPath).toLowerCase()
	return SOUT_MUX_BY_EXTENSION[ext] ?? null
}

function isAudioOnlyPath(filePath: string): boolean {
	return AUDIO_ONLY_EXTENSIONS.has(path.extname(filePath).toLowerCase())
}

function selectRecordingCodecProfile(destPath: string, audioOnly: boolean): RecordingCodecProfile {
	const ext = path.extname(destPath).toLowerCase()
	const mux = selectSoutMux(destPath)

	if (audioOnly) {
		if (ext === '.flac') {
			return { mux, transcode: 'acodec=flac' }
		}
		if (ext === '.wav') {
			return { mux, transcode: 'acodec=s16l,channels=2,samplerate=48000' }
		}
		if (ext === '.ogg' || ext === '.oga' || ext === '.opus') {
			return { mux: mux ?? 'ogg', transcode: 'acodec=vorb,ab=256' }
		}
		if (ext === '.wma' || ext === '.asf') {
			return { mux: mux ?? 'asf', transcode: 'acodec=wma,ab=256' }
		}
		return { mux: mux ?? 'raw', transcode: 'acodec=mp3,ab=320' }
	}

	// Realtime-friendly encode: file branch shares the CPU with live playback.
	const h264 =
		'vcodec=h264,venc=x264{preset=ultrafast,tune=zerolatency,crf=28},scale=1,threads=0'

	if (ext === '.webm') {
		return {
			mux: 'webm',
			transcode: 'vcodec=VP80,vb=1800,scale=1,acodec=vorb,ab=160,channels=2,samplerate=44100',
		}
	}

	if (ext === '.ogg' || ext === '.ogv' || ext === '.ogm') {
		return {
			mux: 'ogg',
			transcode: 'vcodec=theo,vb=1800,scale=1,acodec=vorb,ab=160,channels=2,samplerate=44100',
		}
	}

	if (ext === '.avi') {
		return {
			mux: 'avi',
			transcode: `${h264},acodec=mp3,ab=160,channels=2,samplerate=44100`,
		}
	}

	if (ext === '.wmv' || ext === '.asf' || ext === '.wm') {
		return {
			mux: 'asf',
			transcode: `${h264},acodec=wma,ab=160,channels=2,samplerate=44100`,
		}
	}

	if (ext === '.ts' || ext === '.m2ts' || ext === '.mts' || ext === '.m2t' || ext === '.tts') {
		return {
			mux: 'ts',
			transcode: `${h264},acodec=mp4a,ab=160,channels=2,samplerate=44100`,
		}
	}

	// Default H.264 / AAC for mp4/mov/mkv and unknown containers.
	return {
		mux: mux ?? 'mp4',
		transcode: `${h264},acodec=mp4a,ab=160,channels=2,samplerate=44100`,
	}
}

/** Audio encode fragment used when video can be stream-copied. */
function selectAudioTranscodeFragment(destPath: string): string {
	const ext = path.extname(destPath).toLowerCase()
	if (ext === '.flac') {
		return 'acodec=flac'
	}
	if (ext === '.wav') {
		return 'acodec=s16l,channels=2,samplerate=44100'
	}
	if (ext === '.ogg' || ext === '.oga' || ext === '.ogv' || ext === '.ogm' || ext === '.opus' || ext === '.webm') {
		return 'acodec=vorb,ab=160'
	}
	if (ext === '.wma' || ext === '.asf' || ext === '.wmv' || ext === '.wm') {
		return 'acodec=wma,ab=160'
	}
	if (ext === '.avi' || ext === '.mp3') {
		return 'acodec=mp3,ab=160'
	}
	return 'acodec=mp4a,ab=160,channels=2,samplerate=44100'
}

function buildRecordingMediaOptions(
	destPath: string,
	sourcePath: string,
	videoEffects: VlcVideoEffects,
	audioEffects: VlcAudioEffects | null,
): string[] {
	// Forward slashes keep Windows paths stable inside the VLC sout parser.
	const safePath = destPath.replace(/\\/g, '/').replace(/["']/g, '')
	const audioOnly = isAudioOnlyPath(sourcePath)
	const videoFilter = audioOnly ? null : buildRecordingVideoFilter(videoEffects)
	const audioFilter = audioEffects ? buildRecordingAudioFilter(audioEffects) : null
	const needsTranscode =
		videoFilter !== null ||
		audioFilter !== null ||
		(!audioOnly && !isDefaultVideoEffects(videoEffects))

	const mux = selectSoutMux(destPath)
	const fileDst = mux
		? `std{access=file,mux=${mux},dst='${safePath}'}`
		: `std{access=file,dst='${safePath}'}`

	if (!needsTranscode) {
		// No active effects — stream-copy keeps original quality/format.
		return [
			`:sout=#duplicate{dst=display,dst=${fileDst}}`,
			':sout-keep',
			':sout-all',
		]
	}

	// Keep display on the raw decode path (smooth preview). Only the file branch
	// is transcoded. When only audio effects are active, copy video as-is so the
	// encoder does not fight the live decoder for CPU.
	const profile = selectRecordingCodecProfile(destPath, audioOnly)
	const transcodeParts: string[] = []

	if (audioOnly) {
		if (profile.transcode) {
			transcodeParts.push(profile.transcode)
		}
	} else if (videoFilter) {
		if (profile.transcode) {
			transcodeParts.push(profile.transcode)
		}
		transcodeParts.push(`vfilter=${videoFilter}`)
	} else {
		// Audio effects only — stream-copy video, re-encode audio with afilter.
		transcodeParts.push(`vcodec=copy,${selectAudioTranscodeFragment(destPath)}`)
	}

	if (audioFilter) {
		transcodeParts.push(`afilter=${audioFilter}`)
	}

	const profileMux = profile.mux
	const encodedFileDst = profileMux
		? `std{access=file,mux=${profileMux},dst='${safePath}'}`
		: fileDst

	return [
		`:sout=#duplicate{dst=display,dst=transcode{${transcodeParts.join(',')}}:${encodedFileDst}}`,
		':sout-keep',
		':sout-all',
	]
}

const LIBVLC_ADJUST_ENABLE = 0
const LIBVLC_ADJUST_CONTRAST = 1
const LIBVLC_ADJUST_BRIGHTNESS = 2
const LIBVLC_ADJUST_HUE = 3
const LIBVLC_ADJUST_SATURATION = 4
const LIBVLC_ADJUST_GAMMA = 5

export class VlcPlayerService {
	private instance: unknown = null
	private mediaPlayer: unknown = null
	private media: unknown = null
	private equalizer: unknown = null
	private videoWindow: BrowserWindow | null = null
	private parentWindow: BrowserWindow | null = null
	private videoVisible = false
	private videoOverlaySuspended = false
	private endedNotified = false
	private onEnded: (() => void) | null = null
	private lastViewport: ViewportBounds | null = null
	private mediaLoaded = false
	private currentFilePath: string | null = null
	private pendingAudioEffects: VlcAudioEffects | null = null
	private pendingVolume = 1
	private pendingVolumeMuted = false
	private activeVideoEffects: VlcVideoEffects = { ...defaultVlcVideoEffects }
	private uiOverlayPrioritized = false
	private lastAppliedScreenBounds: { x: number; y: number; width: number; height: number } | null = null
	private recordingPath: string | null = null

	private libvlc_new: (argc: number, argv: unknown) => unknown
	private libvlc_release: (instance: unknown) => void
	private libvlc_errmsg: () => string | null
	private libvlc_media_new_path: (instance: unknown, path: string) => unknown
	private libvlc_media_add_option: (media: unknown, option: string) => void
	private libvlc_media_release: (media: unknown) => void
	private libvlc_media_player_new: (instance: unknown) => unknown
	private libvlc_media_player_release: (player: unknown) => void
	private libvlc_media_player_set_media: (player: unknown, media: unknown) => void
	private libvlc_media_player_set_hwnd: (player: unknown, hwnd: bigint) => void
	private libvlc_media_player_play: (player: unknown) => number
	private libvlc_media_player_pause: (player: unknown) => void
	private libvlc_media_player_stop: (player: unknown) => void
	private libvlc_media_player_set_time: (player: unknown, timeMs: number) => void
	private libvlc_media_player_get_time: (player: unknown) => number
	private libvlc_media_player_get_length: (player: unknown) => number
	private libvlc_media_player_get_state: (player: unknown) => number
	private libvlc_media_player_set_rate: (player: unknown, rate: number) => void
	private libvlc_audio_set_volume: (player: unknown, volume: number) => number
	private libvlc_audio_equalizer_new: () => unknown
	private libvlc_audio_equalizer_release: (equalizer: unknown) => void
	private libvlc_audio_equalizer_set_amp_at_index: (equalizer: unknown, amp: number, index: number) => void
	private libvlc_audio_equalizer_set_preamp: (equalizer: unknown, preamp: number) => void
	private libvlc_media_player_set_equalizer: (player: unknown, equalizer: unknown) => number
	private libvlc_video_set_adjust_int: (player: unknown, option: number, value: number) => void
	private libvlc_video_set_adjust_float: (player: unknown, option: number, value: number) => void
	private libvlc_video_take_snapshot: (player: unknown, num: number, filepath: string, width: number, height: number) => number
	private win32 = getWin32User32()
	private parentGeometryHandler: (() => void) | null = null
	private parentMinimizeHandler: (() => void) | null = null
	private parentRestoreHandler: (() => void) | null = null
	private controlsOverlayWindow: BrowserWindow | null = null
	private filesMenuOverlayWindow: BrowserWindow | null = null

	constructor() {
		const libvlcDir = path.join(app.getAppPath(), 'libvlc')
		process.env.VLC_PLUGIN_PATH = path.join(libvlcDir, 'plugins')
		process.env.PATH = `${libvlcDir}${path.delimiter}${process.env.PATH ?? ''}`

		const lib = koffi.load(path.join(libvlcDir, 'libvlc.dll'))

		this.libvlc_new = lib.func('libvlc_new', 'void *', ['int', 'void *'])
		this.libvlc_release = lib.func('libvlc_release', 'void', ['void *'])
		this.libvlc_errmsg = lib.func('libvlc_errmsg', 'str', [])
		this.libvlc_media_new_path = lib.func('libvlc_media_new_path', 'void *', ['void *', 'str'])
		this.libvlc_media_add_option = lib.func('libvlc_media_add_option', 'void', ['void *', 'str'])
		this.libvlc_media_release = lib.func('libvlc_media_release', 'void', ['void *'])
		this.libvlc_media_player_new = lib.func('libvlc_media_player_new', 'void *', ['void *'])
		this.libvlc_media_player_release = lib.func('libvlc_media_player_release', 'void', ['void *'])
		this.libvlc_media_player_set_media = lib.func('libvlc_media_player_set_media', 'void', ['void *', 'void *'])
		this.libvlc_media_player_set_hwnd = lib.func('libvlc_media_player_set_hwnd', 'void', ['void *', 'int64'])
		this.libvlc_media_player_play = lib.func('libvlc_media_player_play', 'int', ['void *'])
		this.libvlc_media_player_pause = lib.func('libvlc_media_player_pause', 'void', ['void *'])
		this.libvlc_media_player_stop = lib.func('libvlc_media_player_stop', 'void', ['void *'])
		this.libvlc_media_player_set_time = lib.func('libvlc_media_player_set_time', 'void', ['void *', 'int64'])
		this.libvlc_media_player_get_time = lib.func('libvlc_media_player_get_time', 'int64', ['void *'])
		this.libvlc_media_player_get_length = lib.func('libvlc_media_player_get_length', 'int64', ['void *'])
		this.libvlc_media_player_get_state = lib.func('libvlc_media_player_get_state', 'int', ['void *'])
		this.libvlc_media_player_set_rate = lib.func('libvlc_media_player_set_rate', 'void', ['void *', 'float'])
		this.libvlc_audio_set_volume = lib.func('libvlc_audio_set_volume', 'int', ['void *', 'int'])
		this.libvlc_audio_equalizer_new = lib.func('libvlc_audio_equalizer_new', 'void *', [])
		this.libvlc_audio_equalizer_release = lib.func('libvlc_audio_equalizer_release', 'void', ['void *'])
		this.libvlc_audio_equalizer_set_amp_at_index = lib.func('libvlc_audio_equalizer_set_amp_at_index', 'void', ['void *', 'float', 'uint'])
		this.libvlc_audio_equalizer_set_preamp = lib.func('libvlc_audio_equalizer_set_preamp', 'void', ['void *', 'float'])
		this.libvlc_media_player_set_equalizer = lib.func('libvlc_media_player_set_equalizer', 'int', ['void *', 'void *'])
		this.libvlc_video_set_adjust_int = lib.func('libvlc_video_set_adjust_int', 'void', ['void *', 'uint', 'int'])
		this.libvlc_video_set_adjust_float = lib.func('libvlc_video_set_adjust_float', 'void', ['void *', 'uint', 'float'])
		this.libvlc_video_take_snapshot = lib.func('libvlc_video_take_snapshot', 'int', ['void *', 'uint', 'str', 'uint', 'uint'])

		this.instance = this.libvlc_new(0, null)
		this.mediaPlayer = this.libvlc_media_player_new(this.instance)
	}

	attachParent(parentWindow: BrowserWindow) {
		if (this.parentWindow && !this.parentWindow.isDestroyed()) {
			this.detachParentListeners()
		}

		this.parentWindow = parentWindow

		this.parentGeometryHandler = () => {
			this.handleParentGeometryChange()
		}

		this.parentMinimizeHandler = () => {
			this.hideVideoWindow()
		}

		this.parentRestoreHandler = () => {
			this.applyVideoVisibility()
		}

		const onGeometryChange = this.parentGeometryHandler
		parentWindow.on('move', onGeometryChange)
		parentWindow.on('resize', onGeometryChange)
		parentWindow.on('maximize', onGeometryChange)
		parentWindow.on('unmaximize', onGeometryChange)
		parentWindow.on('enter-full-screen', onGeometryChange)
		parentWindow.on('leave-full-screen', onGeometryChange)

		parentWindow.on('minimize', this.parentMinimizeHandler)
		parentWindow.on('restore', this.parentRestoreHandler)
	}

	async prioritizeUiOverlay() {
		this.uiOverlayPrioritized = true
		this.hideVideoWindow()
		return this.takeVideoSnapshot()
	}

	releaseUiOverlay() {
		this.uiOverlayPrioritized = false

		if (this.lastViewport && this.videoVisible) {
			this.applyViewport(this.lastViewport)
		}
	}

	setOnEnded(callback: (() => void) | null) {
		this.onEnded = callback
	}

	setControlsOverlayWindow(window: BrowserWindow | null) {
		this.controlsOverlayWindow = window
	}

	setFilesMenuOverlayWindow(window: BrowserWindow | null) {
		this.filesMenuOverlayWindow = window
	}

	raiseControlsOverlay() {
		const overlay = this.controlsOverlayWindow
		if (!overlay || overlay.isDestroyed()) {
			return
		}

		// Re-assert the always-on-top level instead of SetWindowPos(HWND_TOP),
		// which would demote the window out of the topmost band and let the
		// native video window cover it again.
		overlay.setAlwaysOnTop(true, 'pop-up-menu')

		const filesMenu = this.filesMenuOverlayWindow
		if (filesMenu && !filesMenu.isDestroyed() && filesMenu.isVisible()) {
			this.raiseFilesMenuOverlay()
		}
	}

	raiseFilesMenuOverlay() {
		const overlay = this.filesMenuOverlayWindow
		if (!overlay || overlay.isDestroyed()) {
			return
		}

		overlay.setAlwaysOnTop(true, 'screen-saver')
	}

	setVideoVisible(visible: boolean) {
		this.videoVisible = visible
		this.applyVideoVisibility()
	}

	suspendVideoOverlay() {
		this.videoOverlaySuspended = true
		this.hideVideoWindow()
	}

	resumeVideoOverlay() {
		this.videoOverlaySuspended = false
		// Force a fresh viewport apply after suspend hid the native window.
		this.lastAppliedScreenBounds = null
		this.applyVideoVisibility()
	}

	setViewport(bounds: ViewportBounds) {
		if (bounds.width <= 0 || bounds.height <= 0) {
			this.hideVideoWindow()
			return
		}

		this.lastViewport = bounds

		if (!this.parentWindow || !this.videoVisible) {
			this.hideVideoWindow()
			return
		}

		this.applyViewport(bounds)
	}

	hideVideoOverlay() {
		this.lastAppliedScreenBounds = null
		this.hideVideoWindow()
	}

	load(filePath: string): { ok: boolean; error?: string } {
		this.stop()
		this.mediaLoaded = false
		// Recording is bound to the media traffic of the current file; a new
		// file always starts without an active recording.
		this.recordingPath = null
		this.currentFilePath = filePath

		if (this.media) {
			this.libvlc_media_release(this.media)
			this.media = null
		}

		this.endedNotified = false
		this.media = this.createMedia(filePath, this.activeVideoEffects)

		if (!this.media) {
			return { ok: false, error: this.libvlc_errmsg() ?? 'libvlc_media_new_path failed' }
		}

		this.libvlc_media_player_set_media(this.mediaPlayer, this.media)
		this.mediaLoaded = true
		this.applyPendingEffects()
		return { ok: true }
	}

	loadIfNeeded(filePath: string): { ok: boolean; error?: string; reloaded: boolean } {
		if (this.mediaLoaded && this.currentFilePath === filePath) {
			this.applyPendingEffects()
			return { ok: true, reloaded: false }
		}

		const result = this.load(filePath)
		return { ...result, reloaded: true }
	}

	getLoadedFilePath(): string | null {
		return this.mediaLoaded ? this.currentFilePath : null
	}

	play() {
		this.endedNotified = false
		this.prepareVideoOutput()
		this.libvlc_media_player_play(this.mediaPlayer)
		this.refreshEffectsAfterPipeline()
	}

	pause() {
		this.libvlc_media_player_pause(this.mediaPlayer)
	}

	stop() {
		this.libvlc_media_player_stop(this.mediaPlayer)
	}

	seek(timeMs: number) {
		this.libvlc_media_player_set_time(this.mediaPlayer, Math.max(0, Math.round(timeMs)))
	}

	setVolume(volume: number) {
		this.pendingVolume = Math.min(2, Math.max(0, volume))

		if (!this.mediaLoaded) {
			return
		}

		if (this.recordingPath) {
			this.applyVolumeSettingsForRecording()
			return
		}

		this.applyVolumeSettings()
	}

	setVolumeMuted(muted: boolean) {
		this.pendingVolumeMuted = muted

		if (!this.mediaLoaded) {
			return
		}

		if (this.recordingPath) {
			this.applyVolumeSettingsForRecording()
			return
		}

		this.applyVolumeSettings()
	}

	setRate(rate: number) {
		if (!this.mediaLoaded) {
			return
		}

		this.libvlc_media_player_set_rate(this.mediaPlayer, rate)
	}

	setAudioEffects(effects: VlcAudioEffects) {
		this.pendingAudioEffects = effects

		if (!this.mediaLoaded) {
			return
		}

		// File EQ is baked at recording start; live EQ still drives the display.
		this.applyAudioEffects(effects)
		if (!this.recordingPath) {
			this.refreshEffectsAfterPipeline()
		}
	}

	setVideoEffects(effects: VlcVideoEffects) {
		const previous = this.activeVideoEffects
		this.activeVideoEffects = effects

		if (!this.mediaLoaded) {
			return
		}

		// While recording, keep display adjust in sync but do not reload media
		// (that would restart the sout file). File effects stay as baked at start.
		if (this.recordingPath) {
			this.applyVideoAdjust(effects)
			return
		}

		if (videoEffectsUseMediaFilters(previous) || videoEffectsUseMediaFilters(effects)) {
			this.reloadMediaPreservePosition()
			return
		}

		this.applyVideoAdjust(effects)
		this.refreshEffectsAfterPipeline()
	}

	/** @deprecated Use setAudioEffects */
	setEqualizer(bands: number[]) {
		this.setAudioEffects({ bands, outputGain: 1 })
	}

	/**
	 * Record the media traffic into destPath. Active effects are baked into the
	 * file via a dedicated transcode branch; the display stays on the normal
	 * decode path (with live adjust/EQ) so playback remains smooth.
	 */
	startRecording(destPath: string): { ok: boolean; error?: string } {
		if (!this.mediaLoaded || !this.currentFilePath) {
			return { ok: false, error: 'No media loaded' }
		}

		try {
			this.recordingPath = destPath
			this.reloadMediaPreservePosition()

			if (!this.mediaLoaded) {
				this.recordingPath = null
				return {
					ok: false,
					error: this.libvlc_errmsg() ?? 'Failed to reload media for recording',
				}
			}

			// Ensure media traffic is flowing so the sout file destination receives data.
			const state = this.libvlc_media_player_get_state(this.mediaPlayer)
			if (state !== LIBVLC_STATE_PLAYING) {
				this.prepareVideoOutput()
				this.libvlc_media_player_play(this.mediaPlayer)
			}

			// Restore live display effects after the pipeline switch.
			this.refreshEffectsAfterPipeline()
			return { ok: true }
		} catch (error) {
			this.recordingPath = null
			console.error('Failed to start recording:', error)
			return {
				ok: false,
				error: error instanceof Error ? error.message : 'Failed to start recording',
			}
		}
	}

	stopRecording() {
		if (!this.recordingPath) {
			return
		}

		this.recordingPath = null

		if (this.mediaLoaded && this.currentFilePath) {
			// Reload without the sout chain so playback returns to plain output
			// and the recording file is finalized. Effects are re-applied afterwards.
			this.reloadMediaPreservePosition()
		}
	}

	isRecording(): boolean {
		return this.recordingPath !== null
	}

	getState(): VlcPlayerState {
		const state = this.libvlc_media_player_get_state(this.mediaPlayer)
		const currentTimeMs = Math.max(0, Number(this.libvlc_media_player_get_time(this.mediaPlayer)))
		const durationMs = Math.max(0, Number(this.libvlc_media_player_get_length(this.mediaPlayer)))
		const playing = state === LIBVLC_STATE_PLAYING
		const paused = state === LIBVLC_STATE_PAUSED
		const ended = state === LIBVLC_STATE_ENDED

		if (ended && !this.endedNotified) {
			this.endedNotified = true
			this.onEnded?.()
		}

		return {
			playing,
			paused,
			ended,
			currentTimeMs,
			durationMs,
		}
	}

	destroy() {
		this.stop()
		this.hideVideoWindow()
		this.detachParentListeners()

		if (this.videoWindow && !this.videoWindow.isDestroyed()) {
			this.videoWindow.destroy()
			this.videoWindow = null
		}

		if (this.media) {
			this.libvlc_media_release(this.media)
			this.media = null
		}

		if (this.equalizer) {
			this.libvlc_audio_equalizer_release(this.equalizer)
			this.equalizer = null
		}

		if (this.mediaPlayer) {
			this.libvlc_media_player_release(this.mediaPlayer)
			this.mediaPlayer = null
		}

		if (this.instance) {
			this.libvlc_release(this.instance)
			this.instance = null
		}
	}

	private applyPendingEffects() {
		// Display uses the normal decode path even while recording, so adjust/EQ
		// stay on for a smooth preview. File-side effects are in the separate
		// transcode branch. Avoid volume-boost equalizer during recording.
		if (this.recordingPath) {
			this.applyVolumeSettingsForRecording()
		} else {
			this.applyVolumeSettings()
		}

		if (this.pendingAudioEffects) {
			this.applyAudioEffects(this.pendingAudioEffects)
		}

		this.applyVideoAdjust(this.activeVideoEffects)
	}

	private refreshEffectsAfterPipeline() {
		this.applyPendingEffects()

		for (const delayMs of [50, 200]) {
			setTimeout(() => {
				if (this.mediaLoaded) {
					this.applyPendingEffects()
				}
			}, delayMs)
		}
	}

	private reapplyAudioEffectsIfActive() {
		if (this.pendingAudioEffects && !isDefaultAudioEffects(this.pendingAudioEffects)) {
			this.applyAudioEffects(this.pendingAudioEffects)
		}
	}

	private applyVolumeSettings() {
		if (this.pendingVolumeMuted) {
			this.libvlc_audio_set_volume(this.mediaPlayer, 0)
			this.clearVolumeBoostEqualizer()
			this.reapplyAudioEffectsIfActive()
			return
		}

		const volume = Math.min(2, Math.max(0, this.pendingVolume))

		if (volume <= 1) {
			this.libvlc_audio_set_volume(
				this.mediaPlayer,
				this.uiVolumeToLibVlcVolume(volume),
			)
			this.clearVolumeBoostEqualizer()
			this.reapplyAudioEffectsIfActive()
			return
		}

		// libVLC volume is capped at 100%; boost above that via equalizer preamp.
		// Compensate ~6 dB attenuation from enabling a flat equalizer path.
		this.libvlc_audio_set_volume(this.mediaPlayer, LIBVLC_MAX_VOLUME)
		this.applyVolumeBoostEqualizer(volume)
	}

	/** Volume only — never touches the equalizer (safe while sout is active). */
	private applyVolumeSettingsForRecording() {
		if (this.pendingVolumeMuted) {
			this.libvlc_audio_set_volume(this.mediaPlayer, 0)
			return
		}

		const volume = Math.min(1, Math.max(0, this.pendingVolume))
		this.libvlc_audio_set_volume(this.mediaPlayer, this.uiVolumeToLibVlcVolume(volume))
	}

	private uiVolumeToLibVlcVolume(volume: number): number {
		return Math.min(
			LIBVLC_MAX_VOLUME,
			Math.round(volume * 100 * LIBVLC_VOLUME_CALIBRATION),
		)
	}

	private clearVolumeBoostEqualizer() {
		if (!this.pendingAudioEffects || isDefaultAudioEffects(this.pendingAudioEffects)) {
			this.libvlc_media_player_set_equalizer(this.mediaPlayer, null)
		}
	}

	private applyVolumeBoostEqualizer(gain: number) {
		const VOLUME_EQ_ATTENUATION_DB = 6.02
		const preampDb = Math.min(
			20,
			Math.max(-20, 20 * Math.log10(gain) + VOLUME_EQ_ATTENUATION_DB),
		)

		if (!this.equalizer) {
			this.equalizer = this.libvlc_audio_equalizer_new()
		}

		this.libvlc_audio_equalizer_set_preamp(this.equalizer, preampDb)

		for (let index = 0; index < 10; index += 1) {
			this.libvlc_audio_equalizer_set_amp_at_index(this.equalizer, 0, index)
		}

		this.libvlc_media_player_set_equalizer(this.mediaPlayer, this.equalizer)
	}

	private applyAudioEffects(effects: VlcAudioEffects) {
		if (isDefaultAudioEffects(effects)) {
			this.libvlc_media_player_set_equalizer(this.mediaPlayer, null)
			return
		}

		if (!this.equalizer) {
			this.equalizer = this.libvlc_audio_equalizer_new()
		}

		if (!this.equalizer) {
			return
		}

		this.libvlc_audio_equalizer_set_preamp(this.equalizer, outputGainToPreampDb(effects.outputGain))

		for (let index = 0; index < 10; index += 1) {
			const amp = effects.bands[index] ?? 0
			this.libvlc_audio_equalizer_set_amp_at_index(this.equalizer, amp, index)
		}

		this.libvlc_media_player_set_equalizer(this.mediaPlayer, this.equalizer)
	}

	private applyVideoAdjust(effects: VlcVideoEffects) {
		const adjust = mapVideoEffectsToAdjust(effects)
		this.libvlc_video_set_adjust_int(this.mediaPlayer, LIBVLC_ADJUST_ENABLE, adjust.enabled ? 1 : 0)

		if (!adjust.enabled) {
			return
		}

		this.libvlc_video_set_adjust_float(this.mediaPlayer, LIBVLC_ADJUST_BRIGHTNESS, adjust.brightness)
		this.libvlc_video_set_adjust_float(this.mediaPlayer, LIBVLC_ADJUST_CONTRAST, adjust.contrast)
		this.libvlc_video_set_adjust_float(this.mediaPlayer, LIBVLC_ADJUST_SATURATION, adjust.saturation)
		this.libvlc_video_set_adjust_float(this.mediaPlayer, LIBVLC_ADJUST_HUE, adjust.hue)
		this.libvlc_video_set_adjust_float(this.mediaPlayer, LIBVLC_ADJUST_GAMMA, adjust.gamma)
	}

	private createMedia(filePath: string, effects: VlcVideoEffects) {
		const media = this.libvlc_media_new_path(this.instance, filePath)

		if (!media) {
			return null
		}

		if (this.recordingPath) {
			// Do not attach :video-filter=* media options while sout is active —
			// that combination crashes libVLC. File-side filters (including blur)
			// are baked into the transcode vfilter/afilter chain instead.
			for (const option of buildRecordingMediaOptions(
				this.recordingPath,
				filePath,
				effects,
				this.pendingAudioEffects,
			)) {
				this.libvlc_media_add_option(media, option)
			}
		} else {
			for (const option of buildVideoEffectMediaOptions(effects)) {
				this.libvlc_media_add_option(media, option)
			}
		}

		return media
	}

	private reloadMediaPreservePosition() {
		if (!this.currentFilePath || !this.mediaLoaded) {
			return
		}

		const currentTimeMs = Math.max(0, Number(this.libvlc_media_player_get_time(this.mediaPlayer)))
		const state = this.libvlc_media_player_get_state(this.mediaPlayer)
		const shouldResume = state === LIBVLC_STATE_PLAYING || state === LIBVLC_STATE_PAUSED
		const recording = this.recordingPath !== null

		this.libvlc_media_player_stop(this.mediaPlayer)

		if (this.media) {
			this.libvlc_media_release(this.media)
			this.media = null
		}

		this.media = this.createMedia(this.currentFilePath, this.activeVideoEffects)

		if (!this.media) {
			this.mediaLoaded = false
			return
		}

		this.libvlc_media_player_set_media(this.mediaPlayer, this.media)

		if (currentTimeMs > 0) {
			this.libvlc_media_player_set_time(this.mediaPlayer, currentTimeMs)
		}

		if (shouldResume) {
			this.prepareVideoOutput()
			this.libvlc_media_player_play(this.mediaPlayer)

			// While recording, only apply the recording-safe volume path once.
			// refreshEffectsAfterPipeline would re-touch filters and can crash sout.
			if (recording) {
				this.applyPendingEffects()
			} else {
				this.refreshEffectsAfterPipeline()
			}
			return
		}

		this.applyPendingEffects()
	}

	private prepareVideoOutput() {
		if (!this.videoVisible || !this.lastViewport || this.videoOverlaySuspended) {
			return
		}

		this.applyViewport(this.lastViewport)
	}

	private applyVideoVisibility() {
		if (!this.videoVisible || this.videoOverlaySuspended) {
			this.hideVideoWindow()
			return
		}

		this.prepareVideoOutput()
	}

	private handleParentGeometryChange() {
		this.lastAppliedScreenBounds = null

		if (this.lastViewport && this.videoVisible && !this.videoOverlaySuspended) {
			this.applyViewport(this.lastViewport)
		}

		if (!this.parentWindow || this.parentWindow.isDestroyed()) {
			return
		}

		this.parentWindow.webContents.send('vlc:parent-geometry-changed')
	}

	private applyViewport(bounds: ViewportBounds) {
		if (!this.parentWindow || !this.videoVisible || this.videoOverlaySuspended) {
			return
		}

		const contentBounds = this.parentWindow.getContentBounds()
		const x = Math.round(contentBounds.x + bounds.x)
		const y = Math.round(contentBounds.y + bounds.y)
		const width = Math.max(1, Math.round(bounds.width))
		const height = Math.max(1, Math.round(bounds.height))

		const last = this.lastAppliedScreenBounds
		if (last && last.x === x && last.y === y && last.width === width && last.height === height) {
			return
		}

		this.lastAppliedScreenBounds = { x, y, width, height }

		const videoWindow = this.ensureVideoWindow()
		if (!videoWindow) {
			return
		}

		const wasHidden = !videoWindow.isVisible()

		if (process.platform === 'win32' && this.win32) {
			// getContentBounds and getBoundingClientRect report DIP (CSS) pixels,
			// but SetWindowPos expects physical pixels. Convert so the video lines
			// up with the React media area when the display scale is not 100%.
			const physical = screen.dipToScreenRect(this.parentWindow, {
				x,
				y,
				width,
				height,
			})
			const videoHwnd = hwndToNumber(videoWindow.getNativeWindowHandle())
			this.win32.positionWindow(
				videoHwnd,
				physical.x,
				physical.y,
				physical.width,
				physical.height,
				wasHidden,
			)
		} else {
			videoWindow.setBounds({ x, y, width, height })
		}

		if (this.uiOverlayPrioritized) {
			this.hideVideoWindow()
			return
		}

		if (wasHidden) {
			const hwndBuffer = videoWindow.getNativeWindowHandle()
			this.libvlc_media_player_set_hwnd(this.mediaPlayer, hwndFromBuffer(hwndBuffer))

			if (process.platform !== 'win32') {
				videoWindow.showInactive()
			}

			this.applyPendingEffects()
			this.sendVideoWindowAboveUi()
		}
	}

	private async takeVideoSnapshot() {
		if (!this.mediaLoaded || !this.mediaPlayer) {
			return null
		}

		try {
			const snapshotPath = path.join(app.getPath('temp'), 'fmp-media-player', 'vlc-menu-preview.png')
			await fsPromises.mkdir(path.dirname(snapshotPath), { recursive: true })
			const result = this.libvlc_video_take_snapshot(this.mediaPlayer, 0, snapshotPath, 0, 0)
			return result === 0 ? snapshotPath : null
		} catch (error) {
			console.warn('Failed to capture VLC menu preview:', error)
			return null
		}
	}

	private sendVideoWindowAboveUi() {
		if (!this.win32 || !this.videoWindow || this.videoWindow.isDestroyed()) {
			return
		}

		const videoHwnd = hwndToNumber(this.videoWindow.getNativeWindowHandle())
		this.win32.setWindowPosFlags(videoHwnd, HWND_TOP, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE)

		if (!this.videoWindow.isDestroyed()) {
			this.videoWindow.moveTop()
		}

		// Keep the floating controls overlay above the freshly raised video window.
		this.raiseControlsOverlay()
	}

	private detachParentListeners() {
		if (!this.parentWindow || this.parentWindow.isDestroyed()) {
			return
		}

		if (this.parentGeometryHandler) {
			const onGeometryChange = this.parentGeometryHandler
			this.parentWindow.removeListener('move', onGeometryChange)
			this.parentWindow.removeListener('resize', onGeometryChange)
			this.parentWindow.removeListener('maximize', onGeometryChange)
			this.parentWindow.removeListener('unmaximize', onGeometryChange)
			this.parentWindow.removeListener('enter-full-screen', onGeometryChange)
			this.parentWindow.removeListener('leave-full-screen', onGeometryChange)
		}

		if (this.parentMinimizeHandler) {
			this.parentWindow.removeListener('minimize', this.parentMinimizeHandler)
		}

		if (this.parentRestoreHandler) {
			this.parentWindow.removeListener('restore', this.parentRestoreHandler)
		}

		this.parentGeometryHandler = null
		this.parentMinimizeHandler = null
		this.parentRestoreHandler = null
		this.parentWindow = null
	}

	private ensureVideoWindow() {
		if (!this.parentWindow) {
			return null
		}

		if (!this.videoWindow || this.videoWindow.isDestroyed()) {
			// resizable must stay true: when false, Windows applies min/max tracking
			// size constraints that prevent SetWindowPos from resizing the window to
			// match the React media div. The window is frameless, non-focusable and
			// ignores the mouse, so the user still cannot resize it manually.
			this.videoWindow = new BrowserWindow({
				parent: this.parentWindow,
				frame: false,
				show: false,
				skipTaskbar: true,
				resizable: true,
				minWidth: 1,
				minHeight: 1,
				focusable: false,
				hasShadow: false,
				thickFrame: false,
				backgroundColor: '#000000',
				webPreferences: {
					nodeIntegration: false,
					contextIsolation: true,
				},
			})

			this.videoWindow.setIgnoreMouseEvents(true, { forward: true })

			const hwndBuffer = this.videoWindow.getNativeWindowHandle()
			this.libvlc_media_player_set_hwnd(this.mediaPlayer, hwndFromBuffer(hwndBuffer))
		}

		return this.videoWindow
	}

	private hideVideoWindow() {
		this.lastAppliedScreenBounds = null

		if (this.videoWindow && !this.videoWindow.isDestroyed()) {
			this.videoWindow.hide()
		}
	}
}
