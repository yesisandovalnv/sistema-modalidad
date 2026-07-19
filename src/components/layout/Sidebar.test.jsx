import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../../context/AuthContext'
import { Sidebar } from './Sidebar'
import { NotificationContext } from '../../context/NotificationContext'

function renderSidebar(allowed = []) {
  render(<AuthContext.Provider value={{ hasPermission: (name) => allowed.includes(name) }}><NotificationContext.Provider value={{ unreadCount: 104 }}><MemoryRouter><Sidebar open onToggle={() => {}} /></MemoryRouter></NotificationContext.Provider></AuthContext.Provider>)
}

describe('Sidebar', () => {
  it('muestra dashboard y reportes según capacidades', () => { renderSidebar(['puede_ver_dashboard', 'puede_ver_reportes']); expect(screen.getByText('Dashboard')).toBeInTheDocument(); expect(screen.getByText('Reportes')).toBeInTheDocument() })
  it('oculta dashboard y reportes sin depender del rol visible', () => { renderSidebar([]); expect(screen.queryByText('Dashboard')).not.toBeInTheDocument(); expect(screen.queryByText('Reportes')).not.toBeInTheDocument() })
  it('muestra notificaciones, badge acotado y etiqueta accesible con permiso', () => { renderSidebar(['puede_ver_notificaciones']); expect(screen.getByRole('link', { name: /Notificaciones/ })).toBeInTheDocument(); expect(screen.getByText('99+')).toHaveAttribute('aria-label', '104 notificaciones no leídas') })
})
