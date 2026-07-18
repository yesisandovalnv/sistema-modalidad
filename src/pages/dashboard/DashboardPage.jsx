import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { reportesService } from '../../services/reportesService'
import { ReportFilters } from '../../components/reports/ReportFilters'
import { DistributionList, ErrorState, MetricCard } from '../../components/reports/ReportComponents'
import { Card } from '../../components/ui/card'

const initial = { resumen: {}, modalidades: [], etapas: [], estados: [], documentos: {}, defensas: {}, cierre: {}, notificaciones: {}, tendencia: [], advertencias: [] }
export default function DashboardPage() {
  const [filters, setFilters] = useState({}); const [data, setData] = useState(initial); const [loading, setLoading] = useState(true); const [error, setError] = useState(null); const [revision, setRevision] = useState(0)
  useEffect(() => { const controller = new AbortController(); setLoading(true); setError(null); reportesService.obtenerDashboard(filters, controller.signal).then((value) => setData({ ...initial, ...value })).catch((e) => { if (!e.canceled) setError(e) }).finally(() => { if (!controller.signal.aborted) setLoading(false) }); return () => controller.abort() }, [filters, revision])
  if (error?.status === 403) return <ErrorState message="Acceso no autorizado al dashboard institucional." />
  return <div className="space-y-6"><div><p className="text-sm font-medium text-sky-700 dark:text-sky-300">Analítica institucional</p><h1 className="text-3xl font-bold">Dashboard académico</h1><p className="mt-1 text-slate-500">Indicadores consolidados, sin modificar información académica.</p></div>
    <ReportFilters onApply={setFilters} />{error && <ErrorState message={error.message} onRetry={() => setRevision((v) => v + 1)} />}
    {loading ? <div className="grid animate-pulse gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-label="Cargando dashboard">{Array.from({ length: 5 }).map((_,i) => <div key={i} className="h-28 rounded-xl bg-slate-200 dark:bg-slate-800" />)}</div> : !error && <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><MetricCard label="Total postulaciones" value={data.resumen.total_postulaciones} /><MetricCard label="En proceso" value={data.resumen.en_proceso} /><MetricCard label="Concluidas" value={data.resumen.concluidas} /><MetricCard label="Rechazadas" value={data.resumen.rechazadas} /><MetricCard label="Sin etapa actual" value={data.resumen.sin_etapa_actual} /></div>
      <div className="grid gap-4 lg:grid-cols-3"><DistributionList title="Por modalidad" items={data.modalidades} /><DistributionList title="Por etapa actual" items={data.etapas} labelKey="codigo" /><DistributionList title="Por estado general" items={data.estados} /></div>
      <div className="grid gap-4 lg:grid-cols-3"><Indicator title="Documentos" data={data.documentos} /><Indicator title="Defensas" data={data.defensas} /><Indicator title="Cierre" data={data.cierre} /></div>
      <div className="grid gap-4 lg:grid-cols-2"><DistributionList title="Tendencia por gestión" items={data.tendencia} labelKey="gestion" /><Card><div className="flex items-center gap-2"><Bell className="h-5 w-5"/><h3 className="font-semibold">Notificaciones personales</h3></div><p className="mt-4 text-4xl font-bold">{data.notificaciones.no_leidas ?? 0}</p><p className="text-sm text-slate-500">notificaciones no leídas</p></Card></div>
      {data.advertencias.length > 0 && <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950"><h3 className="font-semibold">Advertencias</h3><ul className="mt-2 list-disc pl-5 text-sm">{data.advertencias.map((x) => <li key={x}>{x}</li>)}</ul></Card>}
    </>}</div>
}
function Indicator({ title, data = {} }) { return <Card><h3 className="font-semibold">{title}</h3><dl className="mt-4 grid grid-cols-2 gap-3">{Object.entries(data).filter(([,v]) => typeof v !== 'object').map(([k,v]) => <div key={k}><dt className="text-xs capitalize text-slate-500">{k.replaceAll('_',' ')}</dt><dd className="text-xl font-semibold">{v ?? 0}</dd></div>)}</dl></Card> }
