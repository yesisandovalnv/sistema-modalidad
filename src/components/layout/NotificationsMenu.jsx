import { useCallback, useContext, useEffect, useId, useRef, useState } from 'react'
import { AlertTriangle, Bell, CheckCheck, CheckCircle2, Info, OctagonAlert } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { NotificationContext } from '../../context/NotificationContext'
import { notificacionesService } from '../../services/notificacionesService'
import { prefersReducedMotion } from '../../hooks/useCountUp'
import { ActionButton } from '../ui/ActionButton'
import { notificationTypeLabel, timeAgo } from '../../lib/notificationLabels'

const CLOSE_MS = 140
const PAGE_SIZE = 8
// Cada nivel con su forma (icono) además del color: no depende solo del color.
const LEVEL_ICON = { INFO: Info, SUCCESS: CheckCircle2, WARNING: AlertTriangle, ERROR: OctagonAlert }

/**
 * Campana del encabezado (como en Facebook): abre una ventana con las últimas notificaciones,
 * separadas en "Nuevas" (sin leer, resaltadas) y "Anteriores". Al abrir una, se marca como
 * leída sola; no hay filtros ni botones de leída/no leída. "Ver todas" lleva a la página.
 */
export function NotificationsMenu() {
  const { unreadCount = 0, clearUnread, refreshUnreadCount } = useContext(NotificationContext) || {}
  const [state, setState] = useState('closed') // closed | open | closing
  const [data, setData] = useState({ loading: true, error: '', results: [], count: 0 })
  const [reload, setReload] = useState(0)
  const [markingAll, setMarkingAll] = useState(false)
  const rootRef = useRef(null)
  const buttonRef = useRef(null)
  const closeTimer = useRef(null)
  const panelId = `notificaciones-${useId().replace(/:/g, '')}`
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const open = state === 'open'

  const close = useCallback((returnFocus = false) => {
    window.clearTimeout(closeTimer.current)
    if (prefersReducedMotion()) setState('closed')
    else {
      setState('closing')
      closeTimer.current = window.setTimeout(() => setState('closed'), CLOSE_MS)
    }
    if (returnFocus) buttonRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event) => { if (!rootRef.current?.contains(event.target)) close() }
    const onKeyDown = (event) => { if (event.key === 'Escape') close(true) }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, close])

  // Cambiar de pantalla cierra la ventana.
  const lastPath = useRef(pathname)
  useEffect(() => {
    if (lastPath.current !== pathname && state !== 'closed') close()
    lastPath.current = pathname
  }, [pathname, state, close])

  useEffect(() => () => window.clearTimeout(closeTimer.current), [])

  useEffect(() => {
    if (!open) return undefined
    const controller = new AbortController()
    setData((current) => ({ ...current, loading: true, error: '' }))
    notificacionesService.obtenerNotificaciones({ page_size: PAGE_SIZE }, controller.signal)
      .then((response) => setData({ loading: false, error: '', results: response?.results || [], count: Number(response?.count) || 0 }))
      .catch((error) => {
        if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') return
        setData({ loading: false, error: 'No pudimos cargar tus notificaciones.', results: [], count: 0 })
      })
    return () => controller.abort()
  }, [open, reload])

  // La página abre el detalle y es la que la marca como leída (un solo lugar).
  const openItem = (item) => {
    close()
    navigate(`/notificaciones?ver=${item.id}`)
  }

  const markAll = async () => {
    if (markingAll || unreadCount === 0) return
    setMarkingAll(true)
    try {
      await notificacionesService.marcarTodasLeidas()
      clearUnread?.()
      setData((current) => ({ ...current, results: current.results.map((item) => ({ ...item, leida: true })) }))
    } catch {
      refreshUnreadCount?.()
    } finally {
      setMarkingAll(false)
    }
  }

  const nuevas = data.results.filter((item) => !item.leida)
  const anteriores = data.results.filter((item) => item.leida)
  const renderItem = (item, index) => {
    const Icon = LEVEL_ICON[item.nivel] || Info
    return (
      <li key={item.id} style={{ '--i': index }} className="notif-row">
        <button type="button" className={`notif-item ${item.leida ? '' : 'is-unread'}`} onClick={() => openItem(item)}>
          <span className="notif-icon" data-level={item.nivel} aria-hidden="true"><Icon className="h-4 w-4" strokeWidth={2.25} /></span>
          <span className="min-w-0 flex-1">
            <span className="notif-title">{item.titulo || notificationTypeLabel(item.tipo)}</span>
            <span className="notif-message">{item.mensaje}</span>
            <span className="notif-meta">{timeAgo(item.created_at)}</span>
          </span>
          {!item.leida && <span className="notif-dot"><span className="sr-only">Sin leer</span></span>}
        </button>
      </li>
    )
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        className="navbar-control relative grid h-10 w-10 place-items-center rounded-full"
        aria-label={unreadCount > 0 ? `Notificaciones, ${unreadCount} sin leer` : 'Notificaciones'}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        title="Notificaciones"
        onClick={() => (open ? close() : (window.clearTimeout(closeTimer.current), setState('open')))}
      >
        <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
        {unreadCount > 0 && <span aria-hidden="true" className="navbar-badge" key={unreadCount}>{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>

      {state !== 'closed' && (
        <div id={panelId} role="dialog" aria-label="Notificaciones" className="notif-panel dropdown-panel" data-state={state}>
          <header className="notif-head">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-[var(--heading)]">Notificaciones</h2>
              <p className="text-xs text-[var(--text-secondary)]">{unreadCount > 0 ? `${unreadCount} sin leer` : 'Todo al día'}</p>
            </div>
            <ActionButton to="/notificaciones" size="sm">Ver todas</ActionButton>
          </header>

          <div className="notif-body" aria-live="polite" aria-busy={data.loading}>
            {data.loading ? (
              <ul className="notif-list" aria-label="Cargando notificaciones">
                {[0, 1, 2].map((index) => (
                  <li key={index} className="notif-skeleton"><span className="skeleton h-9 w-9 rounded-xl" /><span className="grid flex-1 gap-2"><span className="skeleton h-3 w-2/3 rounded" /><span className="skeleton h-3 w-full rounded" /></span></li>
                ))}
              </ul>
            ) : data.error ? (
              <div className="notif-empty" role="alert">
                <p>{data.error}</p>
                <button type="button" className="notif-link" onClick={() => setReload((value) => value + 1)}>Reintentar</button>
              </div>
            ) : data.results.length === 0 ? (
              <div className="notif-empty">
                <Bell className="h-5 w-5" aria-hidden="true" />
                <p>No tienes notificaciones.</p>
              </div>
            ) : (
              <div key={reload}>
                {nuevas.length > 0 && (
                  <section aria-label="Nuevas">
                    <h3 className="notif-section">Nuevas</h3>
                    <ul className="notif-list">{nuevas.map((item, index) => renderItem(item, index))}</ul>
                  </section>
                )}
                {anteriores.length > 0 && (
                  <section aria-label="Anteriores">
                    <h3 className="notif-section">Anteriores</h3>
                    <ul className="notif-list">{anteriores.map((item, index) => renderItem(item, nuevas.length + index))}</ul>
                  </section>
                )}
              </div>
            )}
          </div>

          <footer className="notif-foot">
            <button type="button" className="notif-link" disabled={unreadCount === 0 || markingAll} onClick={markAll}>
              <CheckCheck className="h-4 w-4" aria-hidden="true" />
              {markingAll ? 'Marcando…' : 'Marcar todas como leídas'}
            </button>
          </footer>
        </div>
      )}
    </div>
  )
}
