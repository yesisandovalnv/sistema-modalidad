import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, Download, Eye, FileText, Pencil, Upload } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { DataState, Modal, PageHeader, Pager, SearchBar } from '../../components/crud/CrudShell'
import { crudService, endpoints, modalidadesService } from '../../services/crudService'
import { useAuth } from '../../hooks/useAuth'
import PdfThumbnail from './PdfThumbnail'
import { createPdfThumbnailCache } from './pdfThumbnailCache'

function formatDate(value) {
	if (!value) return ''
	const date = new Date(value)
	return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('es-BO')
}

function saveBlob(blob, filename, open = false) {
	const url = URL.createObjectURL(blob)
	if (open) window.open(url, '_blank', 'noopener,noreferrer')
	else {
		const link = document.createElement('a')
		link.href = url
		link.download = filename
		link.click()
	}
	window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function DocumentModal({ modalidad, document, onClose, onSaved }) {
	const [file, setFile] = useState(null)
	const [name, setName] = useState(document?.nombre || '')
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState('')
	const replacing = Boolean(document)

	const submit = async (event) => {
		event.preventDefault()
		if (!name.trim()) { setError('Escribe un nombre que permita identificar el documento.'); return }
		if (!replacing && !file) { setError('Selecciona un archivo PDF.'); return }
		setSaving(true); setError('')
		try {
			const saved = replacing
				? await modalidadesService.actualizarDocumentoOficial(modalidad.id, document.id, { archivo: file, nombre: name })
				: await modalidadesService.publicarDocumentoOficial(modalidad.id, { archivo: file, nombre: name })
			onSaved(saved)
		} catch (value) { setError(value.message || 'No se pudo publicar el documento.') } finally { setSaving(false) }
	}

	return <Modal title={`${replacing ? 'Actualizar' : 'Subir'} requisitos: ${modalidad.nombre}`} onClose={saving ? () => {} : onClose}>
		<form className="mt-4 space-y-4" onSubmit={submit}>
			<p className="text-sm text-slate-500">El documento pertenece a <strong>{modalidad.nombre}</strong>.</p>
			{replacing && <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Documento actual</p><p className="mt-1 flex items-center gap-2 text-sm font-medium"><FileText className="h-4 w-4 shrink-0" aria-hidden="true" />{document.nombre}</p><p className="mt-1 text-xs text-slate-500">Selecciona un nuevo PDF solo si deseas reemplazar el archivo actual.</p></div>}
			<label className="block text-sm font-medium">Nombre del documento<input required={!replacing} placeholder="Ej. Reglamento de Examen de Grado" className="mt-1 w-full rounded-lg border px-3 py-2 dark:bg-slate-950" value={name} onChange={(event) => setName(event.target.value)} /><span className="mt-1 block text-xs font-normal text-slate-500">Usa un nombre que permita identificar este documento, por ejemplo: Reglamento de Examen de Grado.</span></label>
			<label className="block text-sm font-medium">Nuevo archivo PDF<input required={!replacing} className="mt-1 block w-full rounded-lg border p-2 text-sm" type="file" accept="application/pdf,.pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} /></label>
			<p className="text-xs text-slate-500">Solo PDF, máximo 10 MB.</p>
			{error && <p role="alert" className="text-sm text-red-600">{error}</p>}
			<div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button><Button disabled={saving}>{saving ? 'Guardando…' : replacing ? 'Actualizar requisitos' : 'Publicar requisitos'}</Button></div>
		</form>
	</Modal>
}

function EditModal({ modalidad, onClose, onSaved }) {
	const [description, setDescription] = useState(modalidad.descripcion || '')
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState('')
	const submit = async (event) => {
		event.preventDefault(); setSaving(true); setError('')
		try { const saved = await crudService.update(endpoints.modalidades, modalidad.id, { descripcion: description }); onSaved(saved) }
		catch (value) { setError(value.message || 'No se pudo actualizar la descripción.') } finally { setSaving(false) }
	}
	return <Modal title={`Editar ${modalidad.nombre}`} onClose={saving ? () => {} : onClose}><form className="mt-5 space-y-4" onSubmit={submit}>
		<label className="block text-sm font-medium">Código<span className="mt-1 block rounded-lg border bg-slate-100 px-3 py-2 text-slate-600 dark:bg-slate-800">{modalidad.codigo}</span><span className="mt-1 block text-xs font-normal text-slate-500">Identificador interno, no editable.</span></label>
		<label className="block text-sm font-medium">Nombre oficial<span className="mt-1 block rounded-lg border bg-slate-100 px-3 py-2 text-slate-600 dark:bg-slate-800">{modalidad.nombre}</span></label>
		<label className="block text-sm font-medium">Descripción<textarea className="mt-1 min-h-28 w-full rounded-lg border p-3 dark:bg-slate-950" value={description} onChange={(event) => setDescription(event.target.value)} /></label>
		{error && <p role="alert" className="text-sm text-red-600">{error}</p>}
		<div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button><Button disabled={saving}>{saving ? 'Guardando…' : 'Guardar descripción'}</Button></div>
	</form></Modal>
}

export default function ModalidadesPage() {
	const { hasPermission, user } = useAuth()
	// eslint-disable-next-line react-hooks/exhaustive-deps -- Private cache must reset on authenticated identity changes.
	const thumbnailCache = useMemo(() => createPdfThumbnailCache(), [user])
	useEffect(() => () => thumbnailCache.clear(), [thumbnailCache])
	const canManage = hasPermission('puede_gestionar_catalogos')
	const [query, setQuery] = useState(''); const [search, setSearch] = useState(''); const [page, setPage] = useState(1)
	const [data, setData] = useState({ results: [] }); const [documents, setDocuments] = useState({}); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [revision, setRevision] = useState(0)
	const [documentModal, setDocumentModal] = useState(null); const [editModal, setEditModal] = useState(null); const [actionError, setActionError] = useState(''); const [expandedDocuments, setExpandedDocuments] = useState(null)

	const load = useCallback(async (signal) => {
		setLoading(true); setError('')
		try {
			const result = await crudService.list(endpoints.modalidades, { search, page, page_size: 100 }, signal)
			const normalized = Array.isArray(result) ? { count: result.length, results: result } : result
			setData(normalized)
			const entries = await Promise.all((normalized.results || []).map(async (item) => [item.id, await modalidadesService.obtenerDocumentosOficiales(item.id, signal)]))
			setDocuments(Object.fromEntries(entries))
		} catch (value) { if (!value.canceled) setError(value.message || 'No se pudieron cargar las modalidades.') } finally { if (!signal?.aborted) setLoading(false) }
	}, [page, search])

	useEffect(() => { const controller = new AbortController(); load(controller.signal); return () => controller.abort() }, [load, revision])

	const refresh = () => { setActionError(''); setRevision((value) => value + 1) }
	const visible = useMemo(() => data.results || [], [data.results])
	const readDocument = async (item, open) => {
		setActionError('')
		try { const result = await modalidadesService.descargarDocumentoOficial(item.id, item.documentoId, item.nombre || `${item.codigo}.pdf`, undefined); saveBlob(result.blob, result.filename, open) }
		catch (value) { if (!value.canceled) setActionError(value.message || 'No se pudo acceder al documento.') }
	}

	return <section className="mx-auto max-w-6xl space-y-5">
		<PageHeader title="Modalidades" description="Consulta las modalidades de graduación y sus requisitos oficiales." />
		<SearchBar value={query} onChange={setQuery} onSearch={() => { setSearch(query.trim()); setPage(1) }} />
		{actionError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{actionError}</p>}
		<DataState loading={loading} error={error} empty={!visible.length} onRetry={refresh}>
			<div className="space-y-3">{visible.map((item) => {
                    const itemDocuments = documents[item.id] || []
                    const isExpanded = expandedDocuments === item.id
                    return <article key={item.id} aria-labelledby={`modalidad-${item.id}`} className="min-w-0 rounded-xl border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                                <h2 id={`modalidad-${item.id}`} className="break-words text-xl font-bold">{item.nombre}</h2>
                                <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${item.activo ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-600'}`}>{item.activo ? 'Activa' : 'Inactiva'}</span>
                            </div>
                            {canManage && <Button variant="ghost" onClick={() => setEditModal(item)}><Pencil className="mr-1 h-4 w-4" aria-hidden="true" />Editar modalidad</Button>}
                        </div>
                        <p className="mt-2 break-words text-sm leading-6 text-slate-600 dark:text-slate-300">{item.descripcion || 'Sin descripción registrada.'}</p>
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 dark:border-slate-700">
                            <Button id={`control-documentos-${item.id}`} variant="ghost" className="group h-11 w-11 shrink-0 p-0 hover:bg-transparent" aria-expanded={isExpanded} aria-controls={`documentos-${item.id}`} onClick={() => setExpandedDocuments(isExpanded ? null : item.id)}>
                                <span className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 transition-colors group-hover:bg-slate-100 motion-reduce:transition-none dark:border-slate-700 dark:group-hover:bg-slate-800">
                                    <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-200 motion-reduce:transition-none ${isExpanded ? 'rotate-180' : ''}`} aria-hidden="true" />
                                </span>
                                <span className="sr-only">Documentos oficiales ({itemDocuments.length})</span>
                            </Button>
                            {canManage && <Button variant="secondary" onClick={() => setDocumentModal({ modalidad: item, document: null })}><Upload className="mr-1 h-4 w-4" aria-hidden="true" />Agregar documento</Button>}
                        </div>
                        <div id={`documentos-${item.id}`} role="region" aria-labelledby={`control-documentos-${item.id}`} aria-hidden={!isExpanded} inert={!isExpanded} className={`grid transition-[grid-template-rows,opacity,visibility] duration-200 motion-reduce:transition-none ${isExpanded ? 'visible grid-rows-[1fr] opacity-100' : 'invisible grid-rows-[0fr] opacity-0'}`}>
                            <div className="min-h-0 overflow-hidden">
                                {itemDocuments.length ? <div className="mt-2 divide-y divide-slate-200/70 rounded-md bg-slate-50/60 px-2 dark:divide-slate-700/50 dark:bg-slate-800/20 sm:px-3">
                                    {itemDocuments.map((document) => <div key={document.id} className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 py-2.5 sm:flex-nowrap">
                                        <PdfThumbnail modalidadId={item.id} document={document} active={isExpanded} cache={thumbnailCache} />
                                        <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold" title={document.nombre}>{document.nombre}</p>{formatDate(document.updated_at) && <p className="mt-1 text-xs text-slate-500">Actualizado {formatDate(document.updated_at)}</p>}</div>
                                        <div className="ml-auto flex w-full shrink-0 items-center justify-end gap-1 sm:w-auto">
                                            <Button variant="ghost" className="h-11 w-11 p-0" aria-label={`Ver ${document.nombre}`} title={`Ver ${document.nombre}`} onClick={() => readDocument({ ...item, documentoId: document.id, nombre: document.nombre }, true)}><Eye className="h-4 w-4" aria-hidden="true" /></Button>
                                            <Button variant="ghost" className="h-11 w-11 p-0" aria-label={`Descargar ${document.nombre}`} title={`Descargar ${document.nombre}`} onClick={() => readDocument({ ...item, documentoId: document.id, nombre: document.nombre }, false)}><Download className="h-4 w-4" aria-hidden="true" /></Button>
                                            {canManage && <Button variant="ghost" className="h-11 w-11 p-0" aria-label={`Editar ${document.nombre}`} title={`Editar ${document.nombre}`} onClick={() => setDocumentModal({ modalidad: item, document })}><Pencil className="h-4 w-4" aria-hidden="true" /></Button>}
                                        </div>
                                    </div>)}
                                </div> : <p className="pt-3 text-sm text-slate-500">Aún no se han publicado documentos oficiales.</p>}
                            </div>
                        </div>
                    </article>
			})}<Pager data={data} page={page} onPage={setPage} /></div>
		</DataState>
		{documentModal && <DocumentModal {...documentModal} onClose={() => setDocumentModal(null)} onSaved={() => { setDocumentModal(null); refresh() }} />}
		{editModal && <EditModal modalidad={editModal} onClose={() => setEditModal(null)} onSaved={() => { setEditModal(null); refresh() }} />}
	</section>
}
