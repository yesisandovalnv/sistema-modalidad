import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { ThemeContext } from '../../context/ThemeContext'
import { AuthContext } from '../../context/AuthContext'
import { NotificationContext } from '../../context/NotificationContext'
import { Navbar } from './Navbar'

function RouteLocation() {
  const location = useLocation()
  return <output aria-label="Ruta actual">{location.pathname}</output>
}

function renderNavbar(props = {}, user = { nombres: 'Agustin Fernando', username: 'agustin', rol: { nombre: 'Administración' } }, options = {}) {
  const navbarProps = { onMobileToggle: () => {}, sidebarCollapsed: false, onSidebarToggle: () => {}, ...props }
  const logout = vi.fn()
  const { unreadCount = 12, canViewNotifications = true } = options
  render(
    <AuthContext.Provider value={{ user, logout, hasPermission: (name) => name !== 'puede_ver_notificaciones' || canViewNotifications }}>
      <ThemeContext.Provider value={{ theme: 'light', toggleTheme: () => {} }}>
        <NotificationContext.Provider value={{ unreadCount }}><MemoryRouter initialEntries={['/dashboard']}><Navbar {...navbarProps} /><RouteLocation /><button type="button">Fuera del menú</button></MemoryRouter></NotificationContext.Provider>
      </ThemeContext.Provider>
    </AuthContext.Provider>,
  )
  return { logout }
}

describe('Navbar', () => {
  it('muestra el toggle de escritorio con icono Menu y atributos accesibles', () => {
    renderNavbar()
    const toggle = screen.getByRole('button', { name: 'Colapsar barra lateral' })
    expect(toggle.closest('header')).toHaveClass('layout-navbar')
    expect(toggle.closest('header')).not.toHaveClass('layout-navbar--collapsed')
    expect(toggle).toHaveClass('hidden', 'md:inline-flex')
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(toggle).toHaveAttribute('aria-controls', 'main-sidebar')
    expect(toggle.querySelector('svg')).toBeInTheDocument()
  })

  it('permite expandir y contraer sin mezclar el control móvil', async () => {
    const user = userEvent.setup()
    const onMobileToggle = vi.fn()
    const onSidebarToggle = vi.fn()
    const { rerender } = render(<AuthContext.Provider value={{ user: {}, logout: vi.fn(), hasPermission: () => true }}><ThemeContext.Provider value={{ theme: 'light', toggleTheme: () => {} }}><NotificationContext.Provider value={{ unreadCount: 0 }}><MemoryRouter><Navbar onMobileToggle={onMobileToggle} sidebarCollapsed={false} onSidebarToggle={onSidebarToggle} /></MemoryRouter></NotificationContext.Provider></ThemeContext.Provider></AuthContext.Provider>)
    await user.click(screen.getByRole('button', { name: 'Colapsar barra lateral' }))
    expect(onSidebarToggle).toHaveBeenCalledOnce()
    expect(onMobileToggle).not.toHaveBeenCalled()

    rerender(<AuthContext.Provider value={{ user: {}, logout: vi.fn(), hasPermission: () => true }}><ThemeContext.Provider value={{ theme: 'light', toggleTheme: () => {} }}><NotificationContext.Provider value={{ unreadCount: 0 }}><MemoryRouter><Navbar onMobileToggle={onMobileToggle} sidebarCollapsed onSidebarToggle={onSidebarToggle} /></MemoryRouter></NotificationContext.Provider></ThemeContext.Provider></AuthContext.Provider>)
    expect(screen.getByRole('banner')).toHaveClass('layout-navbar--collapsed')
    expect(screen.getByRole('button', { name: 'Expandir barra lateral' })).toHaveAttribute('aria-expanded', 'false')
    await user.click(screen.getByRole('button', { name: 'Abrir menú de navegación' }))
    expect(onMobileToggle).toHaveBeenCalledOnce()
  })

  it('muestra el nombre y el rol de AuthContext sin avatar en el botón cerrado', () => {
    renderNavbar()

    const trigger = screen.getByRole('button', { name: 'Abrir menú de usuario, Agustin' })
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveAttribute('aria-controls', 'navbar-user-menu')
    expect(trigger).toHaveTextContent('Agustin')
    expect(trigger).toHaveTextContent('Administración')
    expect(trigger.querySelector('svg[aria-hidden="true"]')).toBeInTheDocument()
    expect(trigger.querySelector('span[aria-hidden="true"]')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Notificaciones, 12 sin leer' })).toHaveAttribute('href', '/notificaciones')
    expect(screen.getByText('12')).toBeInTheDocument()
  })

  it('oculta la campana sin permiso y limita visualmente el contador', () => {
    renderNavbar({}, undefined, { unreadCount: 104, canViewNotifications: false })
    expect(screen.queryByRole('link', { name: /Notificaciones/ })).not.toBeInTheDocument()
  })

  it('navega a Notificaciones al hacer clic en la campana', async () => {
    const user = userEvent.setup()
    renderNavbar()

    await user.click(screen.getByRole('link', { name: 'Notificaciones, 12 sin leer' }))

    expect(screen.getByLabelText('Ruta actual')).toHaveTextContent('/notificaciones')
  })

  it('usa el primer nombre disponible y username como fallback', () => {
    renderNavbar({}, { nombres: '  ', nombre_completo: 'Ana Pérez', username: 'ana', rol: { nombre: 'Coordinación' } })
    expect(screen.getByRole('button', { name: 'Abrir menú de usuario, Ana' })).toBeInTheDocument()

    renderNavbar({}, { nombres: '', nombre_completo: '', nombre: '', username: 'usuario1', rol: {} })
    const trigger = screen.getByRole('button', { name: 'Abrir menú de usuario, usuario1' })
    expect(trigger).toHaveTextContent('usuario1')
    expect(trigger.querySelector('span[aria-hidden="true"]')).not.toBeInTheDocument()
  })

  it('abre el menú y navega a Mi perfil', async () => {
    const user = userEvent.setup()
    renderNavbar()

    await user.click(screen.getByRole('button', { name: 'Abrir menú de usuario, Agustin' }))
    const menu = screen.getByRole('menu', { name: 'Menú de usuario' })
    expect(menu).toBeInTheDocument()
    expect(menu.querySelector('[role="presentation"] span[aria-hidden="true"]')).toHaveTextContent('A')
    expect(screen.getByRole('menuitem', { name: 'Mi perfil' })).toHaveAttribute('href', '/perfil')
    expect(screen.getByRole('button', { name: 'Abrir menú de usuario, Agustin' })).toHaveAttribute('aria-expanded', 'true')
    await user.click(screen.getByRole('menuitem', { name: 'Mi perfil' }))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  }, 15000)

  it('cierra con Escape y devuelve el foco al botón que lo abrió', async () => {
    const user = userEvent.setup()
    renderNavbar()
    const trigger = screen.getByRole('button', { name: 'Abrir menú de usuario, Agustin' })

    await user.click(trigger)
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('cierra al pulsar fuera y permite cerrar sesión mediante AuthContext.logout', async () => {
    const user = userEvent.setup()
    const { logout } = renderNavbar()

    await user.click(screen.getByRole('button', { name: 'Abrir menú de usuario, Agustin' }))
    await user.click(screen.getByRole('button', { name: 'Fuera del menú' }))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Abrir menú de usuario, Agustin' }))
    await user.click(screen.getByRole('menuitem', { name: 'Cerrar sesión' }))
    expect(logout).toHaveBeenCalledOnce()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  }, 15000)

  it('permite abrir y recorrer el menú con teclado', async () => {
    const user = userEvent.setup()
    renderNavbar()
    const trigger = screen.getByRole('button', { name: 'Abrir menú de usuario, Agustin' })

    trigger.focus()
    await user.keyboard('{ArrowDown}')

    expect(screen.getByRole('menuitem', { name: 'Mi perfil' })).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitem', { name: 'Cerrar sesión' })).toHaveFocus()
  })
})
