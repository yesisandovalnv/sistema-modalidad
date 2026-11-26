import { Outlet } from 'react-router-dom'
import campusPhoto from '../assets/login-campus-panorama.webp'

export function AuthLayout() {
  return (
    <main className="relative isolate min-h-svh bg-slate-950">
      <div role="img" aria-label="Estudiantes recorriendo el campus universitario." className="pointer-events-none fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url("${campusPhoto}")` }} />
      <div className="flex min-h-svh w-full items-center px-4 py-4 sm:px-8 lg:px-12 xl:px-16">
        <div className="mx-auto w-full min-w-0 max-w-md md:ml-auto md:mr-0">
          <Outlet />
        </div>
        <section aria-label="Mensaje institucional" className="absolute bottom-8 left-12 hidden max-w-sm text-white [text-shadow:0_2px_4px_rgb(0_0_0_/_70%)] xl:left-16">
          <p className="text-sm font-semibold uppercase tracking-widest">Universidad Autónoma del Beni<br />«José Ballivián»</p>
          <h2 className="mt-5 text-4xl font-bold leading-tight tracking-tight">Tu esfuerzo,<br /><span className="text-amber-400">nuestro orgullo</span></h2>
          <div className="mt-5 h-0.5 w-16 bg-amber-400" />
          <p className="mt-4 text-base leading-relaxed xl:text-lg">Sistema de Modalidades de Graduación<br />Carrera de Ingeniería de Sistemas</p>
        </section>
      </div>
    </main>
  )
}
