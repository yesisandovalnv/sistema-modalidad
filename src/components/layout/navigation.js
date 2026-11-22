import { FileText, FolderKanban, GraduationCap, LayoutDashboard, MonitorPlay, Settings, UserCog, Users } from 'lucide-react'

// Menú principal del sistema. `section` agrupa los enlaces en el menú lateral y el orden
// de este arreglo es el orden en que se muestran.
export const navigationLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'puede_ver_dashboard', section: 'Principal' },
  { to: '/postulantes', label: 'Postulantes', icon: Users, permission: 'puede_ver_postulaciones', section: 'Principal' },
  { to: '/documentos', label: 'Documentos', icon: FileText, permission: 'puede_ver_documentos', section: 'Principal' },
  { to: '/modalidades', label: 'Modalidades', icon: FolderKanban, permission: 'puede_ver_modalidades', section: 'Principal' },
  { to: '/seguimiento', label: 'Seguimiento', icon: MonitorPlay, permission: 'puede_ver_seguimiento', section: 'Principal' },
  { to: '/usuarios', label: 'Usuarios', icon: UserCog, permission: 'puede_gestionar_usuarios', section: 'Administración' },
  { to: '/configuracion', label: 'Configuración', icon: Settings, permission: 'puede_ver_configuracion', section: 'Administración' },
  { to: '/reportes/postulaciones', label: 'Postulaciones', icon: FileText, permission: 'puede_ver_reportes', section: 'Reportes' },
  { to: '/reportes/resultados', label: 'Resultados académicos', icon: GraduationCap, permission: 'puede_ver_reportes', section: 'Reportes' },
]

const studentMenuPaths = new Set(['/postulantes', '/documentos', '/modalidades'])

// El estudiante ve solo su proceso: "Postulantes" pasa a ser "Mi proceso" (en /) y
// "Documentos", "Mis documentos".
export function menuLinksFor(studentMode) {
  if (!studentMode) return navigationLinks
  return navigationLinks
    .filter((link) => studentMenuPaths.has(link.to))
    .map((link) => {
      if (link.to === '/postulantes') return { ...link, to: '/', label: 'Mi proceso' }
      if (link.to === '/documentos') return { ...link, label: 'Mis documentos' }
      return link
    })
}

// Nombre de la pantalla actual para la barra superior.
export function currentPageLabel(pathname, studentMode = false) {
  if (pathname.startsWith('/postulaciones/')) return studentMode ? 'Mi proceso' : 'Expediente'
  if (pathname === '/perfil') return 'Mi perfil'
  if (pathname === '/notificaciones') return 'Notificaciones'
  if (pathname === '/reportes' || pathname.startsWith('/reportes/')) {
    const report = navigationLinks.find((link) => pathname.startsWith(link.to))
    return report ? `Reportes · ${report.label}` : 'Reportes'
  }
  const match = menuLinksFor(studentMode).find((link) => (link.to === '/' ? pathname === '/' : pathname.startsWith(link.to)))
  return match?.label || 'Sistema de Modalidad'
}
