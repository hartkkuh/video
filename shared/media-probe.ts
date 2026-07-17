// Shared types describing what the headless libVLC media-probe extracts from a
// file. Used by the Electron main process (producer) and the renderer
// (consumer) so both sides agree on the shape of the data.

export type MediaMetadata = {
  filePath: string
  title: string | null
  artist: string | null
  album: string | null
  albumArtist: string | null
  genre: string | null
  description: string | null
  date: string | null
  trackNumber: string | null
  trackTotal: string | null
  discNumber: string | null
  copyright: string | null
  publisher: string | null
  encodedBy: string | null
  language: string | null
  nowPlaying: string | null
  showName: string | null
  season: string | null
  episode: string | null
  director: string | null
  actors: string | null
  rating: string | null
  url: string | null
  artworkUrl: string | null
  durationMs: number
}

export type MediaTrackKind = 'audio' | 'video' | 'subtitle' | 'unknown'

export type MediaTrackInfo = {
  id: number
  kind: MediaTrackKind
  /** Human-readable codec/fourcc, e.g. "h264", "mp4a". */
  codec: string | null
  codecFourcc: string | null
  originalFourcc: string | null
  /** Bits per second (0 when unknown). */
  bitrate: number
  profile: number
  level: number
  language: string | null
  description: string | null
  // Audio-only fields
  channels?: number
  sampleRate?: number
  // Video-only fields
  width?: number
  height?: number
  frameRate?: number
  sampleAspectRatio?: string
  // Subtitle-only fields
  encoding?: string | null
}

export type MediaThumbnail = {
  filePath: string
  /** PNG data URL (data:image/png;base64,...). */
  dataUrl: string
  width: number
  height: number
}

export type MediaThumbnailOptions = {
  /** Target width in pixels (height keeps the source aspect ratio). */
  width?: number
  /** Position in the media to grab, in milliseconds. Defaults to ~10%. */
  timeMs?: number
}
