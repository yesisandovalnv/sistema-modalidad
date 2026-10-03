import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { DataState, Field, Modal, PageHeader, Pager, SearchBar } from '../../components/crud/CrudShell'
import { crudService, endpoints, listAll } from '../../services/crudService'
import { useAuth } from '../../hooks/useAuth'
import apiClient from '../../services/api'
import { formatCodeLabel } from '../../lib/utils'
import { formatPeriodoLabel, formatStudentLabel } from './postulacionFormatters'
import { postulacionesService } from '../../services/postulacionesService'

const emptyForm = { codigo: '', estudiante: '', modalidad: '', periodo: '', observaciones_generales: '', tipo_registro: 'SEGUIMIENTO' }
const duplicateCodeMessage = 'El código ingresado ya se encuentra registrado en otra postulación. Por favor, ingrese un código diferente.'

const humanizeTipoRegistro = (value) => {
  if (value === 'HISTORICO') return 'Registro histórico'
  return 'Proceso con seguimiento'
}

export default function PostulantesPage() {
  const { hasPermission } = useAuth()
  const canManage = hasPermission('puede_gestionar_postulaciones')
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState({ results: [] })
  const [catalogs, setCatalogs] = useState({ modalidades: [], periodos: [], estudiantes: [], capacidades: {} })
  const [eligibleStudents, setEligibleStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [catalogError, setCatalogError] = useState('')
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [academicDetail, setAcademicDetail] = useState(null)
  const [detailRevision, setDetailRevision] = useState(0)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [studentQuery, setStudentQuery] = useState('')
  const [revision, setRevision] = useState(0)
  const historicalTypesController = useRef(null)
  const [historicalProfile, setHistoricalProfile] = useState(null)
  const [historicalUploadOpen, setHistoricalUploadOpen] = useState(false)
  const [historicalTypes, setHistoricalTypes] = useState([])
  const [historicalTypeId, setHistoricalTypeId] = useState('')
  const [historicalTypeLoading, setHistoricalTypeLoading] = useState(false)
  const [historicalTypeError, setHistoricalTypeError] = useState('')
  const [historicalUploadError, setHistoricalUploadError] = useState('')
  const [historicalUploading, setHistoricalUploading] = useState(false)
  const [historicalFile, setHistoricalFile] = useState(null)
  const [historicalSuccessMessage, setHistoricalSuccessMessage] = useState('')

  const load = useCallback(async (signal) => {
    setLoading(true)
    setError('')
    setCatalogError('')

    try {
      const rows = await crudService.list(
        endpoints.postulaciones,
        { search, page, ordering: '-created_at' },
        signal,
      )
      setData(rows)
    } catch (requestError) {
      if (!requestError.canceled) {
        setError(requestError.status === 403
          ? 'No tienes permiso para gestionar postulaciones.'
          : requestError.message)
      }
    }

    if (canManage && !signal?.aborted) {
      try {
        const [modalidades, periodos, estudiantes] = await Promise.all([
          listAll(endpoints.modalidades, { activo: true, ordering: 'nombre' }, signal),
          listAll(endpoints.periodos, { activo: true, ordering: '-gestion,-semestre' }, signal),
          listAll(endpoints.estudiantes, { ordering: 'apellido_paterno' }, signal),
        ])
        const capacidadesList = await Promise.all(
          modalidades.map((modalidad) => postulacionesService.obtenerCapacidadesModalidad(modalidad.id, signal)),
        )
        const capacidades = Object.fromEntries(
          modalidades.map((modalidad, index) => [modalidad.id, capacidadesList[index]]),
        )
        setCatalogs({ modalidades, periodos, estudiantes, capacidades })
        setEligibleStudents(estudiantes)
      } catch (requestError) {
        if (!requestError.canceled) {
          setCatalogError(requestError.status === 403
            ? 'No tienes permiso para consultar los catálogos de postulaciones.'
            : requestError.message)
        }
      }
    }

    if (!signal?.aborted) setLoading(false)
  }, [search, page, canManage])

  useEffect(() => {
    if (!form || editing || !form.modalidad || !form.periodo) {
      if (!form || editing) setEligibleStudents(catalogs.estudiantes)
      return undefined
    }
    const controller = new AbortController()
    listAll(endpoints.estudiantes, { modalidad: form.modalidad, periodo: form.periodo, ordering: 'apellido_paterno' }, controller.signal)
      .then((students) => {
        if (!controller.signal.aborted) setEligibleStudents(students)
      })
      .catch((requestError) => {
        if (!requestError.canceled && !controller.signal.aborted) setCatalogError(requestError.message)
      })
    return () => controller.abort()
  }, [catalogs.estudiantes, editing, form])

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [load, revision])

  const detailId = detail?.id
  useEffect(() => {
    if (!detailId) return undefined
    const controller = new AbortController()
    setDetail((old) => ({ ...old, data: null, loading: true, error: '' }))
    postulacionesService.obtenerDetalle(detailId, controller.signal)
      .then((value) => setDetail((old) => (
        old?.id === detailId ? { ...old, data: value, loading: false, error: '' } : old
      )))
      .catch((requestError) => {
        if (!requestError.canceled) {
          setDetail((old) => (
            old?.id === detailId
              ? { ...old, data: null, loading: false, error: requestError.message }
              : old
          ))
        }
      })
    return () => controller.abort()
  }, [detailId, detailRevision])

  useEffect(() => {
    if (!detailId) {
      setAcademicDetail(null)
      return undefined
    }
    const controller = new AbortController()
    setAcademicDetail({ id: detailId, flow: null, result: null })
    Promise.allSettled([
      apiClient.get(`/api/v1/postulaciones/${detailId}/flujo/`, { signal: controller.signal }),
      apiClient.get(`/api/v1/postulaciones/${detailId}/resultado-final/`, { signal: controller.signal }),
    ]).then(([flow, result]) => {
      if (controller.signal.aborted) return
      setAcademicDetail({
        id: detailId,
        flow: flow.status === 'fulfilled' ? flow.value.data : null,
        result: result.status === 'fulfilled' ? result.value.data : null,
      })
    })
    return () => controller.abort()
  }, [detailId])

  const activePeriods = useMemo(
    () => [...catalogs.periodos].sort(
      (a, b) => (b.gestion || 0) - (a.gestion || 0)
        || String(b.semestre || '').localeCompare(String(a.semestre || '')),
    ),
    [catalogs.periodos],
  )
  const visibleStudents = useMemo(() => {
    const value = studentQuery.trim().toLocaleLowerCase('es')
    if (!value) return eligibleStudents
    return eligibleStudents.filter((item) => (
      [item.codigo, item.ru, item.ci, item.nombre_completo]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('es')
        .includes(value)
    ))
  }, [eligibleStudents, studentQuery])

  const open = (item = null) => {
    setSelected(item)
    setEditing(Boolean(item))
    setFieldErrors({})
    setStudentQuery('')
    setForm(item
      ? { codigo: item.codigo, observaciones_generales: item.observaciones_generales || '' }
      : { ...emptyForm })
  }

  const change = (name, value) => {
    setForm((old) => ({ ...old, [name]: value }))
    setFieldErrors((old) => ({ ...old, [name]: undefined }))
  }

  const save = async (event) => {
    event.preventDefault()
    if (saving) return
    const required = editing ? ['codigo'] : ['codigo', 'estudiante', 'modalidad', 'periodo']
    const localErrors = Object.fromEntries(
      required
        .filter((name) => !String(form[name] || '').trim())
        .map((name) => [name, ['Este campo es obligatorio.']]),
    )
    if (Object.keys(localErrors).length) {
      setFieldErrors(localErrors)
      return
    }

    setSaving(true)
    setError('')
    setFieldErrors({})
    const payload = editing ? {
      codigo: form.codigo,
      observaciones_generales: form.observaciones_generales,
    } : {
      codigo: form.codigo,
      estudiante: Number(form.estudiante),
      modalidad: Number(form.modalidad),
      periodo: Number(form.periodo),
      observaciones_generales: form.observaciones_generales || '',
    }
    try {
      if (editing) {
        await crudService.update(endpoints.postulaciones, selected.id, payload)
      } else {
        const endpoint = form.tipo_registro === 'HISTORICO' ? '/api/v1/postulaciones/historicas/' : endpoints.postulaciones
        const response = await crudService.create(endpoint, payload)
        if (form.tipo_registro === 'HISTORICO') {
          const created = response || {}
          setHistoricalProfile({
            id: created.id,
            codigo: created.codigo,
            estudiante_detalle: created.estudiante_detalle || catalogs.estudiantes.find((item) => item.id === Number(form.estudiante)),
            modalidad_detalle: created.modalidad_detalle || catalogs.modalidades.find((item) => item.id === Number(form.modalidad)),
            periodo_detalle: created.periodo_detalle || catalogs.periodos.find((item) => item.id === Number(form.periodo)),
          })
          setHistoricalSuccessMessage('Puede continuar con la documentación.')
          setSelected(null)
          setForm(null)
          setQuery('')
          setSearch('')
          setPage(1)
          setRevision((value) => value + 1)
          return
        }
      }
      if (!editing) {
        setQuery('')
        setSearch('')
        setPage(1)
      }
      setSelected(null)
      setForm(null)
      setRevision((value) => value + 1)
    } catch (requestError) {
      if (requestError.status === 403) setError('No tienes permiso para gestionar postulaciones.')
      else {
        const fields = requestError.fields || {}
        const codeError = Array.isArray(fields.codigo) ? fields.codigo.join(' ') : fields.codigo
        const duplicateCode = requestError.status === 400 && /\b(ya existe|already exists|unique)\b/i.test(codeError || '')
        setError(duplicateCode ? '' : requestError.message)
        setFieldErrors(duplicateCode ? { ...fields, codigo: [duplicateCodeMessage] } : fields)
      }
    } finally {
      setSaving(false)
    }
  }

  const loadHistoricalTypes = useCallback(async (postulacionId) => {
    historicalTypesController.current?.abort()
    const controller = new AbortController()
    historicalTypesController.current = controller
    setHistoricalTypeId('')
    setHistoricalTypes([])
    setHistoricalTypeError('')
    setHistoricalTypeLoading(true)
    try {
      const response = await postulacionesService.obtenerTiposDocumentosHistoricos(postulacionId, controller.signal)
      if (!controller.signal.aborted) setHistoricalTypes(Array.isArray(response) ? response : response?.results || [])
    } catch (requestError) {
      if (!requestError.canceled && !controller.signal.aborted) {
        setHistoricalTypeError(requestError.message || 'No se pudieron cargar los tipos documentales históricos.')
      }
    } finally {
      if (!controller.signal.aborted) setHistoricalTypeLoading(false)
    }
  }, [])

  const openHistoricalUpload = useCallback(async (postulacion) => {
    if (!postulacion?.id) return
    setHistoricalTypeId('')
    setHistoricalTypes([])
    setHistoricalUploadError('')
    setHistoricalSuccessMessage('')
    setHistoricalFile(null)
    setHistoricalProfile(postulacion)
    setHistoricalUploadOpen(true)
    await loadHistoricalTypes(postulacion.id)
  }, [loadHistoricalTypes])

  const closeHistoricalUpload = useCallback(() => {
    historicalTypesController.current?.abort()
    historicalTypesController.current = null
    setHistoricalProfile(null)
    setHistoricalUploadOpen(false)
    setHistoricalTypes([])
    setHistoricalTypeId('')
    setHistoricalTypeError('')
    setHistoricalUploadError('')
    setHistoricalFile(null)
    setHistoricalUploading(false)
  }, [])

  const handleHistoricalUpload = async (event) => {
    event.preventDefault()
    if (!historicalProfile || !historicalTypeId || !historicalFile) return
    const formData = new FormData()
    formData.append('tipo_documento_id', String(historicalTypeId))
    formData.append('archivo', historicalFile)
    setHistoricalUploading(true)
    setHistoricalUploadError('')
    try {
      await postulacionesService.subirDocumentoHistorico(historicalProfile.id, formData, new AbortController().signal)
      setHistoricalSuccessMessage('Documento cargado con éxito.')
      setHistoricalTypeId('')
      setHistoricalFile(null)
      setHistoricalTypes([])
      setRevision((value) => value + 1)
    } catch (requestError) {
      setHistoricalUploadError(requestError.message || 'No se pudo cargar el documento histórico.')
    } finally {
      setHistoricalUploading(false)
    }
  }

  const studentName = (id) => catalogs.estudiantes.find((item) => item.id === Number(id))
  const periodName = (id) => catalogs.periodos.find((item) => item.id === Number(id))
  const studentLabel = (item) => item.estudiante_detalle
    ? formatStudentLabel(item.estudiante_detalle)
    : studentName(item.estudiante) ? formatStudentLabel(studentName(item.estudiante)) : 'Estudiante registrado'
  const modalityLabel = (item) => item.modalidad_detalle?.nombre
    || catalogs.modalidades.find((value) => value.id === item.modalidad)?.nombre
    || 'Modalidad registrada'
  const periodLabel = (item) => item.periodo_detalle
    ? formatPeriodoLabel(item.periodo_detalle)
    : periodName(item.periodo) ? formatPeriodoLabel(periodName(item.periodo)) : 'Periodo registrado'
  const stateLabel = (item) => item.estado_actual_detalle?.nombre || 'Sin estado'
  const tipoRegistroLabel = (item) => humanizeTipoRegistro(item?.tipo_registro)

  return (
    <section className="mx-auto max-w-6xl space-y-5">
      <PageHeader
        title="Postulantes"
        description="Gestiona las postulaciones dentro de tu alcance autorizado."
        action={canManage ? (
          <Button onClick={() => open()} disabled={loading || Boolean(catalogError)}>
            Nueva postulación
          </Button>
        ) : null}
      />
      {catalogError && <p role="alert" className="text-sm text-red-600">{catalogError}</p>}
      <SearchBar
        value={query}
        onChange={setQuery}
        onSearch={() => { setSearch(query.trim()); setPage(1) }}
      />
      <DataState
        loading={loading}
        error={error}
        empty={!data.results?.length}
        onRetry={() => setRevision((value) => value + 1)}
      >
        <div className="space-y-3">
          {data.results?.map((item) => (
            <article key={item.id} className="rounded-xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold">{item.codigo}</h2>
                  <dl className="mt-2 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
                    <Info label="Estudiante" value={studentLabel(item)} />
                    <Info label="Modalidad" value={modalityLabel(item)} />
                    <Info label="Periodo" value={periodLabel(item)} />
                    <Info label="Tipo de registro" value={tipoRegistroLabel(item)} />
                    <Info label="Estado" value={stateLabel(item)} />
                  </dl>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-800" to={`/postulaciones/${item.id}`}>
                    Abrir expediente
                  </Link>
                  <Button variant="secondary" onClick={() => setDetail({ id: item.id, codigo: item.codigo, data: null, loading: true, error: '' })}>Detalle</Button>
                  {canManage && (
                    <>
                      <Button onClick={() => open(item)}>Editar</Button>
                    </>
                  )}
                </div>
              </div>
            </article>
          ))}
          <Pager data={data} page={page} onPage={setPage} />
        </div>
      </DataState>
      {detail && (
        <Modal title={`Postulación ${detail.codigo}`} onClose={() => setDetail(null)}>
          <DataState
            loading={detail.loading}
            error={detail.error}
            empty={!detail.loading && !detail.error && !detail.data}
            onRetry={() => setDetailRevision((value) => value + 1)}
          >
            {detail.data && (
              <div className="mt-4 space-y-4">
                <dl className="grid gap-4 sm:grid-cols-2">
                  <Info label="Código" value={detail.data.codigo} />
                  <Info label="Estudiante" value={studentLabel(detail.data)} />
                  <Info label="Modalidad" value={modalityLabel(detail.data)} />
                  <Info label="Gestión y semestre" value={periodLabel(detail.data)} />
                  <Info label="Estado técnico" value={stateLabel(detail.data)} />
                  {academicDetail?.id === detail.data.id && academicDetail.flow?.etapa_actual && (
                    <Info
                      label="Etapa actual"
                      value={`${academicDetail.flow.etapa_actual.nombre} — ${formatCodeLabel(academicDetail.flow.etapa_actual.estado)}`}
                    />
                  )}
                  {academicDetail?.id === detail.data.id && academicDetail.result?.nota_final != null && (
                    <Info label="Resultado final" value={academicDetail.result.nota_final} />
                  )}
                  <Info label="Observaciones generales" value={detail.data.observaciones_generales || 'Sin observaciones generales.'} />
                </dl>
              </div>
            )}
          </DataState>
        </Modal>
      )}
      {historicalProfile && !historicalUploadOpen && (
        <Modal title="Registro histórico creado" onClose={() => {
          setHistoricalProfile(null)
          setHistoricalSuccessMessage('')
        }}>
          <div className="mt-4 space-y-4">
            <p className="text-sm text-slate-600">Estudiante: {studentLabel(historicalProfile)}</p>
            <p className="text-sm text-slate-600">Modalidad: {modalityLabel(historicalProfile)}</p>
            <p className="text-sm text-slate-600">Gestión: {periodLabel(historicalProfile)}</p>
            {historicalSuccessMessage && <p className="text-sm font-medium text-green-700">{historicalSuccessMessage}</p>}
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setHistoricalProfile(null); setHistoricalSuccessMessage('') }}>Cerrar</Button>
              <Button type="button" onClick={() => { setHistoricalSuccessMessage(''); setHistoricalUploadOpen(true); void loadHistoricalTypes(historicalProfile.id) }}>Cargar documentación</Button>
            </div>
          </div>
        </Modal>
      )}
      {historicalProfile && historicalUploadOpen && (
        <Modal title="Subir documento histórico" onClose={closeHistoricalUpload}>
          <form className="mt-4 space-y-4" onSubmit={handleHistoricalUpload}>
            <p className="text-sm text-slate-600">Postulación: {historicalProfile.codigo}</p>
            <p className="text-sm text-slate-600">Estudiante: {studentLabel(historicalProfile)}</p>
            <p className="text-sm text-slate-600">Modalidad: {modalityLabel(historicalProfile)}</p>
            <label className="block text-sm">
              Tipo de documento *
              <select
                value={historicalTypeId}
                onChange={(event) => setHistoricalTypeId(event.target.value)}
                disabled={historicalTypeLoading || Boolean(historicalTypeError) || historicalTypes.length === 0 || historicalUploading}
                className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-950"
              >
                <option value="">{historicalTypeLoading ? 'Cargando tipos...' : 'Seleccionar...'}</option>
                {historicalTypes.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
              </select>
            </label>
            {!historicalTypeLoading && !historicalTypeError && historicalTypes.length === 0 && (
              <p className="text-sm text-slate-600">No existen tipos de documentos configurados para esta modalidad.</p>
            )}
            {historicalTypeError && <p role="alert" className="text-sm text-red-600">{historicalTypeError}</p>}
            <label className="block text-sm">
              Archivo *
              <input
                name="archivo"
                type="file"
                onChange={(event) => setHistoricalFile(event.target.files?.[0] || null)}
                disabled={historicalTypeLoading || Boolean(historicalTypeError) || historicalTypes.length === 0 || historicalUploading}
                className="mt-1 block w-full rounded-lg border p-2"
              />
            </label>
            {historicalUploadError && <p role="alert" className="text-sm text-red-600">{historicalUploadError}</p>}
            {historicalSuccessMessage && <p className="text-sm font-medium text-green-700">{historicalSuccessMessage}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" disabled={historicalUploading} onClick={closeHistoricalUpload}>Cancelar</Button>
              <Button type="submit" disabled={historicalUploading || historicalTypeLoading || Boolean(historicalTypeError) || historicalTypes.length === 0 || !historicalTypeId || !historicalFile}>Subir documento</Button>
            </div>
          </form>
        </Modal>
      )}
      {form && (
        <Modal
          title={editing ? 'Editar postulación' : 'Nueva postulación'}
          onClose={() => { if (!saving) { setSelected(null); setForm(null) } }}
        >
          <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={save}>
            <FormField error={fieldErrors.codigo}>
              <Field label="Código" required value={form.codigo} onChange={(event) => change('codigo', event.target.value)} />
            </FormField>
            {editing ? (
              <div className="rounded-lg border bg-slate-50 p-4 sm:col-span-2 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-sm font-semibold">Datos de solo lectura</p>
                <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Info label="Estudiante" value={studentLabel(selected)} />
                  <Info label="Modalidad" value={modalityLabel(selected)} />
                  <Info label="Gestión y semestre" value={periodLabel(selected)} />
                  <Info label="Tipo de registro" value={tipoRegistroLabel(selected)} />
                  <Info label="Estado técnico" value={stateLabel(selected)} />
                </dl>
                <p className="mt-3 text-xs text-slate-500">Estudiante, modalidad, periodo y estado no se modifican desde esta edición básica.</p>
              </div>
            ) : <div>
              <label className="text-sm" htmlFor="student-search">Buscar estudiante</label>
              <input
                id="student-search"
                value={studentQuery}
                onChange={(event) => setStudentQuery(event.target.value)}
                placeholder="Código, CI o nombre"
                className="mt-1 w-full rounded-lg border px-3 py-2 dark:bg-slate-950"
              />
              <label className="mt-2 block text-sm" htmlFor="student-select">Estudiante</label>
              <select
                id="student-select"
                required
                value={form.estudiante}
                onChange={(event) => change('estudiante', event.target.value)}
                className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-950"
              >
                <option value="">Seleccione un estudiante</option>
                {visibleStudents.map((item) => (
                  <option key={item.id} value={item.id}>{formatStudentLabel(item)}</option>
                ))}
              </select>
              <FieldError value={fieldErrors.estudiante} />
              {!catalogs.estudiantes.length && (
                <p className="mt-1 text-sm text-slate-500">No se encontraron estudiantes activos.</p>
              )}
            </div>}
            {!editing && canManage && (
              <label className="text-sm sm:col-span-2">
                Tipo de registro
                <select
                  value={form.tipo_registro || 'SEGUIMIENTO'}
                  onChange={(event) => change('tipo_registro', event.target.value)}
                  className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-950"
                >
                  <option value="SEGUIMIENTO">Proceso con seguimiento</option>
                  <option value="HISTORICO">Registro histórico</option>
                </select>
              </label>
            )}
            {!editing && <Select
              label="Modalidad"
              value={form.modalidad}
              items={catalogs.modalidades}
              format={(item) => {
                const capability = catalogs.capacidades[item.id]
                return capability?.soportada && capability?.configuracion_valida
                  ? item.nombre
                  : `${item.nombre} — Próximamente / No configurada`
              }}
              isDisabled={(item) => {
                const capability = catalogs.capacidades[item.id]
                return !capability?.soportada || !capability?.configuracion_valida
              }}
              onChange={(value) => change('modalidad', value)}
              error={fieldErrors.modalidad}
            />}
            {!editing && <Select
              label="Gestión / Semestre"
              value={form.periodo}
              items={activePeriods}
              format={formatPeriodoLabel}
              onChange={(value) => change('periodo', value)}
              error={fieldErrors.periodo}
            />}
            <label className="text-sm sm:col-span-2">
              Observaciones
              <textarea
                value={form.observaciones_generales}
                onChange={(event) => change('observaciones_generales', event.target.value)}
                className="mt-1 w-full rounded-lg border p-3 dark:bg-slate-950"
              />
            </label>
            {!editing && !activePeriods.length && (
              <p role="status" className="text-sm text-amber-700 sm:col-span-2">
                No existen periodos académicos activos.
              </p>
            )}
            {error && <p role="alert" className="text-red-600 sm:col-span-2">{error}</p>}
            <div className="flex flex-wrap justify-end gap-2 sm:col-span-2">
              <Button type="button" variant="outline" disabled={saving} onClick={() => { setSelected(null); setForm(null) }}>Cancelar</Button>
              <Button disabled={saving || (!editing && !activePeriods.length)}>
              {saving ? 'Guardando…' : 'Guardar'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  )
}

function Info({ label, value }) {
  return <div><dt className="text-slate-500">{label}</dt><dd>{value}</dd></div>
}

function FieldError({ value }) {
  const message = Array.isArray(value) ? value.join(' ') : value
  return message ? <p role="alert" className="mt-1 text-sm text-red-600">{message}</p> : null
}

function FormField({ error, children }) {
  return <div>{children}<FieldError value={error} /></div>
}

function Select({ label, value, items, format, isDisabled = () => false, onChange, error }) {
  return (
    <label className="text-sm">
      {label}
      <select
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-950"
      >
        <option value="">Seleccione</option>
        {items.map((item) => <option key={item.id} value={item.id} disabled={isDisabled(item)}>{format(item)}</option>)}
      </select>
      <FieldError value={error} />
    </label>
  )
}
