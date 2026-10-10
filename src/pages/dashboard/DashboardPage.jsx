import { useContext, useEffect, useId, useState } from 'react'
import { Bell } from 'lucide-react'
import { reportesService } from '../../services/reportesService'
import { ReportFilters } from '../../components/reports/ReportFilters'
import { DistributionList, ErrorState, MetricCard } from '../../components/reports/ReportComponents'
import { Card } from '../../components/ui/card'
import { AuthContext } from '../../context/AuthContext'

const initial = {
  resumen: {},
  modalidades: [],
  etapas: [],
  estados: [],
  documentos: {},
  defensas: {},
  cierre: {},
  notificaciones: {},
  tendencia: [],
  advertencias: [],
}

const donutColors = ['--primary', '--success', '--evaluation', '--warning', '--danger', '--document']
const DONUT_MAX_CATEGORIES = donutColors.length
const percentFormatter = new Intl.NumberFormat('es-BO', { maximumFractionDigits: 1 })

function firstName(user) {
  const value = [user?.nombres, user?.nombre_completo, user?.nombre, user?.username]
    .find((candidate) => String(candidate || '').trim())
  return String(value || 'Usuario').trim().split(/\s+/)[0]
}

function formatMetricLabel(value) {
  return String(value).replaceAll('_', ' ').replace(/(^|\s)\p{L}/gu, (letter) => letter.toLocaleUpperCase('es'))
}

function formatMetricValue(field, value) {
  if (typeof value === 'string' && /^[A-Z0-9_]+$/.test(value)) {
    return value.replaceAll('_', ' ').toLocaleLowerCase('es').replace(/(^|\s)\p{L}/gu, (letter) => letter.toLocaleUpperCase('es'))
  }
  return value ?? 0
}

function DonutChart({ items }) {
  const titleId = useId()
  const values = items.map((item) => Math.max(0, Number(item.total) || 0))
  const total = values.reduce((sum, value) => sum + value, 0)
  const circumference = 2 * Math.PI * 58
  let offset = 0

  if (items.length > DONUT_MAX_CATEGORIES) {
    return (
      <DistributionList
        title="Postulaciones por modalidad"
        items={items}
        showPercent
      />
    )
  }

  return (
    <Card className="h-full">
      <h2 className="text-lg font-semibold">Postulaciones por modalidad</h2>
      {items.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-[var(--border)] p-5 text-center text-sm text-slate-500">
          Sin datos disponibles para esta distribución.
        </p>
      ) : (
        <div className="mt-4 grid items-center gap-5 sm:grid-cols-[minmax(9rem,0.8fr)_minmax(0,1.2fr)]">
          <svg
            className="mx-auto w-full max-w-44"
            viewBox="0 0 180 180"
            role="img"
            aria-labelledby={titleId}
          >
            <title id={titleId}>Distribución de postulaciones por modalidad; total {total}</title>
            <circle
              cx="90"
              cy="90"
              r="58"
              fill="none"
              stroke="var(--border)"
              strokeWidth="18"
            />
            {items.map((item, index) => {
              const value = values[index]
              const segmentLength = total > 0 ? (value / total) * circumference : 0
              const segmentOffset = offset
              offset += segmentLength
              if (segmentLength === 0) return null

              return (
                <circle
                  key={`${item.codigo || item.nombre}-${index}`}
                  cx="90"
                  cy="90"
                  r="58"
                  fill="none"
                  stroke={`var(${donutColors[index]})`}
                  strokeWidth="18"
                  strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
                  strokeDashoffset={-segmentOffset}
                  transform="rotate(-90 90 90)"
                />
              )
            })}
            <text
              x="90"
              y="88"
              textAnchor="middle"
              className="fill-[var(--text-primary)] text-3xl font-bold"
            >
              {total}
            </text>
            <text
              x="90"
              y="108"
              textAnchor="middle"
              className="fill-[var(--text-secondary)] text-[10px]"
            >
              Postulaciones
            </text>
          </svg>
          <ul className="grid min-w-0 gap-3">
            {items.map((item, index) => {
              const value = values[index]
              const percent = total > 0 ? `${percentFormatter.format((value / total) * 100)}%` : '—'

              return (
                <li
                  key={`${item.codigo || item.nombre}-${index}`}
                  className="flex min-w-0 items-start justify-between gap-3 text-sm"
                >
                  <span className="flex min-w-0 items-start gap-2">
                    <span
                      aria-hidden="true"
                      className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: `var(${donutColors[index]})` }}
                    />
                    <span className="break-words">{item.nombre || item.codigo || 'Sin clasificar'}</span>
                  </span>
                  <span className="shrink-0 text-right tabular-nums">
                    <strong>{value}</strong>
                    <span className="ml-2 text-xs text-slate-500">{percent}</span>
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </Card>
  )
}

function LoadingDashboard() {
  return (
    <div className="space-y-4" role="status" aria-label="Cargando dashboard">
      <div className="grid grid-cols-1 animate-pulse gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-28 rounded-xl bg-slate-200 dark:bg-slate-800" />
        ))}
      </div>
      <div className="grid animate-pulse gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-64 rounded-xl bg-slate-200 dark:bg-slate-800" />
        ))}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useContext(AuthContext)
  const [filters, setFilters] = useState({})
  const [data, setData] = useState(initial)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    reportesService.obtenerDashboard(filters, controller.signal)
      .then((value) => setData({ ...initial, ...value }))
      .catch((requestError) => {
        if (!requestError.canceled) setError(requestError)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [filters, revision])

  if (error?.status === 403) {
    return <ErrorState message="Acceso no autorizado al dashboard institucional." />
  }

  const totalPostulaciones = Number(data.resumen.total_postulaciones) || 0
  const hasNoPostulaciones = !loading && !error && totalPostulaciones === 0

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Bienvenido, {firstName(user)}</h1>
        <p className="mt-1 text-slate-500">Consulta el estado general de los procesos académicos.</p>
      </header>

      <ReportFilters onApply={setFilters} />
      {error && <ErrorState message={error.message} onRetry={() => setRevision((value) => value + 1)} />}

      {loading ? (
        <LoadingDashboard />
      ) : !error && (
        <div className="space-y-6">
          <section
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5"
            aria-label="Resumen de postulaciones"
            data-testid="dashboard-metrics"
          >
            <MetricCard label="Total postulaciones" value={data.resumen.total_postulaciones} />
            <MetricCard label="En proceso" value={data.resumen.en_proceso} />
            <MetricCard label="Concluidas" value={data.resumen.concluidas} />
            <MetricCard label="Rechazadas" value={data.resumen.rechazadas} />
            <MetricCard label="Sin etapa actual" value={data.resumen.sin_etapa_actual} />
          </section>

          {hasNoPostulaciones && (
            <p
              className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-5 text-center text-sm text-[var(--text-secondary)]"
              role="status"
            >
              No hay postulaciones para los filtros aplicados.
            </p>
          )}

          <section
            className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3"
            aria-label="Distribuciones de postulaciones"
            data-testid="dashboard-distributions"
          >
            <DonutChart items={data.modalidades} />
            <DistributionList
              title="Postulaciones por etapa actual"
              items={data.etapas}
              labelKey="codigo"
            />
            <DistributionList title="Postulaciones por estado general" items={data.estados} />
          </section>

          <section
            className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3"
            aria-label="Indicadores operativos"
          >
            <Indicator title="Documentos" data={data.documentos} />
            <Indicator title="Defensas" data={data.defensas} />
            <Indicator title="Cierre académico" data={data.cierre} />
          </section>

          <section className="grid gap-4 lg:grid-cols-2" aria-label="Tendencia y notificaciones">
            <DistributionList
              title="Tendencia por gestión"
              items={data.tendencia}
              labelKey="gestion"
            />
            <Card className="h-full">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-[var(--primary)]" aria-hidden="true" />
                <h2 className="text-lg font-semibold">Notificaciones personales</h2>
              </div>
              <p className="mt-4 text-4xl font-bold tabular-nums">
                {data.notificaciones.no_leidas ?? 0}
              </p>
              <p className="text-sm text-slate-500">notificaciones no leídas</p>
            </Card>
          </section>
        </div>
      )}
    </div>
  )
}

function Indicator({ title, data = {} }) {
  const entries = Object.entries(data)
  const metrics = entries.filter(([, value]) => !Array.isArray(value) && (value === null || typeof value !== 'object'))
  const collections = entries.filter(([, value]) => Array.isArray(value))

  return (
    <Card className="h-full">
      <h2 className="text-lg font-semibold">{title}</h2>
      {metrics.length === 0 && collections.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">Sin datos disponibles.</p>
      ) : (
        <dl className="mt-4 grid grid-cols-2 gap-4">
          {metrics.map(([key, value]) => (
            <div key={key} className="min-w-0">
              <dt className="text-xs capitalize text-slate-500">{formatMetricLabel(key)}</dt>
              <dd className="mt-1 break-words text-xl font-semibold tabular-nums">{value ?? 0}</dd>
            </div>
          ))}
          {collections.map(([key, items]) => (
            <div key={key} className="col-span-full border-t border-[var(--border)] pt-3">
              <dt className="text-xs capitalize text-slate-500">{formatMetricLabel(key)}</dt>
              <dd className="mt-2">
                {items.length === 0 ? (
                  <p className="text-sm text-slate-500">Sin datos disponibles.</p>
                ) : (
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {items.map((item, index) => (
                      <li
                        key={`${key}-${index}`}
                        className="grid min-w-0 grid-cols-2 gap-2 rounded-lg bg-[var(--surface-secondary)] p-3 text-sm"
                      >
                        {Object.entries(item).map(([field, value]) => (
                          <span key={field} className="min-w-0">
                            <span className="block text-xs capitalize text-slate-500">
                              {formatMetricLabel(field)}
                            </span>
                            <strong className="mt-1 block break-words tabular-nums">
                              {formatMetricValue(field, value)}
                            </strong>
                          </span>
                        ))}
                      </li>
                    ))}
                  </ul>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </Card>
  )
}
