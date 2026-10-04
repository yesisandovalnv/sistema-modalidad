import { useEffect, useState } from 'react'
import { Modal } from '../crud/CrudShell'
import { Button } from '../ui/button'
import { postulacionesService } from '../../services/postulacionesService'

function formatDefenseDate(value) {
  if (!value) return 'No registrada'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'No registrada' : date.toLocaleString('es-BO')
}

export default function UploadDialog({ upload, types, postulacion, isHistorical, beforeFields = null, onSubmit, onMultipleSubmit, onClose }) {
  const fixedType = upload.document
  const multiple = isHistorical || upload.multiple === true
  const [selectedTypeId, setSelectedTypeId] = useState('')
  const [selectedEventId, setSelectedEventId] = useState('')
  const [publicDefenses, setPublicDefenses] = useState({ data: [], loading: false, error: '' })
  const [historicalSelections, setHistoricalSelections] = useState([])
  const [historicalStatus, setHistoricalStatus] = useState({ submitting: false, summary: '', items: [] })
  const uploading = Boolean(upload.submitting || historicalStatus.submitting)
  const closeSafely = () => {
    if (!uploading) onClose()
  }
  const selectedType = fixedType || types.data.find((type) => String(type.id) === String(selectedTypeId))
  const isDefenseRecord = selectedType?.codigo === 'ACTA_DEFENSA' || selectedType?.tipo_documento_codigo === 'ACTA_DEFENSA'
  const hasDefenseRecord = multiple && types.data.some((type) => (type.codigo || type.tipo_documento_codigo) === 'ACTA_DEFENSA')

  useEffect(() => {
    if (!fixedType && multiple && types.data.length > 0) {
      setHistoricalSelections((current) => {
        const currentMap = new Map((current || []).map((entry) => [entry.typeId, entry]))
        return types.data.map((type) => {
          const currentEntry = currentMap.get(type.id)
          return {
            typeId: type.id,
            typeName: type.nombre,
            typeCode: type.codigo || type.tipo_documento_codigo,
            file: currentEntry?.file || null,
            status: currentEntry?.status || 'idle',
            error: currentEntry?.error || '',
          }
        })
      })
    }
  }, [fixedType, multiple, types.data])

  useEffect(() => {
    setSelectedEventId('')
    if (!isDefenseRecord && !hasDefenseRecord) {
      setPublicDefenses({ data: [], loading: false, error: '' })
      return undefined
    }
    const controller = new AbortController()
    setPublicDefenses({ data: [], loading: true, error: '' })
    const load = async () => {
      try {
        const candidates = []
        const seenCandidates = new Set()
        const seenNextPages = new Set()
        let page = 1
        let next = true
        while (next && !controller.signal.aborted) {
          const result = await postulacionesService.obtenerDefensas(postulacion, page, controller.signal)
          const items = result?.results || result || []
          items.filter((item) => item.tipo_evento === 'DEFENSA_PUBLICA' && item.estado === 'FINALIZADA' && item.activo !== false).forEach((item) => {
            if (!seenCandidates.has(item.id)) { seenCandidates.add(item.id); candidates.push(item) }
          })
          const nextPage = result?.next || ''
          next = Boolean(nextPage) && !seenNextPages.has(nextPage)
          if (nextPage) seenNextPages.add(nextPage)
          page += 1
        }
        if (!controller.signal.aborted) {
          setPublicDefenses({ data: candidates, loading: false, error: '' })
          if (candidates.length === 1) setSelectedEventId(String(candidates[0].id))
        }
      } catch (error) {
        if (!error.canceled && !controller.signal.aborted) setPublicDefenses({ data: [], loading: false, error: error.message })
      }
    }
    load()
    return () => controller.abort()
  }, [hasDefenseRecord, isDefenseRecord, postulacion])

  const fieldMessage = (name) => {
    const value = upload.fields?.[name]
    return Array.isArray(value) ? value.join(' ') : value
  }

  const selectedHistoryCount = historicalSelections.filter((item) => item.file).length

  const handleHistoricalFileChange = (typeId, file) => {
    setHistoricalSelections((current) => current.map((item) => (
      item.typeId === typeId ? { ...item, file, status: file ? 'selected' : 'idle', error: '' } : item
    )))
    setHistoricalStatus((current) => ({ ...current, summary: '', items: [] }))
  }

  const handleHistoricalRemove = (typeId) => {
    setHistoricalSelections((current) => current.map((item) => (
      item.typeId === typeId ? { ...item, file: null, status: 'idle', error: '' } : item
    )))
    setHistoricalStatus((current) => ({ ...current, summary: '', items: [] }))
  }

  const handleHistoricalSubmit = async (event) => {
    event.preventDefault()
    const selectedEntries = historicalSelections
      .filter((item) => item.file)
      .map((item) => ({ tipo_documento_id: item.typeId, archivo: item.file, evento_defensa_id: item.typeCode === 'ACTA_DEFENSA' ? selectedEventId : undefined, typeId: item.typeId, typeName: item.typeName }))
    if (selectedEntries.length === 0) return
    if (selectedEntries.some((item) => item.evento_defensa_id === '')) {
      setHistoricalStatus({ submitting: false, summary: 'Selecciona la Defensa Pública finalizada.', items: [] })
      return
    }

    setHistoricalStatus({ submitting: true, summary: '', items: [] })
    try {
      const result = await onMultipleSubmit(selectedEntries)
      const nextItems = result.items || []
      setHistoricalSelections((current) => current.map((item) => {
        const matching = nextItems.find((entry) => String(entry.tipo_documento_id) === String(item.typeId))
        if (!matching) return item
        if (matching.status === 'success') {
          return { ...item, file: null, status: 'uploaded', error: '' }
        }
        return { ...item, status: 'error', error: matching.message || 'No se pudo cargar este documento.', file: item.file }
      }))
      setHistoricalStatus({ submitting: false, summary: result.summary, items: nextItems })
      if (result.successCount === selectedEntries.length && !upload.trackIndividualStatus) {
        setHistoricalSelections((current) => current.map((item) => ({ ...item, file: null, status: 'idle', error: '' })))
      }
    } catch (requestError) {
      setHistoricalStatus({ submitting: false, summary: requestError.message || 'No se pudo completar la carga.', items: [] })
    }
  }

  const retryFailedHistoricalUpload = async () => {
    const retryEntries = historicalSelections
      .filter((item) => item.file && item.status === 'error')
      .map((item) => ({ tipo_documento_id: item.typeId, archivo: item.file, evento_defensa_id: item.typeCode === 'ACTA_DEFENSA' ? selectedEventId : undefined, typeId: item.typeId, typeName: item.typeName }))
    if (retryEntries.length === 0) return
    setHistoricalStatus({ submitting: true, summary: '', items: [] })
    try {
      const result = await onMultipleSubmit(retryEntries)
      const nextItems = result.items || []
      setHistoricalSelections((current) => current.map((item) => {
        const matching = nextItems.find((entry) => String(entry.tipo_documento_id) === String(item.typeId))
        if (!matching) return item
        if (matching.status === 'success') {
          return { ...item, file: null, status: 'uploaded', error: '' }
        }
        return { ...item, status: 'error', error: matching.message || 'No se pudo cargar este documento.', file: item.file }
      }))
      setHistoricalStatus({ submitting: false, summary: result.summary, items: nextItems })
      if (result.successCount === retryEntries.length && !upload.trackIndividualStatus) {
        setHistoricalSelections((current) => current.map((item) => ({ ...item, file: null, status: 'idle', error: '' })))
      }
    } catch (requestError) {
      setHistoricalStatus({ submitting: false, summary: requestError.message || 'No se pudo completar la carga.', items: [] })
    }
  }

  const renderHistoryBody = () => {
    if (!multiple || fixedType) return null

    return (
      <div className="grid gap-3">
        {historicalSelections.length > 0 && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <p className="text-xs text-slate-500">Adjunta los documentos disponibles del expediente. No es obligatorio cargar todos en una sola operación.</p>
          </div>
        )}
        {historicalSelections.length === 0 ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-900">
            <span>0 documentos seleccionados</span>
            <Button type="submit" disabled className="min-w-[180px]">Cargar 0 documentos</Button>
          </div>
        ) : historicalSelections.map((entry) => (
          <div key={entry.typeId} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label htmlFor={`historical-file-${entry.typeId}`} className="min-w-0 flex-1 text-sm font-medium text-slate-800 dark:text-slate-100">
                {entry.typeName}
              </label>
              {entry.file && (
                <button type="button" className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800" onClick={() => handleHistoricalRemove(entry.typeId)}>
                  Quitar
                </button>
              )}
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <input id={`historical-file-${entry.typeId}`} aria-label={entry.typeName} type="file" disabled={upload.submitting || historicalStatus.submitting} className="block w-full rounded-lg border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-950" onChange={(event) => handleHistoricalFileChange(entry.typeId, event.target.files?.[0] || null)} />
              {entry.file && <span className="truncate text-xs text-slate-500">{entry.file.name}</span>}
            </div>
            {entry.typeCode === 'ACTA_DEFENSA' && publicDefenses.data.length > 0 && <label className="mt-3 block text-sm">Defensa Pública finalizada
              <select required value={selectedEventId} disabled={upload.submitting || historicalStatus.submitting} onChange={(event) => setSelectedEventId(event.target.value)} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-950">
                <option value="">Seleccione la Defensa Pública</option>{publicDefenses.data.map((defense) => <option key={defense.id} value={defense.id}>{formatDefenseDate(defense.fecha_fin_real || defense.fecha_programada)} — {defense.lugar || 'Sin lugar'}</option>)}
              </select>
            </label>}
            {upload.trackIndividualStatus && <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">Estado: {entry.status === 'uploaded' ? 'Cargado' : entry.status === 'error' ? 'Error' : entry.file ? 'Seleccionado' : 'Pendiente'}</p>}
            {entry.error && <p className="mt-2 text-xs text-red-600">{entry.error}</p>}
          </div>
        ))}
        {upload.trackIndividualStatus && upload.stageProgress && <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-900">
          <p className="font-semibold">{upload.stageProgress.completed} de {upload.stageProgress.total} requisitos de Inscripción cumplidos</p>
          <progress className="mt-2 h-3 w-full" max={upload.stageProgress.total || 1} value={upload.stageProgress.completed} aria-label="Avance de requisitos de Inscripción" />
        </div>}
        {historicalSelections.length > 0 && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-900">
            <span>{selectedHistoryCount} documento{selectedHistoryCount === 1 ? '' : 's'} seleccionado{selectedHistoryCount === 1 ? '' : 's'}</span>
            <Button type="submit" disabled={historicalStatus.submitting || selectedHistoryCount === 0 || (historicalSelections.some((item) => item.file && item.typeCode === 'ACTA_DEFENSA') && (publicDefenses.loading || Boolean(publicDefenses.error) || publicDefenses.data.length === 0 || !selectedEventId))} className="min-w-[180px]">
              {historicalStatus.submitting ? `Cargando ${selectedHistoryCount} de ${selectedHistoryCount}...` : `Cargar ${selectedHistoryCount} documento${selectedHistoryCount === 1 ? '' : 's'}`}
            </Button>
          </div>
        )}
        {historicalStatus.summary && (
          <div className="space-y-3">
            <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{historicalStatus.summary}</p>
            {historicalStatus.items.some((item) => item.status === 'error') && (
              <Button type="button" variant="secondary" onClick={retryFailedHistoricalUpload} disabled={historicalStatus.submitting}>
                Reintentar
              </Button>
            )}
          </div>
        )}
      </div>
    )
  }

  return <Modal title={upload.title || (fixedType ? 'Cargar nueva versión' : isHistorical ? 'Cargar documentación histórica' : 'Cargar documento')} onClose={closeSafely}>
    {upload.success && !multiple ? <div className="mt-4"><p role="status" className="rounded-lg bg-emerald-50 p-3 text-emerald-800">{upload.success}</p><Button className="mt-4" onClick={closeSafely}>Cerrar</Button></div> : <form className="mt-4 grid gap-4" onSubmit={multiple ? handleHistoricalSubmit : onSubmit} noValidate>
      {beforeFields}
      {fixedType ? <div><p className="text-sm text-slate-500">Tipo documental</p><p className="break-words font-medium">{fixedType.tipo_documento_nombre}</p></div> : !multiple && <label className="text-sm">Tipo documental
        <select name="tipo_documento_id" required disabled={types.loading || upload.submitting} onChange={(event) => setSelectedTypeId(event.target.value)} aria-describedby={fieldMessage('tipo_documento_id') ? 'tipo-error' : undefined} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-950">
          <option value="">Seleccione un tipo documental</option>{types.data.map((type) => <option key={type.id} value={type.id}>{type.nombre}</option>)}
        </select>{fieldMessage('tipo_documento_id') && <span id="tipo-error" className="mt-1 block text-red-600">{fieldMessage('tipo_documento_id')}</span>}
      </label>}
      {types.loading && <p role="status">Cargando tipos documentales…</p>}
      {types.error && <p role="alert" className="text-red-600">{types.error}</p>}
      {!fixedType && !types.loading && !types.error && types.data.length === 0 && <p role="status">No hay tipos documentales activos disponibles.</p>}
      {hasDefenseRecord && publicDefenses.loading && <p role="status">Buscando Defensas Públicas finalizadas…</p>}
      {hasDefenseRecord && publicDefenses.error && <p role="alert" className="text-red-600">{publicDefenses.error}</p>}
      {hasDefenseRecord && !publicDefenses.loading && !publicDefenses.error && publicDefenses.data.length === 0 && <p role="alert" className="text-amber-700">No existen Defensas Públicas finalizadas disponibles para vincular el Acta de Defensa.</p>}
      {isDefenseRecord && publicDefenses.loading && <p role="status">Buscando Defensas Públicas finalizadas…</p>}
      {isDefenseRecord && publicDefenses.error && <p role="alert" className="text-red-600">{publicDefenses.error}</p>}
      {isDefenseRecord && !publicDefenses.loading && !publicDefenses.error && publicDefenses.data.length === 0 && <p role="alert" className="text-amber-700">No existen Defensas Públicas finalizadas disponibles para vincular el Acta de Defensa.</p>}
      {isDefenseRecord && publicDefenses.data.length > 0 && <label className="text-sm">Defensa Pública finalizada
        <select name="evento_defensa_id" required value={selectedEventId} disabled={upload.submitting} onChange={(event) => setSelectedEventId(event.target.value)} aria-describedby={fieldMessage('evento_defensa_id') ? 'defensa-error' : undefined} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-950">
          <option value="">Seleccione la Defensa Pública</option>{publicDefenses.data.map((defense) => <option key={defense.id} value={defense.id}>{formatDefenseDate(defense.fecha_fin_real || defense.fecha_programada)} — {defense.lugar || 'Sin lugar'}</option>)}
        </select>{fieldMessage('evento_defensa_id') && <span id="defensa-error" className="mt-1 block text-red-600">{fieldMessage('evento_defensa_id')}</span>}
      </label>}
      {!multiple && <label className="text-sm">Archivo
        <input name="archivo" type="file" required disabled={upload.submitting} aria-describedby={fieldMessage('archivo') ? 'archivo-error' : undefined} className="mt-1 block w-full rounded-lg border p-2" />
        {fieldMessage('archivo') && <span id="archivo-error" className="mt-1 block text-red-600">{fieldMessage('archivo')}</span>}
      </label>}
      {multiple && renderHistoryBody()}
      {fieldMessage('non_field_errors') && <p role="alert" className="text-red-600">{fieldMessage('non_field_errors')}</p>}
      {upload.error && <p role="alert" className="text-red-600">{upload.error}</p>}
      {!multiple && <div className="flex flex-wrap gap-3"><Button type="submit" disabled={upload.submitting || types.loading || Boolean(types.error) || (!fixedType && types.data.length === 0) || (isDefenseRecord && (publicDefenses.loading || Boolean(publicDefenses.error) || publicDefenses.data.length === 0 || !selectedEventId))}>{upload.submitting ? 'Enviando…' : fixedType ? 'Cargar nueva versión' : 'Cargar documento'}</Button><Button type="button" variant="secondary" disabled={upload.submitting} onClick={closeSafely}>Cancelar</Button></div>}
      {multiple && <div className="flex flex-wrap gap-3"><Button type="button" variant="secondary" disabled={historicalStatus.submitting} onClick={closeSafely}>Cancelar</Button></div>}
    </form>}
  </Modal>
}
