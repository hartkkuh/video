export type UpdateCheckResult =
  | {
      status: 'up-to-date'
      currentVersion: string
      latestVersion: string
    }
  | {
      status: 'available'
      currentVersion: string
      latestVersion: string
      releaseNotes: string
      releaseUrl: string
      downloadUrl: string
    }
  | {
      status: 'error'
      currentVersion: string
      message: string
    }

/** Compare semver-ish versions. Returns 1 if a > b, -1 if a < b, 0 if equal. */
export function compareVersions(a: string, b: string): number {
  const left = parseVersionParts(a)
  const right = parseVersionParts(b)
  const length = Math.max(left.length, right.length)

  for (let index = 0; index < length; index += 1) {
    const leftPart = left[index] ?? 0
    const rightPart = right[index] ?? 0
    if (leftPart > rightPart) {
      return 1
    }
    if (leftPart < rightPart) {
      return -1
    }
  }

  return 0
}

export function normalizeVersionTag(value: string): string {
  return value.trim().replace(/^v/i, '')
}

function parseVersionParts(value: string): number[] {
  const normalized = normalizeVersionTag(value)
  if (!normalized) {
    return [0]
  }

  return normalized.split(/[.+_-]/).map((part) => {
    const match = part.match(/^\d+/)
    return match ? Number(match[0]) : 0
  })
}
