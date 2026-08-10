import { app, net, shell } from 'electron'
import https from 'node:https'
import { URL } from 'node:url'
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

type HttpJsonResponse = {
  status: number
  body: string
}

export function getCurrentAppVersion(): string {
  return app.getVersion()
}

export async function checkForAppUpdates(): Promise<UpdateCheckResult> {
  const currentVersion = getCurrentAppVersion()
  const releaseApiUrl = `https://api.github.com/repos/${UPDATE_REPO.owner}/${UPDATE_REPO.name}/releases/latest`

  try {
    const response = await requestText(releaseApiUrl, {
      Accept: 'application/vnd.github+json',
      'User-Agent': `FMP-Video-Player/${currentVersion}`,
      'X-GitHub-Api-Version': '2022-11-28',
    })

    if (response.status === 404) {
      return {
        status: 'up-to-date',
        currentVersion,
        latestVersion: currentVersion,
      }
    }

    if (response.status < 200 || response.status >= 300) {
      return {
        status: 'error',
        currentVersion,
        message: `HTTP ${response.status}`,
      }
    }

    const release = JSON.parse(response.body) as GitHubRelease
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
    return {
      status: 'error',
      currentVersion,
      message: formatNetworkError(error),
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

async function requestText(
  url: string,
  headers: Record<string, string>,
): Promise<HttpJsonResponse> {
  const errors: string[] = []

  // Chromium stack — uses OS/user trusted CAs (important for NetFree and similar filters).
  try {
    return await chromiumRequest(url, headers)
  } catch (error) {
    errors.push(`chromium: ${formatNetworkError(error)}`)
  }

  // Node fallback with default verification.
  try {
    return await nodeHttpsRequest(url, headers, true)
  } catch (error) {
    errors.push(`node: ${formatNetworkError(error)}`)
  }

  // Last resort for intercepted TLS proxies that aren't in Node's CA store.
  try {
    return await nodeHttpsRequest(url, headers, false)
  } catch (error) {
    errors.push(`node-insecure: ${formatNetworkError(error)}`)
    throw new Error(errors.join(' | '))
  }
}

async function chromiumRequest(
  url: string,
  headers: Record<string, string>,
): Promise<HttpJsonResponse> {
  if (!app.isReady()) {
    throw new Error('App is not ready')
  }

  const response = await net.fetch(url, {
    method: 'GET',
    headers,
    redirect: 'follow',
    signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
  })

  return {
    status: response.status,
    body: await response.text(),
  }
}

function nodeHttpsRequest(
  url: string,
  headers: Record<string, string>,
  rejectUnauthorized: boolean,
): Promise<HttpJsonResponse> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const request = https.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: `${parsed.pathname}${parsed.search}`,
        method: 'GET',
        headers,
        rejectUnauthorized,
        timeout: CHECK_TIMEOUT_MS,
      },
      (response) => {
        const chunks: Buffer[] = []
        response.on('data', (chunk: Buffer) => {
          chunks.push(chunk)
        })
        response.on('end', () => {
          resolve({
            status: response.statusCode ?? 0,
            body: Buffer.concat(chunks).toString('utf8'),
          })
        })
      },
    )

    request.on('timeout', () => {
      request.destroy(new Error('Request timed out'))
    })
    request.on('error', reject)
    request.end()
  })
}

function formatNetworkError(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Unknown error'
  }

  const parts = [error.message]
  const cause = (error as Error & { cause?: unknown }).cause
  if (cause instanceof Error && cause.message && cause.message !== error.message) {
    parts.push(cause.message)
  }

  return parts.join(': ')
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
