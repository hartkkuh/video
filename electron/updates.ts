import { app, net, shell } from 'electron'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import https from 'node:https'
import path from 'node:path'
import { URL } from 'node:url'
import {
  compareVersions,
  normalizeVersionTag,
  type UpdateCheckResult,
  type UpdateDownloadProgress,
  type UpdateInstallResult,
} from '../shared/updates.js'

const UPDATE_REPO = {
  owner: 'hartkkuh',
  name: 'video',
} as const

const CHECK_TIMEOUT_MS = 12_000
const DOWNLOAD_TIMEOUT_MS = 10 * 60 * 1000
const DEFAULT_BRANCHES = ['main', 'master'] as const
const PRODUCT_NAME = 'FMP Video Player'

let installInProgress = false

type GitHubReleaseAsset = {
  browser_download_url?: string
  name?: string
}

type GitHubRelease = {
  tag_name?: string
  html_url?: string
  body?: string
  draft?: boolean
  prerelease?: boolean
  assets?: GitHubReleaseAsset[]
}

type UpdateManifest = {
  version: string
  downloadUrl: string
  releaseUrl: string
  releaseNotes: string
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
  const errors: string[] = []
  const candidates: UpdateManifest[] = []

  try {
    const releaseManifest = await tryGitHubReleaseManifest(currentVersion)
    if (releaseManifest) {
      candidates.push(releaseManifest)
    }
  } catch (error) {
    errors.push(`releases: ${formatNetworkError(error)}`)
  }

  try {
    candidates.push(...(await collectRepoVersionManifests(currentVersion)))
  } catch (error) {
    errors.push(`repo: ${formatNetworkError(error)}`)
  }

  const latestManifest = pickNewestManifest(candidates)
  if (latestManifest) {
    return toCheckResult(currentVersion, latestManifest)
  }

  return {
    status: 'error',
    currentVersion,
    message:
      errors.length > 0
        ? errors.join(' | ')
        : 'Update source not found (private repository or missing public Release/update.json)',
  }
}

export async function openUpdateDownload(url: string): Promise<boolean> {
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
    return false
  }

  await shell.openExternal(url)
  return true
}

export async function downloadAndInstallUpdate(
  downloadUrl: string,
  onProgress?: (progress: UpdateDownloadProgress) => void,
): Promise<UpdateInstallResult> {
  if (installInProgress) {
    return { ok: false, message: 'Update already in progress' }
  }

  if (typeof downloadUrl !== 'string' || !/^https?:\/\//i.test(downloadUrl)) {
    return { ok: false, message: 'Invalid download URL' }
  }

  installInProgress = true

  try {
    const installerUrl = await resolveInstallerDownloadUrl(downloadUrl)
    const destPath = path.join(
      app.getPath('temp'),
      `FMP-Video-Player-Setup-${getCurrentAppVersion()}-update.exe`,
    )

    await downloadBinaryFile(installerUrl, destPath, onProgress)

    const perUserExe = path.join(
      process.env.LOCALAPPDATA || '',
      'Programs',
      PRODUCT_NAME,
      `${PRODUCT_NAME}.exe`,
    )
    const perMachineExe = path.join(
      process.env['ProgramFiles'] || 'C:\\Program Files',
      PRODUCT_NAME,
      `${PRODUCT_NAME}.exe`,
    )

    const launcherPath = path.join(
      app.getPath('temp'),
      `fmp-update-launch-${Date.now()}.cmd`,
    )
    const launcherScript = [
      '@echo off',
      `start /wait "" "${destPath}" /S`,
      `if exist "${perUserExe}" (`,
      `  start "" "${perUserExe}"`,
      `) else if exist "${perMachineExe}" (`,
      `  start "" "${perMachineExe}"`,
      `)`,
      `del /f /q "${destPath}" >nul 2>&1`,
      `del /f /q "%~f0" >nul 2>&1`,
      '',
    ].join('\r\n')

    await fsPromises.writeFile(launcherPath, launcherScript, 'utf8')

    const child = spawn('cmd.exe', ['/c', launcherPath], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    })
    child.unref()

    setTimeout(() => {
      app.quit()
    }, 500)

    return { ok: true }
  } catch (error) {
    installInProgress = false
    return {
      ok: false,
      message: formatNetworkError(error),
    }
  }
}

async function resolveInstallerDownloadUrl(downloadUrl: string): Promise<string> {
  const normalized = downloadUrl.trim()
  if (/\.exe($|\?)/i.test(normalized)) {
    return normalized
  }

  // Release page / generic latest link → resolve the Setup .exe asset.
  const release = await tryGitHubReleaseManifest(getCurrentAppVersion())
  if (release?.downloadUrl && /\.exe($|\?)/i.test(release.downloadUrl)) {
    return release.downloadUrl
  }

  throw new Error('Could not resolve installer download URL')
}

async function downloadBinaryFile(
  url: string,
  destPath: string,
  onProgress?: (progress: UpdateDownloadProgress) => void,
): Promise<void> {
  const errors: string[] = []

  try {
    await downloadBinaryWithChromium(url, destPath, onProgress)
    return
  } catch (error) {
    errors.push(`chromium: ${formatNetworkError(error)}`)
  }

  try {
    await downloadBinaryWithNode(url, destPath, true, onProgress)
    return
  } catch (error) {
    errors.push(`node: ${formatNetworkError(error)}`)
  }

  try {
    await downloadBinaryWithNode(url, destPath, false, onProgress)
  } catch (error) {
    errors.push(`node-insecure: ${formatNetworkError(error)}`)
    throw new Error(errors.join(' | '))
  }
}

async function downloadBinaryWithChromium(
  url: string,
  destPath: string,
  onProgress?: (progress: UpdateDownloadProgress) => void,
): Promise<void> {
  if (!app.isReady()) {
    throw new Error('App is not ready')
  }

  const response = await net.fetch(url, {
    method: 'GET',
    redirect: 'follow',
    headers: {
      'User-Agent': `FMP-Video-Player/${getCurrentAppVersion()}`,
      Accept: 'application/octet-stream,*/*',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  const totalBytes = Number(response.headers.get('content-length') ?? 0)
  const reader = response.body?.getReader()
  if (!reader) {
    const buffer = Buffer.from(await response.arrayBuffer())
    await fsPromises.writeFile(destPath, buffer)
    onProgress?.({
      receivedBytes: buffer.length,
      totalBytes: buffer.length,
      percent: 100,
    })
    return
  }

  const chunks: Uint8Array[] = []
  let receivedBytes = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }
    if (!value) {
      continue
    }

    chunks.push(value)
    receivedBytes += value.byteLength
    onProgress?.({
      receivedBytes,
      totalBytes,
      percent: totalBytes > 0 ? Math.min(100, Math.round((receivedBytes / totalBytes) * 100)) : 0,
    })
  }

  await fsPromises.writeFile(destPath, Buffer.concat(chunks))
  if (totalBytes <= 0) {
    onProgress?.({
      receivedBytes,
      totalBytes: receivedBytes,
      percent: 100,
    })
  }
}

function downloadBinaryWithNode(
  url: string,
  destPath: string,
  rejectUnauthorized: boolean,
  onProgress?: (progress: UpdateDownloadProgress) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const request = https.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: `${parsed.pathname}${parsed.search}`,
        method: 'GET',
        headers: {
          'User-Agent': `FMP-Video-Player/${getCurrentAppVersion()}`,
          Accept: 'application/octet-stream,*/*',
        },
        rejectUnauthorized,
        timeout: DOWNLOAD_TIMEOUT_MS,
      },
      (response) => {
        const status = response.statusCode ?? 0
        if (status >= 300 && status < 400 && response.headers.location) {
          response.resume()
          downloadBinaryWithNode(response.headers.location, destPath, rejectUnauthorized, onProgress)
            .then(resolve)
            .catch(reject)
          return
        }

        if (status < 200 || status >= 300) {
          response.resume()
          reject(new Error(`HTTP ${status}`))
          return
        }

        const totalBytes = Number(response.headers['content-length'] ?? 0)
        let receivedBytes = 0
        const file = fs.createWriteStream(destPath)

        response.on('data', (chunk: Buffer) => {
          receivedBytes += chunk.length
          onProgress?.({
            receivedBytes,
            totalBytes,
            percent:
              totalBytes > 0 ? Math.min(100, Math.round((receivedBytes / totalBytes) * 100)) : 0,
          })
        })

        response.pipe(file)

        file.on('finish', () => {
          file.close(() => {
            if (totalBytes <= 0) {
              onProgress?.({
                receivedBytes,
                totalBytes: receivedBytes,
                percent: 100,
              })
            }
            resolve()
          })
        })

        file.on('error', (error) => {
          fs.unlink(destPath, () => reject(error))
        })
      },
    )

    request.on('timeout', () => {
      request.destroy(new Error('Download timed out'))
    })
    request.on('error', reject)
    request.end()
  })
}

function pickNewestManifest(manifests: UpdateManifest[]): UpdateManifest | null {
  let newest: UpdateManifest | null = null

  for (const manifest of manifests) {
    const version = normalizeVersionTag(manifest.version)
    if (!version) {
      continue
    }

    if (!newest || compareVersions(version, newest.version) > 0) {
      newest = {
        ...manifest,
        version,
      }
    }
  }

  return newest
}

function toCheckResult(currentVersion: string, manifest: UpdateManifest): UpdateCheckResult {
  const latestVersion = normalizeVersionTag(manifest.version)

  if (!latestVersion) {
    return {
      status: 'error',
      currentVersion,
      message: 'Invalid release version',
    }
  }

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
    releaseNotes: manifest.releaseNotes,
    releaseUrl: manifest.releaseUrl,
    downloadUrl: manifest.downloadUrl,
  }
}

async function tryGitHubReleaseManifest(currentVersion: string): Promise<UpdateManifest | null> {
  const latestUrl = `https://api.github.com/repos/${UPDATE_REPO.owner}/${UPDATE_REPO.name}/releases/latest`
  const latestResponse = await requestText(latestUrl, githubHeaders(currentVersion))

  if (latestResponse.status === 200) {
    return manifestFromGitHubRelease(JSON.parse(latestResponse.body) as GitHubRelease)
  }

  if (latestResponse.status !== 404) {
    throw new Error(`GitHub latest release HTTP ${latestResponse.status}`)
  }

  const listUrl = `https://api.github.com/repos/${UPDATE_REPO.owner}/${UPDATE_REPO.name}/releases?per_page=10`
  const listResponse = await requestText(listUrl, githubHeaders(currentVersion))

  if (listResponse.status === 404) {
    return null
  }

  if (listResponse.status < 200 || listResponse.status >= 300) {
    throw new Error(`GitHub releases HTTP ${listResponse.status}`)
  }

  const releases = JSON.parse(listResponse.body) as GitHubRelease[]
  if (!Array.isArray(releases) || releases.length === 0) {
    return null
  }

  const release =
    releases.find((item) => !item.draft && !item.prerelease) ??
    releases.find((item) => !item.draft) ??
    releases[0]

  return release ? manifestFromGitHubRelease(release) : null
}

async function collectRepoVersionManifests(currentVersion: string): Promise<UpdateManifest[]> {
  const releaseUrl = `https://github.com/${UPDATE_REPO.owner}/${UPDATE_REPO.name}/releases/latest`
  const manifests: UpdateManifest[] = []
  const errors: string[] = []

  for (const branch of DEFAULT_BRANCHES) {
    const updateJsonUrl = `https://raw.githubusercontent.com/${UPDATE_REPO.owner}/${UPDATE_REPO.name}/${branch}/update.json`
    try {
      const response = await requestText(updateJsonUrl, {
        'User-Agent': `FMP-Video-Player/${currentVersion}`,
        Accept: 'application/json',
        'Cache-Control': 'no-cache',
      })

      if (response.status === 404) {
        // continue
      } else if (response.status < 200 || response.status >= 300) {
        errors.push(`update.json@${branch}: HTTP ${response.status}`)
      } else {
        const parsed = JSON.parse(response.body) as {
          version?: unknown
          downloadUrl?: unknown
          releaseNotes?: unknown
        }
        const version = normalizeVersionTag(String(parsed.version ?? ''))
        if (version) {
          const downloadUrl =
            typeof parsed.downloadUrl === 'string' && parsed.downloadUrl
              ? parsed.downloadUrl
              : releaseUrl

          manifests.push({
            version,
            downloadUrl,
            releaseUrl: downloadUrl.includes('github.com') ? downloadUrl : releaseUrl,
            releaseNotes: typeof parsed.releaseNotes === 'string' ? parsed.releaseNotes : '',
          })
        }
      }
    } catch (error) {
      errors.push(`update.json@${branch}: ${formatNetworkError(error)}`)
    }

    const packageUrl = `https://raw.githubusercontent.com/${UPDATE_REPO.owner}/${UPDATE_REPO.name}/${branch}/package.json`
    try {
      const response = await requestText(packageUrl, {
        'User-Agent': `FMP-Video-Player/${currentVersion}`,
        Accept: 'application/json',
        'Cache-Control': 'no-cache',
      })

      if (response.status === 404) {
        continue
      }

      if (response.status < 200 || response.status >= 300) {
        errors.push(`package.json@${branch}: HTTP ${response.status}`)
        continue
      }

      const parsed = JSON.parse(response.body) as { version?: unknown }
      const version = normalizeVersionTag(String(parsed.version ?? ''))
      if (!version) {
        continue
      }

      manifests.push({
        version,
        downloadUrl: releaseUrl,
        releaseUrl,
        releaseNotes: '',
      })
    } catch (error) {
      errors.push(`package.json@${branch}: ${formatNetworkError(error)}`)
    }
  }

  if (manifests.length === 0 && errors.length > 0) {
    throw new Error(errors.join(' | '))
  }

  return manifests
}

function manifestFromGitHubRelease(release: GitHubRelease): UpdateManifest | null {
  const version = normalizeVersionTag(String(release.tag_name ?? ''))
  if (!version) {
    return null
  }

  const releaseUrl =
    typeof release.html_url === 'string' && release.html_url
      ? release.html_url
      : `https://github.com/${UPDATE_REPO.owner}/${UPDATE_REPO.name}/releases/latest`

  return {
    version,
    releaseUrl,
    downloadUrl: pickDownloadUrl(release.assets, releaseUrl),
    releaseNotes: typeof release.body === 'string' ? release.body.trim() : '',
  }
}

function githubHeaders(currentVersion: string): Record<string, string> {
  return {
    Accept: 'application/vnd.github+json',
    'User-Agent': `FMP-Video-Player/${currentVersion}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'Cache-Control': 'no-cache',
  }
}

async function requestText(
  url: string,
  headers: Record<string, string>,
): Promise<HttpJsonResponse> {
  const errors: string[] = []

  try {
    return await chromiumRequest(url, headers)
  } catch (error) {
    errors.push(`chromium: ${formatNetworkError(error)}`)
  }

  try {
    return await nodeHttpsRequest(url, headers, true)
  } catch (error) {
    errors.push(`node: ${formatNetworkError(error)}`)
  }

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
