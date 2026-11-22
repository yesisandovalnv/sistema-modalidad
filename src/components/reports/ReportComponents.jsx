import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import { AnimatedNumber } from '../ui/AnimatedNumber'
import { barClip } from '../../lib/barClip'
import { labelFromCode, withAccents } from '../../lib/spanishLabel'

// Sin tarjeta cuando va dentro de otra (por ejemplo, en una pestaña).
function Wrapper({ bare, className, style, children }) {
  if (bare) return <div>{children}</div>
  return <Card className={className} style={style}>{children}</Card>
}

const percentFormatter = new Intl.NumberFormat('es-BO', { maximumFractionDigits: 1 })

// Tonos semánticos de DESIGN.md: cada indicador de estado usa su color de estado.
const tones = {
  primary: { bar: 'var(--primary)', soft: 'var(--primary-soft)', text: 'var(--heading)' },
  info: { bar: 'var(--info)', soft: 'var(--info-soft)', text: 'var(--info-text)' },
  success: { bar: 'var(--success)', soft: 'var(--success-soft)', text: 'var(--success-text)' },
  danger: { bar: 'var(--danger)', soft: 'var(--danger-soft)', text: 'var(--danger-text)' },
  warning: { bar: 'var(--warning)', soft: 'var(--warning-soft)', text: 'var(--warning-text)' },
}

// Indicador con su número animado. Con `total`, muestra qué parte del total representa.
// `featured` es la tarjeta azul marino del total, con el filete dorado de la carrera acreditada.
export function MetricCard({ label, value = 0, hint, total, tone = 'primary', icon: Icon, featured = false, compact = false, index = 0 }) {
  const safeValue = Number(value) || 0
  const share = Number(total) > 0 ? Math.min(100, (safeValue / Number(total)) * 100) : null
  const toneColors = tones[tone] || tones.primary

  if (featured && compact) {
    // En la fila de cinco indicadores: misma forma que las demás tarjetas (título, cifra, filete).
    return (
      <div className="metric-featured animate-enter relative flex h-full flex-col justify-between overflow-hidden rounded-xl p-4" style={{ '--stagger': index }}>
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-3xl font-bold leading-tight"><AnimatedNumber value={safeValue} /></p>
      </div>
    )
  }

  if (featured) {
    return (
      <div className="metric-featured animate-enter relative flex h-full items-center justify-between gap-4 overflow-hidden rounded-xl p-5" style={{ '--stagger': index }}>
        <div className="min-w-0">
          <p className="text-sm font-semibold">{label}</p>
          {hint && <p className="mt-0.5 max-w-[11rem] truncate text-xs text-[var(--nav-meta)]" title={hint}>{hint}</p>}
        </div>
        <p className="shrink-0 text-5xl font-bold leading-none"><AnimatedNumber value={safeValue} /></p>
      </div>
    )
  }

  return (
    <Card className={`animate-enter h-full ${compact ? 'p-4' : 'p-5'}`} style={{ '--stagger': index }}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-[var(--text-secondary)]">{label}</p>
        {Icon && (
          <span aria-hidden="true" className={`grid shrink-0 place-items-center rounded-full ${compact ? 'h-8 w-8' : 'h-9 w-9'}`} style={{ background: toneColors.soft, color: toneColors.text }}>
            <Icon className={compact ? 'h-4 w-4' : 'h-[18px] w-[18px]'} strokeWidth={1.75} />
          </span>
        )}
      </div>
      <p className={`font-bold text-[var(--heading)] ${compact ? 'text-2xl leading-tight' : 'mt-1 text-3xl'}`}><AnimatedNumber value={safeValue} /></p>
      {hint && <p className="mt-1 text-xs text-[var(--text-muted)]">{hint}</p>}
      {share !== null && (
        <p className={`${compact ? 'mt-1' : 'mt-2'} text-xs tabular-nums text-[var(--text-muted)]`}>{percentFormatter.format(share)} % del total</p>
      )}
    </Card>
  )
}

function formatCodeLabel(value) {
  return labelFromCode(value)
}

// `colorFor(item, index, items)`: color de cada barra (por estado o por posición en una gama).
export function DistributionList({ title, items = [], labelKey = 'nombre', showPercent = false, index = 0, fill = true, animate = true, bare = false, colorFor }) {
  const values = items.map((item) => Math.max(0, Number(item.total) || 0))
  const max = Math.max(0, ...values)
  const total = values.reduce((sum, value) => sum + value, 0)

  return (
    <Wrapper bare={bare} className={`${animate ? 'animate-enter' : ''} ${fill ? 'h-full' : ''}`} style={animate ? { '--stagger': index } : undefined}>
      <h3 className={bare ? 'sr-only' : 'text-base font-semibold text-[var(--heading)]'}>{title}</h3>
      {items.length === 0 ? (
        <p className="mt-2 rounded-lg border border-dashed border-[var(--border)] p-5 text-center text-sm text-[var(--text-secondary)]">
          Sin datos disponibles para esta distribución.
        </p>
      ) : (
        <ul className={bare ? 'space-y-3.5' : 'mt-4 space-y-4'}>
          {items.map((item, itemIndex) => {
            const value = values[itemIndex]
            const rawLabel = item[labelKey] || item.codigo || 'Sin clasificar'
            const label = labelKey === 'codigo' ? formatCodeLabel(rawLabel) : withAccents(String(rawLabel))
            const width = max > 0 ? (value / max) * 100 : 0
            const percent = total > 0 ? `${percentFormatter.format((value / total) * 100)}%` : '—'

            return (
              <li key={`${item.codigo || item[labelKey]}-${itemIndex}`}>
                <div className="mb-1.5 flex flex-wrap justify-between gap-x-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2 break-words text-[var(--text-primary)]">
                    {colorFor && <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colorFor(item, itemIndex, items) }} />}
                    {label}
                  </span>
                  <span className="flex shrink-0 items-center gap-2 tabular-nums">
                    <strong className="text-[var(--heading)]">{value}</strong>
                    {showPercent && <span className="text-xs text-[var(--text-muted)]">{percent}</span>}
                  </span>
                </div>
                <div aria-hidden="true" className="h-2.5 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
                  <div
                    className="bar-fill h-full w-full rounded-full"
                    style={{ clipPath: barClip(width), '--stagger': itemIndex, background: colorFor ? colorFor(item, itemIndex, items) : 'var(--primary)' }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Wrapper>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <div role="alert" className="animate-enter rounded-xl border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] bg-[var(--danger-soft)] p-6 text-[var(--danger-text)]">
      <p>{message}</p>
      {onRetry && <Button className="mt-4" onClick={onRetry}>Reintentar</Button>}
    </div>
  )
}

export function EmptyState({ children = 'No se encontraron postulaciones con los filtros aplicados.' }) {
  return <div className="animate-enter rounded-xl border border-dashed border-[var(--border-strong)] p-10 text-center text-[var(--text-secondary)]">{children}</div>
}

export function ProgressCell({ value = 0 }) {
  const safe = Math.min(100, Math.max(0, Number(value || 0)))
  return (
    <div className="min-w-28">
      <span className="text-xs font-medium">{safe.toFixed(2)}%</span>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--surface-sunken)]" role="progressbar" aria-label={`Avance ${safe.toFixed(2)}%`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={safe}>
        <div className="bar-fill h-full w-full rounded-full bg-[var(--success)]" style={{ clipPath: barClip(safe) }} />
      </div>
    </div>
  )
}

// Paginación del sistema (la misma de Postulantes y Fondo de Tiempo): anterior, la página
// actual en píldora con sus vecinas y siguiente, centrada. Solo aparece si hay más de una página.
export function Pagination({ count = 0, page = 1, hasNext, hasPrevious, onPage }) {
  if (!hasNext && !hasPrevious) return null
  const numbers = [hasPrevious ? page - 1 : null, page, hasNext ? page + 1 : null].filter((value) => value !== null && value >= 1)
  return (
    <nav className="page-nav" aria-label="Paginación">
      <span className="sr-only">{count} resultados · Página {page}</span>
      <button type="button" className="page-nav-arrow" aria-label="Anterior" disabled={!hasPrevious} onClick={() => onPage(page - 1)}>
        <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
      </button>
      {numbers.map((value) => (
        <button key={value} type="button" className="page-nav-number" aria-current={value === page ? 'page' : undefined} aria-label={`Página ${value}`} onClick={() => value !== page && onPage(value)}>{value}</button>
      ))}
      <button type="button" className="page-nav-arrow" aria-label="Siguiente" disabled={!hasNext} onClick={() => onPage(page + 1)}>
        <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
      </button>
    </nav>
  )
}
