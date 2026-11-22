import { useEffect, useMemo, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { FilterChips, FilterMenu } from '../ui/FilterMenu'
import { activeFilters } from '../../lib/activeFilters'
import { withAccents } from '../../lib/spanishLabel'
import { reportesService } from '../../services/reportesService'

const empty = { modalidad: '', gestion: '', semestre: '', tipo_registro: '', etapa_actual: '', buscar: '', fecha_desde: '', fecha_hasta: '' }

function defaultGestiones() {
  const year = new Date().getFullYear()
  return [year, year - 1, year - 2, year - 3]
}

/**
 * Filtros de los reportes y del Inicio: un botón "Filtrar" que despliega columnas para marcar
 * lo que se quiere ver (se aplica al instante), los chips de lo elegido y, si se pide, un buscador.
 * `gestiones`: años a ofrecer (el Inicio pasa los que tienen postulaciones).
 */
// `layout="header"`: solo el botón, a la derecha de la cabecera (sin chips, para que nada
// se mueva al marcar); lo elegido se informa con `onSummary` para mostrarlo en otro lugar.
export function ReportFilters({ initial = empty, onApply, showSearch = false, gestiones, layout = 'inline', onSummary }) {
  const [values, setValues] = useState({ ...empty, ...initial })
  const [modalidades, setModalidades] = useState([])
  const [etapas, setEtapas] = useState([])
  const [loadingStages, setLoadingStages] = useState(false)
  const [stageError, setStageError] = useState('')
  const [configurationWarning, setConfigurationWarning] = useState('')
  const searchTimer = useRef(null)

  useEffect(() => {
    const controller = new AbortController()
    reportesService.obtenerModalidades(controller.signal).then(setModalidades).catch(() => {})
    return () => controller.abort()
  }, [])

  useEffect(() => {
    setEtapas([]); setStageError(''); setConfigurationWarning(''); setLoadingStages(false)
    if (!values.modalidad) return undefined
    const controller = new AbortController()
    setLoadingStages(true)
    reportesService.obtenerCapacidades(values.modalidad, controller.signal)
      .then((data) => {
        setEtapas((data.etapas || []).filter((stage) => stage.id != null))
        if (data.configuracion_valida === false) setConfigurationWarning((data.advertencias || [])[0] || 'La modalidad tiene etapas sin configurar.')
      })
      .catch((error) => { if (!error.canceled) setStageError('No se pudieron cargar las etapas.') })
      .finally(() => { if (!controller.signal.aborted) setLoadingStages(false) })
    return () => controller.abort()
  }, [values.modalidad])

  useEffect(() => () => window.clearTimeout(searchTimer.current), [])

  const apply = (next) => { setValues(next); onApply(next) }
  const change = (key, value) => {
    const next = { ...values, [key]: value === '' ? '' : String(value) }
    if (key === 'modalidad') next.etapa_actual = ''
    apply(next)
  }
  const clear = () => apply({ ...empty, buscar: values.buscar })

  const years = useMemo(() => {
    const list = [...new Set([...(gestiones || []), ...defaultGestiones()].map(Number).filter(Boolean))]
    return list.sort((a, b) => b - a)
  }, [gestiones])

  const columns = [
    { key: 'gestion', group: 'periodo', title: 'Gestión', options: years.map((year) => ({ value: String(year), label: String(year) })) },
    { key: 'semestre', group: 'periodo', title: 'Semestre', options: [{ value: 'I', label: 'Semestre I' }, { value: 'II', label: 'Semestre II' }] },
    { key: 'modalidad', group: 'modalidad', title: 'Modalidad', options: modalidades.map((m) => ({ value: String(m.id), label: withAccents(m.nombre) })) },
    { key: 'tipo_registro', group: 'proceso', title: 'Tipo de registro', options: [{ value: 'SEGUIMIENTO', label: 'Seguimiento' }, { value: 'HISTORICO', label: 'Histórico' }] },
    {
      key: 'etapa_actual',
      group: 'proceso',
      title: 'Etapa actual',
      disabled: !values.modalidad || loadingStages,
      options: etapas.map((e) => ({ value: String(e.id), label: withAccents(e.nombre) })),
      note: !values.modalidad ? 'Elige una modalidad' : loadingStages ? 'Cargando etapas…' : etapas.length === 0 ? 'Sin etapas disponibles' : '',
    },
  ]

  const header = layout === 'header'
  const summary = activeFilters(columns, values).map((item) => item.label).join(' · ')
  useEffect(() => { onSummary?.(summary) }, [summary, onSummary])
  return (
    <div className={header ? 'report-filters contents' : 'report-filters flex min-w-0 flex-col gap-2'}>
      <div className={header ? 'report-filters-action' : 'flex min-w-0 flex-wrap items-center gap-2'}>
        {showSearch && (
          <label className="search-pill relative min-w-0 flex-1 sm:max-w-sm">
            <span className="sr-only">Buscar</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" aria-hidden="true" />
            <input
              className="pill-control pl-10"
              value={values.buscar}
              placeholder="Buscar por nombre o código"
              onChange={(event) => {
                const next = { ...values, buscar: event.target.value }
                setValues(next)
                window.clearTimeout(searchTimer.current)
                searchTimer.current = window.setTimeout(() => onApply(next), 350)
              }}
            />
          </label>
        )}
        <FilterMenu columns={columns} values={values} onChange={change} onClear={clear} />
        {!header && <FilterChips columns={columns} values={values} onChange={change} />}
      </div>
      {(stageError || configurationWarning) && (
        <div className={`space-y-1 px-1 text-xs ${header ? 'report-filters-chips' : ''}`}>
          {stageError && <p role="alert" className="text-[var(--danger-text)]">{stageError}</p>}
          {configurationWarning && <p role="status" className="text-[var(--warning-text)]">{configurationWarning}</p>}
        </div>
      )}
    </div>
  )
}
