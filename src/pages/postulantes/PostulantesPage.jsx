import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { DataState, Field, Modal, PageHeader, Pager, SearchBar } from '../../components/crud/CrudShell'
import { crudService, endpoints, listAll } from '../../services/crudService'
import { useAuth } from '../../hooks/useAuth'
import { formatPeriodoLabel, formatStudentLabel } from './postulacionFormatters'
import { postulacionesService } from '../../services/postulacionesService'

const emptyForm = { codigo: '', estudiante: '', modalidad: '', periodo: '', observaciones_generales: '' }

export default function PostulantesPage() {
  const { hasPermission } = useAuth()
  const canManage = hasPermission('puede_gestionar_postulaciones')
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState({ results: [] })
  const [catalogs, setCatalogs] = useState({ modalidades: [], periodos: [], estudiantes: [], capacidades: {} })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [catalogError, setCatalogError] = useState('')
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailRevision, setDetailRevision] = useState(0)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [studentQuery, setStudentQuery] = useState('')
  const [revision, setRevision] = useState(0)

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

  const activePeriods = useMemo(
    () => [...catalogs.periodos].sort(
      (a, b) => (b.gestion || 0) - (a.gestion || 0)
        || String(b.semestre || '').localeCompare(String(a.semestre || '')),
    ),
    [catalogs.periodos],
  )
  const visibleStudents = useMemo(() => {
    const value = studentQuery.trim().toLocaleLowerCase('es')
    if (!value) return catalogs.estudiantes
    return catalogs.estudiantes.filter((item) => (
      [item.codigo, item.ru, item.ci, item.nombre_completo]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('es')
        .includes(value)
    ))
  }, [catalogs.estudiantes, studentQuery])

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
      ...form,
      estudiante: Number(form.estudiante),
      modalidad: Number(form.modalidad),
      periodo: Number(form.periodo),
    }
    try {
      if (editing) await crudService.update(endpoints.postulaciones, selected.id, payload)
      else await crudService.create(endpoints.postulaciones, payload)
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
        setError(requestError.message)
        setFieldErrors(requestError.fields || {})
      }
    } finally {
      setSaving(false)
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
                  <Info label="Observaciones generales" value={detail.data.observaciones_generales || 'Sin observaciones generales.'} />
                </dl>
                <p role="note" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
                  Estos son datos técnicos básicos y no sustituyen actos administrativos o institucionales.
                </p>
              </div>
            )}
          </DataState>
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
