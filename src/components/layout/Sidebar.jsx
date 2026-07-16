import { NavLink } from 'react-router-dom'
import { LayoutDashboard, FileText, Users, FolderKanban, MonitorPlay, Settings, LogOut, Menu } from 'lucide-react'
import { Button } from '../ui/button'

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/postulantes', label: 'Postulantes', icon: Users },
  { to: '/documentos', label: 'Documentos', icon: FileText },
  { to: '/modalidades', label: 'Modalidades', icon: FolderKanban },
  { to: '/seguimiento', label: 'Seguimiento', icon: MonitorPlay },
  { to: '/usuarios', label: 'Usuarios', icon: Users },
  { to: '/reportes', label: 'Reportes', icon: FileText },
  { to: '/configuracion', label: 'Configuración', icon: Settings },
]

export function Sidebar({ open, onToggle }) {
  return (
    <aside className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-slate-200 bg-white/90 p-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 ${open ? 'translate-x-0' : '-translate-x-full'} transition md:translate-x-0 md:static md:block`}>
      <div className="flex items-center justify-between md:justify-start">
        <div>
          <p className="text-sm font-semibold text-slate-500">Sistema de modalidad</p>
          <h2 className="text-lg font-semibold">Panel Administrativo</h2>
        </div>
        <Button variant="ghost" className="md:hidden" onClick={onToggle}>
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      <nav className="mt-8 space-y-1">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${isActive ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'}`
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm font-semibold">Preparado para JWT</p>
        <p className="mt-1 text-sm text-slate-500">La autenticación se conectará con Django REST Framework en el siguiente paso.</p>
      </div>

      <Button variant="secondary" className="mt-8 w-full justify-start gap-2">
        <LogOut className="h-4 w-4" />
        Cerrar sesión
      </Button>
    </aside>
  )
}
