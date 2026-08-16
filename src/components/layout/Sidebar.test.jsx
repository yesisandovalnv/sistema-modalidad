import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../../context/AuthContext'
import { Sidebar } from './Sidebar'
import { NotificationContext } from '../../context/NotificationContext'

function renderSidebar(allowed = [], props = {}) {
  const sidebarProps = { open: true, collapsed: false, onMobileToggle: () => {}, ...props }
  render(<AuthContext.Provider value={{ hasPermission: (name) => allowed.includes(name), logout: () => {} }}><NotificationContext.Provider value={{ unreadCount: 104 }}><MemoryRouter initialEntries={['/dashboard']}><Sidebar {...sidebarProps} /></MemoryRouter></NotificationContext.Provider></AuthContext.Provider>)
}

describe('Sidebar', () => {
  it('muestra dashboard y reportes según capacidades', () => { renderSidebar(['puede_ver_dashboard', 'puede_ver_reportes']); expect(screen.getByText('Dashboard')).toBeInTheDocument(); expect(screen.getByText('Reportes')).toBeInTheDocument() })
  it('oculta dashboard y reportes sin depender del rol visible', () => { renderSidebar([]); expect(screen.queryByText('Dashboard')).not.toBeInTheDocument(); expect(screen.queryByText('Reportes')).not.toBeInTheDocument() })
  it('muestra notificaciones, badge acotado y etiqueta accesible con permiso', () => { renderSidebar(['puede_ver_notificaciones']); expect(screen.getByRole('link', { name: /Notificaciones/ })).toBeInTheDocument(); expect(screen.getByText('99+')).toHaveAttribute('aria-label', '104 notificaciones no leídas') })
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
