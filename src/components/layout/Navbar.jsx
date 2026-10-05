import { useEffect, useRef, useState } from 'react'
import { Bell, ChevronDown, LogOut, Menu, Moon, Sun, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../ui/button'
import { useTheme } from '../../hooks/useTheme'
import { useAuth } from '../../hooks/useAuth'

function getDisplayName(user) {
  const value = [user?.nombres, user?.nombre_completo, user?.nombre, user?.username]
    .find((candidate) => String(candidate || '').trim())
  return String(value || 'Usuario').trim().split(/\s+/)[0]
}

export function Navbar({ onMobileToggle, sidebarCollapsed, onSidebarToggle }) {
  const { theme, toggleTheme } = useTheme()
  const { user, logout } = useAuth()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef(null)
  const userMenuButtonRef = useRef(null)
  const displayName = getDisplayName(user)
  const roleName = user?.rol?.nombre || 'Rol no disponible'

  useEffect(() => {
    if (!userMenuOpen) return undefined

    const closeOnOutsidePointer = (event) => {
      if (!userMenuRef.current?.contains(event.target)) setUserMenuOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer)
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer)
  }, [userMenuOpen])

  const handleMenuKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      setUserMenuOpen(false)
      userMenuButtonRef.current?.focus()
      return
    }

    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    const menuItems = [...(userMenuRef.current?.querySelectorAll('[role="menuitem"]') || [])]
    if (!menuItems.length) return

    event.preventDefault()
    const currentIndex = menuItems.indexOf(document.activeElement)
    const nextIndex = event.key === 'Home' ? 0
      : event.key === 'End' ? menuItems.length - 1
        : event.key === 'ArrowDown' ? (currentIndex + 1) % menuItems.length
          : (currentIndex <= 0 ? menuItems.length - 1 : currentIndex - 1)
    menuItems[nextIndex].focus()
  }

  const openMenuFromKeyboard = (event) => {
    if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return
    event.preventDefault()
    setUserMenuOpen(true)
    requestAnimationFrame(() => {
      const menuItems = userMenuRef.current?.querySelectorAll('[role="menuitem"]')
      menuItems?.[event.key === 'ArrowDown' ? 0 : menuItems.length - 1]?.focus()
    })
  }

  return (
    <header data-collapsed={sidebarCollapsed} className={`layout-navbar fixed top-0 right-0 z-30 flex items-center justify-between border-b border-[var(--navbar-border)] bg-[var(--surface)] px-4 py-4 shadow-[0_1px_3px_rgb(15_23_42_/_0.04)] md:px-6 ${sidebarCollapsed ? 'layout-navbar--collapsed' : ''}`}>
      <div className="flex items-center gap-3">
        <Button variant="ghost" className="md:hidden" onClick={onMobileToggle} aria-label="Abrir menú de navegación">
          <Menu className="h-5 w-5" />
        </Button>
        <Button
          variant="outline"
          className="hidden h-9 w-10 rounded-lg border-slate-200 bg-slate-50 p-0 text-slate-700 shadow-sm hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 md:inline-flex"
          onClick={onSidebarToggle}
          aria-label={sidebarCollapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
          aria-expanded={!sidebarCollapsed}
          aria-controls="main-sidebar"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </Button>
        <div>
          <p className="text-sm font-medium text-[var(--text-secondary)]">Bienvenido</p>
          <h1 className="text-lg font-semibold">Sistema de modalidad</h1>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" aria-label="Notificaciones">
          <Bell className="h-4 w-4" />
        </Button>
        <div
          className="relative"
          ref={userMenuRef}
          onKeyDown={handleMenuKeyDown}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setUserMenuOpen(false)
          }}
        >
          <button
            ref={userMenuButtonRef}
            type="button"
            className="inline-flex max-w-44 items-center gap-2 rounded-lg p-1.5 text-left text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-light)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
            aria-label={`Abrir menú de usuario, ${displayName}`}
            aria-haspopup="menu"
            aria-expanded={userMenuOpen}
            aria-controls="navbar-user-menu"
            onClick={() => setUserMenuOpen((open) => !open)}
            onKeyDown={openMenuFromKeyboard}
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{displayName}</span>
              <span className="block truncate text-xs text-[var(--text-secondary)]">{roleName}</span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" aria-hidden="true" />
          </button>
          {userMenuOpen && (
            <div
              id="navbar-user-menu"
              role="menu"
              aria-label="Menú de usuario"
              className="absolute right-0 top-full z-50 mt-2 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] shadow-lg"
            >
              <div role="presentation" className="flex items-center gap-3 border-b border-[var(--border)] p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--primary-soft)] font-semibold text-[var(--blue-deep)] dark:bg-slate-700 dark:text-slate-100" aria-hidden="true">
                  {displayName.charAt(0).toLocaleUpperCase('es')}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{displayName}</span>
                  <span className="block truncate text-xs text-[var(--text-secondary)]">{roleName}</span>
                </span>
              </div>
              <Link
                to="/perfil"
                role="menuitem"
                className="flex w-full items-center gap-3 px-4 py-3 text-sm hover:bg-[var(--surface-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--primary-light)]"
                onClick={() => setUserMenuOpen(false)}
              >
                <UserRound className="h-4 w-4" aria-hidden="true" />
                Mi perfil
              </Link>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-3 border-t border-[var(--border)] px-4 py-3 text-left text-sm hover:bg-[var(--surface-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--primary-light)]"
                onClick={() => {
                  setUserMenuOpen(false)
                  logout()
                }}
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
