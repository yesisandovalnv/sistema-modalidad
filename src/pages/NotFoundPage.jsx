import { Link } from 'react-router-dom'
import { Button } from '../components/ui/button'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center dark:bg-slate-950">
      <p className="text-sm uppercase tracking-[0.3em] text-slate-500">404</p>
      <h1 className="mt-4 text-4xl font-semibold">Página no encontrada</h1>
      <p className="mt-3 max-w-md text-sm text-slate-500">La ruta solicitada no existe o aún no está disponible en la arquitectura inicial.</p>
      <Link to="/dashboard" className="mt-6">
        <Button>Volver al dashboard</Button>
      </Link>
    </div>
  )
}
