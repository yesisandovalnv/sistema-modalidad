import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageHeader, DataState } from '../../components/crud/CrudShell'
import { Card } from '../../components/ui/card'
import { postulacionesService } from '../../services/postulacionesService'
import { formatPeriodoLabel, formatStudentLabel } from './postulacionFormatters'

const EMPTY = 'No registrado'

export default function ExpedientePage() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)

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

  if (loading || error || !data) {
    return (
      <section className="mx-auto max-w-5xl space-y-5">
        <PageHeader title="Expediente de Proyecto de Grado" description="Resumen técnico de la postulación." />
        <DataState loading={loading} error={error} empty={!loading && !error && !data} onRetry={() => setRevision((value) => value + 1)} />
        <BackLink />
      </section>
    )
  }

  const { detalle, flujo } = data
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

      <Card role="note" className="border-amber-300 bg-amber-50 dark:bg-amber-950">
        <h2 className="font-bold">Alcance de este expediente</h2>
        <p className="mt-2 text-sm">
          Los estados y la macroetapa mostrados son registros técnicos del sistema. No sustituyen actas,
          designaciones, aprobaciones ni otros actos administrativos o institucionales.
        </p>
      </Card>
    </section>
  )
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
