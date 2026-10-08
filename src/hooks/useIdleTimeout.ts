import { useCallback, useEffect, useRef, useState } from 'react'

const EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'] as const

/**
 * Inactivity timer (FR-007). Calls onTimeout after `timeoutMin` of no input;
 * `warning` turns true `warnSec` before that so the UI can offer to stay signed in.
 */
export function useIdleTimeout(enabled: boolean, timeoutMin: number, warnSec: number, onTimeout: () => void) {
  const lastActivity = useRef(Date.now())
  const warningShown = useRef(false)
  const timeoutRef = useRef(onTimeout)
  const [remaining, setRemaining] = useState<number | null>(null)

  useEffect(() => {
    timeoutRef.current = onTimeout
  }, [onTimeout])

  const stay = useCallback(() => {
    lastActivity.current = Date.now()
    warningShown.current = false
    setRemaining(null)
  }, [])

  useEffect(() => {
    if (!enabled) return
    lastActivity.current = Date.now()
    warningShown.current = false
    // While the warning shows, only the explicit "stay" button resets the timer.
    const onActivity = () => {
      if (!warningShown.current) lastActivity.current = Date.now()
    }
    EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }))
    const id = setInterval(() => {
      const left = Math.ceil((timeoutMin * 60_000 - (Date.now() - lastActivity.current)) / 1000)
      if (left <= 0) {
        clearInterval(id)
        warningShown.current = false
        setRemaining(null)
        timeoutRef.current()
      } else if (left <= warnSec) {
        warningShown.current = true
        setRemaining(left)
      } else if (warningShown.current) {
        warningShown.current = false
        setRemaining(null)
      }
    }, 1000)
    return () => {
      clearInterval(id)
      EVENTS.forEach((e) => window.removeEventListener(e, onActivity))
    }
  }, [enabled, timeoutMin, warnSec])

  return { warning: remaining !== null, secondsLeft: remaining ?? 0, stay }
}
