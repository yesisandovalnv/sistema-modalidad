import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarClock, ClipboardCheck, FileClock, Package, UserPlus } from 'lucide-react'
import { Card } from '../../components/ui/card'
import { ActionButton } from '../../components/ui/ActionButton'
import { AnimatedNumber } from '../../components/ui/AnimatedNumber'
import { dashboardService } from '../../services/dashboardService'

const dateFormatter = new Intl.DateTimeFormat('es-BO', { day: 'numeric', month: 'short' })
const timeFormatter = new Intl.DateTimeFormat('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false })

const STATE_TONE = { EN_PROCESO: 'info', CONCLUIDA: 'success', APROBADA: 'success', RECHAZADA: 'danger', ANULADA: 'danger', OBSERVADA: 'warning', REGISTRADA: 'neutral' }

// Pide los datos de una tarjeta y guarda carga, error y resultado.
// Se pide una vez al montar la tarjeta.
function useWidget(load) {
  const [state, setState] = useState({ loading: true, error: '', data: null })
  useEffect(() => {
    const controller = new AbortController()
    setState({ loading: true, error: '', data: null })
    load(controller.signal)
      .then((data) => { if (!controller.signal.aborted) setState({ loading: false, error: '', data }) })
      .catch((error) => { if (!controller.signal.aborted && !error?.canceled) setState({ loading: false, error: 'No se pudo cargar.', data: null }) })
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return state
}

// Tarjeta de actividad: título con su explicación en una línea y, a la derecha, un contador.
function ActivityCard({ title, description, icon: Icon, index, footer, aside, children, testId }) {
  return (
    <Card className="activity-card animate-enter flex h-full flex-col p-0" style={{ '--stagger': index }} data-testid={testId}>
      <header className="activity-card-header">
        <span aria-hidden="true" className="activity-card-icon"><Icon className="h-[18px] w-[18px]" strokeWidth={1.9} /></span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-[var(--heading)]">{title}</h2>
          <p className="truncate text-xs text-[var(--text-secondary)]">{description}</p>
        </div>
        {aside}
      </header>
      <div className="flex-1 px-5 pb-1 pt-2">{children}</div>
      {footer && <div className="px-5 pb-5 pt-3">{footer}</div>}
    </Card>
  )
}

function CountBadge({ value, label }) {
  if (value === undefined || value === null) return null
  return (
    <span className="activity-count-badge" title={`${value} ${label}`}>
      <AnimatedNumber value={value} />
      <span className="sr-only"> {label}</span>
    </span>
  )
}

function WidgetState({ loading, error, empty, emptyText, rows = 3, children }) {
  if (loading) {
    return (
      <div className="space-y-2" role="status" aria-label="Cargando">
        {Array.from({ length: rows }).map((_, index) => <div key={index} className="skeleton h-11 rounded-lg" style={{ '--stagger': index }} />)}
      </div>
    )
  }
  if (error) return <p className="rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger-text)]" role="alert">{error}</p>
  if (empty) return <p className="rounded-lg border border-dashed border-[var(--border-strong)] px-3 py-4 text-center text-sm text-[var(--text-secondary)]">{emptyText}</p>
  return children
}

export function ProximasDefensas({ index = 0, canOpen = false }) {
  const { loading, error, data } = useWidget((signal) => dashboardService.proximasDefensas(signal))
  const now = Date.now()
  return (
    <ActivityCard title="Próximas defensas" description="La más cercana primero" icon={CalendarClock} index={index} testId="widget-defensas" aside={<CountBadge value={data?.total} label="programadas" />}>
      <WidgetState loading={loading} error={error} empty={!data?.items?.length} emptyText="No hay defensas programadas.">
        <ul className="pending-list">
          {data?.items?.map((event, itemIndex) => {
            const date = event.fecha_programada ? new Date(event.fecha_programada) : null
            const overdue = date && date.getTime() < now
            const content = (
              <>
                <span className={`activity-date ${overdue ? 'is-overdue' : ''}`}>
                  <strong>{date ? dateFormatter.format(date).replace('.', '') : '—'}</strong>
                  <small>{date ? timeFormatter.format(date) : ''}</small>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-semibold text-[var(--heading)]">{event.postulacion_codigo || `Postulación ${event.postulacion}`}</span>
                    {overdue && <span className="activity-flag" title="La fecha ya pasó y la defensa sigue programada">Por realizar</span>}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-[var(--text-secondary)]">{event.tipo_display}</span>
                  {(event.lugar || event.modalidad_display) && <span className="block truncate text-xs text-[var(--text-muted)]">{event.lugar || event.modalidad_display}</span>}
                </span>
                {canOpen && <ArrowRight className="pending-arrow h-4 w-4 shrink-0" aria-hidden="true" />}
              </>
            )
            return (
              <li key={event.id} style={{ '--i': itemIndex }}>
                {canOpen ? <Link to={`/postulaciones/${event.postulacion}`} className="pending-tile">{content}</Link> : <div className="pending-tile">{content}</div>}
              </li>
            )
          })}
        </ul>
      </WidgetState>
    </ActivityCard>
  )
}

export function PostulacionesRecientes({ index = 0, canOpen = false }) {
  const { loading, error, data } = useWidget((signal) => dashboardService.postulacionesRecientes(signal))
  return (
    <ActivityCard title="Postulaciones recientes" description={data?.total ? `Las últimas de ${data.total} registradas` : 'Las últimas registradas en el sistema'} icon={UserPlus} index={index} testId="widget-recientes" aside={canOpen && <ActionButton to="/postulantes" size="sm">Ver todos</ActionButton>}>
      <WidgetState loading={loading} error={error} empty={!data?.items?.length} emptyText="Todavía no hay postulaciones.">
        <ul className="activity-list">
          {data?.items?.map((item, itemIndex) => {
            const state = item.estado_actual_detalle || {}
            const tone = STATE_TONE[state.codigo] || 'neutral'
            const name = item.estudiante_detalle?.nombre_completo || item.estudiante_detalle?.username || 'Estudiante'
            const content = (
              <>
                <span className="activity-avatar" aria-hidden="true">{name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toLocaleUpperCase('es')}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-[var(--heading)]">{name}</span>
                  <span className="block truncate text-xs text-[var(--text-secondary)]">{[item.codigo, item.modalidad_detalle?.nombre].filter(Boolean).join(' · ')}</span>
                </span>
                {state.nombre && <span className={`semantic-status semantic-status--${tone} shrink-0`}>{state.nombre}</span>}
              </>
            )
            return (
              <li key={item.id} style={{ '--i': itemIndex }}>
                {canOpen ? <Link to={`/postulaciones/${item.id}`} className="activity-row">{content}</Link> : <div className="activity-row">{content}</div>}
              </li>
            )
          })}
        </ul>
      </WidgetState>
    </ActivityCard>
  )
}

export function PendientesRevision({ index = 0, canSeeDocuments = false, canSeeApplications = false }) {
  const { loading, error, data } = useWidget((signal) => dashboardService.pendientes(signal))
  const rows = [
    { key: 'documentos', label: 'Documentos por revisar', hint: 'Enviados, esperan aprobación', icon: FileClock, to: canSeeDocuments ? '/documentos' : null },
    { key: 'condiciones', label: 'Condiciones por verificar', hint: 'Requisitos de cierre', icon: ClipboardCheck, to: canSeeApplications ? '/postulantes' : null },
    { key: 'entregas', label: 'Entregas físicas pendientes', hint: 'Ejemplares, CD, timbres', icon: Package, to: canSeeApplications ? '/postulantes' : null },
  ]
  return (
    <ActivityCard title="Pendientes de revisión" description="Lo que espera una acción de la carrera" icon={ClipboardCheck} index={index} testId="widget-pendientes">
      <WidgetState loading={loading} error={error} empty={false}>
        <ul className="pending-list">
          {rows.map((row, itemIndex) => {
            const value = data?.[row.key]
            const content = (
              <>
                <span className={`pending-count ${value ? 'has-items' : ''}`}>{value === null || value === undefined ? '—' : <AnimatedNumber value={value} />}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 font-semibold text-[var(--heading)]">
                    <row.icon className="h-4 w-4 shrink-0 text-[var(--focus)]" strokeWidth={1.9} aria-hidden="true" />
                    <span className="truncate">{row.label}</span>
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-[var(--text-secondary)]">{row.hint}</span>
                </span>
                {row.to && <ArrowRight className="pending-arrow h-4 w-4 shrink-0" aria-hidden="true" />}
              </>
            )
            return (
              <li key={row.key} style={{ '--i': itemIndex }}>
                {row.to ? <Link to={row.to} className="pending-tile">{content}</Link> : <div className="pending-tile">{content}</div>}
              </li>
            )
          })}
        </ul>
      </WidgetState>
    </ActivityCard>
  )
}
