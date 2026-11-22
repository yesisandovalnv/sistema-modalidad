import { useEffect, useLayoutEffect, useRef } from 'react'
import { LayoutGrid, List } from 'lucide-react'

const VIEW_OPTIONS = [{ id: 'tarjetas', label: 'Tarjetas', icon: LayoutGrid }, { id: 'lista', label: 'Lista', icon: List }]

// Selector "Tarjetas | Lista" como el de Fondo de Tiempo: el fondo de la opción elegida se
// desliza de una a otra (la primera posición se pone sin animación). En celular, solo íconos.
// La píldora se coloca directamente en el DOM (sin estado): no agrega renders a la pantalla
// que lo contiene. Si está oculto (otra pestaña) mide 0 y espera a que el ResizeObserver avise.
export function ViewToggle({ view, onChange }) {
  const buttons = useRef({})
  const indicatorRef = useRef(null)

  useLayoutEffect(() => {
    const place = () => {
      const indicator = indicatorRef.current
      const button = buttons.current[view]
      if (!indicator || !button || !button.offsetWidth) return
      indicator.style.width = `${button.offsetWidth}px`
      indicator.style.transform = `translateX(${button.offsetLeft}px)`
      indicator.dataset.ready = 'true'
    }
    place()
    if (typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(place)
    Object.values(buttons.current).forEach((button) => button && observer.observe(button))
    return () => observer.disconnect()
  }, [view])

  useEffect(() => {
    const frame = requestAnimationFrame(() => { if (indicatorRef.current) indicatorRef.current.dataset.animated = 'true' })
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div role="group" aria-label="Ver como" className="view-toggle">
      <span ref={indicatorRef} aria-hidden="true" className="view-toggle-indicator" />
      {VIEW_OPTIONS.map((option) => (
        <button
          key={option.id}
          ref={(element) => { buttons.current[option.id] = element }}
          type="button"
          title={option.label}
          aria-pressed={view === option.id}
          className="view-toggle-option"
          onClick={() => onChange(option.id)}
        >
          <option.icon className="h-4 w-4" aria-hidden="true" />
          <span className="view-toggle-text">{option.label}</span>
        </button>
      ))}
    </div>
  )
}
