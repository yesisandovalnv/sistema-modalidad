import { useEffect, useState } from 'react'
import { Button } from '../ui/button'
import { reportesService } from '../../services/reportesService'

const empty = { modalidad: '', gestion: '', semestre: '', etapa_actual: '', buscar: '', fecha_desde: '', fecha_hasta: '' }
export function ReportFilters({ initial = empty, onApply, showSearch = false }) {
  const [draft, setDraft] = useState({ ...empty, ...initial }); const [modalidades, setModalidades] = useState([]); const [etapas, setEtapas] = useState([]); const [advanced, setAdvanced] = useState(false)
  useEffect(() => { const controller = new AbortController(); reportesService.obtenerModalidades(controller.signal).then(setModalidades).catch(() => {}); return () => controller.abort() }, [])
  useEffect(() => {
    setDraft((current) => ({ ...current, etapa_actual: '' })); setEtapas([])
    if (!draft.modalidad) return
    const controller = new AbortController(); reportesService.obtenerCapacidades(draft.modalidad, controller.signal).then((data) => setEtapas(data.etapas || [])).catch(() => setEtapas([])); return () => controller.abort()
  }, [draft.modalidad])
  const set = (key) => (e) => setDraft((current) => ({ ...current, [key]: e.target.value }))
  const field = 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950'
  return <form className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900" onSubmit={(e) => { e.preventDefault(); onApply(draft) }}>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <label className="grid gap-1 text-sm">Modalidad<select className={field} value={draft.modalidad} onChange={set('modalidad')}><option value="">Todas</option>{modalidades.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}</select></label>
      <label className="grid gap-1 text-sm">Gestión<input className={field} type="number" min="1900" max="2200" value={draft.gestion} onChange={set('gestion')} placeholder="2026" /></label>
      <label className="grid gap-1 text-sm">Semestre<select className={field} value={draft.semestre} onChange={set('semestre')}><option value="">Todos</option><option value="1">Primero</option><option value="2">Segundo</option></select></label>
      <label className="grid gap-1 text-sm">Etapa actual<select className={field} value={draft.etapa_actual} onChange={set('etapa_actual')} disabled={!draft.modalidad || !etapas.some((e) => e.id)}><option value="">Todas</option>{etapas.filter((e) => e.id).map((e) => <option key={e.codigo} value={e.id}>{e.nombre}</option>)}</select>{draft.modalidad && !etapas.some((e) => e.id) && <span className="text-xs text-amber-700">El catálogo actual no expone IDs de etapa.</span>}</label>
      {showSearch && <label className="grid gap-1 text-sm">Buscar<input className={field} value={draft.buscar} onChange={set('buscar')} placeholder="Nombre o código" /></label>}
    </div>
    {advanced && <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-sm">Fecha desde<input className={field} type="date" value={draft.fecha_desde} onChange={set('fecha_desde')} /></label><label className="grid gap-1 text-sm">Fecha hasta<input className={field} type="date" value={draft.fecha_hasta} onChange={set('fecha_hasta')} /></label></div>}
    <div className="mt-4 flex flex-wrap gap-2"><Button type="submit">Aplicar filtros</Button><Button type="button" variant="outline" onClick={() => { setDraft(empty); onApply(empty) }}>Limpiar filtros</Button><Button type="button" variant="ghost" onClick={() => setAdvanced((v) => !v)}>{advanced ? 'Ocultar avanzados' : 'Filtros avanzados'}</Button></div>
  </form>
}
