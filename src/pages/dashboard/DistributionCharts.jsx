import { useCountUp } from '../../hooks/useCountUp'
import { AnimatedNumber } from '../../components/ui/AnimatedNumber'
import { labelFromCode, withAccents } from '../../lib/spanishLabel'

// Una forma distinta por pestaña y colores planos (sin gamas ni degradados):
// etapa = columnas de colores; estado = barra segmentada; gestión = barras horizontales.

const percentFormatter = new Intl.NumberFormat('es-BO', { maximumFractionDigits: 1 })
const STATE_COLOR = { EN_PROCESO: 'var(--info)', CONCLUIDA: 'var(--success)', APROBADA: 'var(--success)', RECHAZADA: 'var(--danger)', ANULADA: 'var(--danger)', OBSERVADA: 'var(--warning)', REGISTRADA: 'var(--neutral)' }

function Empty() {
  return (
    <p className="mt-2 rounded-lg border border-dashed border-[var(--border)] p-5 text-center text-sm text-[var(--text-secondary)]">
      Sin datos disponibles para esta distribución.
    </p>
  )
}

const totalOf = (items) => items.reduce((sum, item) => sum + Math.max(0, Number(item.total) || 0), 0)

/** Estados: una barra 100 % partida por estado (con 2 px de separación) y su leyenda. */
export function StateStack({ title, items = [] }) {
  const total = totalOf(items)
  const shown = useCountUp(total)
  if (!items.length) return <div><h3 className="sr-only">{title}</h3><Empty /></div>
  const visible = items.filter((item) => Number(item.total) > 0)
  return (
    <div className="mx-auto w-full max-w-[26rem]">
      <h3 className="sr-only">{title}</h3>
      <p className="mb-3 text-sm text-[var(--text-secondary)]"><strong className="text-2xl font-bold tabular-nums text-[var(--heading)]">{shown}</strong> postulaciones según su estado general</p>
      <div className="state-stack" role="img" aria-label={`${title}: ${items.map((item) => `${withAccents(item.nombre || labelFromCode(item.codigo))} ${item.total}`).join(', ')}`}>
        {visible.map((item, index) => (
          <span key={item.codigo || index} className="state-stack-segment" style={{ flexGrow: Number(item.total), background: STATE_COLOR[item.codigo] || 'var(--neutral)', '--stagger': index }} />
        ))}
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {items.map((item, index) => {
          const value = Math.max(0, Number(item.total) || 0)
          return (
            <li key={`${item.codigo}-${index}`} className="state-legend" style={{ '--i': index }}>
              <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-[4px]" style={{ background: STATE_COLOR[item.codigo] || 'var(--neutral)' }} />
              <span className="min-w-0 flex-1 truncate text-sm text-[var(--text-primary)]">{withAccents(item.nombre || labelFromCode(item.codigo))}</span>
              <strong className="tabular-nums text-[var(--heading)]">{value}</strong>
              <span className="w-12 text-right text-xs tabular-nums text-[var(--text-muted)]">{total > 0 ? `${percentFormatter.format((value / total) * 100)}%` : '—'}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// Colores categóricos validados (dataviz) en orden fijo; si hubiera más etapas que colores,
// las de menor cantidad se juntan en "Otras" (nunca se repite ni se inventa un color).
const CATEGORY_COLORS = ['--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5', '--chart-6']

/** Etapas: una columna vertical por etapa, cada una de su color, cifra arriba y nombre abajo. */
export function StageColumns({ title, items = [] }) {
  if (!items.length) return <div><h3 className="sr-only">{title}</h3><Empty /></div>
  const sorted = [...items].sort((a, b) => (Number(b.total) || 0) - (Number(a.total) || 0))
  const columns = sorted.length > CATEGORY_COLORS.length
    ? [...sorted.slice(0, CATEGORY_COLORS.length - 1), { codigo: 'OTRAS', total: totalOf(sorted.slice(CATEGORY_COLORS.length - 1)) }]
    : sorted
  const max = Math.max(1, ...columns.map((item) => Number(item.total) || 0))
  return (
    <div className="w-full">
      <h3 className="sr-only">{title}</h3>
      <ul className="stage-columns" style={{ '--n': columns.length }}>
        {columns.map((item, index) => {
          const value = Math.max(0, Number(item.total) || 0)
          return (
            <li key={item.codigo || index} className="stage-column" style={{ '--stagger': index }}>
              <strong className="tabular-nums text-[var(--heading)]"><AnimatedNumber value={value} /></strong>
              <span className="stage-column-track" aria-hidden="true">
                <span className="stage-column-bar" style={{ height: `${(value / max) * 100}%`, background: `var(${CATEGORY_COLORS[index]})` }} />
              </span>
              <span className="stage-column-name" title={labelFromCode(item.codigo)}>{labelFromCode(item.codigo)}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// Cada año conserva siempre su color (año módulo 6 sobre la paleta validada): años seguidos
// caen en colores vecinos distinguibles y un filtro no repinta los años que quedan.
const yearColor = (year) => `var(${CATEGORY_COLORS[((Number(year) % CATEGORY_COLORS.length) + CATEGORY_COLORS.length) % CATEGORY_COLORS.length]})`

/** Gestiones: una barra horizontal por año, del más reciente al más antiguo, cifra al final. */
export function YearBars({ title, items = [] }) {
  if (!items.length) return <div><h3 className="sr-only">{title}</h3><Empty /></div>
  const rows = [...items].sort((a, b) => Number(b.gestion) - Number(a.gestion))
  const max = Math.max(1, ...rows.map((item) => Number(item.total) || 0))
  return (
    <div className="mx-auto w-full max-w-[24rem]">
      <h3 className="sr-only">{title}</h3>
      <ul className="year-bars">
        {rows.map((item, index) => {
          const value = Math.max(0, Number(item.total) || 0)
          return (
            <li key={item.gestion ?? index} className="year-bar-row" style={{ '--stagger': index }}>
              <span className="year-bar-year">{item.gestion}</span>
              <span className="year-bar-track" aria-hidden="true">
                <span className="year-bar-fill" style={{ width: `${Math.max(2, (value / max) * 100)}%`, background: yearColor(item.gestion) }} />
              </span>
              <strong className="year-bar-value"><AnimatedNumber value={value} /></strong>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
