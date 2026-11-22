import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { PanelLeftClose, PanelLeftOpen, X } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { menuLinksFor } from './navigation'
import escudoUabjb from '../../assets/uabjb-escudo.webp'

const MOBILE_QUERY = '(max-width: 767px)'

function useIsMobile() {
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(MOBILE_QUERY).matches)
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined
    const media = window.matchMedia(MOBILE_QUERY)
    const update = () => setMobile(media.matches)
    media.addEventListener?.('change', update)
    return () => media.removeEventListener?.('change', update)
  }, [])
  return mobile
}

export function Sidebar({ open, collapsed = false, onMobileToggle, onCollapseToggle }) {
  const isMobile = useIsMobile()
  const closeButtonRef = useRef(null)
  const returnFocusRef = useRef(null)
  const drawerOpen = isMobile && open
  const { hasPermission, roleCode } = useAuth()
  const { pathname } = useLocation()
  const studentMode = roleCode === 'ESTUDIANTE'
  const processActive = studentMode && (pathname === '/' || pathname === '/postulantes' || pathname.startsWith('/postulaciones/'))
  const visibleLinks = menuLinksFor(studentMode).filter((link) => !link.permission || hasPermission(link.permission))
  const linksRef = useRef(null)
  const [indicator, setIndicator] = useState(null)

  // Píldora activa que se desliza de una opción a otra. La primera medición no anima,
  // para que no entre volando desde arriba al cargar la página.
  useLayoutEffect(() => {
    const container = linksRef.current
    if (!container) return undefined
    const measure = () => {
      const active = container.querySelector('.sidebar-link--active')
      if (!active || !active.offsetHeight) { setIndicator(null); return }
      setIndicator((previous) => ({ top: active.offsetTop, left: active.offsetLeft, width: active.offsetWidth, height: active.offsetHeight, animate: Boolean(previous) }))
    }
    measure()
    if (typeof ResizeObserver !== 'function') return undefined
    const observer = new ResizeObserver(measure)
    observer.observe(container)
    return () => observer.disconnect()
  }, [pathname, collapsed, visibleLinks.length])

  // En el celular el menú es un panel deslizable: al abrirse recibe el foco, Escape lo
  // cierra y el foco vuelve al botón que lo abrió.
  useEffect(() => {
    if (!drawerOpen) return undefined
    returnFocusRef.current = document.activeElement
    closeButtonRef.current?.focus()
    const closeOnEscape = (event) => { if (event.key === 'Escape') onMobileToggle?.() }
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('keydown', closeOnEscape)
      if (returnFocusRef.current instanceof HTMLElement && returnFocusRef.current.isConnected) returnFocusRef.current.focus()
    }
  }, [drawerOpen, onMobileToggle])

  return (
    <aside id="main-sidebar" data-collapsed={collapsed} inert={isMobile && !open ? true : undefined} className={`sidebar fixed inset-y-0 left-0 z-40 flex flex-col ${collapsed ? 'sidebar--collapsed' : ''} ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
      <div className="sidebar-toolbar flex justify-end px-3 pt-3">
        <button ref={closeButtonRef} type="button" className="sidebar-close grid h-9 w-9 place-items-center rounded-full md:hidden" onClick={onMobileToggle} aria-label="Cerrar menú de navegación">
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
        {onCollapseToggle && (
          <button
            type="button"
            className="sidebar-close hidden h-9 w-9 place-items-center rounded-full md:grid"
            onClick={onCollapseToggle}
            aria-label={collapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
            title={collapsed ? 'Expandir menú' : 'Contraer menú'}
            aria-expanded={!collapsed}
            aria-controls="main-sidebar"
          >
            {collapsed ? <PanelLeftOpen className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" /> : <PanelLeftClose className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />}
          </button>
        )}
      </div>

      <div className="sidebar-brand flex flex-col items-center gap-3 px-4 pb-2 pt-1 text-center">
        <span className="sidebar-brand-plate">
          <img src={escudoUabjb} alt="Escudo de la Universidad Autónoma del Beni José Ballivián" width={70} height={70} />
        </span>
        <div className="sidebar-label min-w-0">
          <p className="truncate text-base font-semibold text-[var(--sidebar-text-active)]">Sistema de Modalidad</p>
          <p className="truncate text-xs text-[var(--nav-meta)]">Ingeniería de Sistemas · UABJB</p>
        </div>
      </div>

      <nav aria-label="Navegación principal" className="mt-4 flex-1 overflow-y-auto px-3 pb-6">
        <div ref={linksRef} className={`relative ${indicator ? 'has-indicator' : ''}`}>
        {indicator && (
          <span
            aria-hidden="true"
            className={`sidebar-indicator ${indicator.animate ? 'sidebar-indicator--animate' : ''}`}
            style={{ transform: `translate(${indicator.left}px, ${indicator.top}px)`, width: indicator.width, height: indicator.height }}
          />
        )}
        {visibleLinks.map(({ to, label, icon: Icon, section }, index) => (
          <div key={to}>
            {section && visibleLinks[index - 1]?.section !== section && (
              <p className="sidebar-label sidebar-section mb-1.5 mt-5 px-3 text-[0.6875rem] font-semibold uppercase tracking-[0.08em]">{section}</p>
            )}
            <NavLink
              to={to}
              aria-label={collapsed ? label : undefined}
              title={collapsed ? label : undefined}
              className={({ isActive }) => `sidebar-link mb-0.5 flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium ${isActive || (studentMode && to === '/' && processActive) ? 'sidebar-link--active' : ''}`}
            >
              <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
              <span className="sidebar-label">{label}</span>
            </NavLink>
          </div>
        ))}
        </div>
      </nav>
    </aside>
  )
}
