import { useEffect, useRef, useState } from 'react'

// Settle-only pulse. Returns true for a single ~300ms window once `value` has
// stopped changing for `delay` ms. While the value keeps changing — a slider
// mid-drag — the settle timer is reset on every change and never fires, so the
// pulse lights exactly once when the value comes to rest, never during the drag.
// The initial mount is skipped so tiles don't pulse on first paint.
export function usePulse(value: unknown, delay = 250): boolean {
  const [pulsing, setPulsing] = useState(false)
  const mounted = useRef(false)

  // arm a settle timer on each change; a follow-up change clears it before it
  // fires (the drag case), so `true` is only reached after the value rests
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    setPulsing(false)
    const settle = setTimeout(() => setPulsing(true), delay)
    return () => clearTimeout(settle)
  }, [value, delay])

  // once lit, hold the class for the animation window, then drop it
  useEffect(() => {
    if (!pulsing) return
    const done = setTimeout(() => setPulsing(false), 300)
    return () => clearTimeout(done)
  }, [pulsing])

  return pulsing
}
