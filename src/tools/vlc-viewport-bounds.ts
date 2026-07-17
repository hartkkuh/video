export type VlcViewportBounds = {
  x: number
  y: number
  width: number
  height: number
}

type MeasureOptions = {
  controlsOverlay?: HTMLElement | null
}

function roundBounds(bounds: VlcViewportBounds): VlcViewportBounds {
  return {
    x: Math.round(bounds.x),
    y: Math.round(bounds.y),
    width: Math.max(1, Math.round(bounds.width)),
    height: Math.max(1, Math.round(bounds.height)),
  }
}

export function isViewportVisibleInWindow(viewport: HTMLElement): boolean {
  const rect = viewport.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) {
    return false
  }

  const visualViewport = window.visualViewport
  const viewportWidth = visualViewport?.width ?? window.innerWidth
  const viewportHeight = visualViewport?.height ?? window.innerHeight
  const offsetLeft = visualViewport?.offsetLeft ?? 0
  const offsetTop = visualViewport?.offsetTop ?? 0

  return (
    rect.bottom > offsetTop &&
    rect.top < offsetTop + viewportHeight &&
    rect.right > offsetLeft &&
    rect.left < offsetLeft + viewportWidth
  )
}

export function measureVlcViewportBounds(
  viewport: HTMLElement,
  options: MeasureOptions = {},
): VlcViewportBounds | null {
  const rect = viewport.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) {
    return null
  }

  const visualViewport = window.visualViewport
  let x = rect.left
  let y = rect.top
  let width = rect.width
  let height = rect.height

  if (visualViewport) {
    x = rect.left - visualViewport.offsetLeft
    y = rect.top - visualViewport.offsetTop
  }

  const controlsOverlay = options.controlsOverlay
  if (controlsOverlay) {
    const overlayRect = controlsOverlay.getBoundingClientRect()
    const overlapTop = Math.max(rect.top, overlayRect.top)
    const overlapBottom = Math.min(rect.bottom, overlayRect.bottom)
    const overlap = overlapBottom - overlapTop

    if (overlap > 0) {
      height = Math.max(1, height - overlap)
    }
  }

  return roundBounds({ x, y, width, height })
}

export function viewportBoundsKey(bounds: VlcViewportBounds): string {
  return `${bounds.x}:${bounds.y}:${bounds.width}:${bounds.height}`
}
