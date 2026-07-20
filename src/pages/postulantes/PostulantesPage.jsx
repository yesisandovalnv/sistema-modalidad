import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { DataState, Field, Modal, PageHeader, Pager, SearchBar } from '../../components/crud/CrudShell'
import { crudService, endpoints, listAll } from '../../services/crudService'
import { useAuth } from '../../hooks/useAuth'
import { formatPeriodoLabel, formatStudentLabel } from './postulacionFormatters'

const emptyForm = { codigo: '', estudiante: '', modalidad: '', periodo: '', observaciones_generales: '' }

export default function PostulantesPage() {
  const { hasPermission } = useAuth()
  const canManage = hasPermission('puede_gestionar_postulaciones')
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState({ results: [] })
  const [catalogs, setCatalogs] = useState({ modalidades: [], periodos: [], estudiantes: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [catalogError, setCatalogError] = useState('')
  const [selected, setSelected] = useState(null)
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
        setCatalogs({ modalidades, periodos, estudiantes })
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
      formatStudentLabel(item).toLocaleLowerCase('es').includes(value)
    ))
  }, [catalogs.estudiantes, studentQuery])

  const open = (item = null) => {
    setSelected(item)
    setEditing(Boolean(item))
    setFieldErrors({})
    setStudentQuery('')
    setForm(item ? {
      codigo: item.codigo,
      estudiante: String(item.estudiante),
      modalidad: String(item.modalidad),
      periodo: String(item.periodo),
      observaciones_generales: item.observaciones_generales || '',
    } : { ...emptyForm })
  }

  const change = (name, value) => {
    setForm((old) => ({ ...old, [name]: value }))
    setFieldErrors((old) => ({ ...old, [name]: undefined }))
  }

  const save = async (event) => {
    event.preventDefault()
    if (saving) return
    const required = ['codigo', 'estudiante', 'modalidad', 'periodo']
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
    const payload = {
      ...form,
      estudiante: Number(form.estudiante),
      modalidad: Number(form.modalidad),
      periodo: Number(form.periodo),
    }
    try {
      if (editing) await crudService.update(endpoints.postulaciones, selected.id, payload)
      else await crudService.create(endpoints.postulaciones, payload)
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
                    <Info label="Estudiante" value={studentName(item.estudiante) ? formatStudentLabel(studentName(item.estudiante)) : 'Estudiante registrado'} />
                    <Info label="Modalidad" value={catalogs.modalidades.find((value) => value.id === item.modalidad)?.nombre || 'Modalidad registrada'} />
                    <Info label="Periodo" value={periodName(item.periodo) ? formatPeriodoLabel(periodName(item.periodo)) : 'Periodo registrado'} />
                    <Info label="Estado" value={item.estado_actual || 'Sin estado'} />
                  </dl>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-800" to={`/postulaciones/${item.id}`}>
                    Abrir expediente
                  </Link>
                  <Button variant="secondary" onClick={() => setSelected(item)}>Detalle</Button>
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
      {selected && !form && (
        <Modal title={`Postulación ${selected.codigo}`} onClose={() => setSelected(null)}>
          <p className="mt-4">{selected.observaciones_generales || 'Sin observaciones.'}</p>
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
            <div>
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
            </div>
            <Select
              label="Modalidad"
              value={form.modalidad}
              items={catalogs.modalidades}
              format={(item) => item.nombre}
              onChange={(value) => change('modalidad', value)}
              error={fieldErrors.modalidad}
            />
            <Select
              label="Gestión / Semestre"
              value={form.periodo}
              items={activePeriods}
              format={formatPeriodoLabel}
              onChange={(value) => change('periodo', value)}
              error={fieldErrors.periodo}
            />
            <label className="text-sm sm:col-span-2">
              Observaciones
              <textarea
                value={form.observaciones_generales}
                onChange={(event) => change('observaciones_generales', event.target.value)}
                className="mt-1 w-full rounded-lg border p-3 dark:bg-slate-950"
              />
            </label>
            {!activePeriods.length && (
              <p role="status" className="text-sm text-amber-700 sm:col-span-2">
                No existen periodos académicos activos.
              </p>
            )}
            {error && <p role="alert" className="text-red-600 sm:col-span-2">{error}</p>}
            <Button disabled={saving || !activePeriods.length} className="sm:col-span-2">
              {saving ? 'Guardando…' : 'Guardar'}
            </Button>
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

function Select({ label, value, items, format, onChange, error }) {
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
        {items.map((item) => <option key={item.id} value={item.id}>{format(item)}</option>)}
      </select>
      <FieldError value={error} />
    </label>
  )
}
