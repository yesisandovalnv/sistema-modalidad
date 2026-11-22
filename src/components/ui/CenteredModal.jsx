import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { prefersReducedMotion } from '../../hooks/useCountUp'

const CLOSE_MS = 180

/**
 * Ventana flotante con las reglas de Fondo de Tiempo: se monta en <body> y el fondo difuminado
 * tiene la forma del panel de trabajo (debajo de la barra, a la derecha del menú lateral, con
 * sus esquinas curvas; MainLayout publica el ancho del menú en html[data-sidebar]). La
 * ventana queda centrada en esa área. Escape, pulsar fuera o la X la
 * cierran con una salida corta; el foco entra a la ventana, no se escapa con Tab y vuelve
 * al botón que la abrió.
 *
 * Convive con ventanas propias del contenido (p. ej. las del Expediente: subir documento,
 * dictamen, participantes…): si hay otra ventana `aria-modal` abierta, Escape y Tab son de
 * esa ventana. `layer="page"` la deja un nivel por debajo de esas ventanas (que usan z-50),
 * incluso de las que se dibujan directo en <body>.
 */
export function CenteredModal({ title, eyebrow, onClose, children, size = 'md', labelledBy, layer = 'top' }) {
  const [closing, setClosing] = useState(false)
  const dialogRef = useRef(null)
  const timer = useRef(null)
  const returnFocus = useRef(typeof document !== 'undefined' ? document.activeElement : null)

  const requestClose = useCallback(() => {
    if (prefersReducedMotion()) { onClose(); return }
    setClosing(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(onClose, CLOSE_MS)
  }, [onClose])

  const requestCloseRef = useRef(requestClose)
  useEffect(() => { requestCloseRef.current = requestClose }, [requestClose])

  useEffect(() => {
    const target = returnFocus.current
    // Si la ventana ya llevó el foco a un campo (autoFocus), se respeta; si no, va a la X.
    if (!dialogRef.current?.contains(document.activeElement)) dialogRef.current?.querySelector('[data-autofocus]')?.focus()
    // Mientras la ventana está abierta, todo lo de atrás (menú lateral, barra y página) queda
    // bloqueado con inert: sin clics ni teclado. El menú lleva además un velo. Al cerrar se
    // deja todo como estaba (en celular el menú cerrado ya viene inert).
    const sidebar = document.getElementById('main-sidebar')
    const blocked = document.querySelector('.app-shell') || sidebar
    const wasInert = blocked?.hasAttribute('inert')
    blocked?.setAttribute('inert', '')
    sidebar?.setAttribute('data-modal-blocked', '')
    // Escape cierra aunque el foco no esté dentro de la ventana.
    const onEscape = (event) => {
      if (event.key !== 'Escape') return
      // Si hay un desplegable abierto, Escape cierra primero ese desplegable, no la ventana.
      if (document.activeElement?.getAttribute('aria-expanded') === 'true') return
      // Con varias ventanas abiertas, Escape cierra solo la de arriba (la última abierta).
      const open = [...document.querySelectorAll('[aria-modal="true"]')]
      if (open[open.length - 1] !== dialogRef.current) return
      event.stopPropagation()
      requestCloseRef.current()
    }
    document.addEventListener('keydown', onEscape, true)
    return () => {
      window.clearTimeout(timer.current)
      document.removeEventListener('keydown', onEscape, true)
      sidebar?.removeAttribute('data-modal-blocked')
      if (!wasInert) blocked?.removeAttribute('inert')
      if (target && typeof target.focus === 'function' && target.isConnected && !target.disabled && !target.closest?.('[hidden]')) target.focus()
    }
  }, [])

  const onKeyDown = (event) => {
    if (event.key !== 'Tab') return
    // Tab dentro de otra ventana (aunque esté dibujada aquí dentro o venga de un portal del
    // contenido) lo maneja esa ventana.
    if (event.target.closest?.('[aria-modal="true"]') !== dialogRef.current) return
    // Solo lo que de verdad recibe foco con Tab (los colores no elegidos tienen tabIndex -1).
    const focusable = [...dialogRef.current.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]')]
      .filter((element) => element.tabIndex >= 0)
    if (!focusable.length) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  }

  const generatedId = `modal-${useId().replace(/:/g, '')}`
  const headingId = labelledBy || generatedId

  return createPortal(
    <>
    <div className="modal-catcher" data-layer={layer} aria-hidden="true" onMouseDown={requestClose} />
    <div className="modal-overlay" data-layer={layer} data-state={closing ? 'closing' : 'open'} onMouseDown={(event) => { if (event.target === event.currentTarget) requestClose() }}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className={`modal-window modal-window--${size}`}
        data-state={closing ? 'closing' : 'open'}
        onKeyDown={onKeyDown}
      >
        <header className="modal-head">
          <div className="min-w-0">
            {eyebrow && <p className="modal-eyebrow">{eyebrow}</p>}
            <h2 id={headingId} className="text-lg font-bold text-[var(--heading)]">{title}</h2>
          </div>
          <button type="button" className="modal-close" onClick={requestClose} aria-label="Cerrar" data-autofocus>
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
    </>,
    document.body,
  )
}
