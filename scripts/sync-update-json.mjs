import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
const version = String(packageJson.version ?? '').trim()

if (!version) {
  console.error('package.json is missing a version')
  process.exit(1)
}

const productName = 'FMP Video Player'
const setupFileName = `${productName}-Setup-${version}.exe`
const downloadUrl = `https://github.com/hartkkuh/video/releases/download/v${version}/${encodeURIComponent(setupFileName)}`

const updatePath = path.join(root, 'update.json')
const previous = fs.existsSync(updatePath)
  ? JSON.parse(fs.readFileSync(updatePath, 'utf8'))
  : {}

const next = {
  version,
  downloadUrl,
  releaseNotes: typeof previous.releaseNotes === 'string' ? previous.releaseNotes : '',
}

fs.writeFileSync(updatePath, `${JSON.stringify(next, null, 2)}\n`, 'utf8')
console.log(`Synced update.json → ${version}`)
console.log(`Download URL → ${downloadUrl}`)
