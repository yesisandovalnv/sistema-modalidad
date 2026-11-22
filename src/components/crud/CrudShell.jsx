import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { CenteredModal } from '../ui/CenteredModal'
import { Pagination } from '../reports/ReportComponents'

export function PageHeader({ title, description, action }) { return <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h1 className="text-3xl font-bold">{title}</h1><p className="mt-1 text-slate-500">{description}</p></div>{action}</header> }
export function SearchBar({ value, onChange, onSearch, children }) { return <form className="app-filter-panel flex flex-col gap-4 rounded-xl border p-4 sm:flex-row" onSubmit={(event) => { event.preventDefault(); onSearch() }}><label className="flex-1 text-sm">Buscar<input value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 dark:bg-slate-950" /></label>{children}<Button className="self-end" type="submit">Buscar</Button></form> }
export function DataState({ loading, error, empty, emptyMessage = 'No se encontraron registros.', children, onRetry }) { if (loading) return <Card role="status" className="text-center">Cargando…</Card>; if (error) return <Card role="alert" className="border-red-300 text-red-700"><p>{error}</p><Button className="mt-3" onClick={onRetry}>Reintentar</Button></Card>; if (empty) return <Card role="status" className="text-center text-slate-500">{emptyMessage}</Card>; return children }
export function Pager({ data, page, onPage }) { return <Pagination count={data.count || 0} page={page} hasNext={Boolean(data.next)} hasPrevious={Boolean(data.previous)} onPage={onPage} /> }
// Todas las ventanas flotantes del sistema siguen las reglas de Fondo de Tiempo: fondo difuminado
// con la forma del panel de trabajo y la ventana centrada a la derecha del menú lateral.
export function Modal({ title, onClose, children, size = 'form' }) {
	return <CenteredModal title={title} onClose={onClose} size={size}>{children}</CenteredModal>
}
export function Field({ label, ...props }) { return <label className="text-sm">{label}<input {...props} className="mt-1 w-full rounded-lg border px-3 py-2 dark:bg-slate-950" /></label> }
