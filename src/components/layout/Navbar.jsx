import { Bell, Moon, Sun, Menu } from 'lucide-react'
import { Button } from '../ui/button'
import { useTheme } from '../../context/ThemeContext'

export function Navbar({ onToggle }) {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 md:px-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" className="md:hidden" onClick={onToggle}>
          <Menu className="h-5 w-5" />
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
