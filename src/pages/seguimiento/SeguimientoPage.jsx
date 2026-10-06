import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { DataState, Modal, PageHeader, Pager, SearchBar } from '../../components/crud/CrudShell'
import { crudService, endpoints, listAll } from '../../services/crudService'
import { useAuth } from '../../hooks/useAuth'
import { formatCodeLabel } from '../../lib/utils'

const actionLabels = { iniciar: 'Iniciar', aprobar: 'Aprobar', rechazar: 'Rechazar', omitir: 'Omitir' }
const seguimientoStates = [
  ['PENDIENTE', 'Pendiente'], ['EN_PROCESO', 'En proceso'], ['OBSERVADA', 'Observada'],
  ['APROBADA', 'Aprobada'], ['RECHAZADA', 'Rechazada'], ['OMITIDA', 'Omitida'],
]
const emptyFilters = { modalidad: '', estado: '', etapa: '', periodo: '' }

function Info({ label, value }) {
  return <div><dt className="font-semibold">{label}</dt><dd>{value || '—'}</dd></div>
}

function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) return '—'
  return new Intl.DateTimeFormat('es-BO', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
  }).format(date)
}

function ActionContext({ item }) {
  return <p className="text-sm text-slate-600 dark:text-slate-300">{item.nombre} · {item.estudiante_nombre || item.codigo_postulacion}</p>
}

export default function SeguimientoPage() {
  const { hasPermission } = useAuth()
  const canManage = hasPermission('puede_gestionar_seguimiento')
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState({ results: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [pendingAction, setPendingAction] = useState(null)
  const [observation, setObservation] = useState('')
  const [actionError, setActionError] = useState('')
  const [revision, setRevision] = useState(0)
  const [busy, setBusy] = useState(false)
  const [filters, setFilters] = useState(emptyFilters)
  const [modalidades, setModalidades] = useState([])
  const [periodos, setPeriodos] = useState([])
  const [etapas, setEtapas] = useState([])
  const [catalogError, setCatalogError] = useState('')

  const load = useCallback(async (signal) => {
    setLoading(true)
    setError('')
    try {
      setData(await crudService.list(endpoints.seguimiento, { search, page, ordering: '-updated_at,-id', ...filters }, signal))
    } catch (requestError) {
      if (!requestError.canceled) setError(requestError.message)
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [search, page, filters])

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      listAll(endpoints.modalidades, { activo: true, ordering: 'nombre' }, controller.signal),
      listAll(endpoints.periodos, { activo: true, ordering: '-gestion,-semestre' }, controller.signal),
    ]).then(([modalidadesData, periodosData]) => {
      setModalidades(modalidadesData)
      setPeriodos(periodosData)
    }).catch((requestError) => {
      if (!requestError.canceled) setCatalogError('No se pudieron cargar los filtros disponibles.')
    })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!filters.modalidad) {
      setEtapas([])
      return undefined
    }
    const controller = new AbortController()
    crudService.list(`${endpoints.modalidades}${filters.modalidad}/capacidades/`, {}, controller.signal)
      .then((capabilities) => setEtapas((capabilities.etapas || []).filter((etapa) => etapa.id)))
      .catch((requestError) => {
        if (!requestError.canceled) setCatalogError('No se pudieron cargar las etapas de la modalidad.')
      })
    return () => controller.abort()
  }, [filters.modalidad])

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [load, revision])

  const openDetail = (item) => {
    setSelected(item)
    setPendingAction(null)
    setObservation('')
    setActionError('')
  }

  const closeDetail = () => {
    if (busy) return
    setSelected(null)
    setPendingAction(null)
    setObservation('')
    setActionError('')
  }

  const openAction = (action) => {
    setPendingAction(action)
    setObservation('')
    setActionError('')
  }

  const cancelAction = () => {
    if (busy) return
    setPendingAction(null)
    setObservation('')
    setActionError('')
  }

  const act = async (item, action, observations = '') => {
    if (busy) return
    const normalizedObservation = observations.trim()
    if (action === 'observar' && !normalizedObservation) {
      setActionError('La observación es obligatoria.')
      return
    }
    setBusy(true)
    setActionError('')
    try {
      await crudService.action(endpoints.seguimiento, item.id, action, normalizedObservation ? { observaciones: normalizedObservation } : {})
      setRevision((value) => value + 1)
      setSelected(null)
      setPendingAction(null)
      setObservation('')
    } catch (requestError) {
      setActionError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  const hasActions = (item) => item.acciones_permitidas?.length > 0
  const changeFilter = (name, value) => {
    setFilters((current) => ({ ...current, [name]: value, ...(name === 'modalidad' ? { etapa: '' } : {}) }))
    setPage(1)
  }
  const clearFilters = () => {
    setFilters(emptyFilters)
    setPage(1)
  }

  return <section className="mx-auto max-w-6xl space-y-5">
    <PageHeader title="Seguimiento" description="Consulta y gestiona las etapas de los procesos académicos." />
    <SearchBar value={query} onChange={setQuery} onSearch={() => { setSearch(query.trim()); setPage(1) }} />
    <div className="grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-2 lg:grid-cols-5 dark:border-slate-800 dark:bg-slate-900">
      <label className="text-sm font-medium">Modalidad
        <select aria-label="Modalidad" value={filters.modalidad} onChange={(event) => changeFilter('modalidad', event.target.value)} className="mt-1 w-full rounded-lg border bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
          <option value="">Todas</option>
          {modalidades.map((modalidad) => <option key={modalidad.id} value={modalidad.id}>{modalidad.nombre}</option>)}
        </select>
      </label>
      <label className="text-sm font-medium">Estado
        <select aria-label="Estado" value={filters.estado} onChange={(event) => changeFilter('estado', event.target.value)} className="mt-1 w-full rounded-lg border bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
          <option value="">Todos</option>
          {seguimientoStates.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label className="text-sm font-medium">Etapa
        <select aria-label="Etapa" value={filters.etapa} disabled={!filters.modalidad} onChange={(event) => changeFilter('etapa', event.target.value)} className="mt-1 w-full rounded-lg border bg-white px-3 py-2 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950">
          <option value="">Todas</option>
          {etapas.map((etapa) => <option key={etapa.id} value={etapa.id}>{etapa.nombre}</option>)}
        </select>
      </label>
      <label className="text-sm font-medium">Periodo / gestión
        <select aria-label="Periodo / gestión" value={filters.periodo} onChange={(event) => changeFilter('periodo', event.target.value)} className="mt-1 w-full rounded-lg border bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
          <option value="">Todos</option>
          {periodos.map((periodo) => <option key={periodo.id} value={periodo.id}>{periodo.nombre || `${periodo.gestion}-${periodo.semestre}`}</option>)}
        </select>
      </label>
      <div className="flex items-end"><Button type="button" variant="outline" className="w-full" onClick={clearFilters}>Limpiar filtros</Button></div>
    </div>
    {catalogError && <p role="alert" className="text-sm text-red-600">{catalogError}</p>}
    <DataState loading={loading} error={error} empty={!data.results?.length} onRetry={() => setRevision((value) => value + 1)}>
      <div className="space-y-3">
        {data.results?.map((item) => <article key={item.id} className="rounded-xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                <span>{item.codigo}</span>
                {item.numero_intento > 1 && <span className="rounded-full border px-2 py-0.5">Intento {item.numero_intento}</span>}
              </div>
              <h2 className="mt-1 text-lg font-bold">{item.nombre}</h2>
              <p className="mt-1 text-sm font-medium">{item.codigo_postulacion} · {formatCodeLabel(item.estado)}</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.estudiante_nombre} · {item.modalidad_nombre}</p>
            </div>
            <Button variant="secondary" onClick={() => openDetail(item)}>{hasActions(item) ? 'Gestionar' : 'Ver detalle'}</Button>
          </div>
        </article>)}
        <Pager data={data} page={page} onPage={setPage} />
      </div>
    </DataState>

    {selected && !pendingAction && <Modal title={selected.nombre} onClose={closeDetail}>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <Info label="Código de postulación" value={selected.codigo_postulacion} />
        <Info label="Estudiante" value={selected.estudiante_nombre} />
        <Info label="Modalidad" value={selected.modalidad_nombre} />
        <Info label="Etapa" value={selected.nombre} />
        <Info label="Estado" value={formatCodeLabel(selected.estado)} />
        <Info label="Intento" value={selected.numero_intento} />
        {typeof selected.obligatoria === 'boolean' && <Info label="Obligatoriedad" value={selected.obligatoria ? 'Obligatoria' : 'Opcional'} />}
        <Info label="Inicio" value={formatDateTime(selected.fecha_inicio)} />
        <Info label="Fin" value={formatDateTime(selected.fecha_fin)} />
      </dl>
      {selected.observaciones && <div className="mt-4 rounded-lg border p-3 dark:border-slate-700"><p className="text-sm font-semibold">Observaciones</p><p className="mt-1 whitespace-pre-wrap text-sm">{selected.observaciones}</p></div>}
      <div className="mt-5 flex flex-wrap gap-2">
        <Link className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary-light)] focus:ring-offset-2 focus:ring-offset-[var(--surface)] app-button--outline" to={`/postulaciones/${selected.postulacion}`}>Abrir expediente</Link>
        {canManage && hasActions(selected) && <>
          {selected.acciones_permitidas.includes('iniciar') && <Button disabled={busy} onClick={() => openAction('iniciar')}>Iniciar</Button>}
          {selected.acciones_permitidas.includes('aprobar') && <Button disabled={busy} onClick={() => openAction('aprobar')}>Aprobar</Button>}
          {selected.acciones_permitidas.includes('observar') && <Button disabled={busy} variant="secondary" onClick={() => openAction('observar')}>Observar</Button>}
          {selected.acciones_permitidas.includes('rechazar') && <Button disabled={busy} variant="outline" onClick={() => openAction('rechazar')}>Rechazar</Button>}
          {selected.acciones_permitidas.includes('omitir') && <Button disabled={busy} variant="outline" onClick={() => openAction('omitir')}>Omitir</Button>}
        </>}
      </div>
      {canManage && !hasActions(selected) && <p className="mt-5 text-sm text-slate-500">No hay acciones disponibles para esta etapa.</p>}
    </Modal>}

    {selected && pendingAction === 'observar' && <Modal title="Registrar observación" onClose={cancelAction}>
      <form className="mt-4 space-y-4" onSubmit={(event) => { event.preventDefault(); void act(selected, 'observar', observation) }}>
        <ActionContext item={selected} />
        <label className="block text-sm font-medium" htmlFor="seguimiento-observacion">Observación
          <textarea id="seguimiento-observacion" required rows={5} value={observation} onChange={(event) => { setObservation(event.target.value); setActionError('') }} disabled={busy} className="mt-1 w-full rounded-lg border p-3 dark:bg-slate-950" />
        </label>
        {actionError && <p role="alert" className="text-sm text-red-600">{actionError}</p>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" disabled={busy} onClick={cancelAction}>Cancelar</Button>
          <Button type="submit" disabled={busy || !observation.trim()}>{busy ? 'Guardando…' : 'Confirmar observación'}</Button>
        </div>
      </form>
    </Modal>}

    {selected && pendingAction && pendingAction !== 'observar' && <Modal title={`Confirmar ${actionLabels[pendingAction].toLowerCase()}`} onClose={cancelAction}>
      <div className="mt-4 space-y-4">
        <p>¿Confirmas que deseas {actionLabels[pendingAction].toLowerCase()} esta etapa?</p>
        <ActionContext item={selected} />
        <p className="text-sm text-slate-500">Postulación {selected.codigo_postulacion}</p>
        {actionError && <p role="alert" className="text-sm text-red-600">{actionError}</p>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" disabled={busy} onClick={cancelAction}>Cancelar</Button>
          <Button type="button" disabled={busy} onClick={() => void act(selected, pendingAction)}>{busy ? 'Procesando…' : `Confirmar ${actionLabels[pendingAction].toLowerCase()}`}</Button>
        </div>
      </div>
    </Modal>}
  </section>
}
