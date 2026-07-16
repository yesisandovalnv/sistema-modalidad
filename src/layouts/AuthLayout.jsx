import { Outlet } from 'react-router-dom'

export function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10 dark:bg-slate-950">
      <div className="w-full max-w-6xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="grid min-h-[700px] lg:grid-cols-2">
          <div className="hidden bg-gradient-to-br from-slate-900 to-slate-700 p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-300">Arquitectura inicial</p>
              <h2 className="mt-4 text-3xl font-semibold">Sistema de modalidad</h2>
              <p className="mt-3 max-w-md text-sm text-slate-300">
                Interfaz profesional y escalable para conectar con un backend en Django REST Framework.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/10 p-4 text-sm text-slate-200">
              <p className="font-medium">Próximos pasos</p>
              <ul className="mt-2 space-y-1 text-slate-300">
                <li>• Autenticación JWT</li>
                <li>• Integración con API</li>
                <li>• Protección de rutas</li>
              </ul>
            </div>
          </div>
          <div className="flex items-center justify-center p-6 sm:p-10">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  )
}
