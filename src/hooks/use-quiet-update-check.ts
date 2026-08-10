import { useEffect, useState } from 'react'
import type { UpdateCheckResult } from '../../shared/updates'

type AvailableUpdate = Extract<UpdateCheckResult, { status: 'available' }>

/**
 * Quiet startup check: never surfaces "up to date" or network errors.
 * Only exposes an available update for the in-app banner.
 */
export function useQuietUpdateCheck() {
  const [availableUpdate, setAvailableUpdate] = useState<AvailableUpdate | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function runQuietCheck() {
      if (!window.electronAPI?.checkForUpdates) {
        return
      }

      try {
        const result = await window.electronAPI.checkForUpdates()
        if (cancelled || result.status !== 'available') {
          return
        }

        setAvailableUpdate(result)
      } catch {
        // Quiet by design — ignore startup check failures.
      }
    }

    void runQuietCheck()

    return () => {
      cancelled = true
    }
  }, [])

  return {
    availableUpdate: dismissed ? null : availableUpdate,
    dismissUpdate: () => setDismissed(true),
  }
}
