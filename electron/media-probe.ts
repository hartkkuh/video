import fsPromises from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { app, BrowserWindow, nativeImage } from 'electron'
import { resolveLibvlcDir } from './libvlc-path.js'
import { hwndFromBuffer } from './win32-api.js'
import { readArtworkFromMetaUrl, readEmbeddedAudioArtwork } from './media-artwork.js'
import type {
  MediaMetadata,
  MediaThumbnail,
  MediaThumbnailOptions,
  MediaTrackInfo,
  MediaTrackKind,
} from '../shared/media-probe.js'

const require = createRequire(import.meta.url)
const koffi = require('koffi')

export type { MediaMetadata, MediaThumbnail, MediaTrackInfo } from '../shared/media-probe.js'

const LIBVLC_STATE_PLAYING = 3
const LIBVLC_STATE_ERROR = 7

// libvlc_media_parse_flag_t
const LIBVLC_MEDIA_PARSE_LOCAL = 0x0
// libvlc_media_parsed_status_t
const LIBVLC_MEDIA_PARSED_FAILED = 2
const LIBVLC_MEDIA_PARSED_TIMEOUT = 3
const LIBVLC_MEDIA_PARSED_DONE = 4

// libvlc_track_type_t
const LIBVLC_TRACK_AUDIO = 0
const LIBVLC_TRACK_VIDEO = 1
const LIBVLC_TRACK_TEXT = 2

// libvlc_meta_t indices
const META = {
  title: 0,
  artist: 1,
  genre: 2,
  copyright: 3,
  album: 4,
  trackNumber: 5,
  description: 6,
  rating: 7,
  date: 8,
  url: 10,
  language: 11,
  nowPlaying: 12,
  publisher: 13,
  encodedBy: 14,
  artworkUrl: 15,
  trackTotal: 17,
  director: 18,
  season: 19,
  episode: 20,
  showName: 21,
  actors: 22,
  albumArtist: 23,
  discNumber: 24,
} as const

// Anonymous struct layouts that mirror libvlc_media.h (3.0.x). Only the leading
// fields we read are described; reading fewer bytes than the real struct is
// safe because the consumed fields all sit at the start.
const AudioTrackStruct = koffi.struct({
  i_channels: 'uint',
  i_rate: 'uint',
})

const VideoTrackStruct = koffi.struct({
  i_height: 'uint',
  i_width: 'uint',
  i_sar_num: 'uint',
  i_sar_den: 'uint',
  i_frame_rate_num: 'uint',
  i_frame_rate_den: 'uint',
})

const SubtitleTrackStruct = koffi.struct({
  psz_encoding: 'str',
})

const MediaTrackStruct = koffi.struct({
  i_codec: 'uint32',
  i_original_fourcc: 'uint32',
  i_id: 'int',
  i_type: 'int',
  i_profile: 'int',
  i_level: 'int',
  // union { audio*; video*; subtitle* } -> single pointer
  media: 'void *',
  i_bitrate: 'uint',
  psz_language: 'str',
  psz_description: 'str',
})

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function fourccToString(code: number): string | null {
  if (!code) {
    return null
  }

  const bytes = [code & 0xff, (code >>> 8) & 0xff, (code >>> 16) & 0xff, (code >>> 24) & 0xff]
  const text = bytes
    .map((byte) => (byte >= 32 && byte < 127 ? String.fromCharCode(byte) : ''))
    .join('')
    .trim()

  return text.length ? text : null
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min
  }

  return Math.min(max, Math.max(min, value))
}

/**
 * Headless libVLC media inspector. Owns a dedicated libVLC instance so probing a
 * file never disturbs the main playback engine in VlcPlayerService.
 */
export class MediaProbeService {
  private instance: unknown

  private libvlc_new: (argc: number, argv: unknown) => unknown
  private libvlc_release: (instance: unknown) => void
  private libvlc_media_new_path: (instance: unknown, filePath: string) => unknown
  private libvlc_media_add_option: (media: unknown, option: string) => void
  private libvlc_media_release: (media: unknown) => void
  private libvlc_media_parse_with_options: (media: unknown, flags: number, timeoutMs: number) => number
  private libvlc_media_get_parsed_status: (media: unknown) => number
  private libvlc_media_get_meta: (media: unknown, meta: number) => unknown
  private libvlc_media_get_duration: (media: unknown) => number
  private libvlc_media_tracks_get: (media: unknown, out: unknown[]) => number
  private libvlc_media_tracks_release: (tracks: unknown, count: number) => void
  private libvlc_free: (pointer: unknown) => void
  private libvlc_media_player_new: (instance: unknown) => unknown
  private libvlc_media_player_release: (player: unknown) => void
  private libvlc_media_player_set_media: (player: unknown, media: unknown) => void
  private libvlc_media_player_set_hwnd: (player: unknown, hwnd: bigint) => void
  private libvlc_media_player_play: (player: unknown) => number
  private libvlc_media_player_stop: (player: unknown) => void
  private libvlc_media_player_set_time: (player: unknown, timeMs: number) => void
  private libvlc_media_player_get_length: (player: unknown) => number
  private libvlc_media_player_get_state: (player: unknown) => number
  private libvlc_audio_set_volume: (player: unknown, volume: number) => number
  private libvlc_video_take_snapshot: (
    player: unknown,
    num: number,
    filePath: string,
    width: number,
    height: number,
  ) => number

  constructor() {
    const libvlcDir = resolveLibvlcDir()
    process.env.VLC_PLUGIN_PATH = path.join(libvlcDir, 'plugins')
    process.env.PATH = `${libvlcDir}${path.delimiter}${process.env.PATH ?? ''}`

    const lib = koffi.load(path.join(libvlcDir, 'libvlc.dll'))

    this.libvlc_new = lib.func('libvlc_new', 'void *', ['int', 'void *'])
    this.libvlc_release = lib.func('libvlc_release', 'void', ['void *'])
    this.libvlc_media_new_path = lib.func('libvlc_media_new_path', 'void *', ['void *', 'str'])
    this.libvlc_media_add_option = lib.func('libvlc_media_add_option', 'void', ['void *', 'str'])
    this.libvlc_media_release = lib.func('libvlc_media_release', 'void', ['void *'])
    this.libvlc_media_parse_with_options = lib.func('libvlc_media_parse_with_options', 'int', [
      'void *',
      'int',
      'int',
    ])
    this.libvlc_media_get_parsed_status = lib.func('libvlc_media_get_parsed_status', 'int', ['void *'])
    this.libvlc_media_get_meta = lib.func('libvlc_media_get_meta', 'void *', ['void *', 'int'])
    this.libvlc_media_get_duration = lib.func('libvlc_media_get_duration', 'int64', ['void *'])
    this.libvlc_media_tracks_get = lib.func('libvlc_media_tracks_get', 'uint', [
      'void *',
      koffi.out(koffi.pointer('void *')),
    ])
    this.libvlc_media_tracks_release = lib.func('libvlc_media_tracks_release', 'void', ['void *', 'uint'])
    this.libvlc_free = lib.func('libvlc_free', 'void', ['void *'])
    this.libvlc_media_player_new = lib.func('libvlc_media_player_new', 'void *', ['void *'])
    this.libvlc_media_player_release = lib.func('libvlc_media_player_release', 'void', ['void *'])
    this.libvlc_media_player_set_media = lib.func('libvlc_media_player_set_media', 'void', ['void *', 'void *'])
    this.libvlc_media_player_set_hwnd = lib.func('libvlc_media_player_set_hwnd', 'void', ['void *', 'int64'])
    this.libvlc_media_player_play = lib.func('libvlc_media_player_play', 'int', ['void *'])
    this.libvlc_media_player_stop = lib.func('libvlc_media_player_stop', 'void', ['void *'])
    this.libvlc_media_player_set_time = lib.func('libvlc_media_player_set_time', 'void', ['void *', 'int64'])
    this.libvlc_media_player_get_length = lib.func('libvlc_media_player_get_length', 'int64', ['void *'])
    this.libvlc_media_player_get_state = lib.func('libvlc_media_player_get_state', 'int', ['void *'])
    this.libvlc_audio_set_volume = lib.func('libvlc_audio_set_volume', 'int', ['void *', 'int'])
    this.libvlc_video_take_snapshot = lib.func('libvlc_video_take_snapshot', 'int', [
      'void *',
      'uint',
      'str',
      'uint',
      'uint',
    ])

    this.instance = this.libvlc_new(0, null)
  }

  /** EXPORT 1 - container/stream metadata (title, artist, duration, ...). */
  async extractMetadata(filePath: string): Promise<MediaMetadata | null> {
    const media = this.libvlc_media_new_path(this.instance, filePath)

    if (!media) {
      return null
    }

    try {
      await this.parseMedia(media)

      return {
        filePath,
        title: this.getMeta(media, META.title),
        artist: this.getMeta(media, META.artist),
        album: this.getMeta(media, META.album),
        albumArtist: this.getMeta(media, META.albumArtist),
        genre: this.getMeta(media, META.genre),
        description: this.getMeta(media, META.description),
        date: this.getMeta(media, META.date),
        trackNumber: this.getMeta(media, META.trackNumber),
        trackTotal: this.getMeta(media, META.trackTotal),
        discNumber: this.getMeta(media, META.discNumber),
        copyright: this.getMeta(media, META.copyright),
        publisher: this.getMeta(media, META.publisher),
        encodedBy: this.getMeta(media, META.encodedBy),
        language: this.getMeta(media, META.language),
        nowPlaying: this.getMeta(media, META.nowPlaying),
        showName: this.getMeta(media, META.showName),
        season: this.getMeta(media, META.season),
        episode: this.getMeta(media, META.episode),
        director: this.getMeta(media, META.director),
        actors: this.getMeta(media, META.actors),
        rating: this.getMeta(media, META.rating),
        url: this.getMeta(media, META.url),
        artworkUrl: this.getMeta(media, META.artworkUrl),
        durationMs: Math.max(0, Number(this.libvlc_media_get_duration(media))),
      }
    } finally {
      this.libvlc_media_release(media)
    }
  }

  /** EXPORT 2 - per-channel encoding details for every track in the file. */
  async extractTracks(filePath: string): Promise<MediaTrackInfo[]> {
    const media = this.libvlc_media_new_path(this.instance, filePath)

    if (!media) {
      return []
    }

    try {
      await this.parseMedia(media)
      return this.readTracks(media)
    } finally {
      this.libvlc_media_release(media)
    }
  }

  /** EXPORT 3 - a single thumbnail image grabbed from the file. */
  async extractThumbnail(
    filePath: string,
    options: MediaThumbnailOptions = {},
  ): Promise<MediaThumbnail | null> {
    const width = Math.round(clampNumber(options.width ?? 320, 16, 1920))
    const media = this.libvlc_media_new_path(this.instance, filePath)

    if (!media) {
      return null
    }

    try {
      await this.parseMedia(media)

      const artworkUrl = this.getMeta(media, META.artworkUrl)
      const fromMeta = await readArtworkFromMetaUrl(artworkUrl, width)
      if (fromMeta) {
        return { filePath, ...fromMeta }
      }

      const fromTags = await readEmbeddedAudioArtwork(filePath, width)
      if (fromTags) {
        return { filePath, ...fromTags }
      }

      const tracks = this.readTracks(media)
      const hasVideoTrack = tracks.some((track) => track.kind === 'video')
      if (!hasVideoTrack) {
        return null
      }

      return await this.captureVideoSnapshot(media, filePath, width, options)
    } finally {
      this.libvlc_media_release(media)
    }
  }

  private async captureVideoSnapshot(
    media: unknown,
    filePath: string,
    width: number,
    options: MediaThumbnailOptions,
  ): Promise<MediaThumbnail | null> {
    this.libvlc_media_add_option(media, ':no-audio')
    // Software decoding is more reliable for an offscreen, never-presented window.
    this.libvlc_media_add_option(media, ':avcodec-hw=none')

    const player = this.libvlc_media_player_new(this.instance)
    let window: BrowserWindow | null = null

    try {
      this.libvlc_media_player_set_media(player, media)

      // Off-screen, hidden host window: libVLC needs a real HWND to spin up a
      // video output, but positioned far off any display so nothing flashes.
      window = new BrowserWindow({
        show: false,
        width: 640,
        height: 360,
        x: -32000,
        y: -32000,
        frame: false,
        skipTaskbar: true,
        focusable: false,
        hasShadow: false,
        backgroundColor: '#000000',
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      })
      window.setIgnoreMouseEvents(true)

      const hwnd = hwndFromBuffer(window.getNativeWindowHandle())
      this.libvlc_media_player_set_hwnd(player, hwnd)
      window.showInactive()

      this.libvlc_audio_set_volume(player, 0)

      if (this.libvlc_media_player_play(player) !== 0) {
        return null
      }

      const started = await this.waitForPlaying(player, 5000)
      if (!started) {
        return null
      }

      const length = Math.max(0, Number(this.libvlc_media_player_get_length(player)))
      const seekTo =
        typeof options.timeMs === 'number'
          ? clampNumber(options.timeMs, 0, length > 0 ? length : options.timeMs)
          : length > 1500
            ? Math.min(length - 500, Math.max(1000, Math.floor(length * 0.1)))
            : 0

      if (seekTo > 0) {
        this.libvlc_media_player_set_time(player, seekTo)
      }

      // Give the vout a moment to decode and render the (seeked) frame.
      await delay(900)

      const dir = path.join(app.getPath('temp'), 'fmp-media-player', 'probe')
      await fsPromises.mkdir(dir, { recursive: true })
      const outPath = path.join(
        dir,
        `thumb-${Date.now()}-${Math.random().toString(36).slice(2)}.png`,
      )

      let snapshotResult = this.libvlc_video_take_snapshot(player, 0, outPath, width, 0)
      if (snapshotResult !== 0) {
        await delay(500)
        snapshotResult = this.libvlc_video_take_snapshot(player, 0, outPath, width, 0)
      }

      if (snapshotResult !== 0) {
        return null
      }

      const image = nativeImage.createFromPath(outPath)
      await fsPromises.rm(outPath, { force: true })

      if (image.isEmpty()) {
        return null
      }

      const size = image.getSize()
      return {
        filePath,
        dataUrl: image.toDataURL(),
        width: size.width,
        height: size.height,
      }
    } catch (error) {
      console.warn('media-probe: thumbnail extraction failed:', error)
      return null
    } finally {
      try {
        this.libvlc_media_player_stop(player)
      } catch {
        // ignore
      }
      try {
        this.libvlc_media_player_release(player)
      } catch {
        // ignore
      }
      if (window && !window.isDestroyed()) {
        window.destroy()
      }
    }
  }

  destroy() {
    if (this.instance) {
      this.libvlc_release(this.instance)
      this.instance = null
    }
  }

  private async parseMedia(media: unknown): Promise<boolean> {
    const started = this.libvlc_media_parse_with_options(media, LIBVLC_MEDIA_PARSE_LOCAL, 5000)

    // A non-zero return means parsing could not even be queued; meta/tracks may
    // still be partially available, so we fall through and read what we can.
    if (started !== 0) {
      return false
    }

    const deadline = Date.now() + 6000
    while (Date.now() < deadline) {
      const status = this.libvlc_media_get_parsed_status(media)

      if (status === LIBVLC_MEDIA_PARSED_DONE) {
        return true
      }

      if (status === LIBVLC_MEDIA_PARSED_FAILED || status === LIBVLC_MEDIA_PARSED_TIMEOUT) {
        return false
      }

      await delay(25)
    }

    return false
  }

  private getMeta(media: unknown, meta: number): string | null {
    const pointer = this.libvlc_media_get_meta(media, meta)

    if (!pointer) {
      return null
    }

    try {
      // `pointer` is a char* to the string bytes, so decode the NUL-terminated
      // string starting at that address (not as a char** value).
      const value = koffi.decode.string(pointer) as string
      return normalizeString(value)
    } finally {
      this.libvlc_free(pointer)
    }
  }

  private readTracks(media: unknown): MediaTrackInfo[] {
    const out: unknown[] = [null]
    const count = this.libvlc_media_tracks_get(media, out)
    const arrayPointer = out[0]

    if (!count || !arrayPointer) {
      return []
    }

    const tracks: MediaTrackInfo[] = []

    try {
      const trackPointers = koffi.decode(arrayPointer, koffi.array('void *', count)) as unknown[]

      for (let index = 0; index < count; index += 1) {
        const trackPointer = trackPointers[index]
        if (!trackPointer) {
          continue
        }

        const raw = koffi.decode(trackPointer, MediaTrackStruct) as {
          i_codec: number
          i_original_fourcc: number
          i_id: number
          i_type: number
          i_profile: number
          i_level: number
          media: unknown
          i_bitrate: number
          psz_language: string | null
          psz_description: string | null
        }

        const kind: MediaTrackKind =
          raw.i_type === LIBVLC_TRACK_AUDIO
            ? 'audio'
            : raw.i_type === LIBVLC_TRACK_VIDEO
              ? 'video'
              : raw.i_type === LIBVLC_TRACK_TEXT
                ? 'subtitle'
                : 'unknown'

        const info: MediaTrackInfo = {
          id: raw.i_id,
          kind,
          codec: fourccToString(raw.i_codec),
          codecFourcc: fourccToString(raw.i_codec),
          originalFourcc: fourccToString(raw.i_original_fourcc),
          bitrate: raw.i_bitrate >>> 0,
          profile: raw.i_profile,
          level: raw.i_level,
          language: normalizeString(raw.psz_language),
          description: normalizeString(raw.psz_description),
        }

        if (kind === 'audio' && raw.media) {
          const audio = koffi.decode(raw.media, AudioTrackStruct) as {
            i_channels: number
            i_rate: number
          }
          info.channels = audio.i_channels
          info.sampleRate = audio.i_rate
        } else if (kind === 'video' && raw.media) {
          const video = koffi.decode(raw.media, VideoTrackStruct) as {
            i_height: number
            i_width: number
            i_sar_num: number
            i_sar_den: number
            i_frame_rate_num: number
            i_frame_rate_den: number
          }
          info.width = video.i_width
          info.height = video.i_height
          info.frameRate = video.i_frame_rate_den
            ? Math.round((video.i_frame_rate_num / video.i_frame_rate_den) * 1000) / 1000
            : 0
          info.sampleAspectRatio = video.i_sar_den
            ? `${video.i_sar_num}:${video.i_sar_den}`
            : undefined
        } else if (kind === 'subtitle' && raw.media) {
          const subtitle = koffi.decode(raw.media, SubtitleTrackStruct) as {
            psz_encoding: string | null
          }
          info.encoding = normalizeString(subtitle.psz_encoding)
        }

        tracks.push(info)
      }
    } finally {
      this.libvlc_media_tracks_release(arrayPointer, count)
    }

    return tracks
  }

  private async waitForPlaying(player: unknown, timeoutMs: number): Promise<boolean> {
    const deadline = Date.now() + timeoutMs

    while (Date.now() < deadline) {
      const state = this.libvlc_media_player_get_state(player)

      if (state === LIBVLC_STATE_PLAYING) {
        return true
      }

      if (state === LIBVLC_STATE_ERROR) {
        return false
      }

      await delay(30)
    }

    return false
  }
}

let sharedProbeService: MediaProbeService | null = null

export function getMediaProbeService(): MediaProbeService {
  if (!sharedProbeService) {
    sharedProbeService = new MediaProbeService()
  }

  return sharedProbeService
}
