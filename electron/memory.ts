import fs from 'node:fs/promises'
import {
  defaultPersistedAppMemory,
  normalizePersistedMemory,
  toPersistedMemory,
  type AppMemory,
  type PersistedAppMemory,
} from '../shared/app-memory.js'

export type { AppMemory, PersistedAppMemory }

export const defaultAppMemory = defaultPersistedAppMemory

export { normalizePersistedMemory as normalizeMemory, toPersistedMemory as toStoredMemory }

async function directoryExists(directoryPath: string): Promise<boolean> {
  if (!directoryPath) {
    return false
  }

  try {
    const stats = await fs.stat(directoryPath)
    return stats.isDirectory()
  } catch {
    return false
  }
}

export async function normalizeStoredMemory(value: unknown): Promise<PersistedAppMemory> {
  const memory = normalizePersistedMemory(value)

  if (!memory.lastOpenDirectory) {
    return memory
  }

  if (await directoryExists(memory.lastOpenDirectory)) {
    return memory
  }

  return {
    ...memory,
    lastOpenDirectory: '',
  }
}

export function toRuntimeMemory(persisted: PersistedAppMemory): AppMemory {
  return {
    ...persisted,
    filePaths: [],
    currentIndex: 0,
  }
}
