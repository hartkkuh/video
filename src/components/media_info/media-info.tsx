import { useEffect, useRef, useState, type ReactNode } from 'react'
import type {
  MediaMetadata as MediaMetadataData,
  MediaThumbnail as MediaThumbnailData,
  MediaTrackInfo,
} from '../../../shared/media-probe'

export type {
  MediaMetadata as MediaMetadataData,
  MediaThumbnail as MediaThumbnailData,
  MediaTrackInfo,
  MediaTrackKind,
} from '../../../shared/media-probe'

/**
 * Headless libVLC media-info components. They render no UI of their own: each one
 * pulls a slice of information from a file (through the Electron/libVLC bridge)
 * and hands it back via the `children` render-prop and/or the `onLoaded`/`onError`
 * callbacks. Consumers decide what (if anything) to render.
 */

export type MediaProbeState<TData> = {
  data: TData | null
  loading: boolean
  error: string | null
}

type RenderProp<TData> = (state: MediaProbeState<TData>) => ReactNode

type BaseProps<TData> = {
  /** Absolute path of the media file to inspect. `null` clears the result. */
  filePath: string | null | undefined
  onLoaded?: (data: TData) => void
  onError?: (error: string) => void
  children?: RenderProp<TData>
}

function emptyState<TData>(): MediaProbeState<TData> {
  return { data: null, loading: false, error: null }
}

function useMediaProbe<TData>(
  filePath: string | null | undefined,
  fetcher: (filePath: string) => Promise<TData> | undefined,
  callbacks: { onLoaded?: (data: TData) => void; onError?: (error: string) => void },
  // Extra primitive dependencies that should re-trigger the fetch (e.g. width).
  deps: ReadonlyArray<unknown> = [],
): MediaProbeState<TData> {
  const [state, setState] = useState<MediaProbeState<TData>>(emptyState)

  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher
  const callbacksRef = useRef(callbacks)
  callbacksRef.current = callbacks

  useEffect(() => {
    if (!filePath) {
      setState(emptyState())
      return
    }

    let cancelled = false
    setState({ data: null, loading: true, error: null })

    const pending = fetcherRef.current(filePath)

    if (!pending) {
      const message = 'Media probe is unavailable in this environment.'
      setState({ data: null, loading: false, error: message })
      callbacksRef.current.onError?.(message)
      return
    }

    pending
      .then((result) => {
        if (cancelled) {
          return
        }

        setState({ data: result, loading: false, error: null })
        callbacksRef.current.onLoaded?.(result)
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return
        }

        const message = error instanceof Error ? error.message : String(error)
        setState({ data: null, loading: false, error: message })
        callbacksRef.current.onError?.(message)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePath, ...deps])

  return state
}

function render<TData>(children: RenderProp<TData> | undefined, state: MediaProbeState<TData>) {
  return children ? children(state) : null
}

// --- EXPORT 1: container/stream metadata -----------------------------------

export function useMediaMetadata(
  filePath: string | null | undefined,
  callbacks: { onLoaded?: (data: MediaMetadataData | null) => void; onError?: (error: string) => void } = {},
): MediaProbeState<MediaMetadataData | null> {
  return useMediaProbe<MediaMetadataData | null>(
    filePath,
    (path) => window.electronAPI?.mediaGetMetadata?.(path),
    callbacks,
  )
}

export function MediaMetadata({
  filePath,
  onLoaded,
  onError,
  children,
}: BaseProps<MediaMetadataData | null>): ReactNode {
  const state = useMediaMetadata(filePath, { onLoaded, onError })
  return render(children, state)
}

// --- EXPORT 2: per-channel encoding details --------------------------------

export function useMediaChannels(
  filePath: string | null | undefined,
  callbacks: { onLoaded?: (data: MediaTrackInfo[]) => void; onError?: (error: string) => void } = {},
): MediaProbeState<MediaTrackInfo[]> {
  return useMediaProbe<MediaTrackInfo[]>(
    filePath,
    (path) => window.electronAPI?.mediaGetTracks?.(path),
    callbacks,
  )
}

export function MediaChannels({
  filePath,
  onLoaded,
  onError,
  children,
}: BaseProps<MediaTrackInfo[]>): ReactNode {
  const state = useMediaChannels(filePath, { onLoaded, onError })
  return render(children, state)
}

// --- EXPORT 3: thumbnail image ---------------------------------------------

type MediaThumbnailProps = BaseProps<MediaThumbnailData | null> & {
  /** Target width in pixels (height keeps the source aspect ratio). */
  width?: number
  /** Capture position in milliseconds. Defaults to ~10% of the duration. */
  timeMs?: number
}

export function useMediaThumbnail(
  filePath: string | null | undefined,
  options: {
    width?: number
    timeMs?: number
    onLoaded?: (data: MediaThumbnailData | null) => void
    onError?: (error: string) => void
  } = {},
): MediaProbeState<MediaThumbnailData | null> {
  const { width, timeMs, onLoaded, onError } = options
  return useMediaProbe<MediaThumbnailData | null>(
    filePath,
    (path) => window.electronAPI?.mediaGetThumbnail?.(path, { width, timeMs }),
    { onLoaded, onError },
    [width, timeMs],
  )
}

export function MediaThumbnail({
  filePath,
  width,
  timeMs,
  onLoaded,
  onError,
  children,
}: MediaThumbnailProps): ReactNode {
  const state = useMediaThumbnail(filePath, { width, timeMs, onLoaded, onError })
  return render(children, state)
}
