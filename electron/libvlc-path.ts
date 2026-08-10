import { app } from 'electron'
import path from 'node:path'

/** Resolve the bundled libVLC directory for both dev and packaged builds. */
export function resolveLibvlcDir(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'libvlc')
  }

  return path.join(app.getAppPath(), 'libvlc')
}
