import { useState } from 'react'
import { Navbar } from '../components/layout/Navbar'
import { Sidebar } from '../components/layout/Sidebar'
import { Footer } from '../components/layout/Footer'
import { Outlet } from 'react-router-dom'

export function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <div className="min-h-screen overflow-x-hidden">
        <Sidebar
          open={sidebarOpen}
          collapsed={sidebarCollapsed}
          onMobileToggle={() => setSidebarOpen((value) => !value)}
        />
        <div className="flex min-h-screen min-w-0 flex-col">
          <Navbar
            onMobileToggle={() => setSidebarOpen((value) => !value)}
            sidebarCollapsed={sidebarCollapsed}
            onSidebarToggle={() => setSidebarCollapsed((value) => !value)}
          />
          <main data-testid="main-content" data-collapsed={sidebarCollapsed} className={`layout-main flex-1 p-4 pt-[89px] md:p-6 md:pt-[97px] ${sidebarCollapsed ? 'layout-main--collapsed' : ''}`}>
            <Outlet />
          </main>
          <div className={`layout-footer ${sidebarCollapsed ? 'layout-footer--collapsed' : ''}`}>
            <Footer />
          </div>
        </div>
      </div>
    </div>
  )
}
