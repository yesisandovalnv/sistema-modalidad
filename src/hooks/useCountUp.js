import { useEffect, useRef, useState } from 'react'

// Sin matchMedia (pruebas, navegadores antiguos) o con "reducir movimiento" activado,
// los números aparecen directamente con su valor final.
export function prefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Cuenta desde el valor mostrado antes hasta `target` con una curva de salida (cúbica).
export function useCountUp(target, duration = 600) {
  const value = Number(target) || 0
  const reduced = prefersReducedMotion()
  const [display, setDisplay] = useState(reduced ? value : 0)
  const shownRef = useRef(reduced ? value : 0)

  useEffect(() => {
    if (reduced) return undefined
    const from = shownRef.current
    if (from === value) return undefined
    let frame
    const start = performance.now()
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - (1 - progress) ** 3
      const next = Math.round(from + (value - from) * eased)
      shownRef.current = next
      setDisplay(next)
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, duration, reduced])

  return reduced ? value : display
}
