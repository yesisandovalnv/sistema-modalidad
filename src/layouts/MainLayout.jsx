import { useCallback, useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Navbar } from '../components/layout/Navbar'
import { Sidebar } from '../components/layout/Sidebar'
import { Footer } from '../components/layout/Footer'
import { useAuth } from '../hooks/useAuth'
import { applyColorTheme, loadColorTheme } from '../lib/colorThemes'

export function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { pathname } = useLocation()
  const { user } = useAuth() || {}
  const username = user?.username
  const panelRef = useRef(null)
  const toggleSidebar = useCallback(() => setSidebarOpen((value) => !value), [])
  const toggleCollapsed = useCallback(() => setSidebarCollapsed((value) => !value), [])

  // Tema de color del usuario (Mi perfil → Tema de color). Al salir vuelve a los de la UABJB.
  useEffect(() => {
    applyColorTheme(loadColorTheme(username))
    return () => applyColorTheme('uabjb')
  }, [username])

  // Las ventanas flotantes (CenteredModal) cubren solo el área a la derecha del menú lateral.
  useEffect(() => {
    document.documentElement.dataset.sidebar = sidebarCollapsed ? 'collapsed' : 'expanded'
    return () => { delete document.documentElement.dataset.sidebar }
  }, [sidebarCollapsed])

  // Al cambiar de pantalla: el menú del celular se cierra y el panel vuelve arriba.
  useEffect(() => {
    setSidebarOpen(false)
    panelRef.current?.scrollTo?.({ top: 0 })
  }, [pathname])

  return (
    <div className="app-shell">
      <Sidebar
        open={sidebarOpen}
        collapsed={sidebarCollapsed}
        onMobileToggle={toggleSidebar}
        onCollapseToggle={toggleCollapsed}
      />
      {sidebarOpen && (
        <button
          type="button"
          aria-hidden="true"
          tabIndex={-1}
          className="fixed inset-0 z-[35] bg-[var(--scrim)] md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div ref={panelRef} data-testid="layout-panel" className={`layout-column flex min-w-0 flex-col ${sidebarCollapsed ? 'layout-column--collapsed' : ''}`}>
        <Navbar
          onMobileToggle={toggleSidebar}
          sidebarCollapsed={sidebarCollapsed}
        />
        <main data-testid="main-content" data-collapsed={sidebarCollapsed} className={`layout-main flex-1 px-4 pb-6 md:px-8 md:pb-8 ${sidebarCollapsed ? 'layout-main--collapsed' : ''}`}>
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  )
}
