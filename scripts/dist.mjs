import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

// NetFree / filtered TLS proxies often break electron-builder downloads.
process.env.NODE_TLS_REJECT_UNAUTHORIZED ??= '0'
process.env.CSC_IDENTITY_AUTO_DISCOVERY ??= 'false'

const args = process.argv.slice(2)
const localElectronDist = path.resolve('node_modules/electron/dist')

// Prefer a local Electron install when present (dev machines behind TLS filters).
// On CI, electron-builder downloads Electron itself when this path is absent.
if (fs.existsSync(path.join(localElectronDist, 'electron.exe'))) {
  args.push(`--config.electronDist=${localElectronDist}`)
}

// CI auto-detects publish when electron-builder.yml has a publish block.
// Releases are uploaded separately by GitHub Actions, so default to never.
const hasPublishFlag = args.some(
  (arg) => arg === '--publish' || arg.startsWith('--publish='),
)
if (!hasPublishFlag) {
  args.push('--publish', 'never')
}

const child = spawn('npx', ['electron-builder', ...args], {
  stdio: 'inherit',
  shell: true,
  env: process.env,
})

child.on('exit', (code) => {
  process.exit(code ?? 1)
})
