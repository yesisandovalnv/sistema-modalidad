import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageHeader, DataState } from '../../components/crud/CrudShell'
import { Card } from '../../components/ui/card'
import { Pagination } from '../../components/reports/ReportComponents'
import { postulacionesService } from '../../services/postulacionesService'
import { formatPeriodoLabel, formatStudentLabel } from './postulacionFormatters'

const EMPTY = 'No registrado'
const CONTRACT_WARNINGS = [
  'La aprobación y originalidad del tema no están certificadas automáticamente por el sistema.',
  'La defensa privada representa el 30 %, pero la normativa disponible no define una nota numérica reproducible para calcular ese aporte.',
  'La clasificación final institucional permanece pendiente.',
  'La cantidad oficial de ejemplares permanece pendiente de validación institucional.',
  'Los proyectos grupales no están soportados actualmente.',
  'Los plazos reglamentarios no se calculan automáticamente.',
  'El cierre técnico o documental no equivale a legalización o cierre universitario oficial.',
]

export default function ExpedientePage() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [history, setHistory] = useState({ data: null, loading: true, error: '' })
  const [historyRevision, setHistoryRevision] = useState(0)
  const [historyView, setHistoryView] = useState({ id: null, page: 1 })
  const historyPage = String(historyView.id) === String(id) ? historyView.page : 1

  const load = useCallback(async (signal) => {
    setData(null)
    setLoading(true)
    setError('')
    try {
      setData(await postulacionesService.obtenerExpediente(id, signal))
    } catch (requestError) {
      if (!requestError.canceled) setError(requestError.message)
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [id])

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [load, revision])

  useEffect(() => {
    const controller = new AbortController()
    setHistory({ data: null, loading: true, error: '' })
    postulacionesService.obtenerHistorial(id, historyPage, controller.signal)
      .then((historyData) => setHistory({ data: historyData, loading: false, error: '' }))
      .catch((requestError) => {
        if (!requestError.canceled) setHistory({ data: null, loading: false, error: requestError.message })
      })
    return () => controller.abort()
  }, [id, historyPage, historyRevision])

  if (loading || error || !data) {
    return (
      <section className="mx-auto max-w-5xl space-y-5">
        <PageHeader title="Expediente de Proyecto de Grado" description="Resumen técnico de la postulación." />
        <DataState loading={loading} error={error} empty={!loading && !error && !data} onRetry={() => setRevision((value) => value + 1)} />
        <BackLink />
      </section>
    )
  }

  const { detalle, flujo, resultado, cierre } = data
  const student = detalle.estudiante_detalle
  const period = detalle.periodo_detalle
  const currentStage = flujo.etapa_actual
  const progress = flujo.porcentaje_avance === null || flujo.porcentaje_avance === undefined
    ? null
    : Number(flujo.porcentaje_avance)
  const safeProgress = progress !== null && Number.isFinite(progress)
    ? Math.min(100, Math.max(0, progress))
    : null

  return (
    <section className="mx-auto max-w-5xl space-y-5">
      <PageHeader
        title="Expediente de Proyecto de Grado"
        description={`Postulación ${detalle.codigo || EMPTY}`}
        action={<BackLink />}
      />

      <Card>
        <h2 className="text-xl font-bold">Resumen técnico</h2>
        <dl className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Info label="Código" value={detalle.codigo} />
          <Info label="Estudiante" value={student ? formatStudentLabel(student) : EMPTY} />
          <Info label="Modalidad" value={detalle.modalidad_detalle?.nombre || flujo.modalidad?.nombre} />
          <Info label="Gestión y semestre" value={period ? formatPeriodoLabel(period) : EMPTY} />
          <Info label="Estado técnico general" value={detalle.estado_actual_detalle?.nombre} />
          <Info label="Macroetapa técnica actual" value={currentStage?.nombre} />
        </dl>

        <div className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-800">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="font-semibold">Avance del macroflujo</span>
            <span>{safeProgress === null ? EMPTY : `${safeProgress}%`}</span>
          </div>
          {safeProgress !== null && (
            <progress className="mt-2 h-3 w-full" max="100" value={safeProgress} aria-label="Avance del macroflujo">
              {safeProgress}%
            </progress>
          )}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <h2 className="text-xl font-bold">Resultado académico técnico</h2>
        {resultado.error ? <PartialState message={resultado.error} onRetry={() => setRevision((value) => value + 1)} /> : (
          <dl className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Info label="Nota pública" value={resultado.data?.nota_publica} />
            <Info label="Aporte público" value={resultado.data?.aporte_publica} />
            <Info label="Resultado cualitativo" value={resultado.data?.resultado} />
            <Info label="Nota final" value={resultado.data?.nota_final ?? 'Pendiente de definición institucional'} />
          </dl>
        )}
        {resultado.data?.limitacion_normativa && <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">{resultado.data.limitacion_normativa}</p>}
      </Card>

      <Card role="note" aria-labelledby="limites-normativos" className="overflow-hidden border-amber-300 bg-amber-50 dark:bg-amber-950">
        <h2 id="limites-normativos" className="text-xl font-bold">Límites normativos</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm">
          {CONTRACT_WARNINGS.map((warning) => <li key={warning}>{warning}</li>)}
          {(cierre.data?.advertencias_normativas || []).map((warning) => <li key={`backend-${warning}`}>{warning}</li>)}
        </ul>
      </Card>

      <Card className="overflow-hidden">
        <h2 className="text-xl font-bold">Estado técnico de cierre</h2>
        {cierre.error ? <PartialState message={cierre.error} onRetry={() => setRevision((value) => value + 1)} /> : <ClosureState cierre={cierre.data} />}
      </Card>

      <HistoryCard
        history={history}
        page={historyPage}
        onPage={(page) => setHistoryView({ id, page })}
        onRetry={() => setHistoryRevision((value) => value + 1)}
      />
    </section>
  )
}

function HistoryCard({ history, page, onPage, onRetry }) {
  const rows = history.data?.results || []
  return (
    <Card className="overflow-hidden" aria-labelledby="historial-title">
      <h2 id="historial-title" className="text-xl font-bold">Historial</h2>
      <p className="mt-1 text-sm text-slate-500">Trazabilidad técnica de cambios de estado.</p>
      {history.loading && <p role="status" className="mt-4 text-sm">Cargando historial…</p>}
      {history.error && <div role="alert" className="mt-4"><p>{history.error}</p><button className="mt-3 rounded-md border px-3 py-2 font-medium" onClick={onRetry}>Reintentar historial</button></div>}
      {!history.loading && !history.error && rows.length === 0 && <p className="mt-4 text-sm text-slate-500">No se registraron cambios de estado.</p>}
      {!history.loading && !history.error && rows.length > 0 && (
        <>
          <ol className="mt-5 space-y-4">
            {rows.map((item) => <HistoryItem key={item.id} item={item} />)}
          </ol>
          <Pagination
            count={history.data.count}
            page={page}
            hasNext={Boolean(history.data.next)}
            hasPrevious={Boolean(history.data.previous)}
            onPage={onPage}
          />
        </>
      )}
    </Card>
  )
}

function HistoryItem({ item }) {
  return (
    <li className="min-w-0 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
      <p className="font-semibold break-words">{item.estado_anterior_nombre || 'Estado inicial'} → {item.estado_nuevo_nombre || 'No registrado'}</p>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
        <Info label="Fecha" value={formatHistoryDate(item.fecha_cambio)} />
        <Info label="Actor" value={item.actor_nombre || 'Sistema'} />
      </dl>
      <p className="mt-3 break-words text-sm">{item.comentario?.trim() || 'Sin comentario'}</p>
    </li>
  )
}

function formatHistoryDate(value) {
  if (!value) return 'No registrada'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'No registrada' : date.toLocaleString('es-BO')
}

function PartialState({ message, onRetry }) {
  return <div role="status" className="mt-4 rounded-lg border border-slate-200 p-4 text-sm dark:border-slate-700"><p>{message}</p><button className="mt-3 rounded-md border px-3 py-2 font-medium" onClick={onRetry}>Reintentar</button></div>
}

function ClosureState({ cierre }) {
  const groups = [
    ['Condiciones faltantes', cierre?.condiciones_faltantes],
    ['Entregas faltantes', cierre?.entregas_faltantes],
    ['Documentos faltantes', cierre?.documentos_faltantes],
  ].filter(([, items]) => items?.length)
  return groups.length ? <div className="mt-4 space-y-4">{groups.map(([label, items]) => <section key={label}><h3 className="font-semibold">{label}</h3><ul className="mt-2 list-disc pl-5 text-sm">{items.map((item) => <li key={String(item)}>{String(item)}</li>)}</ul></section>)}</div> : <p className="mt-4 text-sm">No se informaron faltantes de cierre técnico.</p>
}

function Info({ label, value }) {
  return <div><dt className="text-sm text-slate-500">{label}</dt><dd className="mt-1 font-medium">{value || EMPTY}</dd></div>
}

function BackLink() {
  return (
    <Link className="inline-flex items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:hover:bg-slate-800" to="/postulantes">
      Volver a postulaciones
    </Link>
  )
}
