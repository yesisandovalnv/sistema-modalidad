import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../../context/AuthContext'
import { Sidebar } from './Sidebar'
import { NotificationContext } from '../../context/NotificationContext'

function renderSidebar(allowed = [], props = {}, roleCode = '') {
  const sidebarProps = { open: true, collapsed: false, onMobileToggle: () => {}, ...props }
  render(<AuthContext.Provider value={{ hasPermission: (name) => allowed.includes(name), roleCode, logout: () => {} }}><NotificationContext.Provider value={{ unreadCount: 104 }}><MemoryRouter initialEntries={['/dashboard']}><Sidebar {...sidebarProps} /></MemoryRouter></NotificationContext.Provider></AuthContext.Provider>)
}

function renderStudentSidebarAt(path) {
  return render(<AuthContext.Provider value={{ hasPermission: (name) => ['puede_ver_postulaciones', 'puede_ver_documentos', 'puede_ver_modalidades', 'puede_ver_notificaciones'].includes(name), roleCode: 'ESTUDIANTE', logout: () => {} }}><NotificationContext.Provider value={{ unreadCount: 0 }}><MemoryRouter initialEntries={[path]}><Sidebar open onMobileToggle={() => {}} /></MemoryRouter></NotificationContext.Provider></AuthContext.Provider>)
}

describe('Sidebar', () => {
  it('muestra dashboard y reportes según capacidades', () => { renderSidebar(['puede_ver_dashboard', 'puede_ver_reportes']); expect(screen.getByText('Dashboard')).toBeInTheDocument(); expect(screen.getByText('Reportes')).toBeInTheDocument() })
  it('oculta dashboard y reportes sin depender del rol visible', () => { renderSidebar([]); expect(screen.queryByText('Dashboard')).not.toBeInTheDocument(); expect(screen.queryByText('Reportes')).not.toBeInTheDocument() })
  it('muestra notificaciones, badge acotado y etiqueta accesible con permiso', () => { renderSidebar(['puede_ver_notificaciones']); expect(screen.getByRole('link', { name: /Notificaciones/ })).toBeInTheDocument(); expect(screen.getByText('99+')).toHaveAttribute('aria-label', '104 notificaciones no leídas') })
  it('muestra Modalidades con la capability de consulta', () => { renderSidebar(['puede_ver_modalidades']); expect(screen.getByRole('link', { name: 'Modalidades' })).toHaveAttribute('href', '/modalidades') })
  it('oculta Modalidades sin la capability de consulta', () => { renderSidebar([]); expect(screen.queryByRole('link', { name: 'Modalidades' })).not.toBeInTheDocument() })
  it('muestra únicamente el menú de estudiante y conserva destinos funcionales', () => {
    renderSidebar(['puede_cargar_documentos', 'puede_ver_postulaciones', 'puede_ver_documentos', 'puede_ver_modalidades', 'puede_ver_notificaciones', 'puede_ver_seguimiento'], {}, 'ESTUDIANTE')
    expect(screen.getByRole('link', { name: 'Mi proceso' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Mis documentos' })).toHaveAttribute('href', '/documentos')
    expect(screen.getByRole('link', { name: 'Modalidades' })).toHaveAttribute('href', '/modalidades')
    expect(screen.getByRole('link', { name: /Notificaciones/ })).toBeInTheDocument()
    expect(screen.getByText('99+')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Postulantes' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Seguimiento' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Documentos' })).not.toBeInTheDocument()
  })
  it.each(['/', '/postulaciones/45', '/postulantes'])('mantiene Mi proceso activo en %s', (path) => {
    renderStudentSidebarAt(path)
    expect(screen.getByRole('link', { name: 'Mi proceso' })).toHaveClass('sidebar-link--active')
  })
  it('mantiene activos los destinos secundarios del estudiante', () => {
    renderStudentSidebarAt('/documentos')
    expect(screen.getByRole('link', { name: 'Mi proceso' })).not.toHaveClass('sidebar-link--active')
    expect(screen.getByRole('link', { name: 'Mis documentos' })).toHaveClass('sidebar-link--active')
    cleanup()
    renderStudentSidebarAt('/modalidades')
    expect(screen.getByRole('link', { name: 'Modalidades' })).toHaveClass('sidebar-link--active')
    cleanup()
    renderStudentSidebarAt('/notificaciones')
    expect(screen.getByRole('link', { name: /Notificaciones/ })).toHaveClass('sidebar-link--active')
  })
  it('no infiere menú estudiante por puede_cargar_documentos', () => {
    renderSidebar(['puede_cargar_documentos', 'puede_ver_documentos'], {}, 'DOCENTE')
    expect(screen.getByRole('link', { name: 'Documentos' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Mi proceso' })).not.toBeInTheDocument()
  })
  it('conserva la navegación administrativa actual', () => {
    renderSidebar(['puede_ver_dashboard', 'puede_ver_postulaciones', 'puede_ver_documentos', 'puede_ver_modalidades', 'puede_ver_notificaciones', 'puede_ver_seguimiento', 'puede_gestionar_usuarios', 'puede_ver_reportes', 'puede_ver_configuracion'])
    for (const label of ['Dashboard', 'Postulantes', 'Documentos', 'Modalidades', 'Seguimiento', 'Usuarios', 'Reportes', 'Configuración', 'Notificaciones']) expect(screen.getByText(label)).toBeInTheDocument()
    expect(screen.queryByText('Mi proceso')).not.toBeInTheDocument()
    expect(screen.queryByText('Mis documentos')).not.toBeInTheDocument()
  })
  it('inicia expandido y conserva la opción activa', () => {
    renderSidebar(['puede_ver_dashboard'])
    expect(document.querySelector('#main-sidebar')).toHaveAttribute('data-collapsed', 'false')
    expect(screen.getByText('Dashboard')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveClass('sidebar-link--active')
  })
  it('colapsa textos solo en escritorio, mantiene iconos, badge y tooltip accesible', () => {
    renderSidebar(['puede_ver_dashboard', 'puede_ver_notificaciones'], { collapsed: true })
    expect(document.querySelector('#main-sidebar')).toHaveClass('sidebar--collapsed')
    expect(screen.getByText('Dashboard')).toHaveClass('sidebar-label')
    expect(screen.getByRole('link', { name: 'Dashboard' }).querySelector('svg')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('title', 'Dashboard')
    expect(screen.getByText('99+')).toBeInTheDocument()
  })
})
