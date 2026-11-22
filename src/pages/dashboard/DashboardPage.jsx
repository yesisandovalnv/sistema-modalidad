import { useContext, useEffect, useId, useMemo, useRef, useState } from 'react'
import { CircleCheck, CircleDashed, CircleX, LayoutDashboard, LoaderCircle } from 'lucide-react'
import { ActionButton } from '../../components/ui/ActionButton'
import { ReportFilters } from '../../components/reports/ReportFilters'
import { Tabs } from '../../components/ui/Tabs'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { PendientesRevision, PostulacionesRecientes, ProximasDefensas } from './DashboardActivity'
import { StageColumns, StateStack, YearBars } from './DistributionCharts'
import { reportesService } from '../../services/reportesService'
import { DistributionList, ErrorState, MetricCard } from '../../components/reports/ReportComponents'
import { Card } from '../../components/ui/card'
import { AnimatedNumber } from '../../components/ui/AnimatedNumber'
import { useCountUp } from '../../hooks/useCountUp'
import { labelFromCode, withAccents } from '../../lib/spanishLabel'
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

// Series de los gráficos (DESIGN.md). El color sigue a la modalidad, no a su posición:
// así un filtro no repinta las que quedan. Las desconocidas toman los colores libres.
const donutColors = ['--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5', '--chart-6']
const MODALITY_COLOR = {
  PROYECTO_GRADO: '--chart-1',
  TESIS_GRADO: '--chart-2',
  TRABAJO_DIRIGIDO: '--chart-3',
  GRADUACION_VIA_DIPLOMADO: '--chart-4',
  EXCELENCIA_ACADEMICA: '--chart-5',
  EXAMEN_GRADO: '--chart-6',
}

function seriesColors(items) {
  const used = new Set(items.map((item) => MODALITY_COLOR[item.codigo]).filter(Boolean))
  const free = donutColors.filter((color) => !used.has(color))
  return items.map((item) => MODALITY_COLOR[item.codigo] || free.shift() || donutColors[0])
}
const DONUT_MAX_CATEGORIES = donutColors.length
const percentFormatter = new Intl.NumberFormat('es-BO', { maximumFractionDigits: 1 })

function firstName(user) {
  const value = [user?.nombres, user?.nombre_completo, user?.nombre, user?.username]
    .find((candidate) => String(candidate || '').trim())
  return String(value || 'Usuario').trim().split(/\s+/)[0]
}

function formatMetricLabel(value) {
  return labelFromCode(value)
}

function formatMetricValue(field, value) {
  if (typeof value === 'string' && /^[A-Z0-9_]+$/.test(value)) return labelFromCode(value)
  return value ?? 0
}

function DonutChart({ items }) {
  const titleId = useId()
  const values = items.map((item) => Math.max(0, Number(item.total) || 0))
  const total = values.reduce((sum, value) => sum + value, 0)
  const shownTotal = useCountUp(total)
  const colors = seriesColors(items)
  const circumference = 2 * Math.PI * 58
  let offset = 0

  if (items.length > DONUT_MAX_CATEGORIES) {
    return (
      <DistributionList
        title="Postulaciones por modalidad"
        items={items}
        showPercent
        bare
      />
    )
  }

  return (
    <div className="mx-auto w-full max-w-[34rem]">
      <h3 className="sr-only">Postulaciones por modalidad</h3>
      {items.length === 0 ? (
        <p className="mt-2 rounded-lg border border-dashed border-[var(--border)] p-5 text-center text-sm text-[var(--text-secondary)]">
          Sin datos disponibles para esta distribución.
        </p>
      ) : (
        <div className="grid items-center gap-5 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-8">
          <svg
            className="mx-auto w-full max-w-52"
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
              stroke="var(--surface-sunken)"
              strokeWidth="18"
            />
            {items.map((item, index) => {
              const value = values[index]
              const segmentLength = total > 0 ? (value / total) * circumference : 0
              const visibleLength = values.filter((v) => v > 0).length > 1 ? Math.max(0, segmentLength - 2) : segmentLength
              const segmentOffset = offset
              offset += segmentLength
              if (segmentLength === 0) return null

              return (
                <circle
                  key={`${item.codigo || item.nombre}-${index}`}
                  className="donut-segment"
                  style={{ '--stagger': index }}
                  cx="90"
                  cy="90"
                  r="58"
                  fill="none"
                  stroke={`var(${colors[index]})`}
                  strokeWidth="18"
                  strokeDasharray={`${visibleLength} ${circumference - visibleLength}`}
                  strokeDashoffset={-segmentOffset}
                  transform="rotate(-90 90 90)"
                />
              )
            })}
            <text
              x="90"
              y="88"
              textAnchor="middle"
              className="fill-[var(--heading)] text-3xl font-bold"
            >
              {shownTotal}
            </text>
            <text
              x="90"
              y="108"
              textAnchor="middle"
              className="fill-[var(--text-secondary)] text-xs"
            >
              Postulaciones
            </text>
          </svg>
          <ul className="grid w-full min-w-0 gap-2">
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
                      style={{ backgroundColor: `var(${colors[index]})` }}
                    />
                    <span className="break-words">{item.nombre ? withAccents(item.nombre) : labelFromCode(item.codigo)}</span>
                  </span>
                  <span className="shrink-0 text-right tabular-nums">
                    <strong>{value}</strong>
                    <span className="ml-2 text-xs text-[var(--text-muted)]">{percent}</span>
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

function LoadingDashboard() {
  return (
    <div className="space-y-4" role="status" aria-label="Cargando dashboard">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="skeleton h-28 rounded-xl" style={{ '--stagger': index }} />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="skeleton h-72 rounded-xl" style={{ '--stagger': index + 4 }} />
        ))}
      </div>
    </div>
  )
}

// Enlace a la siguiente acción, visible solo si el rol puede abrir esa pantalla.
// Orden de entrada: cabecera y total, los cuatro estados y luego las dos tarjetas con pestañas.
const ORDER = { header: 0, total: 1, metrics: 2, panels: 6, activity: 8 }

export default function DashboardPage() {
  const { user, hasPermission } = useContext(AuthContext) || {}
  const can = (permission) => hasPermission?.(permission) === true
  const [filters, setFilters] = useState({})
  const [data, setData] = useState(initial)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [revision, setRevision] = useState(0)
  const loadedOnce = useRef(false)
  const [dataVersion, setDataVersion] = useState(0)
  const [knownYears, setKnownYears] = useState([])
  // En el celular la distribución no cambia sola de pestaña: se elige tocando.
  const isPhone = useMediaQuery('(max-width: 767px)')

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    reportesService.obtenerDashboard(filters, controller.signal)
      .then((value) => {
        loadedOnce.current = true
        const next = { ...initial, ...value }
        setData(next)
        setDataVersion((version) => version + 1)
        // Los años con postulaciones se recuerdan para ofrecerlos en el filtro aunque se filtre por uno.
        setKnownYears((years) => [...new Set([...years, ...(next.tendencia || []).map((item) => Number(item.gestion)).filter(Boolean)])])
      })
      .catch((requestError) => {
        if (!requestError.canceled) setError(requestError)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [filters, revision])

  const distributionTabs = useMemo(() => [
    { id: 'modalidad', label: 'Modalidad', content: <DonutChart items={data.modalidades} /> },
    { id: 'etapa', label: 'Etapa', content: <StageColumns title="Postulaciones por etapa actual" items={data.etapas} /> },
    { id: 'estado', label: 'Estado', content: <StateStack title="Postulaciones por estado general" items={data.estados} /> },
    { id: 'gestion', label: 'Gestión', content: <YearBars title="Tendencia por gestión" items={data.tendencia} /> },
  ], [data])

  if (error?.status === 403) {
    return <ErrorState message="Acceso no autorizado al dashboard institucional." />
  }

  // El esqueleto solo aparece la primera vez. Al filtrar, los datos se quedan en pantalla
  // (atenuados) y los números y barras pasan del valor anterior al nuevo.
  const firstLoad = loading && !loadedOnce.current
  const refreshing = loading && loadedOnce.current
  const totalPostulaciones = Number(data.resumen.total_postulaciones) || 0
  const hasNoPostulaciones = !loading && !error && totalPostulaciones === 0

  const indicatorTabs = [
    { id: 'documentos', label: 'Documentos', content: <Indicator title="Documentos" data={data.documentos} /> },
    { id: 'defensas', label: 'Defensas', content: <Indicator title="Defensas" data={data.defensas} /> },
    { id: 'cierre', label: 'Cierre', content: <Indicator title="Cierre académico" data={data.cierre} /> },
  ]

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <Card className="dashboard-header animate-enter p-5" style={{ '--stagger': ORDER.header }}>
          <span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--surface-sunken)] text-[var(--heading)]">
            <LayoutDashboard className="h-[22px] w-[22px]" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-[var(--heading)]">Bienvenido, {firstName(user)}</h1>
            <p className="mt-0.5 text-sm text-[var(--text-secondary)]">Consulta el estado general de los procesos académicos.</p>
          </div>
          <ReportFilters layout="header" onApply={setFilters} gestiones={knownYears} />
        </Card>
        {firstLoad ? (
          <div className="skeleton min-h-28 rounded-xl" aria-hidden="true" />
        ) : (
          <MetricCard
            featured
            index={ORDER.total}
            label="Total postulaciones"
            value={error ? 0 : data.resumen.total_postulaciones}
          />
        )}
      </div>

      {error && <ErrorState message={error.message} onRetry={() => setRevision((value) => value + 1)} />}

      {firstLoad ? (
        <LoadingDashboard />
      ) : !error && (
        <div key={dataVersion} className={`dashboard-body space-y-4 ${refreshing ? 'is-refreshing' : ''}`} aria-busy={refreshing || undefined}>
          <section
            className="grid grid-cols-2 gap-3 xl:grid-cols-4"
            aria-label="Resumen de postulaciones"
            data-testid="dashboard-metrics"
          >
            <MetricCard compact index={ORDER.metrics} tone="info" icon={LoaderCircle} label="En proceso" value={data.resumen.en_proceso} total={totalPostulaciones} />
            <MetricCard compact index={ORDER.metrics + 1} tone="success" icon={CircleCheck} label="Concluidas" value={data.resumen.concluidas} total={totalPostulaciones} />
            <MetricCard compact index={ORDER.metrics + 2} tone="danger" icon={CircleX} label="Rechazadas" value={data.resumen.rechazadas} total={totalPostulaciones} />
            <MetricCard compact index={ORDER.metrics + 3} tone="warning" icon={CircleDashed} label="Sin etapa actual" value={data.resumen.sin_etapa_actual} total={totalPostulaciones} />
          </section>

          {hasNoPostulaciones && (
            <p
              className="animate-enter rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-4 text-center text-sm text-[var(--text-secondary)]"
              role="status"
            >
              No hay postulaciones para los filtros aplicados.
            </p>
          )}

          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="animate-enter flex h-full flex-col p-5" style={{ '--stagger': ORDER.panels }} data-testid="dashboard-distributions" aria-label="Distribuciones de postulaciones">
              <Tabs autoPlay={isPhone ? 0 : 5000} replayOnSelect className="flex flex-1 flex-col" panelClassName="tabs-panel--center" label="Ver la distribución por" tabs={distributionTabs} title={<h2 className="text-base font-semibold text-[var(--heading)]">Distribución</h2>} />
            </Card>
            <Card className="animate-enter flex h-full flex-col p-5" style={{ '--stagger': ORDER.panels + 1 }} aria-label="Indicadores operativos">
              <Tabs replayOnSelect label="Indicadores operativos" tabs={indicatorTabs} title={<h2 className="text-base font-semibold text-[var(--heading)]">Indicadores</h2>} />
              {can('puede_ver_documentos') && <div className="mt-auto flex justify-end pt-4"><ActionButton to="/documentos">Ver documentos</ActionButton></div>}
            </Card>
          </div>

          <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-[1fr_1.3fr_1fr]" aria-label="Actividad">
            <ProximasDefensas index={ORDER.activity} canOpen={can('puede_ver_postulaciones')} />
            <PostulacionesRecientes index={ORDER.activity + 1} canOpen={can('puede_ver_postulaciones')} />
            <PendientesRevision index={ORDER.activity + 2} canSeeDocuments={can('puede_ver_documentos')} canSeeApplications={can('puede_ver_postulaciones')} />
          </section>
        </div>
      )}
    </div>
  )
}

function Indicator({ title, data = {}, action = null }) {
  // Va dentro de una pestaña: sin tarjeta y con el título solo para lectores de pantalla.
  const entries = Object.entries(data)
  const metrics = entries.filter(([, value]) => !Array.isArray(value) && (value === null || typeof value !== 'object'))
  const collections = entries.filter(([, value]) => Array.isArray(value))

  return (
    <div className="flex flex-col gap-4">
      <h3 className="sr-only">{title}</h3>
      {metrics.length === 0 && collections.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">Sin datos disponibles.</p>
      ) : (
        <>
          {metrics.length > 0 && (
            <dl className="indicator-tiles">
              {metrics.map(([key, value], index) => (
                <div key={key} className="indicator-tile" style={{ '--i': Math.min(index, 8) }}>
                  <dt>{formatMetricLabel(key)}</dt>
                  <dd>{typeof value === 'number' || value === null ? <AnimatedNumber value={value ?? 0} /> : value}</dd>
                </div>
              ))}
            </dl>
          )}
          {collections.map(([key, items]) => (
            <section key={key} aria-label={formatMetricLabel(key)}>
              <h4 className="mb-2 text-sm font-semibold text-[var(--heading)]">{formatMetricLabel(key)}</h4>
              {items.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">Sin datos disponibles.</p>
              ) : (
                <div className="indicator-table">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>{Object.keys(items[0]).map((field) => <th key={field} scope="col">{formatMetricLabel(field)}</th>)}</tr>
                    </thead>
                    <tbody>
                      {items.map((item, itemIndex) => (
                        <tr key={`${key}-${itemIndex}`}>
                          {Object.entries(item).map(([field, value]) => <td key={field}>{formatMetricValue(field, value)}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}
        </>
      )}
      {action && <div className="pt-1">{action}</div>}
    </div>
  )
}
