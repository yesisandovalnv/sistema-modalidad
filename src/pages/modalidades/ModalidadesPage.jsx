import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, FileText, Pencil, Upload } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { DataState, Modal, PageHeader, Pager, SearchBar } from '../../components/crud/CrudShell'
import { crudService, endpoints, modalidadesService } from '../../services/crudService'
import { useAuth } from '../../hooks/useAuth'

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
	const { hasPermission } = useAuth()
	const canManage = hasPermission('puede_gestionar_catalogos')
	const [query, setQuery] = useState(''); const [search, setSearch] = useState(''); const [page, setPage] = useState(1)
	const [data, setData] = useState({ results: [] }); const [documents, setDocuments] = useState({}); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [revision, setRevision] = useState(0)
	const [documentModal, setDocumentModal] = useState(null); const [editModal, setEditModal] = useState(null); const [actionError, setActionError] = useState(''); const [expandedDocuments, setExpandedDocuments] = useState({})

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
					const itemDocuments = documents[item.id] || []; const active = item.activo; const isExpanded = Boolean(expandedDocuments[item.id]); const displayedDocuments = isExpanded ? itemDocuments : itemDocuments.slice(0, 1); const remainingCount = itemDocuments.length - 1
					const toggleDocuments = () => setExpandedDocuments((current) => ({ ...current, [item.id]: !current[item.id] })); return <article key={item.id} className="rounded-xl border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
						<div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(24rem,2fr)] lg:items-start">
							<div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-bold">{item.nombre}</h2><span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-600'}`}>{active ? 'Activa' : 'Inactiva'}</span></div><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">{item.descripcion || 'Sin descripción registrada.'}</p></div>
							<div className="min-w-0 rounded-lg border bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950"><div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold"><span className="flex items-center gap-2"><FileText className="h-4 w-4" aria-hidden="true" />Requisitos oficiales</span>{itemDocuments.length > 0 && <span className="text-xs font-normal text-slate-500">{itemDocuments.length} documento{itemDocuments.length === 1 ? '' : 's'} disponible{itemDocuments.length === 1 ? '' : 's'}</span>}</div>{itemDocuments.length ? <><div id={`documentos-${item.id}`} className="divide-y divide-slate-200 dark:divide-slate-700">{displayedDocuments.map((document) => <div key={document.id} className="py-3 first:pt-2 last:pb-1"><div className="flex items-start gap-2"><FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" /><div className="min-w-0 flex-1"><p className="break-words text-sm font-semibold leading-5" title={document.nombre}>{document.nombre}</p><p className="mt-0.5 text-[11px] text-slate-500">Actualizado {formatDate(document.updated_at) || 'sin fecha'}</p><div className="mt-2 flex flex-wrap items-center gap-1"><Button variant="secondary" onClick={() => readDocument({ ...item, documentoId: document.id, nombre: document.nombre }, true)}>Ver</Button><Button variant="outline" onClick={() => readDocument({ ...item, documentoId: document.id, nombre: document.nombre }, false)}><Download className="mr-1 h-3.5 w-3.5" aria-hidden="true" />Descargar</Button>{canManage && <Button variant="ghost" aria-label="Actualizar" title="Actualizar documento" onClick={() => setDocumentModal({ modalidad: item, document })}><Pencil className="h-4 w-4" aria-hidden="true" /><span className="sr-only">Actualizar documento</span></Button>}</div></div></div></div>)}</div>{itemDocuments.length > 1 && <Button variant="ghost" aria-expanded={isExpanded} aria-controls={`documentos-${item.id}`} onClick={toggleDocuments}>{isExpanded ? 'Mostrar menos' : `Ver ${remainingCount === 1 ? 'otro documento' : 'otros documentos'} (${remainingCount})`}</Button>}{canManage && <div className="mt-2 flex flex-wrap gap-2 border-t border-slate-200 pt-3 dark:border-slate-700"><Button variant="secondary" onClick={() => setDocumentModal({ modalidad: item, document: null })}><Upload className="mr-1 h-4 w-4" aria-hidden="true" />Agregar documento</Button><Button variant="ghost" onClick={() => setEditModal(item)}><Pencil className="mr-1 h-4 w-4" aria-hidden="true" />Editar modalidad</Button></div>}</> : <><p className="py-2 text-sm text-slate-500">Aún no se han publicado documentos oficiales.</p>{canManage && <div className="mt-2 flex flex-wrap gap-2 border-t border-slate-200 pt-3 dark:border-slate-700"><Button variant="secondary" onClick={() => setDocumentModal({ modalidad: item, document: null })}><Upload className="mr-1 h-4 w-4" aria-hidden="true" />Agregar documento</Button><Button variant="ghost" onClick={() => setEditModal(item)}><Pencil className="mr-1 h-4 w-4" aria-hidden="true" />Editar modalidad</Button></div>}</>}</div>
					</div>
				</article>
			})}<Pager data={data} page={page} onPage={setPage} /></div>
		</DataState>
		{documentModal && <DocumentModal {...documentModal} onClose={() => setDocumentModal(null)} onSaved={() => { setDocumentModal(null); refresh() }} />}
		{editModal && <EditModal modalidad={editModal} onClose={() => setEditModal(null)} onSaved={() => { setEditModal(null); refresh() }} />}
	</section>
}
