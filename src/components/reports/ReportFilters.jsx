import { useEffect, useState } from 'react'
import { Button } from '../ui/button'
import { reportesService } from '../../services/reportesService'

const empty = { modalidad: '', gestion: '', semestre: '', tipo_registro: '', etapa_actual: '', buscar: '', fecha_desde: '', fecha_hasta: '' }
export function ReportFilters({ initial = empty, onApply, showSearch = false }) {
  const [draft, setDraft] = useState({ ...empty, ...initial }); const [modalidades, setModalidades] = useState([]); const [etapas, setEtapas] = useState([]); const [advanced, setAdvanced] = useState(false); const [loadingStages, setLoadingStages] = useState(false); const [stageError, setStageError] = useState(''); const [configurationWarning, setConfigurationWarning] = useState('')
  useEffect(() => { const controller = new AbortController(); reportesService.obtenerModalidades(controller.signal).then(setModalidades).catch(() => {}); return () => controller.abort() }, [])
  useEffect(() => {
    setDraft((current) => ({ ...current, etapa_actual: '' })); setEtapas([]); setStageError(''); setConfigurationWarning(''); setLoadingStages(false)
    if (!draft.modalidad) return
    const controller = new AbortController(); setLoadingStages(true); reportesService.obtenerCapacidades(draft.modalidad, controller.signal).then((data) => { setEtapas((data.etapas || []).filter((stage) => stage.id != null)); if (data.configuracion_valida === false) setConfigurationWarning((data.advertencias || [])[0] || 'La modalidad tiene etapas sin configurar.') }).catch((error) => { if (!error.canceled) setStageError('No se pudieron cargar las etapas.') }).finally(() => { if (!controller.signal.aborted) setLoadingStages(false) }); return () => controller.abort()
  }, [draft.modalidad])
  const set = (key) => (e) => setDraft((current) => ({ ...current, [key]: e.target.value }))
  const field = 'h-10 min-w-0 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950'
  return <form className="app-filter-panel rounded-xl border p-4" onSubmit={(e) => { e.preventDefault(); onApply(draft) }}>
    <div className={`grid gap-4 sm:grid-cols-2 ${showSearch ? 'xl:grid-cols-5' : 'lg:grid-cols-4'}`}>
      <label className="grid gap-1 text-sm">Modalidad<select className={field} value={draft.modalidad} onChange={set('modalidad')}><option value="">Todas</option>{modalidades.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}</select></label>
      <label className="grid gap-1 text-sm">Gestión<input className={field} type="number" min="1900" max="2200" value={draft.gestion} onChange={set('gestion')} placeholder="2026" /></label>
      <label className="grid gap-1 text-sm">Semestre<select className={field} value={draft.semestre} onChange={set('semestre')}><option value="">Todos</option><option value="I">Primero</option><option value="II">Segundo</option></select></label>
      <label className="grid gap-1 text-sm">Tipo de registro<select aria-label="Tipo de registro" className={field} value={draft.tipo_registro} onChange={set('tipo_registro')}><option value="">Todos</option><option value="SEGUIMIENTO">Seguimiento</option><option value="HISTORICO">Histórico</option></select></label>
      <label className="grid gap-1 text-sm">Etapa actual<select aria-label="Etapa actual" className={field} value={draft.etapa_actual} onChange={set('etapa_actual')} disabled={!draft.modalidad || loadingStages || etapas.length === 0}><option value="">{loadingStages ? 'Cargando etapas…' : etapas.length === 0 && draft.modalidad ? 'Sin etapas disponibles' : 'Todas'}</option>{etapas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}</select>{stageError && <span role="alert" className="text-xs text-red-700">{stageError}</span>}{configurationWarning && <span role="status" className="text-xs text-amber-700">{configurationWarning}</span>}</label>
      {showSearch && <label className="grid gap-1 text-sm">Buscar<input className={field} value={draft.buscar} onChange={set('buscar')} placeholder="Nombre o código" /></label>}
    </div>
    {advanced && <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-sm">Fecha desde<input className={field} type="date" value={draft.fecha_desde} onChange={set('fecha_desde')} /></label><label className="grid gap-1 text-sm">Fecha hasta<input className={field} type="date" value={draft.fecha_hasta} onChange={set('fecha_hasta')} /></label></div>}
    <div className="mt-4 flex flex-wrap gap-2"><Button type="submit">Aplicar filtros</Button><Button type="button" variant="outline" onClick={() => { setDraft(empty); onApply(empty) }}>Limpiar filtros</Button><Button type="button" variant="ghost" onClick={() => setAdvanced((v) => !v)}>{advanced ? 'Ocultar avanzados' : 'Filtros avanzados'}</Button></div>
  </form>
}
