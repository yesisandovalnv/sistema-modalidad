import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ThemeContext } from '../../context/ThemeContext'
import { AuthContext } from '../../context/AuthContext'
import { NotificationContext } from '../../context/NotificationContext'
import { Navbar } from './Navbar'

function renderNavbar(props = {}, user = { nombres: 'Agustin Fernando', username: 'agustin', rol: { nombre: 'Administración' } }, { permissions = [], unreadCount = 0, path = '/' } = {}) {
  const navbarProps = { onMobileToggle: () => {}, sidebarCollapsed: false, onSidebarToggle: () => {}, ...props }
  const logout = vi.fn()
  render(
    <AuthContext.Provider value={{ user, logout, hasPermission: (name) => permissions.includes(name) }}>
      <NotificationContext.Provider value={{ unreadCount }}>
      <ThemeContext.Provider value={{ theme: 'light', toggleTheme: () => {} }}>
        <MemoryRouter initialEntries={[path]}><Navbar {...navbarProps} /><button type="button">Fuera del menú</button></MemoryRouter>
      </ThemeContext.Provider>
      </NotificationContext.Provider>
    </AuthContext.Provider>,
  )
  return { logout }
}

describe('Navbar', () => {
  it('muestra el nombre de la pantalla actual sin repetir el título del sistema', () => {
    renderNavbar({}, undefined, { path: '/postulantes' })
    expect(screen.getByText('Postulantes')).toBeInTheDocument()
    expect(screen.queryByText('Bienvenido')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })

  it('la campana abre la ventana de notificaciones e indica las no leídas cuando hay permiso', () => {
    renderNavbar({}, undefined, { permissions: ['puede_ver_notificaciones'], unreadCount: 3 })
    const bell = screen.getByRole('button', { name: 'Notificaciones, 3 sin leer' })
    expect(bell).toHaveAttribute('aria-haspopup', 'dialog')
    expect(bell).toHaveAttribute('aria-expanded', 'false')
  })

  it('sin permiso no muestra la campana', () => {
    renderNavbar()
    expect(screen.queryByRole('button', { name: /^Notificaciones/ })).not.toBeInTheDocument()
  })

  it('ya no muestra el botón de modo claro/oscuro en la barra (está en Mi perfil)', () => {
    renderNavbar()
    expect(screen.queryByRole('button', { name: /Activar modo/ })).not.toBeInTheDocument()
  })

  it('solo ofrece el botón del celular para abrir el menú; el colapso vive en el menú lateral', async () => {
    const user = userEvent.setup()
    const onMobileToggle = vi.fn()
    renderNavbar({ onMobileToggle, sidebarCollapsed: true })
    expect(screen.getByRole('banner')).toHaveClass('layout-navbar--collapsed')
    expect(screen.queryByRole('button', { name: /barra lateral/ })).not.toBeInTheDocument()
    const mobileToggle = screen.getByRole('button', { name: 'Abrir menú de navegación' })
    expect(mobileToggle).toHaveClass('md:hidden')
    await user.click(mobileToggle)
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
    expect(screen.queryByRole('link', { name: /Notificaciones/ })).not.toBeInTheDocument()
  })

  it('usa el primer nombre disponible y username como fallback', () => {
    renderNavbar({}, { nombres: '  ', nombre_completo: 'Ana Pérez', username: 'ana', rol: { nombre: 'Coordinación' } })
    expect(screen.getByRole('button', { name: 'Abrir menú de usuario, Ana' })).toBeInTheDocument()

    renderNavbar({}, { nombres: '', nombre_completo: '', nombre: '', username: 'usuario1', rol: {} })
    const trigger = screen.getByRole('button', { name: 'Abrir menú de usuario, usuario1' })
    expect(trigger).toHaveTextContent('usuario1')
    expect(trigger.querySelector('span[aria-hidden="true"]')).not.toBeInTheDocument()
  })

  it('abre el menú y Mi perfil se abre en una ventana flotante', async () => {
    const user = userEvent.setup()
    renderNavbar()

    await user.click(screen.getByRole('button', { name: 'Abrir menú de usuario, Agustin' }))
    const menu = screen.getByRole('menu', { name: 'Menú de usuario' })
    expect(menu).toBeInTheDocument()
    expect(menu.querySelector('[role="presentation"] span[aria-hidden="true"]')).toHaveTextContent('A')
    expect(screen.getByRole('button', { name: 'Abrir menú de usuario, Agustin' })).toHaveAttribute('aria-expanded', 'true')
    await user.click(screen.getByRole('menuitem', { name: 'Mi perfil' }))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    const dialog = screen.getByRole('dialog', { name: 'Mi perfil' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog.closest('.modal-overlay')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByRole('dialog', { name: 'Mi perfil' })).not.toBeInTheDocument()
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
