import fs from 'node:fs'
import path from 'node:path'
import pngToIco from 'png-to-ico'

const root = path.resolve(import.meta.dirname, '..')
const logoPath = path.join(root, 'public', 'logo.png')
const targets = [
  path.join(root, 'build', 'icon.ico'),
  path.join(root, 'public', 'icon.ico'),
]

const buffer = await pngToIco(logoPath)
fs.mkdirSync(path.join(root, 'build'), { recursive: true })

for (const target of targets) {
  fs.writeFileSync(target, buffer)
  console.log(`Wrote ${path.relative(root, target)} (${buffer.length} bytes)`)
}
