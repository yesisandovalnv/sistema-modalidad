import { Card } from '../ui/card'
import { Button } from '../ui/button'

export function MetricCard({ label, value = 0, hint }) {
  return (
    <Card className="h-full border-t-4 border-t-[var(--primary)] p-5">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold tabular-nums">{value ?? 0}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </Card>
  )
}

function formatCodeLabel(value) {
  return String(value || 'Sin clasificar')
    .replaceAll('_', ' ')
    .toLocaleLowerCase('es')
    .replace(/(^|\s)\p{L}/gu, (letter) => letter.toLocaleUpperCase('es'))
}

const percentFormatter = new Intl.NumberFormat('es-BO', { maximumFractionDigits: 1 })

export function DistributionList({ title, items = [], labelKey = 'nombre', showPercent = false }) {
  const values = items.map((item) => Math.max(0, Number(item.total) || 0))
  const max = Math.max(0, ...values)
  const total = values.reduce((sum, value) => sum + value, 0)

  return (
    <Card className="h-full">
      <h3 className="text-lg font-semibold">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-[var(--border)] p-5 text-center text-sm text-slate-500">
          Sin datos disponibles para esta distribución.
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {items.map((item, index) => {
            const value = values[index]
            const rawLabel = item[labelKey] || item.codigo || 'Sin clasificar'
            const label = labelKey === 'codigo' ? formatCodeLabel(rawLabel) : rawLabel
            const width = max > 0 ? (value / max) * 100 : 0
            const percent = total > 0 ? `${percentFormatter.format((value / total) * 100)}%` : '—'

            return (
              <li key={`${item.codigo || item[labelKey]}-${index}`}>
                <div className="mb-1 flex flex-wrap justify-between gap-x-3 text-sm">
                  <span className="break-words">{label}</span>
                  <span className="flex shrink-0 items-center gap-2 tabular-nums">
                    <strong>{value}</strong>
                    {showPercent && <span className="text-xs text-slate-500">{percent}</span>}
                  </span>
                </div>
                <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-[var(--primary)] transition-[width]"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

export function ErrorState({ message, onRetry }) { return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"><p>{message}</p>{onRetry && <Button className="mt-4" onClick={onRetry}>Reintentar</Button>}</div> }
export function EmptyState({ children = 'No se encontraron postulaciones con los filtros aplicados.' }) { return <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500">{children}</div> }
export function ProgressCell({ value = 0 }) { const safe = Math.min(100, Math.max(0, Number(value || 0))); return <div className="min-w-28"><span className="text-xs font-medium">{safe.toFixed(2)}%</span><div className="mt-1 h-2 rounded bg-slate-200 dark:bg-slate-700" role="progressbar" aria-label={`Avance ${safe.toFixed(2)}%`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={safe}><div className="h-full rounded bg-emerald-600" style={{ width: `${safe}%` }} /></div></div> }
export function Pagination({ count = 0, page = 1, hasNext, hasPrevious, onPage }) { return <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-4 dark:border-slate-800"><span className="text-sm text-slate-500">{count} resultados · Página {page}</span><div className="flex gap-2"><Button type="button" variant="outline" disabled={!hasPrevious} onClick={() => onPage(page - 1)}>Anterior</Button><Button type="button" variant="outline" disabled={!hasNext} onClick={() => onPage(page + 1)}>Siguiente</Button></div></div> }
