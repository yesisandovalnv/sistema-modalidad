import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, ArrowLeft, Bell, CheckCheck, CheckCircle2, ChevronRight, Info, OctagonAlert, X } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { FilterMenu } from '../../components/ui/FilterMenu'
import { Pagination } from '../../components/reports/ReportComponents'
import { notificacionesService } from '../../services/notificacionesService'
import { useNotifications } from '../../hooks/useNotifications'
import { NOTIFICATION_LEVELS, NOTIFICATION_TYPES, notificationTypeLabel, timeAgo } from '../../lib/notificationLabels'

const safeMetadata = { etapa_nombre: 'Etapa', modalidad_nombre: 'Modalidad', tipo_documento: 'Tipo de documento', tipo_defensa: 'Tipo de defensa', fecha_programada: 'Fecha programada', estado_anterior: 'Estado anterior', estado_nuevo: 'Estado nuevo' }
const LEVEL_ICON = { INFO: Info, SUCCESS: CheckCircle2, WARNING: AlertTriangle, ERROR: OctagonAlert }
const EMPTY_FILTERS = { leida: '', nivel: '', tipo: '', fecha_desde: '', fecha_hasta: '' }

// Mismas opciones que la ventana de la campana; aquí se suman el tipo y las fechas.
const FILTER_COLUMNS = [
  { key: 'leida', title: 'Estado', group: 'estado', options: [{ value: 'false', label: 'Solo sin leer' }] },
  { key: 'nivel', title: 'Nivel', group: 'estado', options: Object.entries(NOTIFICATION_LEVELS).map(([value, label]) => ({ value, label })) },
  { key: 'tipo', title: 'Tipo', options: Object.entries(NOTIFICATION_TYPES).map(([value, label]) => ({ value, label })) },
]

const formatDate = (value, full = false) => {
  if (!value) return 'Sin fecha'
  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) return 'Fecha no disponible'
  return new Intl.DateTimeFormat('es-BO', full ? { dateStyle: 'long', timeStyle: 'short' } : { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date)
}

// "Hasta" incluye todo ese día (la API compara con la fecha y hora exactas).
const toParams = (filters, page) => ({ ...filters, fecha_hasta: filters.fecha_hasta ? `${filters.fecha_hasta}T23:59:59` : '', page })

function DetailModal({ notification, onClose }) {
  const closeRef = useRef(null)
  useEffect(() => { closeRef.current?.focus(); const key = (event) => event.key === 'Escape' && onClose(); document.addEventListener('keydown', key); return () => document.removeEventListener('keydown', key) }, [onClose])
  const metadata = notification.metadata && typeof notification.metadata === 'object' ? Object.entries(notification.metadata).filter(([key]) => safeMetadata[key]) : []
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="notification-title" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-6 text-[var(--text-primary)] shadow-xl">
      <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-[var(--text-secondary)]">{notificationTypeLabel(notification.tipo)}</p><h2 id="notification-title" className="mt-1 text-xl font-bold text-[var(--heading)]">{notification.titulo}</h2></div><Button ref={closeRef} variant="ghost" aria-label="Cerrar detalle" onClick={onClose}><X className="h-5 w-5" /></Button></div>
      <p className="mt-4 whitespace-pre-wrap break-words">{notification.mensaje}</p>
      <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="font-semibold">Nivel</dt><dd>{NOTIFICATION_LEVELS[notification.nivel] || notificationTypeLabel(notification.nivel)}</dd></div><div><dt className="font-semibold">Estado</dt><dd>{notification.leida ? 'Leída' : 'No leída'}</dd></div><div><dt className="font-semibold">Creada</dt><dd>{formatDate(notification.created_at, true)}</dd></div><div><dt className="font-semibold">Leída el</dt><dd>{notification.fecha_lectura ? formatDate(notification.fecha_lectura, true) : 'Aún no leída'}</dd></div>{notification.actor && <div><dt className="font-semibold">Actor</dt><dd>{notification.actor.nombre || notification.actor.username}</dd></div>}{metadata.map(([key, value]) => <div key={key}><dt className="font-semibold">{safeMetadata[key]}</dt><dd>{String(value)}</dd></div>)}</dl>
    </div></div>
}

export default function NotificacionesPage() {
  const { unreadCount, refreshUnreadCount, decrementUnread, clearUnread } = useNotifications()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [page, setPage] = useState(1)
  const [data, setData] = useState({ count: 0, next: null, previous: null, results: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [allBusy, setAllBusy] = useState(false)
  const [selected, setSelected] = useState(null)
  const listStart = useRef(null)

  const load = useCallback(async (signal) => {
    setLoading(true); setError('')
    try { setData(await notificacionesService.obtenerNotificaciones(toParams(filters, page), signal)) }
    catch (err) { if (err?.name !== 'CanceledError' && err?.code !== 'ERR_CANCELED') setError(err.status === 403 ? 'No tienes permiso para consultar notificaciones.' : 'No pudimos cargar tus notificaciones.') }
    finally { if (!signal?.aborted) setLoading(false) }
  }, [filters, page])

  useEffect(() => { const controller = new AbortController(); load(controller.signal); refreshUnreadCount(); return () => controller.abort() }, [load, refreshUnreadCount])

  // Abrir una notificación la marca como leída (como en Facebook); no hay botón para desmarcarla.
  const openDetail = useCallback((item) => {
    setSelected(item)
    if (item.leida) return
    const readNow = { ...item, leida: true, fecha_lectura: new Date().toISOString() }
    setData((current) => ({ ...current, results: current.results.map((entry) => entry.id === item.id ? readNow : entry) }))
    notificacionesService.marcarLeida(item.id)
      .then((updated) => { if (updated) setData((current) => ({ ...current, results: current.results.map((entry) => entry.id === item.id ? updated : entry) })); decrementUnread() })
      .catch(() => refreshUnreadCount())
  }, [decrementUnread, refreshUnreadCount])
  const openDetailRef = useRef(openDetail)
  useEffect(() => { openDetailRef.current = openDetail }, [openDetail])

  // Desde la campana se llega con ?ver=<id>: se abre el detalle de esa notificación.
  const verId = searchParams.get('ver')
  useEffect(() => {
    if (!verId) return undefined
    const controller = new AbortController()
    notificacionesService.obtenerNotificacion(verId, controller.signal).then((item) => openDetailRef.current(item)).catch(() => {})
    return () => controller.abort()
  }, [verId])

  const closeDetail = useCallback(() => {
    setSelected(null)
    if (searchParams.has('ver')) { const next = new URLSearchParams(searchParams); next.delete('ver'); setSearchParams(next, { replace: true }) }
  }, [searchParams, setSearchParams])

  const changeFilter = (name, value) => { setFilters((current) => ({ ...current, [name]: value })); setPage(1) }
  const clearFilters = () => { setFilters(EMPTY_FILTERS); setPage(1) }
  const markAll = async () => { if (!unreadCount || allBusy) return; setAllBusy(true); setError(''); try { await notificacionesService.marcarTodasLeidas(); clearUnread(); setData((current) => ({ ...current, results: current.results.map((entry) => ({ ...entry, leida: true, fecha_lectura: entry.fecha_lectura || new Date().toISOString() })) })) } catch { setError('No se pudieron marcar todas las notificaciones como leídas.') } finally { setAllBusy(false) } }
  const goPage = (next) => { setPage(next); requestAnimationFrame(() => listStart.current?.focus()) }
  const filtered = Object.values(filters).some((value) => value !== '')
  // Volver: a la pantalla anterior si se llegó desde el sistema; si no, al Dashboard.
  const goBack = () => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/dashboard'))

  return <section className="space-y-4">
    <Card className="animate-enter flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between" style={{ '--stagger': 0 }}>
      <div className="flex items-center gap-4">
        <button type="button" className="notif-back" onClick={goBack} aria-label="Volver" title="Volver"><ArrowLeft className="h-5 w-5" strokeWidth={2.25} aria-hidden="true" /></button>
        <span aria-hidden="true" className="hidden h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--surface-sunken)] text-[var(--heading)] sm:grid"><Bell className="h-[22px] w-[22px]" strokeWidth={1.75} /></span>
        <div>
          <h1 className="text-xl font-bold text-[var(--heading)]">Notificaciones</h1>
          <p className="text-sm text-[var(--text-secondary)]">Cambios y eventos de tus postulaciones.</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
        <span className={`notif-page-count ${unreadCount ? 'has-unread' : ''}`} role="status" aria-live="polite">{unreadCount} {unreadCount === 1 ? 'notificación no leída' : 'notificaciones no leídas'}</span>
        <Button className="gap-2 rounded-lg" onClick={markAll} disabled={!unreadCount || allBusy}><CheckCheck className="h-4 w-4" />{allBusy ? 'Marcando…' : 'Marcar todas como leídas'}</Button>
      </div>
    </Card>

    <Card className="animate-enter relative z-10 grid grid-cols-2 items-end gap-3 p-4 sm:flex sm:flex-wrap" style={{ '--stagger': 1 }}>
      <div className="col-span-2 flex items-center justify-between gap-3 sm:contents">
        <FilterMenu align="start" columns={FILTER_COLUMNS} values={filters} onChange={changeFilter} onClear={filtered ? clearFilters : undefined} />
        <span className="text-sm text-[var(--text-secondary)] sm:order-last sm:ml-auto sm:self-center">{data.count} {data.count === 1 ? 'notificación' : 'notificaciones'}</span>
      </div>
      <label className="notif-date">Desde<input type="date" value={filters.fecha_desde} max={filters.fecha_hasta || undefined} onChange={(event) => changeFilter('fecha_desde', event.target.value)} /></label>
      <label className="notif-date">Hasta<input type="date" value={filters.fecha_hasta} min={filters.fecha_desde || undefined} onChange={(event) => changeFilter('fecha_hasta', event.target.value)} /></label>
    </Card>

    <div ref={listStart} tabIndex="-1" className="focus:outline-none">
      {error && <div role="alert" className="mb-4 rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-4 text-[var(--danger-text)]"><p>{error}</p><Button variant="secondary" className="mt-2" onClick={() => load()}>Reintentar</Button></div>}
      {loading ? (
        <ul className="space-y-2" aria-label="Cargando notificaciones">{[0, 1, 2].map((index) => <li key={index} className="flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"><span className="skeleton h-10 w-10 rounded-xl" /><span className="grid flex-1 gap-2"><span className="skeleton h-3.5 w-1/3 rounded" /><span className="skeleton h-3 w-2/3 rounded" /></span></li>)}</ul>
      ) : data.results.length === 0 ? (
        <div className="animate-fade grid place-items-center gap-2 rounded-xl border border-dashed border-[var(--border)] p-10 text-center text-[var(--text-secondary)]"><Bell className="h-6 w-6" aria-hidden="true" />{filtered ? 'No se encontraron notificaciones con los filtros aplicados.' : 'No tienes notificaciones.'}</div>
      ) : (
        <Card className="overflow-hidden p-0">
          <ul key={`${page}|${Object.values(filters).join('|')}`} className="divide-y divide-[var(--border)]">
            {data.results.map((item, index) => {
              const Icon = LEVEL_ICON[item.nivel] || Info
              return (
                <li key={item.id} style={{ '--i': Math.min(index, 10) }} className="notif-page-li">
                  <button type="button" className={`notif-page-row ${item.leida ? '' : 'is-unread'}`} onClick={() => openDetail(item)}>
                    <span className="notif-icon" data-level={item.nivel} aria-hidden="true"><Icon className="h-4 w-4" strokeWidth={2.25} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-[0.9375rem] font-semibold text-[var(--heading)]">{item.titulo}</span>
                        {!item.leida && <span className="notif-badge">Nueva</span>}
                      </span>
                      <span className="mt-0.5 block break-words text-sm text-[var(--text-secondary)]">{item.mensaje}</span>
                      <span className="mt-1 block text-xs text-[var(--text-muted)]"><time dateTime={item.created_at} title={formatDate(item.created_at)}>{timeAgo(item.created_at)}</time> · {NOTIFICATION_LEVELS[item.nivel] || notificationTypeLabel(item.nivel)}{item.actor ? ` · ${item.actor.nombre || item.actor.username}` : ''}</span>
                    </span>
                    <ChevronRight className="notif-page-chevron h-5 w-5" aria-hidden="true" />
                  </button>
                </li>
              )
            })}
          </ul>
          <Pagination count={data.count} page={page} hasNext={Boolean(data.next)} hasPrevious={Boolean(data.previous)} onPage={goPage} />
        </Card>
      )}
    </div>
    {selected && <DetailModal notification={selected} onClose={closeDetail} />}
  </section>
}
