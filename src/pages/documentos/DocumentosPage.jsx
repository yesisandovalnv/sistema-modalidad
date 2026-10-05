import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '../../components/ui/button'
import { DataState, PageHeader, Pager, SearchBar } from '../../components/crud/CrudShell'
import { crudService, endpoints, listAll } from '../../services/crudService'
import { postulacionesService } from '../../services/postulacionesService'
import { useAuth } from '../../hooks/useAuth'
import UploadDialog from '../../components/documentos/UploadDialog'
import DocumentDetailDialog from '../../components/documentos/DocumentDetailDialog'

const format = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? '—' : new Intl.DateTimeFormat('es-BO', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function formatApplicationLabel(application) {
  const student = application.estudiante_detalle || {}
  return [application.codigo, student.ru, student.nombre_completo].filter(Boolean).join(' - ')
}

export default function DocumentosPage() {
  const { hasPermission, roleCode } = useAuth()
  const isStudent = roleCode === 'ESTUDIANTE'
  const canManage = hasPermission('puede_cargar_documentos')
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState({ results: [] })
  const [types, setTypes] = useState([])
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [upload, setUpload] = useState(null)
  const [revision, setRevision] = useState(0)
  const [applicationId, setApplicationId] = useState('')
  const [applicableTypes, setApplicableTypes] = useState([])
  const [applicableLoading, setApplicableLoading] = useState(false)
  const [applicableError, setApplicableError] = useState('')
  const applicableController = useRef(null)
  const uploadController = useRef(null)

  const load = useCallback(async (signal) => {
    setLoading(true)
    setError('')
    try {
      const [rows, catalog, availableApplications] = await Promise.all([
        crudService.list(endpoints.documentos, { search, page }, signal),
        crudService.list(endpoints.tiposDocumento, { page_size: 100 }, signal),
        listAll(endpoints.postulaciones, { ordering: '-created_at' }, signal),
      ])
      setData(rows)
      setTypes(catalog.results || catalog)
      setApplications(availableApplications)
    } catch (requestError) {
      if (!requestError.canceled) setError(requestError.message)
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [search, page])

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [load, revision])

  useEffect(() => () => {
    applicableController.current?.abort()
    uploadController.current?.abort()
  }, [])

  const openUpload = () => {
    applicableController.current?.abort()
    setApplicationId('')
    setApplicableTypes([])
    setApplicableLoading(false)
    setApplicableError('')
    setUpload({ document: null, multiple: true, submitting: false, fields: {}, error: '', success: '' })
  }

  const closeUpload = () => {
    applicableController.current?.abort()
    applicableController.current = null
    uploadController.current?.abort()
    uploadController.current = null
    setUpload(null)
  }

  const loadApplicableTypes = async (selectedId) => {
    applicableController.current?.abort()
    setApplicationId(selectedId)
    setApplicableTypes([])
    setApplicableError('')
    if (!selectedId) return

    const controller = new AbortController()
    applicableController.current = controller
    setApplicableLoading(true)
    try {
      const response = await postulacionesService.obtenerDocumentosAplicables(selectedId, controller.signal)
      if (!controller.signal.aborted) setApplicableTypes(response.documentos_aplicables || [])
    } catch (requestError) {
      if (!requestError.canceled && !controller.signal.aborted) setApplicableError(requestError.message || 'No se pudieron cargar los documentos aplicables.')
    } finally {
      if (!controller.signal.aborted) setApplicableLoading(false)
    }
  }

  const selectApplication = (event) => loadApplicableTypes(event.target.value)

  useEffect(() => {
    if (!upload || !isStudent || loading || applications.length !== 1 || applicationId) return
    loadApplicableTypes(String(applications[0].id))
  }, [upload, isStudent, loading, applications, applicationId])

  const submitMultipleUpload = async (entries) => {
    if (!applicationId || !Array.isArray(entries) || entries.length === 0) {
      return { total: 0, successCount: 0, failureCount: 0, items: [], summary: 'No hay documentos seleccionados.' }
    }
    const controller = new AbortController()
    uploadController.current?.abort()
    uploadController.current = controller
    const results = []
    setUpload((current) => ({ ...current, submitting: true, error: '', success: '' }))

    for (const entry of entries) {
      if (controller.signal.aborted) break
      try {
        await postulacionesService.cargarDocumento({
          postulacionId: applicationId,
          tipoDocumentoId: entry.tipo_documento_id,
          archivo: entry.archivo,
          eventoDefensaId: entry.evento_defensa_id,
        }, controller.signal)
        results.push({ ...entry, status: 'success', message: 'Cargado' })
      } catch (requestError) {
        if (controller.signal.aborted || requestError.canceled) break
        results.push({ ...entry, status: 'error', message: requestError.message || 'No se pudo cargar este documento.' })
      }
    }

    const successCount = results.filter((item) => item.status === 'success').length
    const failureCount = results.length - successCount
    const summary = failureCount === 0
      ? `${successCount} documento${successCount === 1 ? '' : 's'} cargado${successCount === 1 ? '' : 's'} correctamente.`
      : `${successCount} documento${successCount === 1 ? '' : 's'} cargado${successCount === 1 ? '' : 's'}. ${failureCount} documento${failureCount === 1 ? '' : 's'} no pudo${failureCount === 1 ? '' : 'ieron'} cargarse.`
    if (controller.signal.aborted) {
      return { total: results.length, successCount, failureCount, items: results, summary: '', canceled: true }
    }
    setUpload((current) => current ? { ...current, submitting: false, success: summary } : current)
    if (successCount > 0) setRevision((value) => value + 1)
    return { total: results.length, successCount, failureCount, items: results, summary }
  }

  const typeName = (item) => item.tipo_documento_nombre || types.find((type) => type.id === item.tipo_documento)?.nombre || item.tipo_documento
  const applicationsById = Object.fromEntries(applications.map((application) => [application.id, application]))
  const applicationFor = (item) => applicationsById[item.postulacion]
  const applicationCode = (item) => applicationFor(item)?.codigo || 'Postulación no disponible'
  const applicationModality = (item) => applicationFor(item)?.modalidad_detalle?.nombre || 'Modalidad no disponible'
  const applicationStudent = (item) => applicationFor(item)?.estudiante_detalle?.nombre_completo || 'Estudiante no disponible'
  const uploadableTypes = applicableTypes.filter((type) => type.capacidad_carga?.permitida === true)
  return <section className="mx-auto max-w-6xl space-y-5">
    <PageHeader title={isStudent ? 'Mis documentos' : 'Documentos'} description={isStudent ? 'Consulta el estado, las observaciones y las versiones de los documentos de tu proceso académico.' : 'Consulta y gestiona los documentos de las postulaciones.'} action={canManage ? <Button onClick={openUpload}>Subir documento</Button> : null} />
    <SearchBar value={query} onChange={setQuery} onSearch={() => { setSearch(query.trim()); setPage(1) }} />
    <DataState loading={loading} error={error} empty={!data.results?.length} onRetry={() => setRevision((value) => value + 1)}>
      <div className="overflow-x-auto rounded-xl border"><table className="w-full min-w-[750px] text-left text-sm"><thead className="bg-slate-100 dark:bg-slate-800"><tr><th className="p-3">Postulación</th><th className="p-3">Documento</th><th className="p-3">Estado</th><th className="p-3">Fecha</th><th className="p-3">Corrección</th><th className="p-3">Acciones</th></tr></thead><tbody>{data.results?.map((item) => <tr key={item.id} className="border-t align-top dark:border-slate-800"><td className="p-3"><p className="font-semibold">{applicationCode(item)}</p>{!isStudent && <p className="text-slate-600 dark:text-slate-300">{applicationStudent(item)}</p>}<p className="text-xs text-slate-500">{applicationModality(item)}</p></td><td className="p-3 font-medium">{typeName(item)}</td><td className="p-3">{item.estado_nombre || 'Estado no disponible'}</td><td className="p-3">{format(item.fecha_subida)}</td><td className="p-3">{item.requiere_correccion ? 'Requiere corrección' : 'No requerida'}</td><td className="p-3"><Button variant="secondary" onClick={() => setSelected(item)}>Detalle</Button></td></tr>)}</tbody></table><Pager data={data} page={page} onPage={setPage} /></div>
    </DataState>
    {selected && <DocumentDetailDialog document={selected} onClose={() => setSelected(null)} />}
    {upload && <UploadDialog key={applicationId || 'sin-postulacion'} upload={upload} types={{ data: uploadableTypes, loading: applicableLoading, error: applicableError }} postulacion={applicationId} isHistorical={false} beforeFields={<>{(!isStudent || applications.length > 1) && <label className="text-sm">Postulación<select required value={applicationId} onChange={selectApplication} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-950"><option value="">Seleccione</option>{applications.map((application) => <option key={application.id} value={application.id}>{formatApplicationLabel(application)}</option>)}</select></label>}{isStudent && !loading && applications.length === 0 && <p className="text-sm text-slate-500">No existe una postulación disponible para subir documentos.</p>}{applicationId && !applicableLoading && !applicableError && applicableTypes.length > 0 && uploadableTypes.length === 0 && <p role="status" className="text-sm text-slate-600">No tienes documentos pendientes de carga o corrección.</p>}</>} onMultipleSubmit={submitMultipleUpload} onClose={closeUpload} />}
  </section>
}
