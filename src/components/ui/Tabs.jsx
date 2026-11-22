import { Fragment, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { prefersReducedMotion } from '../../hooks/useCountUp'

/**
 * Pestañas con una píldora que se desliza a la elegida (WAI-ARIA tabs: flechas, Inicio/Fin).
 * Todos los paneles quedan montados y los no elegidos se ocultan con `hidden`: cambiar de
 * pestaña no vuelve a pedir datos y el panel elegido entra con un fundido corto.
 *
 * tabs: [{ id, label, content }]
 */
// `title`: se pone a la izquierda, en la misma fila que las pestañas (que van a la derecha).
// `autoPlay` (ms): pasa sola a la siguiente pestaña. Se pausa mientras el cursor o el foco
// están dentro, y no corre con "reducir movimiento" (WCAG 2.2.2: lo que se mueve solo se pausa).
// `panelClassName`: clase extra para cada panel (p. ej. centrar el gráfico en una tarjeta alta).
// `replayOnSelect`: el contenido se vuelve a montar cada vez que su pestaña pasa a estar activa,
// para que sus animaciones de entrada (barras, cifras que cuentan) se vean al elegirla.
export function Tabs({ tabs, label, defaultTab, className = '', title = null, autoPlay = 0, panelClassName = '', replayOnSelect = false }) {
  const baseId = `tabs-${useId().replace(/:/g, '')}`
  const [current, setCurrent] = useState(defaultTab || tabs[0]?.id)
  const listRef = useRef(null)
  const [indicator, setIndicator] = useState(null)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (!autoPlay || paused || tabs.length < 2 || prefersReducedMotion()) return undefined
    const timer = window.setInterval(() => {
      setCurrent((id) => tabs[(tabs.findIndex((tab) => tab.id === id) + 1) % tabs.length].id)
    }, autoPlay)
    return () => window.clearInterval(timer)
  }, [autoPlay, paused, tabs])

  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return undefined
    const measure = () => {
      const active = list.querySelector('[aria-selected="true"]')
      if (!active || !active.offsetWidth) { setIndicator(null); return }
      setIndicator((previous) => ({ left: active.offsetLeft, width: active.offsetWidth, animate: Boolean(previous) }))
    }
    measure()
    if (typeof ResizeObserver !== 'function') return undefined
    const observer = new ResizeObserver(measure)
    observer.observe(list)
    return () => observer.disconnect()
  }, [current, tabs.length])

  const onKeyDown = (event) => {
    const index = tabs.findIndex((tab) => tab.id === current)
    const last = tabs.length - 1
    const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length
      : event.key === 'ArrowLeft' ? (index - 1 + tabs.length) % tabs.length
        : event.key === 'Home' ? 0 : event.key === 'End' ? last : null
    if (next === null) return
    event.preventDefault()
    setCurrent(tabs[next].id)
    listRef.current?.querySelectorAll('[role="tab"]')[next]?.focus()
  }

  return (
    <div
      className={className}
      onMouseEnter={autoPlay ? () => setPaused(true) : undefined}
      onMouseLeave={autoPlay ? () => setPaused(false) : undefined}
      onFocus={autoPlay ? () => setPaused(true) : undefined}
      onBlur={autoPlay ? (event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false) } : undefined}
    >
      <div className="tabs-header">
      {title}
      <div ref={listRef} role="tablist" aria-label={label} className={`tabs-list ${indicator ? 'has-indicator' : ''}`} onKeyDown={onKeyDown}>
        {indicator && (
          <span
            aria-hidden="true"
            className={`tabs-indicator ${indicator.animate ? 'tabs-indicator--animate' : ''}`}
            style={{ transform: `translateX(${indicator.left}px)`, width: indicator.width }}
          />
        )}
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`${baseId}-tab-${tab.id}`}
            aria-selected={tab.id === current}
            aria-controls={`${baseId}-panel-${tab.id}`}
            tabIndex={tab.id === current ? 0 : -1}
            className="tabs-tab"
            onClick={() => setCurrent(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${baseId}-panel-${tab.id}`}
          aria-labelledby={`${baseId}-tab-${tab.id}`}
          hidden={tab.id !== current}
          className={`tabs-panel ${panelClassName}`.trim()}
        >
          {replayOnSelect ? <Fragment key={tab.id === current ? 'activa' : 'oculta'}>{tab.content}</Fragment> : tab.content}
        </div>
      ))}
    </div>
  )
}
