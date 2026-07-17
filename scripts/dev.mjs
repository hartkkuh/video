import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import waitOn from 'wait-on'
import { startup } from 'vite-plugin-electron'

const distFiles = [
  'dist/index.html',
  'dist-electron/main.js',
  'dist-electron/preload.cjs',
]

// Remove stale Electron outputs so waitOn waits for a fresh build from this
// session. Otherwise Electron can start against an older main.js that is
// missing newly-added IPC handlers.
for (const file of distFiles) {
  try {
    fs.rmSync(path.resolve(file), { force: true })
  } catch {
    // File may not exist yet.
  }
}

const vite = spawn('npx vite build --watch', {
  stdio: 'inherit',
  shell: true,
})

function shutdown(code = 0) {
  startup.exit()
  vite.kill()
  process.exit(code)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

vite.on('exit', (code) => {
  startup.exit()
  process.exit(code ?? 1)
})

await waitOn({
  resources: distFiles.map((file) => path.resolve(file)),
  timeout: 120000,
})

console.log('Starting Electron…')

try {
  const started = await startup(['.', '--no-sandbox'])
  if (!started) {
    console.error('Electron startup was prevented (ELECTRON_STARTUP_PREVENT or startup.prevent).')
    shutdown(1)
  }
} catch (error) {
  console.error('Failed to start Electron:', error)
  shutdown(1)
}
