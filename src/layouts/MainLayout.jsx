import { useState } from 'react'
import { Navbar } from '../components/layout/Navbar'
import { Sidebar } from '../components/layout/Sidebar'
import { Footer } from '../components/layout/Footer'
import { Outlet } from 'react-router-dom'

export function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <div className="flex min-h-screen">
        <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen((value) => !value)} />
        <div className="flex min-h-screen flex-1 flex-col">
          <Navbar onToggle={() => setSidebarOpen((value) => !value)} />
          <main className="flex-1 p-4 md:p-6">
            <Outlet />
          </main>
          <Footer />
        </div>
      </div>
    </div>
  )
}
