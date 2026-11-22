import { useLayoutEffect, useRef, useState } from 'react'
import { Lock } from 'lucide-react'

const EXPEDIENTE_PRIMARY_TABS = [
  { id: 'resumen', label: 'Resumen', hash: 'resumen' },
  { id: 'documentos', label: 'Documentos', hash: 'documentos' },
  { id: 'defensas', label: 'Defensas', hash: 'defensas' },
  { id: 'actores', label: 'Actores', hash: 'actores' },
  { id: 'etapas', label: 'Etapas', hash: 'etapas' },
  { id: 'historial', label: 'Historial', hash: 'historial' },
]

export function ExpedienteNav({ activeTab, hasModalityTab, hasOutcomeTab, lockedTabs = null, onActivate }) {
  const items = [
    ...EXPEDIENTE_PRIMARY_TABS,
    ...(hasModalityTab ? [{ id: 'modalidad', label: 'Modalidad', hash: 'modalidad' }] : []),
    ...(hasOutcomeTab ? [{ id: 'resultado-cierre', label: 'Resultado y cierre', hash: 'resultado-y-cierre' }] : []),
  ]
  const isLocked = (item) => Boolean(lockedTabs?.has(item.id))
  // Píldora que se desliza a la pestaña activa (misma que las pestañas del Inicio).
  const listRef = useRef(null)
  const [indicator, setIndicator] = useState(null)
  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return undefined
    const measure = () => {
      const active = list.querySelector('[aria-selected="true"]')
      if (!active || !active.offsetWidth) { setIndicator(null); return }
      const item = active.parentElement
      setIndicator((previous) => ({ left: item.offsetLeft, top: item.offsetTop, width: item.offsetWidth, height: item.offsetHeight, animate: Boolean(previous) }))
    }
    measure()
    if (typeof ResizeObserver !== 'function') return undefined
    const observer = new ResizeObserver(measure)
    observer.observe(list)
    return () => observer.disconnect()
  }, [activeTab, items.length])

  const handleKeyDown = (event, index) => {
    const step = (from, delta) => {
      let next = from
      for (let tries = 0; tries < items.length; tries += 1) {
        next = (next + delta + items.length) % items.length
        if (!isLocked(items[next])) return next
      }
      return from
    }
    let nextIndex = index
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = step(index, 1)
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = step(index, -1)
    else if (event.key === 'Home') nextIndex = step(items.length - 1, 1)
    else if (event.key === 'End') nextIndex = step(0, -1)
    else return
    event.preventDefault()
    const nextTab = items[nextIndex]
    onActivate(nextTab.hash)
    document.getElementById(`expediente-tab-${nextTab.id}`)?.focus()
  }

  return <nav aria-label="Secciones del expediente" className="expediente-nav">
    <ul ref={listRef} className={`tabs-list expediente-tabs ${indicator ? 'has-indicator' : ''}`} role="tablist" aria-label="Pestañas del expediente">
      {indicator && <li role="presentation" aria-hidden="true" className={`tabs-indicator ${indicator.animate ? 'tabs-indicator--animate' : ''}`} style={{ transform: `translate(${indicator.left}px, ${indicator.top}px)`, width: indicator.width, height: indicator.height }} />}
      {items.map((item, index) => <li key={item.id}>
        {isLocked(item) ? <span
          id={`expediente-tab-${item.id}`}
          role="tab"
          aria-selected="false"
          aria-disabled="true"
          title="No disponible en un registro histórico"
          className="tabs-tab expediente-tab is-locked"
        >{item.label}<Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /></span> : <a
          id={`expediente-tab-${item.id}`}
          href={`#${item.hash}`}
          role="tab"
          aria-controls={item.id === 'modalidad' ? 'modalidad' : item.id === 'resultado-cierre' ? 'resultado-y-cierre' : `panel-${item.id}`}
          aria-selected={activeTab === item.id}
          tabIndex={activeTab === item.id ? 0 : -1}
          className={`tabs-tab expediente-tab${activeTab === item.id ? ' is-active' : ''}`}
          onKeyDown={(event) => handleKeyDown(event, index)}
        >{item.label}</a>}
      </li>)}
    </ul>
  </nav>
}
