import { NavLink } from 'react-router-dom'
import { LayoutDashboard, FileText, Users, FolderKanban, MonitorPlay, Settings, LogOut, Menu, Bell, GraduationCap } from 'lucide-react'
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

export function Sidebar({ open, collapsed = false, onMobileToggle }) {
  const { hasPermission, logout } = useAuth()
  const { unreadCount } = useNotifications()

  return (
    <aside id="main-sidebar" data-collapsed={collapsed} className={`sidebar fixed inset-y-0 left-0 z-40 flex flex-col border-r p-3 ${collapsed ? 'sidebar--collapsed' : ''} ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
      <div className={`flex min-h-12 items-center ${collapsed ? 'md:justify-center' : 'justify-between'}`}>
        <div className="flex min-w-0 items-center gap-3 px-1">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--sidebar-active)] text-white"><GraduationCap className="h-5 w-5" aria-hidden="true" /></span>
          <div className={`sidebar-label min-w-0 ${collapsed ? 'md:hidden' : ''}`}>
            <p className="truncate text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-text)]">Sistema de modalidad</p>
            <h2 className="truncate text-base font-semibold text-white">Gestión académica</h2>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="shrink-0 text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover)] hover:text-white md:hidden" onClick={onMobileToggle} aria-label="Cerrar menú de navegación">
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      <nav aria-label="Navegación principal" className="mt-7 flex-1 space-y-1">
        {links.filter((link) => !link.permission || hasPermission(link.permission)).map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            aria-label={collapsed ? label : undefined}
            title={collapsed ? label : undefined}
            className={({ isActive }) => `sidebar-link flex min-h-10 items-center rounded-lg px-3 text-sm font-medium ${collapsed ? 'md:justify-center md:px-2' : 'gap-3'} ${isActive ? 'sidebar-link--active' : ''}`}
          >
            <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span className={`sidebar-label ${collapsed ? 'md:hidden' : ''}`}>{label}</span>
            {to === '/notificaciones' && unreadCount > 0 && <span role="status" aria-label={`${unreadCount} notificaciones no leídas`} className={`${collapsed ? 'md:absolute md:right-1 md:top-0 md:min-w-4 md:px-1' : 'ml-auto min-w-8 px-2'} rounded-full bg-rose-600 py-0.5 text-center text-xs font-bold text-white`}>{unreadCount > 99 ? '99+' : unreadCount}</span>}
          </NavLink>
        ))}
      </nav>

      <Button variant="ghost" className={`mt-3 w-full text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover)] hover:text-white ${collapsed ? 'md:justify-center md:px-2' : 'justify-start gap-3'}`} onClick={logout} aria-label={collapsed ? 'Cerrar sesión' : undefined} title={collapsed ? 'Cerrar sesión' : undefined}>
        <LogOut className="h-4 w-4" />
        <span className={`sidebar-label ${collapsed ? 'md:hidden' : ''}`}>Cerrar sesión</span>
      </Button>
    </aside>
  )
}
