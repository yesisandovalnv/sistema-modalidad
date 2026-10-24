import { Outlet } from 'react-router-dom'
import campusPhoto from '../../uab/Estudiantes_rumbo_al_éxito_universitario.png_2K_20261024134144.jpg'

export function AuthLayout() {
  return (
    <main className="relative isolate min-h-screen bg-slate-950">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <img src={campusPhoto} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover blur-xl" />
        <img src={campusPhoto} alt="Estudiantes recorriendo el campus universitario." className="absolute inset-0 h-full w-full object-cover object-top lg:object-contain lg:object-left" />
        <div className="absolute inset-0 bg-slate-950/35 lg:bg-gradient-to-t lg:from-slate-950/80 lg:via-slate-950/10 lg:to-transparent" />
      </div>
      <div className="mx-auto grid min-h-screen w-full max-w-screen-2xl items-center gap-10 px-4 py-6 sm:px-8 lg:grid-cols-2 lg:gap-12 lg:px-12 lg:py-10">
        <section aria-label="Mensaje institucional" className="hidden min-w-0 self-end pb-10 text-white lg:block">
          <p className="text-sm font-semibold uppercase tracking-widest">Universidad Autónoma del Beni<br />«José Ballivián»</p>
          <h2 className="mt-5 text-4xl font-bold leading-tight tracking-tight xl:text-6xl">Tu esfuerzo,<br /><span className="text-amber-400">nuestro orgullo</span></h2>
          <div className="mt-5 h-0.5 w-16 bg-amber-400" />
          <p className="mt-4 text-base leading-relaxed xl:text-lg">Sistema de Modalidades de Graduación<br />Carrera de Ingeniería de Sistemas</p>
        </section>
        <div className="w-full min-w-0 max-w-lg justify-self-center lg:justify-self-end">
          <Outlet />
        </div>
      </div>
    </main>
  )
}
