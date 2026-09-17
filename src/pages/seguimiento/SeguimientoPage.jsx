import { useCallback, useEffect, useState } from 'react'
import { Button } from '../../components/ui/button'
import { DataState, Modal, PageHeader, Pager, SearchBar } from '../../components/crud/CrudShell'
import { crudService, endpoints } from '../../services/crudService'
import { useAuth } from '../../hooks/useAuth'
import { formatCodeLabel } from '../../lib/utils'

function Info({ label, value }) {
  return <div><dt className="font-semibold">{label}</dt><dd>{value || '—'}</dd></div>
}

function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) return '—'
  return new Intl.DateTimeFormat('es-BO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date)
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
  const [revision, setRevision] = useState(0)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (signal) => {
    setLoading(true)
    setError('')
    try {
      setData(await crudService.list(endpoints.seguimiento, { search, page, ordering: 'etapa__orden' }, signal))
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

  const act = async (item, action) => {
    const observations = action === 'observar' ? window.prompt('Ingrese la observación:') : ''
    if (action === 'observar' && !observations?.trim()) return
    setBusy(true)
    setError('')
    try {
      await crudService.action(endpoints.seguimiento, item.id, action, observations ? { observaciones: observations } : {})
      setRevision((value) => value + 1)
      setSelected(null)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  return <section className="mx-auto max-w-6xl space-y-5">
    <PageHeader title="Seguimiento" description="Consulta y gestiona las etapas del workflow dentro de tu alcance." />
    <SearchBar value={query} onChange={setQuery} onSearch={() => { setSearch(query.trim()); setPage(1) }} />
    <DataState loading={loading} error={error} empty={!data.results?.length} onRetry={() => setRevision((value) => value + 1)}>
      <div className="space-y-3">
        {data.results?.map((item) => <article key={item.id} className="rounded-xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500">{item.codigo} · Intento {item.numero_intento}</p>
              <h2 className="text-lg font-bold">{item.nombre}</h2>
              <p className="text-sm">{item.codigo_postulacion} · {formatCodeLabel(item.estado)}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">{item.estudiante_nombre} · {item.modalidad_nombre}</p>
            </div>
            <Button variant="secondary" onClick={() => setSelected(item)}>Detalle y acciones</Button>
          </div>
        </article>)}
        <Pager data={data} page={page} onPage={setPage} />
      </div>
    </DataState>
    {selected && <Modal title={selected.nombre} onClose={() => setSelected(null)}>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <Info label="Código de postulación" value={selected.codigo_postulacion} />
        <Info label="Estudiante" value={selected.estudiante_nombre} />
        <Info label="Modalidad" value={selected.modalidad_nombre} />
        <Info label="Etapa" value={selected.nombre} />
        <Info label="Estado" value={formatCodeLabel(selected.estado)} />
        <Info label="Intento" value={selected.numero_intento} />
        <Info label="Inicio" value={formatDateTime(selected.fecha_inicio)} />
        <Info label="Fin" value={formatDateTime(selected.fecha_fin)} />
      </dl>
      {selected.observaciones && <p className="mt-4">{selected.observaciones}</p>}
      {canManage && selected.acciones_permitidas?.length > 0 && <div className="mt-5 flex flex-wrap gap-2">
        {selected.acciones_permitidas.includes('iniciar') && <Button disabled={busy} onClick={() => act(selected, 'iniciar')}>Iniciar</Button>}
        {selected.acciones_permitidas.includes('aprobar') && <Button disabled={busy} onClick={() => act(selected, 'aprobar')}>Aprobar</Button>}
        {selected.acciones_permitidas.includes('observar') && <Button disabled={busy} variant="secondary" onClick={() => act(selected, 'observar')}>Observar</Button>}
        {selected.acciones_permitidas.includes('rechazar') && <Button disabled={busy} variant="outline" onClick={() => act(selected, 'rechazar')}>Rechazar</Button>}
        {selected.acciones_permitidas.includes('omitir') && <Button disabled={busy} variant="outline" onClick={() => act(selected, 'omitir')}>Omitir</Button>}
      </div>}
      {canManage && !selected.acciones_permitidas?.length && <p className="mt-5 text-sm text-slate-500">No hay acciones disponibles para esta etapa.</p>}
      {error && <p role="alert" className="mt-3 text-red-600">{error}</p>}
    </Modal>}
  </section>
}
