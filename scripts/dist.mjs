import { spawn } from 'node:child_process'

// NetFree / filtered TLS proxies often break electron-builder downloads.
process.env.NODE_TLS_REJECT_UNAUTHORIZED ??= '0'
process.env.CSC_IDENTITY_AUTO_DISCOVERY ??= 'false'

const args = process.argv.slice(2)
const child = spawn('npx', ['electron-builder', ...args], {
  stdio: 'inherit',
  shell: true,
  env: process.env,
})

child.on('exit', (code) => {
  process.exit(code ?? 1)
})
