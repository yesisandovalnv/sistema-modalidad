import { Card } from '../../components/ui/card'

const stats = [
  { title: 'Postulantes', value: '1,240', description: 'Registros activos' },
  { title: 'Documentos', value: '892', description: 'Subidos esta semana' },
  { title: 'Modalidades', value: '12', description: 'Programas disponibles' },
  { title: 'Seguimiento', value: '76%', description: 'Avance general' },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-700 p-8 text-white shadow-sm dark:border-slate-800">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-300">Dashboard inicial</p>
        <h2 className="mt-3 text-3xl font-semibold">Bienvenido al panel administrativo</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">Aquí se concentrará la vista principal del sistema cuando se integren los módulos del negocio.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <p className="text-sm text-slate-500">{stat.title}</p>
            <h3 className="mt-3 text-3xl font-semibold">{stat.value}</h3>
            <p className="mt-2 text-sm text-slate-500">{stat.description}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <h3 className="text-lg font-semibold">Vista general</h3>
          <p className="mt-2 text-sm text-slate-500">Este espacio está preparado para mostrar gráficos, alertas y métricas empresariales.</p>
        </Card>
        <Card>
          <h3 className="text-lg font-semibold">Estado del sistema</h3>
          <ul className="mt-4 space-y-3 text-sm text-slate-500">
            <li>• API REST configurada</li>
            <li>• Layout responsivo listo</li>
            <li>• Tema claro/oscuro activo</li>
          </ul>
        </Card>
      </div>
    </div>
  )
}
