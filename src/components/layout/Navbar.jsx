import { Bell, Moon, Sun, Menu } from 'lucide-react'
import { Button } from '../ui/button'
import { useTheme } from '../../hooks/useTheme'

export function Navbar({ onMobileToggle, sidebarCollapsed, onSidebarToggle }) {
  const { theme, toggleTheme } = useTheme()

  return (
    <header data-collapsed={sidebarCollapsed} className={`layout-navbar fixed top-0 right-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 md:px-6 ${sidebarCollapsed ? 'layout-navbar--collapsed' : ''}`}>
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
          <p className="text-sm font-medium text-slate-500">Bienvenido</p>
          <h1 className="text-lg font-semibold">Sistema de modalidad</h1>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon">
          <Bell className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}
