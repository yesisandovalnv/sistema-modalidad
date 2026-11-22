import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Eye, FileSpreadsheet, Info as InfoIcon, Pencil, Plus, Search, SearchX, UserPlus, Users } from 'lucide-react'
import { ViewToggle } from '../../components/ui/ViewToggle'
import { STATUS_TONE as statusTone } from '../../lib/statusTone'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { ActionButton } from '../../components/ui/ActionButton'
import { MetricCard } from '../../components/reports/ReportComponents'
import { DataState } from '../../components/crud/CrudShell'
import { CenteredModal } from '../../components/ui/CenteredModal'
import { Select } from '../../components/ui/Select'
import { FilterMenu } from '../../components/ui/FilterMenu'
import { ModalityChips } from '../../components/ui/ModalityChips'
import { sortModalities } from '../../lib/modalityColor'
import { withAccents } from '../../lib/spanishLabel'
import { crudService, endpoints, listAll } from '../../services/crudService'
import { useAuth } from '../../hooks/useAuth'
import apiClient from '../../services/api'
import { formatCodeLabel } from '../../lib/utils'
import { formatPeriodoLabel, formatStudentLabel } from './postulacionFormatters'
import { postulacionesService } from '../../services/postulacionesService'
import StudentImportModal from '../usuarios/StudentImportModal'
import { QuickStudentForm } from './QuickStudentForm'

const emptyForm = { estudiante: '', modalidad: '', periodo: '', observaciones_generales: '', tipo_registro: 'SEGUIMIENTO' }
const duplicateCodeMessage = 'El código ingresado ya se encuentra registrado en otra postulación. Por favor, ingrese un código diferente.'
// Mismo estilo que el Inicio: tarjetas compactas con el nombre del estudiante y sus acciones
// (Detalle y Editar como íconos, "Abrir expediente" con el ActionButton común). Modalidad,
// periodo, tipo de registro y estado se ven en Detalle. El estado usa colores semánticos.
// Tarjetas o lista: cada usuario elige cómo ver a los estudiantes y se recuerda en este navegador.
const REGISTRO_OPTIONS = [{ value: 'SEGUIMIENTO', label: 'Proceso con seguimiento' }, { value: 'HISTORICO', label: 'Registro histórico' }]
// Nombres cortos en los botones de modalidad (el completo aparece al pasar el cursor).
const CHIP_LABEL = { GRADUACION_VIA_DIPLOMADO: 'Vía Diplomado', EXCELENCIA_ACADEMICA: 'Excelencia' }
const VIEW_KEY = 'sm_postulantes_vista'
const readView = () => { try { return localStorage.getItem(VIEW_KEY) === 'lista' ? 'lista' : 'tarjetas' } catch { return 'tarjetas' } }
const PAGE_SIZE = { tarjetas: 15, lista: 20 }

const initialsOf = (label) => String(label || '')
  .replace(/^[^-]*-\s*/, '')
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0])
  .join('')
  .toLocaleUpperCase('es') || '?'

const humanizeTipoRegistro = (value) => {
  if (value === 'HISTORICO') return 'Registro histórico'
  return 'Proceso con seguimiento'
}

export default function PostulantesPage() {
  const { hasPermission, roleCode } = useAuth()
  const canManage = hasPermission('puede_gestionar_postulaciones')
  // Registrar o importar estudiantes usa la administración de usuarios: mismo permiso que el backend.
  const canRegisterStudents = canManage && hasPermission('puede_gestionar_usuarios')
  const [quickStudent, setQuickStudent] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [view, setView] = useState(readView)
  const pageSize = PAGE_SIZE[view]
  // Como en Fondo de Tiempo: al cambiar de vista (o de página) el contenido se vuelve a montar
  // y cada estudiante entra escalonado; el fondo del selector se desliza a la opción elegida.
  const chooseView = (next) => {
    if (next === view) return
    try { localStorage.setItem(VIEW_KEY, next) } catch { /* sin almacenamiento: dura hasta recargar */ }
    setView(next)
    setPage(1)
  }
  const [search, setSearch] = useState('')
  // Filtro por modalidad. El listado del servidor no filtra por modalidad, así que con una
  // modalidad elegida se pide la lista completa (ya acotada por la búsqueda), se filtra aquí y
  // se pagina aquí mismo, como en Fondo de Tiempo. Sin filtro, todo sigue paginado en el servidor.
  const [modalidadFilter, setModalidadFilter] = useState([])
  const [page, setPage] = useState(1)
  const [data, setData] = useState({ results: [] })
  const [catalogs, setCatalogs] = useState({ modalidades: [], periodos: [], estudiantes: [], capacidades: {} })
  const [eligibleStudents, setEligibleStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // Error al guardar: se muestra en el formulario, no reemplaza la lista de fondo.
  const [formError, setFormError] = useState('')
  const [catalogError, setCatalogError] = useState('')
  // Postulación recién creada: se ofrece abrir su expediente, que es el paso siguiente.
  const [createdProfile, setCreatedProfile] = useState(null)
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [academicDetail, setAcademicDetail] = useState(null)
  const [detailRevision, setDetailRevision] = useState(0)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [saving, setSaving] = useState(false)
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

  // La lista ya cargó una vez: al buscar o paginar se queda en pantalla (atenuada) en lugar
  // de cambiar por "Cargando…".
  const loadedOnce = useRef(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const value = query.trim()
      if (value !== search) {
        setSearch(value)
        setPage(1)
      }
    }, 350)
    return () => window.clearTimeout(timer)
  }, [query, search])

  const load = useCallback(async (signal) => {
    setLoading(true)
    setError('')
    setCatalogError('')

    try {
      if (modalidadFilter.length) {
        const all = await listAll(endpoints.postulaciones, { search, ordering: '-created_at' }, signal)
        const matching = all.filter((item) => modalidadFilter.includes(String(item.modalidad_detalle?.id ?? item.modalidad)))
        const pages = Math.max(1, Math.ceil(matching.length / pageSize))
        const current = Math.min(page, pages)
        setData({
          count: matching.length,
          next: current < pages ? 'local' : null,
          previous: current > 1 ? 'local' : null,
          results: matching.slice((current - 1) * pageSize, current * pageSize),
        })
      } else {
        const rows = await crudService.list(
          endpoints.postulaciones,
          { search, page, ordering: '-created_at', page_size: pageSize },
          signal,
        )
        setData(rows)
      }
      loadedOnce.current = true
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
  }, [search, page, pageSize, modalidadFilter, canManage])

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

  const open = (item = null) => {
    setFormError('')
    setQuickStudent(false)
    setSelected(item)
    setEditing(Boolean(item))
    setFieldErrors({})
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
    const required = editing ? ['codigo'] : ['estudiante', 'modalidad', 'periodo']
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
    setFormError('')
    setFieldErrors({})
    const payload = editing ? {
      codigo: form.codigo,
      observaciones_generales: form.observaciones_generales,
    } : {
      estudiante: Number(form.estudiante),
      modalidad: Number(form.modalidad),
      periodo: Number(form.periodo),
      observaciones_generales: form.observaciones_generales || '',
    }
    let created = null
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
        if (response?.id) {
          created = {
            id: response.id,
            estudiante_detalle: response.estudiante_detalle || catalogs.estudiantes.find((item) => item.id === Number(form.estudiante)),
            modalidad_detalle: response.modalidad_detalle || catalogs.modalidades.find((item) => item.id === Number(form.modalidad)),
            periodo_detalle: response.periodo_detalle || catalogs.periodos.find((item) => item.id === Number(form.periodo)),
          }
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
      if (created) setCreatedProfile(created)
    } catch (requestError) {
      if (requestError.status === 403) setFormError('No tienes permiso para gestionar postulaciones.')
      else {
        const fields = requestError.fields || {}
        const codeError = Array.isArray(fields.codigo) ? fields.codigo.join(' ') : fields.codigo
        const duplicateCode = requestError.status === 400 && /\b(ya existe|already exists|unique)\b/i.test(codeError || '')
        setFormError(duplicateCode ? '' : requestError.message)
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

  const renderActions = (item) => (
    <div className="postulante-actions">
      <button className="postulante-icon" type="button" aria-label="Detalle" title="Ver detalle" onClick={() => setDetail({ id: item.id, codigo: item.codigo, data: null, loading: true, error: '', row: item })}>
        <Eye className="h-4 w-4" aria-hidden="true" />
      </button>
      <ActionButton to={`/postulaciones/${item.id}`} size="sm">Abrir expediente</ActionButton>
    </div>
  )

  // Las modalidades del filtro son las del catálogo que ya se carga para quien gestiona
  // postulaciones; en solo lectura no se cargan catálogos (US-007) y no hay filtro.
  const filterModalities = catalogs.modalidades
  const filterColumns = [{
    key: 'modalidad',
    title: 'Modalidad',
    multiple: true,
    options: filterModalities.map((item) => ({ value: String(item.id), label: withAccents(item.nombre) })),
  }]
  // Botones de modalidad sobre la lista: mismo valor que el menú Filtrar.
  const chipModalities = sortModalities(filterModalities).map((item) => ({ value: String(item.id), label: CHIP_LABEL[item.codigo] || withAccents(item.nombre), title: withAccents(item.nombre), codigo: item.codigo }))
  const filterName = filterColumns[0].options.filter((option) => modalidadFilter.includes(option.value)).map((option) => option.label).join(', ')
  const changeFilter = (key, value) => { if (key === 'modalidad') { setModalidadFilter(Array.isArray(value) ? value : []); setPage(1) } }

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
    <section className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <Card className="postulantes-header animate-enter p-5" style={{ '--stagger': 0 }}>
          <span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--surface-sunken)] text-[var(--heading)]">
            <Users className="h-[22px] w-[22px]" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-[var(--heading)]">Postulantes</h1>
            <p className="mt-0.5 text-sm text-[var(--text-secondary)]">Gestiona las postulaciones dentro de tu alcance autorizado.</p>
          </div>
          <div className="postulantes-tools">
          <label className="postulantes-search" role="search">
            <span className="sr-only">Buscar</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nombre, R.U. o C.I."
              className="pill-control postulantes-search-input"
            />
          </label>
          {filterModalities.length > 0 && (
            <FilterMenu columns={filterColumns} values={{ modalidad: modalidadFilter }} onChange={changeFilter} />
          )}
          </div>
        </Card>
        <MetricCard featured index={1} label="Postulaciones" hint={[filterName, search ? `Búsqueda: ${search}` : ''].filter(Boolean).join(' · ') || undefined} value={data.count ?? data.results?.length ?? 0} />
      </div>
      {catalogError && <p role="alert" className="text-sm text-[var(--danger-text)]">{catalogError}</p>}
      <Card className="animate-enter p-4 sm:p-5" style={{ '--stagger': 2 }}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-base font-semibold text-[var(--heading)]">Estudiantes postulados</p>
          <div className="ml-auto flex flex-wrap items-center gap-2">
          <ViewToggle view={view} onChange={chooseView} />
          {canRegisterStudents && (
            <Button variant="secondary" className="gap-2 rounded-full" onClick={() => setImportOpen(true)}>
              <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
              Importar estudiantes
            </Button>
          )}
          {canManage && (
            <Button className="gap-2 rounded-full" onClick={() => open()} disabled={loading || Boolean(catalogError)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Nueva postulación
            </Button>
          )}
          </div>
        </div>
        <ModalityChips options={chipModalities} selected={modalidadFilter} onChange={(value) => changeFilter('modalidad', value)} />
        <DataState
          loading={loading && !loadedOnce.current}
          error={error}
          empty={false}
          onRetry={() => setRevision((value) => value + 1)}
        >
          {!loading && !data.results?.length ? (
            <EmptyResults
              key={`vacio-${search}-${modalidadFilter.join(',')}`}
              student={roleCode === 'ESTUDIANTE'}
              filtered={Boolean(search || modalidadFilter.length)}
            />
          ) : view === 'lista' ? (
            <div key={`lista-${search}-${modalidadFilter.join(',')}-${page}-${revision}`} className={`postulantes-table ${loading ? 'is-refreshing' : ''}`} aria-busy={loading || undefined}>
              <div className="postulantes-table-head" aria-hidden="true">
                <span>Estudiante</span>
                <span>Modalidad</span>
                <span>Estado</span>
                <span className="text-right">Acciones</span>
              </div>
              {data.results?.map((item, index) => {
                const label = studentLabel(item)
                return (
                  <article key={item.id} className="postulante-row animate-row-in" style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}>
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="postulante-avatar" aria-hidden="true">{initialsOf(label)}</span>
                      <h2 className="postulante-name postulante-name--row" title={label}>{label}</h2>
                    </div>
                    <p className="postulante-cell"><span className="postulante-cell-label">Modalidad</span>{modalityLabel(item)}</p>
                    <p className="postulante-cell"><span className="postulante-cell-label">Estado</span><span className="postulante-status" data-tone={statusTone[item.estado_actual_detalle?.codigo] || 'neutral'}>{stateLabel(item)}</span></p>
                    {renderActions(item)}
                  </article>
                )
              })}
            </div>
          ) : (
            <div key={`tarjetas-${search}-${modalidadFilter.join(',')}-${page}-${revision}`} className={`postulantes-cards ${loading ? 'is-refreshing' : ''}`} aria-busy={loading || undefined}>
              {data.results?.map((item, index) => {
                const label = studentLabel(item)
                return (
                  <article key={item.id} className="postulante-card animate-row-in" style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}>
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="postulante-avatar postulante-avatar--lg" aria-hidden="true">{initialsOf(label)}</span>
                      <div className="min-w-0 flex-1">
                        <h2 className="postulante-name" title={label}>{label}</h2>
                        <p className="mt-0.5 truncate text-sm text-[var(--text-secondary)]">{modalityLabel(item)}</p>
                      </div>
                      <span className="postulante-status" data-tone={statusTone[item.estado_actual_detalle?.codigo] || 'neutral'}>{stateLabel(item)}</span>
                    </div>
                    {renderActions(item)}
                  </article>
                )
              })}
            </div>
          )}
          <PageNav count={data.count ?? 0} page={page} pageSize={pageSize} hasNext={Boolean(data.next)} hasPrevious={Boolean(data.previous)} onPage={setPage} />
        </DataState>
      </Card>
      {detail && (
        <CenteredModal title="Detalle de la postulación" eyebrow={detail.codigo ? `Postulación ${detail.codigo}` : 'Postulación'} onClose={() => setDetail(null)}>
          <DataState
            loading={detail.loading}
            error={detail.error}
            empty={!detail.loading && !detail.error && !detail.data}
            onRetry={() => setDetailRevision((value) => value + 1)}
          >
            {detail.data && (
              <div className="space-y-4">
                <div className="postulante-detail-head">
                  <span className="postulante-avatar postulante-avatar--lg" aria-hidden="true">{initialsOf(studentLabel(detail.data))}</span>
                  <div className="min-w-0">
                    <p className="text-xs text-[var(--text-secondary)]">Estudiante</p>
                    <p className="text-base font-bold text-[var(--heading)]">{studentLabel(detail.data)}</p>
                  </div>
                </div>
                <dl className="postulante-detail-grid">
                  <Info label="Código" value={detail.data.codigo} />
                  <Info label="Modalidad" value={modalityLabel(detail.data)} />
                  <Info label="Gestión y semestre" value={periodLabel(detail.data)} />
                  <Info label="Tipo de registro" value={tipoRegistroLabel(detail.data.tipo_registro ? detail.data : detail.row)} />
                  <Info label="Estado técnico" value={<span className="postulante-status" data-tone={statusTone[detail.data.estado_actual_detalle?.codigo] || 'neutral'}>{stateLabel(detail.data)}</span>} />
                  {academicDetail?.id === detail.data.id && academicDetail.flow?.etapa_actual && (
                    <Info
                      label="Etapa actual"
                      value={`${academicDetail.flow.etapa_actual.nombre} — ${formatCodeLabel(academicDetail.flow.etapa_actual.estado)}`}
                    />
                  )}
                  {academicDetail?.id === detail.data.id && academicDetail.result?.nota_final != null && (
                    <Info label="Resultado final" value={academicDetail.result.nota_final} />
                  )}
                  <div className="sm:col-span-2"><Info label="Observaciones generales" value={detail.data.observaciones_generales || 'Sin observaciones generales.'} /></div>
                </dl>
                <p role="note" className="postulante-note">
                  <InfoIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Estos son datos técnicos básicos y no sustituyen actos administrativos o institucionales.
                </p>
              </div>
            )}
          </DataState>
          <div className="form-footer postulante-detail-actions">
            {canManage && (
              <Button type="button" variant="secondary" className="gap-2" onClick={() => { const item = detail.data || detail.row; setDetail(null); open(item) }}>
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Editar
              </Button>
            )}
            <ActionButton to={`/postulaciones/${detail.id}`}>Abrir expediente</ActionButton>
          </div>
        </CenteredModal>
      )}
      {createdProfile && (
        <CenteredModal title="Postulación creada" eyebrow="Nueva postulación" onClose={() => setCreatedProfile(null)}>
          <div className="space-y-4">
            <dl className="postulante-detail-grid">
              <Info label="Estudiante" value={studentLabel(createdProfile)} />
              <Info label="Modalidad" value={modalityLabel(createdProfile)} />
              <Info label="Gestión" value={periodLabel(createdProfile)} />
            </dl>
            <p className="text-sm text-[var(--text-secondary)]">El siguiente paso es abrir el expediente e iniciar la Inscripción.</p>
            <div className="form-footer">
              <Button type="button" variant="outline" onClick={() => setCreatedProfile(null)}>Cerrar</Button>
              <ActionButton to={`/postulaciones/${createdProfile.id}`}>Abrir expediente</ActionButton>
            </div>
          </div>
        </CenteredModal>
      )}
      {historicalProfile && !historicalUploadOpen && (
        <CenteredModal title="Registro histórico creado" eyebrow="Nueva postulación" onClose={() => {
          setHistoricalProfile(null)
          setHistoricalSuccessMessage('')
        }}>
          <div className="space-y-4">
            <dl className="postulante-detail-grid">
              <Info label="Estudiante" value={studentLabel(historicalProfile)} />
              <Info label="Modalidad" value={modalityLabel(historicalProfile)} />
              <Info label="Gestión" value={periodLabel(historicalProfile)} />
            </dl>
            {historicalSuccessMessage && <p className="text-sm font-medium text-[var(--success-text)]">{historicalSuccessMessage}</p>}
            <div className="form-footer">
              <Button type="button" variant="outline" onClick={() => { setHistoricalProfile(null); setHistoricalSuccessMessage('') }}>Cerrar</Button>
              <Button type="button" onClick={() => { setHistoricalSuccessMessage(''); setHistoricalUploadOpen(true); void loadHistoricalTypes(historicalProfile.id) }}>Cargar documentación</Button>
            </div>
          </div>
        </CenteredModal>
      )}
      {historicalProfile && historicalUploadOpen && (
        <CenteredModal title="Subir documento histórico" eyebrow={historicalProfile.codigo ? `Postulación ${historicalProfile.codigo}` : 'Registro histórico'} onClose={closeHistoricalUpload}>
          <form className="space-y-4" onSubmit={handleHistoricalUpload}>
            <p className="text-sm text-[var(--text-secondary)]">Postulación: {historicalProfile.codigo}</p>
            <dl className="postulante-detail-grid">
              <Info label="Estudiante" value={studentLabel(historicalProfile)} />
              <Info label="Modalidad" value={modalityLabel(historicalProfile)} />
            </dl>
            <Select
              showLabel
              label="Tipo de documento *"
              placeholder={historicalTypeLoading ? 'Cargando tipos...' : 'Seleccionar...'}
              value={historicalTypeId}
              onChange={(value) => setHistoricalTypeId(value)}
              disabled={historicalTypeLoading || Boolean(historicalTypeError) || historicalTypes.length === 0 || historicalUploading}
              options={historicalTypes.map((item) => ({ value: String(item.id), label: item.nombre }))}
            />
            {!historicalTypeLoading && !historicalTypeError && historicalTypes.length === 0 && (
              <p className="text-sm text-[var(--text-secondary)]">No existen tipos de documentos configurados para esta modalidad.</p>
            )}
            {historicalTypeError && <p role="alert" className="text-sm text-[var(--danger-text)]">{historicalTypeError}</p>}
            <label className="form-label">
              Archivo *
              <input
                name="archivo"
                type="file"
                onChange={(event) => setHistoricalFile(event.target.files?.[0] || null)}
                disabled={historicalTypeLoading || Boolean(historicalTypeError) || historicalTypes.length === 0 || historicalUploading}
                className="form-control form-control--file"
              />
            </label>
            {historicalUploadError && <p role="alert" className="text-sm text-[var(--danger-text)]">{historicalUploadError}</p>}
            {historicalSuccessMessage && <p className="text-sm font-medium text-[var(--success-text)]">{historicalSuccessMessage}</p>}
            <div className="form-footer">
              <Button type="button" variant="outline" disabled={historicalUploading} onClick={closeHistoricalUpload}>Cancelar</Button>
              <Button type="submit" disabled={historicalUploading || historicalTypeLoading || Boolean(historicalTypeError) || historicalTypes.length === 0 || !historicalTypeId || !historicalFile}>Subir documento</Button>
            </div>
          </form>
        </CenteredModal>
      )}
      {importOpen && <StudentImportModal onClose={() => setImportOpen(false)} onComplete={() => setRevision((value) => value + 1)} />}
      {form && (
        <CenteredModal
          title={editing ? 'Editar postulación' : 'Nueva postulación'}
          eyebrow={editing ? studentLabel(selected) : undefined}
          size="form"
          onClose={() => { if (!saving) { setSelected(null); setForm(null) } }}
        >
          <form className="compact-form" onSubmit={save}>
            {editing ? (
              <>
                <FormField error={fieldErrors.codigo}>
                  <label className="form-label">Código<input required value={form.codigo} onChange={(event) => change('codigo', event.target.value)} className="form-control" /></label>
                </FormField>
                <p className="form-help">{modalityLabel(selected)} · {periodLabel(selected)}. Estudiante, modalidad, periodo y estado no se modifican desde esta edición básica.</p>
              </>
            ) : (
              <>
                {quickStudent ? (
                  <QuickStudentForm
                    onCancel={() => setQuickStudent(false)}
                    onCreated={(student) => {
                      setCatalogs((current) => ({ ...current, estudiantes: [...current.estudiantes, student] }))
                      setEligibleStudents((current) => [...current, student])
                      change('estudiante', String(student.id))
                      setQuickStudent(false)
                    }}
                  />
                ) : <div>
                  <Select
                    showLabel
                    searchable
                    required
                    label="Estudiante"
                    placeholder="Escribe el nombre, R.U. o C.I."
                    emptyText="Ningún estudiante coincide"
                    value={form.estudiante}
                    onChange={(value) => change('estudiante', value)}
                    options={eligibleStudents.map((item) => ({
                      value: String(item.id),
                      label: formatStudentLabel(item),
                      keywords: [item.codigo, item.ru, item.ci, item.nombre_completo].filter(Boolean).join(' '),
                    }))}
                  />
                  <FieldError value={fieldErrors.estudiante} />
                  {!catalogs.estudiantes.length && <p className="form-help">No se encontraron estudiantes activos.</p>}
                  {canRegisterStudents && (
                    <button type="button" className="form-link" onClick={() => setQuickStudent(true)}>
                      <UserPlus className="h-4 w-4" aria-hidden="true" />
                      ¿No está en la lista? Registrar estudiante
                    </button>
                  )}
                </div>}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Select
                      showLabel
                      required
                      label="Modalidad"
                      value={form.modalidad}
                      onChange={(value) => change('modalidad', value)}
                      options={catalogs.modalidades.map((item) => {
                        const capability = catalogs.capacidades[item.id]
                        const available = capability?.soportada && capability?.configuracion_valida
                        const name = withAccents(item.nombre)
                        return { value: String(item.id), label: available ? name : `${name} — Próximamente / No configurada`, disabled: !available }
                      })}
                    />
                    <FieldError value={fieldErrors.modalidad} />
                  </div>
                  <div>
                    <Select
                      showLabel
                      required
                      label="Gestión / Semestre"
                      value={form.periodo}
                      onChange={(value) => change('periodo', value)}
                      options={activePeriods.map((item) => ({ value: String(item.id), label: formatPeriodoLabel(item) }))}
                    />
                    <FieldError value={fieldErrors.periodo} />
                  </div>
                </div>
                {canManage && (
                  <div className="grid items-end gap-4 sm:grid-cols-2">
                    <Select
                      showLabel
                      label="Tipo de registro"
                      value={form.tipo_registro || 'SEGUIMIENTO'}
                      onChange={(value) => change('tipo_registro', value)}
                      options={REGISTRO_OPTIONS}
                    />
                    <p className="form-hint">
                      {form.tipo_registro === 'HISTORICO'
                        ? 'Postulación ya concluida: después podrás cargar su documentación.'
                        : 'La postulación seguirá todas sus etapas en el sistema.'}
                    </p>
                  </div>
                )}
                {!activePeriods.length && (
                  <p role="status" className="form-help text-[var(--warning-text)]">No existen periodos académicos activos.</p>
                )}
              </>
            )}
            <label className="form-label">
              Observaciones
              <textarea
                value={form.observaciones_generales}
                onChange={(event) => change('observaciones_generales', event.target.value)}
                className="form-control form-control--area"
                rows={3}
                placeholder="Opcional"
              />
            </label>
            {formError && <p role="alert" className="text-sm text-[var(--danger-text)]">{formError}</p>}
            <div className="form-footer">
              <Button type="button" variant="outline" className="rounded-full" disabled={saving} onClick={() => { setSelected(null); setForm(null) }}>Cancelar</Button>
              <Button className="rounded-full px-6" disabled={saving || (!editing && !activePeriods.length)}>
                {saving ? 'Guardando…' : 'Guardar'}
              </Button>
            </div>
          </form>
        </CenteredModal>
      )}
    </section>
  )
}

function Info({ label, value }) {
  return <div className="min-w-0"><dt className="text-xs text-[var(--text-secondary)]">{label}</dt><dd className="break-words text-sm font-medium text-[var(--heading)]">{value}</dd></div>
}

function FieldError({ value }) {
  const message = Array.isArray(value) ? value.join(' ') : value
  return message ? <p role="alert" className="mt-1 text-sm text-[var(--danger-text)]">{message}</p> : null
}

function FormField({ error, children }) {
  return <div>{children}<FieldError value={error} /></div>
}


// Paginación como la de Fondo de Tiempo: solo los números de página con anterior y siguiente,
// centrados; aparece solo cuando hay más de una página.
function PageNav({ count, page, pageSize, hasNext, hasPrevious, onPage }) {
  if (!hasNext && !hasPrevious) return null
  const pages = Math.max(page, Math.ceil(count / pageSize))
  const numbers = [...new Set([1, page - 1, page, page + 1, pages])].filter((n) => n >= 1 && n <= pages).sort((x, y) => x - y)
  return (
    <nav className="page-nav" aria-label="Paginación de postulantes">
      <button type="button" className="page-nav-arrow" aria-label="Anterior" disabled={!hasPrevious} onClick={() => onPage(page - 1)}>
        <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
      </button>
      {numbers.map((n, index) => (
        <span key={n} className="contents">
          {index > 0 && n - numbers[index - 1] > 1 && <span className="page-nav-gap" aria-hidden="true">…</span>}
          <button type="button" className="page-nav-number" aria-current={n === page ? 'page' : undefined} aria-label={`Página ${n}`} onClick={() => n !== page && onPage(n)}>{n}</button>
        </span>
      ))}
      <button type="button" className="page-nav-arrow" aria-label="Siguiente" disabled={!hasNext} onClick={() => onPage(page + 1)}>
        <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
      </button>
    </nav>
  )
}

// Sin resultados: entra con el mismo fundido que las tarjetas (no aparece de golpe) y explica
// qué pasó y qué probar. Ocupa un alto fijo, así la tarjeta no "se corta" al quedar vacía.
function EmptyResults({ student, filtered }) {
  const title = student
    ? 'Todavía no tienes postulaciones académicas registradas.'
    : filtered ? 'No hay estudiantes que coincidan' : 'No se encontraron registros.'
  const hint = student
    ? 'Cuando se registre tu postulación, aparecerá aquí.'
    : filtered ? 'Prueba con otro nombre, R.U. o C.I., o marca otras modalidades en Filtrar.' : 'Las postulaciones registradas aparecerán aquí.'
  const Icon = filtered ? SearchX : Users
  return (
    <div role="status" className="postulantes-empty animate-row-in">
      <span className="postulantes-empty-icon" aria-hidden="true"><Icon className="h-6 w-6" strokeWidth={1.75} /></span>
      <p className="text-base font-semibold text-[var(--heading)]">{title}</p>
      <p className="max-w-sm text-sm text-[var(--text-secondary)]">{hint}</p>
    </div>
  )
}
