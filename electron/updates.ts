import { app, shell } from 'electron'
import {
  compareVersions,
  normalizeVersionTag,
  type UpdateCheckResult,
} from '../shared/updates.js'

const UPDATE_REPO = {
  owner: 'hartkkuh',
  name: 'video',
} as const

const CHECK_TIMEOUT_MS = 12_000

type GitHubReleaseAsset = {
  browser_download_url?: string
  name?: string
}

type GitHubRelease = {
  tag_name?: string
  html_url?: string
  body?: string
  assets?: GitHubReleaseAsset[]
}

export function getCurrentAppVersion(): string {
  return app.getVersion()
}

export async function checkForAppUpdates(): Promise<UpdateCheckResult> {
  const currentVersion = getCurrentAppVersion()

  try {
    const response = await fetch(
      `https://api.github.com/repos/${UPDATE_REPO.owner}/${UPDATE_REPO.name}/releases/latest`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': `FMP-Video-Player/${currentVersion}`,
          'X-GitHub-Api-Version': '2022-11-28',
        },
        signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
      },
    )

    if (response.status === 404) {
      return {
        status: 'up-to-date',
        currentVersion,
        latestVersion: currentVersion,
      }
    }

    if (!response.ok) {
      return {
        status: 'error',
        currentVersion,
        message: `HTTP ${response.status}`,
      }
    }

    const release = (await response.json()) as GitHubRelease
    const latestVersion = normalizeVersionTag(String(release.tag_name ?? ''))

    if (!latestVersion) {
      return {
        status: 'error',
        currentVersion,
        message: 'Invalid release tag',
      }
    }

    const releaseUrl =
      typeof release.html_url === 'string' && release.html_url
        ? release.html_url
        : `https://github.com/${UPDATE_REPO.owner}/${UPDATE_REPO.name}/releases/latest`

    if (compareVersions(latestVersion, currentVersion) <= 0) {
      return {
        status: 'up-to-date',
        currentVersion,
        latestVersion,
      }
    }

    return {
      status: 'available',
      currentVersion,
      latestVersion,
      releaseNotes: typeof release.body === 'string' ? release.body.trim() : '',
      releaseUrl,
      downloadUrl: pickDownloadUrl(release.assets, releaseUrl),
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      status: 'error',
      currentVersion,
      message,
    }
  }
}

export async function openUpdateDownload(url: string): Promise<boolean> {
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
    return false
  }

  await shell.openExternal(url)
  return true
}

function pickDownloadUrl(assets: GitHubReleaseAsset[] | undefined, fallback: string): string {
  if (!Array.isArray(assets) || assets.length === 0) {
    return fallback
  }

  const preferredExtensions = ['.exe', '.msi', '.zip']
  for (const extension of preferredExtensions) {
    const match = assets.find((asset) => {
      const name = typeof asset.name === 'string' ? asset.name.toLowerCase() : ''
      const url =
        typeof asset.browser_download_url === 'string' ? asset.browser_download_url : ''
      return Boolean(url) && name.endsWith(extension)
    })
    if (match?.browser_download_url) {
      return match.browser_download_url
    }
  }

  const first = assets.find(
    (asset) => typeof asset.browser_download_url === 'string' && asset.browser_download_url,
  )
  return first?.browser_download_url ?? fallback
}
