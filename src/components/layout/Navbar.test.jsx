import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeContext } from '../../context/ThemeContext'
import { Navbar } from './Navbar'

function renderNavbar(props = {}) {
  const navbarProps = { onMobileToggle: () => {}, sidebarCollapsed: false, onSidebarToggle: () => {}, ...props }
  render(<ThemeContext.Provider value={{ theme: 'light', toggleTheme: () => {} }}><Navbar {...navbarProps} /></ThemeContext.Provider>)
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
    const { rerender } = render(<ThemeContext.Provider value={{ theme: 'light', toggleTheme: () => {} }}><Navbar onMobileToggle={onMobileToggle} sidebarCollapsed={false} onSidebarToggle={onSidebarToggle} /></ThemeContext.Provider>)
    await user.click(screen.getByRole('button', { name: 'Colapsar barra lateral' }))
    expect(onSidebarToggle).toHaveBeenCalledOnce()
    expect(onMobileToggle).not.toHaveBeenCalled()

    rerender(<ThemeContext.Provider value={{ theme: 'light', toggleTheme: () => {} }}><Navbar onMobileToggle={onMobileToggle} sidebarCollapsed onSidebarToggle={onSidebarToggle} /></ThemeContext.Provider>)
    expect(screen.getByRole('banner')).toHaveClass('layout-navbar--collapsed')
    expect(screen.getByRole('button', { name: 'Expandir barra lateral' })).toHaveAttribute('aria-expanded', 'false')
    await user.click(screen.getByRole('button', { name: 'Abrir menú de navegación' }))
    expect(onMobileToggle).toHaveBeenCalledOnce()
  })
})
