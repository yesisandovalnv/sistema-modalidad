import { useEffect, useRef, useState } from 'react'
import { ChevronDown, LogOut, Menu, UserRound } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { Button } from '../ui/button'
import { useAuth } from '../../hooks/useAuth'
import { currentPageLabel } from './navigation'
import { NotificationsMenu } from './NotificationsMenu'
import { ProfileModal } from '../../pages/profile/ProfileModal'

function getDisplayName(user) {
  const value = [user?.nombres, user?.nombre_completo, user?.nombre, user?.username]
    .find((candidate) => String(candidate || '').trim())
  return String(value || 'Usuario').trim().split(/\s+/)[0]
}

export function Navbar({ onMobileToggle, sidebarCollapsed }) {
  const { user, logout, hasPermission, roleCode } = useAuth()
  const { pathname } = useLocation()
  const pageLabel = currentPageLabel(pathname, roleCode === 'ESTUDIANTE')
  const canSeeNotifications = hasPermission?.('puede_ver_notificaciones') === true
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const userMenuRef = useRef(null)
  const userMenuButtonRef = useRef(null)
  const focusOnOpenRef = useRef(null)
  const displayName = getDisplayName(user)
  const roleName = user?.rol?.nombre || 'Rol no disponible'

  // Al abrir con el teclado, el foco pasa al primer o al último elemento apenas se dibuja el menú.
  useEffect(() => {
    if (!userMenuOpen || !focusOnOpenRef.current) return
    const menuItems = userMenuRef.current?.querySelectorAll('[role="menuitem"]')
    menuItems?.[focusOnOpenRef.current === 'first' ? 0 : menuItems.length - 1]?.focus()
    focusOnOpenRef.current = null
  }, [userMenuOpen])

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
    event.stopPropagation()
    if (userMenuOpen) {
      const menuItems = userMenuRef.current?.querySelectorAll('[role="menuitem"]')
      menuItems?.[event.key === 'ArrowDown' ? 0 : menuItems.length - 1]?.focus()
      return
    }
    focusOnOpenRef.current = event.key === 'ArrowDown' ? 'first' : 'last'
    setUserMenuOpen(true)
  }

  return (
    <header data-collapsed={sidebarCollapsed} className={`layout-navbar fixed top-0 right-0 z-30 flex items-center justify-between px-4 md:px-6 ${sidebarCollapsed ? 'layout-navbar--collapsed' : ''}`}>
      <div className="flex items-center gap-3">
        <Button variant="ghost" className="navbar-control h-10 w-10 rounded-full p-0 md:hidden" onClick={onMobileToggle} aria-label="Abrir menú de navegación" aria-controls="main-sidebar">
          <Menu className="h-5 w-5" aria-hidden="true" />
        </Button>
        <p className="navbar-title truncate text-base font-semibold">{pageLabel}</p>
      </div>

      <div className="flex items-center gap-2">
        {canSeeNotifications && <NotificationsMenu />}
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
            className="navbar-control navbar-account inline-flex max-w-44 items-center gap-2 rounded-xl p-1.5 text-left"
            aria-label={`Abrir menú de usuario, ${displayName}`}
            aria-haspopup="menu"
            aria-expanded={userMenuOpen}
            aria-controls="navbar-user-menu"
            onClick={() => setUserMenuOpen((open) => !open)}
            onKeyDown={openMenuFromKeyboard}
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{displayName}</span>
              <span className="navbar-meta block truncate text-xs">{roleName}</span>
            </span>
            <ChevronDown className="navbar-meta h-4 w-4 shrink-0" aria-hidden="true" />
          </button>
          {userMenuOpen && (
            <div
              id="navbar-user-menu"
              role="menu"
              aria-label="Menú de usuario"
              className="dropdown-panel absolute right-0 top-full z-50 mt-2 w-64 max-w-[calc(100vw-2rem)] overflow-hidden p-1.5 text-[var(--text-primary)]"
              style={{ transformOrigin: 'top right' }}
            >
              <div role="presentation" className="dropdown-item mb-1 flex items-center gap-3 border-b border-[var(--border)] px-3 pb-3 pt-2.5" style={{ '--i': 0 }}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--primary-soft)] font-semibold text-[var(--heading)]" aria-hidden="true">
                  {displayName.charAt(0).toLocaleUpperCase('es')}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{displayName}</span>
                  <span className="block truncate text-xs text-[var(--text-secondary)]">{roleName}</span>
                </span>
              </div>
              <button
                type="button"
                role="menuitem"
                className="dropdown-item dropdown-action flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm"
                style={{ '--i': 1 }}
                onClick={() => {
                  setUserMenuOpen(false)
                  userMenuButtonRef.current?.focus()
                  setProfileOpen(true)
                }}
              >
                <UserRound className="h-4 w-4" aria-hidden="true" />
                Mi perfil
              </button>
              <button
                type="button"
                role="menuitem"
                className="dropdown-item dropdown-action flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm"
                style={{ '--i': 2 }}
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
      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
    </header>
  )
}
