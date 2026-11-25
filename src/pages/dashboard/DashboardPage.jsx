import { useContext, useEffect, useId, useState } from 'react'
import {
  Activity,
  ClipboardCheck,
  FileCheck2,
  Files,
  GraduationCap,
  ListTodo,
  ShieldCheck,
} from 'lucide-react'
import { reportesService } from '../../services/reportesService'
import { ReportFilters } from '../../components/reports/ReportFilters'
import { DistributionList, ErrorState } from '../../components/reports/ReportComponents'
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

const numberFormatter = new Intl.NumberFormat('es-BO')
const donutColors = ['--primary', '--success', '--evaluation', '--warning', '--danger', '--document']
const DONUT_MAX_CATEGORIES = donutColors.length
const percentFormatter = new Intl.NumberFormat('es-BO', { maximumFractionDigits: 1 })
const defenseTypes = [
  { key: 'DEFENSA_PERFIL', label: 'Defensa de perfil', color: 'var(--primary)' },
  { key: 'DEFENSA_PRIVADA', label: 'Defensa privada', color: 'var(--evaluation)' },
  { key: 'DEFENSA_PUBLICA', label: 'Defensa pública', color: 'var(--success)' },
]

function firstName(user) {
  const value = [user?.nombres, user?.nombre_completo, user?.nombre, user?.username]
    .find((candidate) => String(candidate || '').trim())
  return String(value || 'Usuario').trim().split(/\s+/)[0]
}

function displayNumber(value) {
  return numberFormatter.format(Number(value) || 0)
}

function KpiCard({ icon: Icon, label, value, tone }) {
  return (
    <Card className="group flex min-w-0 items-center gap-4 p-4 transition-transform duration-200 hover:-translate-y-0.5 sm:p-5">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ color: tone, backgroundColor: `color-mix(in srgb, ${tone} 12%, transparent)` }}>
        <Icon className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-[var(--text-secondary)] sm:text-sm">{label}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums text-[var(--text-primary)] sm:text-3xl">{displayNumber(value)}</p>
      </div>
    </Card>
  )
}

function PanelHeading({ eyebrow, title, detail }) {
  return (
    <div>
      {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">{eyebrow}</p>}
      <h2 className="mt-1 text-base font-semibold tracking-tight text-[var(--text-primary)] sm:text-lg">{title}</h2>
      {detail && <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{detail}</p>}
    </div>
  )
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



function DefenseTypeChart({ defenses = {} }) {
  const counts = defenseTypes.map((type) => ({
    ...type,
    value: (defenses.por_tipo || []).filter((item) => item.tipo_evento === type.key)
      .reduce((sum, item) => sum + (Number(item.total) || 0), 0),
  }))
  const max = Math.max(1, ...counts.map((item) => item.value))

  return (
    <Card className="h-full p-5 sm:p-6">
      <PanelHeading eyebrow="Seguimiento" title="Defensas por tipo" detail="Eventos registrados en el periodo y filtros aplicados." />
      <ul className="mt-6 space-y-5">
        {counts.map((item) => (
          <li key={item.key}>
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="text-[var(--text-secondary)]">{item.label}</span>
              <strong className="tabular-nums text-[var(--text-primary)]">{displayNumber(item.value)}</strong>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[var(--surface-secondary)]" role="img" aria-label={`${item.label}: ${displayNumber(item.value)}`} title={`${item.label}: ${displayNumber(item.value)}`}>
              <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${(item.value / max) * 100}%`, backgroundColor: item.color }}>
                <span className="sr-only">{displayNumber(item.value)}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function ClosureChart({ closure = {} }) {
  const values = [
    { label: 'Revisión final aprobada', value: closure.revision_final_aprobada, color: 'var(--primary)' },
    { label: 'Cierre documental aprobado', value: closure.cierre_documental_aprobado, color: 'var(--evaluation)' },
    { label: 'Cierres concluidos', value: closure.concluidas, color: 'var(--success)' },
    { label: 'Condiciones pendientes', value: closure.condiciones_pendientes, color: 'var(--warning)' },
  ]
  const max = Math.max(1, ...values.map((item) => Number(item.value) || 0))

  return (
    <Card className="h-full p-5 sm:p-6">
      <PanelHeading eyebrow="Cierre académico" title="Avance de cierre" detail="Aprobaciones, conclusión y condiciones pendientes." />
      <ul className="mt-6 space-y-4">
        {values.map((item) => {
          const value = Number(item.value) || 0
          return (
            <li key={item.label}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 text-[var(--text-secondary)]">{item.label}</span>
                <strong className="shrink-0 tabular-nums text-[var(--text-primary)]">{displayNumber(value)}</strong>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-secondary)]" role="img" aria-label={`${item.label}: ${displayNumber(value)}`} title={`${item.label}: ${displayNumber(value)}`}>
                <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${(value / max) * 100}%`, backgroundColor: item.color }} />
              </div>
            </li>
          )
        })}
      </ul>
      <p className="mt-4 border-t border-[var(--border)] pt-3 text-xs text-[var(--text-secondary)]">
        Entregas pendientes: <strong className="tabular-nums text-[var(--text-primary)]">{displayNumber(closure.entregas_pendientes)}</strong>
      </p>
    </Card>
  )
}

function TrendChart({ items = [] }) {
  if (items.length < 2) return null
  const values = items.map((item) => ({ label: item.gestion, value: Number(item.total) || 0 }))
  const max = Math.max(1, ...values.map((item) => item.value))

  return (
    <Card className="p-5 sm:p-6">
      <PanelHeading eyebrow="Histórico disponible" title="Postulaciones por gestión" detail="Evolución según los periodos devueltos por el sistema." />
      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {values.map((item) => (
          <li key={item.label}>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-[var(--text-secondary)]">Gestión {item.label}</span>
              <strong className="tabular-nums text-[var(--text-primary)]">{displayNumber(item.value)}</strong>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[var(--surface-secondary)]" role="img" aria-label={`Gestión ${item.label}: ${displayNumber(item.value)}`} title={`Gestión ${item.label}: ${displayNumber(item.value)}`}>
              <div className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-500" style={{ width: `${(item.value / max) * 100}%` }}>
                <span className="sr-only">{displayNumber(item.value)}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function LoadingDashboard() {
  return (
    <div className="space-y-5" role="status" aria-label="Cargando dashboard">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-24 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />)}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-72 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />)}
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

  if (error?.status === 403) return <ErrorState message="Acceso no autorizado al dashboard institucional." />

  const documents = data.documentos || {}
  const defenses = data.defensas || {}
  const closure = data.cierre || {}
  const totalPostulaciones = Number(data.resumen.total_postulaciones) || 0
  const hasNoPostulaciones = !loading && !error && totalPostulaciones === 0

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 pb-6 sm:space-y-6">
      <header className="flex flex-col justify-between gap-4 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">Sistema institucional</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">Panel de control</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Bienvenido, {firstName(user)}. Resumen de los procesos académicos.</p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
          <Activity className="h-3.5 w-3.5 text-[var(--primary)]" aria-hidden="true" /> Datos según filtros aplicados
        </span>
      </header>

      <ReportFilters onApply={setFilters} />
      {error && <ErrorState message={error.message} onRetry={() => setRevision((value) => value + 1)} />}

      {loading ? <LoadingDashboard /> : !error && (
        <div className="space-y-5 sm:space-y-6">
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6" aria-label="Indicadores principales" data-testid="dashboard-metrics">
            <KpiCard icon={Files} label="Documentos registrados" value={documents.total} tone="var(--document)" />
            <KpiCard icon={FileCheck2} label="Documentos aprobados" value={documents.aprobados} tone="var(--success)" />
            <KpiCard icon={ShieldCheck} label="Defensas finalizadas" value={defenses.finalizadas} tone="var(--primary)" />
            <KpiCard icon={ClipboardCheck} label="Evaluaciones consolidadas" value={defenses.evaluaciones_consolidadas} tone="var(--evaluation)" />
            <KpiCard icon={GraduationCap} label="Cierres académicos concluidos" value={closure.concluidas} tone="var(--delivery)" />
            <KpiCard icon={ListTodo} label="Condiciones pendientes" value={closure.condiciones_pendientes} tone="var(--warning)" />
          </section>

          {hasNoPostulaciones && (
            <p className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-4 text-center text-sm text-[var(--text-secondary)]" role="status">
              No hay postulaciones para los filtros aplicados.
            </p>
          )}

          <section className="grid gap-4 xl:grid-cols-3" aria-label="Visualizaciones institucionales" data-testid="dashboard-charts">
            <DonutChart items={data.modalidades || []} />
            <DefenseTypeChart defenses={defenses} />
            <ClosureChart closure={closure} />
          </section>
          {data.tendencia?.length >= 2 && <section aria-label="Evolución histórica" data-testid="dashboard-trend"><TrendChart items={data.tendencia} /></section>}
        </div>
      )}
    </div>
  )
}
