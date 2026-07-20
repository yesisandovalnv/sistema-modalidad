import { NavLink } from 'react-router-dom'
import { LayoutDashboard, FileText, Users, FolderKanban, MonitorPlay, Settings, LogOut, Menu, Bell } from 'lucide-react'
import { Button } from '../ui/button'
import { useAuth } from '../../hooks/useAuth'
import { useNotifications } from '../../hooks/useNotifications'

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'puede_ver_dashboard' },
  { to: '/notificaciones', label: 'Notificaciones', icon: Bell, permission: 'puede_ver_notificaciones' },
  { to: '/postulantes', label: 'Postulantes', icon: Users, permission: 'puede_ver_postulaciones' },
  { to: '/documentos', label: 'Documentos', icon: FileText, permission: 'puede_ver_documentos' },
  { to: '/modalidades', label: 'Modalidades', icon: FolderKanban, permission: 'puede_gestionar_catalogos' },
  { to: '/seguimiento', label: 'Seguimiento', icon: MonitorPlay, permission: 'puede_ver_seguimiento' },
  { to: '/usuarios', label: 'Usuarios', icon: Users, permission: 'puede_gestionar_usuarios' },
  { to: '/reportes/postulaciones', label: 'Reportes', icon: FileText, permission: 'puede_ver_reportes' },
  { to: '/configuracion', label: 'Configuración', icon: Settings, permission: 'puede_ver_configuracion' },
]

export function Sidebar({ open, onToggle }) {
  const { hasPermission, logout } = useAuth()
  const { unreadCount } = useNotifications()
  return (
    <aside className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-slate-200 bg-white/90 p-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 ${open ? 'translate-x-0' : '-translate-x-full'} transition md:translate-x-0 md:static md:block`}>
      <div className="flex items-center justify-between md:justify-start">
        <div>
          <p className="text-sm font-semibold text-slate-500">Sistema de modalidad</p>
          <h2 className="text-lg font-semibold">Gestión académica</h2>
        </div>
        <Button variant="ghost" className="md:hidden" onClick={onToggle}>
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      <nav className="mt-8 space-y-1">
        {links.filter((link) => !link.permission || hasPermission(link.permission)).map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${isActive ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'}`
            }
          >
            <Icon className="h-4 w-4" />
            {label}
            {to === '/notificaciones' && unreadCount > 0 && <span role="status" aria-label={`${unreadCount} notificaciones no leídas`} className="ml-auto min-w-8 rounded-full bg-rose-600 px-2 py-0.5 text-center text-xs font-bold text-white">{unreadCount > 99 ? '99+' : unreadCount}</span>}
          </NavLink>
        ))}
      </nav>

      <Button variant="secondary" className="mt-8 w-full justify-start gap-2" onClick={logout}>
        <LogOut className="h-4 w-4" />
        Cerrar sesión
      </Button>
    </aside>
  )
}
