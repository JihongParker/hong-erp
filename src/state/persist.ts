import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'

// Session persistence for cockpit parameters. Each module's user-set inputs are
// mirrored to localStorage under a shared prefix so a reload lands the visitor
// back on the exact scenario they were exploring. Only genuine user parameters
// are stored — derived results, hover state, and anything seeded from the live
// FRED snapshot (forwards, spot) stay out so they never freeze to a stale value.
// Keys are namespaced `<module>.<field>` (e.g. 'budget.B').

const PREFIX = 'hongerp-params-v1:'

export function usePersistentState<T>(
  key: string,
  initial: T | (() => T),
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(PREFIX + key)
      if (raw != null) return JSON.parse(raw) as T
    } catch {
      /* missing, unavailable, or corrupt storage → fall back to initial */
    }
    return initial instanceof Function ? (initial as () => T)() : initial
  })

  useEffect(() => {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value))
    } catch {
      /* storage full or blocked; the demo still works from memory */
    }
  }, [key, value])

  return [value, setValue]
}

// Remove every persisted cockpit parameter (the `hongerp-params-v1:` namespace).
// Wired into "Reset demo data" in App.tsx (ResetDemo onClick): a reset both
// restores the seeded ERP ledgers and wipes these persisted params, so the demo
// returns to a genuinely clean slate rather than reloading into a stale scenario.
export function clearPersistedParams(): void {
  try {
    const doomed: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(PREFIX)) doomed.push(k)
    }
    doomed.forEach((k) => localStorage.removeItem(k))
  } catch {
    /* storage unavailable — nothing to clear */
  }
}
