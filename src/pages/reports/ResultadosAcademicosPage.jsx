import { useEffect, useRef, useState } from 'react'
import { Download, Printer } from 'lucide-react'
import { reportesService } from '../../services/reportesService'
import { useAuth } from '../../hooks/useAuth'
import { EmptyState, ErrorState, Pagination } from '../../components/reports/ReportComponents'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { formatCodeLabel } from '../../lib/utils'
import { printHtmlBlob } from '../../lib/printHtmlBlob'

const emptyFilters = { buscar: '', gestion: '', semestre: '', modalidad: '', estado_administrativo: '' }
const emptyPage = { count: 0, next: null, previous: null, results: [] }
const fieldClass = 'h-10 min-w-0 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950'
const academicResultLabels = {
  POSTERGADO: 'Postergado',
  APROBADO: 'Aprobado',
  APROBACION_PLENA: 'Aprobación plena',
  APROBACION_PLENA_CON_FELICITACION: 'Aprobación plena con felicitación',
  BUENO: 'Bueno',
  MUY_BUENO: 'Muy Bueno',
  EXCELENTE: 'Excelente',
  FAVORABLE: 'Favorable',
  DESFAVORABLE: 'Desfavorable',
}

function AcademicValue({ result }) {
  if (result.semantica_valor_numerico === 'CALIFICACION_FINAL' && result.nota_final != null) {
    return <span className="font-semibold tabular-nums">{result.nota_final}</span>
  }
  if (result.semantica_valor_numerico === 'PROMEDIO_ACADEMICO' && result.promedio_academico != null) {
    return <span className="font-semibold tabular-nums">{result.promedio_academico}</span>
  }
  return <span className="text-slate-500">—</span>
}

function ResultSummary({ result }) {
  const canonicalResult = result.clasificacion || result.resultado
  if (!result.definitivo || !canonicalResult) return <span className="text-slate-500">Sin resultado</span>
  return academicResultLabels[canonicalResult] || formatCodeLabel(canonicalResult)
}

function ResultFilters({ modalidades, estados, onApply }) {
  const [draft, setDraft] = useState(emptyFilters)
  const set = (key) => (event) => setDraft((current) => ({ ...current, [key]: event.target.value }))
  return <form className="app-filter-panel rounded-xl border p-4" onSubmit={(event) => { event.preventDefault(); onApply(draft) }}>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <label className="grid gap-1 text-sm">Buscar<input className={fieldClass} value={draft.buscar} onChange={set('buscar')} placeholder="Código, nombre, username o RU" /></label>
      <label className="grid gap-1 text-sm">Gestión<input className={fieldClass} type="number" min="1900" max="2200" value={draft.gestion} onChange={set('gestion')} placeholder="2026" /></label>
      <label className="grid gap-1 text-sm">Semestre<select className={fieldClass} value={draft.semestre} onChange={set('semestre')}><option value="">Todos</option><option value="I">Primero</option><option value="II">Segundo</option></select></label>
      <label className="grid gap-1 text-sm">Modalidad<select className={fieldClass} value={draft.modalidad} onChange={set('modalidad')}><option value="">Todas</option>{modalidades.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label>
      <label className="grid gap-1 text-sm">Estado administrativo<select className={fieldClass} value={draft.estado_administrativo} onChange={set('estado_administrativo')}><option value="">Todos</option>{estados.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label>
    </div>
    <div className="mt-4 flex flex-wrap gap-2"><Button type="submit">Aplicar filtros</Button><Button type="button" variant="outline" onClick={() => { setDraft(emptyFilters); onApply(emptyFilters) }}>Limpiar filtros</Button></div>
  </form>
}

export default function ResultadosAcademicosPage() {
  const { hasPermission } = useAuth()
  const [filters, setFilters] = useState(emptyFilters)
  const [page, setPage] = useState(1)
  const [data, setData] = useState(emptyPage)
  const [catalogs, setCatalogs] = useState({ modalidades: [], estados: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [exporting, setExporting] = useState('')
  const [exportError, setExportError] = useState('')
  const [retry, setRetry] = useState(0)
  const printController = useRef(null)

  const exportExcel = async () => {
    if (exporting) return
    setExporting('xlsx')
    setExportError('')
    try {
      const { blob, filename } = await reportesService.exportarResultadosAcademicosXLSX(filters)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (exportRequestError) {
      setExportError(exportRequestError.message)
    } finally {
      setExporting('')
    }
  }

  const printReport = async () => {
    if (exporting) return
    printController.current?.abort()
    const controller = new AbortController()
    printController.current = controller
    setExporting('html')
    setExportError('')
    try {
      const blob = await reportesService.imprimirResultadosAcademicos(filters)
      await printHtmlBlob(blob, { title: 'Impresion temporal de resultados academicos', signal: controller.signal })
    } catch (exportRequestError) {
      if (exportRequestError.name !== 'AbortError') setExportError(exportRequestError.message)
    } finally {
      if (printController.current === controller) {
        printController.current = null
        setExporting('')
      }
    }
  }

  useEffect(() => () => printController.current?.abort(), [])

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([reportesService.obtenerModalidades(controller.signal), reportesService.obtenerEstadosPostulacion(controller.signal)])
      .then(([modalidades, estados]) => setCatalogs({ modalidades, estados }))
      .catch(() => {})
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError(null); setData(emptyPage)
    reportesService.obtenerResultados({ ...filters, page, page_size: 20 }, controller.signal)
      .then(setData)
      .catch((requestError) => { if (!requestError.canceled) setError(requestError) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [filters, page, retry])

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-sky-700">Consulta institucional</p><h1 className="text-3xl font-bold">Resultados académicos</h1><p className="text-slate-500">Consulta institucional de resultados académicos por modalidad y periodo.</p></div>{hasPermission('puede_exportar_reportes') && <div className="flex flex-wrap gap-2"><Button onClick={printReport} disabled={Boolean(exporting)} className="gap-2"><Printer className="h-4 w-4" />{exporting === 'html' ? 'Preparando…' : 'Imprimir'}</Button><Button onClick={exportExcel} disabled={Boolean(exporting)} variant="secondary" className="gap-2"><Download className="h-4 w-4" />{exporting === 'xlsx' ? 'Exportando…' : 'Excel'}</Button></div>}</div>
    <ResultFilters modalidades={catalogs.modalidades} estados={catalogs.estados} onApply={(next) => { setFilters(next); setPage(1) }} />
    {exportError && <p role="alert" className="text-sm text-red-600">{exportError} Aplique más filtros si se superó el límite.</p>}
    {error && <ErrorState message={error.message} onRetry={() => setRetry((value) => value + 1)} />}
    <Card className="overflow-hidden p-0">
      {loading ? <div className="p-10 text-center" role="status">Cargando resultados académicos…</div>
        : error ? null
          : data.results.length === 0 ? <EmptyState>No se encontraron resultados académicos con los filtros aplicados.</EmptyState>
            : <><div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-slate-100 dark:bg-slate-800"><tr>{['Estudiante', 'RU', 'Modalidad', 'Periodo', 'Estado', 'Valor académico', 'Resultado académico'].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody>{data.results.map((row) => <tr key={row.postulacion_id} className="border-t border-slate-200 align-top dark:border-slate-800"><td className="px-4 py-3 font-medium"><span className="block">{row.estudiante?.nombre || 'Sin nombre'}</span><span className="text-xs text-slate-500">{row.postulacion_codigo}</span></td><td className="px-4 py-3">{row.estudiante?.ru || '—'}</td><td className="px-4 py-3">{row.modalidad?.nombre || 'Sin modalidad'}</td><td className="px-4 py-3">{row.gestion} · {row.semestre}</td><td className="px-4 py-3">{row.estado_administrativo?.nombre || formatCodeLabel(row.estado_administrativo?.codigo) || 'Sin estado'}</td><td className="px-4 py-3"><AcademicValue result={row.resultado_academico} /></td><td className="px-4 py-3"><ResultSummary result={row.resultado_academico} /></td></tr>)}</tbody></table></div><Pagination count={data.count} page={page} hasNext={Boolean(data.next)} hasPrevious={Boolean(data.previous)} onPage={setPage} /></>}
    </Card>
  </div>
}
