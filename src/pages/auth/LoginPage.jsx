import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, GraduationCap, IdCard, LockKeyhole, UserRound } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { authService } from '../../services/authService'
import careerLogo from '../../../uab/logo/Logo-ac.png'

const STUDENT_ERROR = 'No fue posible iniciar sesión con los datos proporcionados.'

export default function LoginPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('student')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [ru, setRu] = useState('')
  const [ci, setCi] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const selectMode = (nextMode) => { setMode(nextMode); setError('') }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      const response = mode === 'student'
        ? await authService.studentLogin({ ru: ru.trim().toUpperCase(), ci: ci.trim() })
        : await authService.login({ username: username.trim(), password })
      localStorage.setItem('auth_access_token', response.data.access)
      localStorage.setItem('auth_refresh_token', response.data.refresh)
      window.dispatchEvent(new Event('auth-authenticated'))
      navigate('/', { replace: true })
    } catch (requestError) {
      if (!requestError.response) setError('No se pudo conectar con el servidor.')
      else if (mode === 'student') setError(STUDENT_ERROR)
      else if ([400, 401].includes(requestError.response.status)) setError('Usuario o contraseña incorrectos.')
      else if (requestError.response.status === 403) setError('No tienes permiso para acceder.')
      else {
        const detail = requestError.response.data?.detail
        setError(typeof detail === 'string' ? detail : 'No fue posible iniciar sesión. Intenta nuevamente.')
      }
    } finally { setIsLoading(false) }
  }

  const inputClass = 'w-full rounded-xl border border-slate-300 bg-white min-h-11 py-2.5 pl-11 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-700 focus:ring-4 focus:ring-blue-700/10 disabled:cursor-not-allowed disabled:bg-slate-100'
  const isStudent = mode === 'student'
  const activeAccessName = isStudent ? 'estudiantes' : 'personal administrativo'
  return (
    <div className="w-full">
      <Card className="rounded-3xl border-white/70 bg-white/98 p-5 shadow-lg" style={{ colorScheme: 'light', '--surface': '#ffffff', '--text-primary': '#0f172a' }}>
        <div className="mb-3 text-center">
          <img src={careerLogo} alt="Escudo de la Carrera de Ingeniería de Sistemas" className="mx-auto h-16 w-16 object-contain" />
          <p className="mt-2 text-xs font-bold uppercase tracking-wider text-blue-900">Universidad Autónoma del Beni<br />«José Ballivián»</p>
          <p className="mt-1 text-xs uppercase tracking-wider text-slate-600">Carrera de Ingeniería de Sistemas</p>
          <div className="mx-auto mt-3 h-0.5 w-14 bg-amber-400" />
        </div>
        <header className="space-y-1 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-800">
            Sistema de Modalidades de Graduación
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            Bienvenido
          </h1>
          <p className="mx-auto max-w-md text-sm leading-5 text-slate-600">
            Ingresa con tus credenciales institucionales para continuar.
          </p>
        </header>

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5" role="tablist" aria-label="Tipo de acceso">
          <Button
            type="button"
            id="student-access-tab"
            role="tab"
            aria-selected={isStudent}
            aria-controls="login-form"
            variant={isStudent ? 'default' : 'ghost'}
            className={`min-h-12 min-w-0 gap-2 whitespace-normal rounded-xl px-2 text-xs leading-4 sm:text-sm ${isStudent ? 'shadow-sm' : 'text-slate-600 hover:bg-white/70'}`}
            onClick={() => selectMode('student')}
            disabled={isLoading}
          >
            <GraduationCap aria-hidden="true" size={17} />
            Estudiantes
          </Button>
          <Button
            type="button"
            id="administrative-access-tab"
            role="tab"
            aria-selected={!isStudent}
            aria-controls="login-form"
            variant={!isStudent ? 'default' : 'ghost'}
            className={`min-h-12 min-w-0 gap-2 whitespace-normal rounded-xl px-2 text-xs leading-4 sm:text-sm ${!isStudent ? 'shadow-sm' : 'text-slate-600 hover:bg-white/70'}`}
            onClick={() => selectMode('administrative')}
            disabled={isLoading}
          >
            <UserRound aria-hidden="true" size={17} />
            Personal administrativo
          </Button>
        </div>

        <form
          id="login-form"
          className="mt-3 space-y-3"
          onSubmit={handleSubmit}
          aria-busy={isLoading}
          role="tabpanel"
          aria-labelledby={isStudent ? 'student-access-tab' : 'administrative-access-tab'}
        >
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-slate-900">
              Acceso para {activeAccessName}
            </p>
            <p className="text-xs leading-5 text-slate-500">
              {isStudent
                ? 'Utiliza tu Registro Universitario y Cédula de Identidad.'
                : 'Utiliza el usuario y la contraseña asignados.'}
            </p>
          </div>

          {isStudent ? <>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-800" htmlFor="student-ru">R.U.</label>
              <div className="relative">
                <IdCard aria-hidden="true" size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input id="student-ru" name="ru" autoComplete="username" className={inputClass} placeholder="Ingresa tu R.U." value={ru} onChange={(event) => setRu(event.target.value)} disabled={isLoading} required />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-800" htmlFor="student-ci">C.I.</label>
              <div className="relative">
                <LockKeyhole aria-hidden="true" size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input id="student-ci" name="ci" type="password" autoComplete="current-password" className={inputClass} placeholder="Ingresa tu C.I." value={ci} onChange={(event) => setCi(event.target.value)} disabled={isLoading} required />
              </div>
            </div>
          </> : <>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-800" htmlFor="administrative-username">Usuario</label>
              <div className="relative">
                <UserRound aria-hidden="true" size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input id="administrative-username" name="username" autoComplete="username" className={inputClass} placeholder="Ingresa tu usuario" value={username} onChange={(event) => setUsername(event.target.value)} disabled={isLoading} required />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-800" htmlFor="administrative-password">Contraseña</label>
              <div className="relative">
                <LockKeyhole aria-hidden="true" size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input id="administrative-password" name="password" type="password" autoComplete="current-password" className={inputClass} placeholder="********" value={password} onChange={(event) => setPassword(event.target.value)} disabled={isLoading} required />
              </div>
            </div>
          </>}
          {error ? <p className="text-sm font-medium text-red-600" role="alert">{error}</p> : null}
          <Button className="min-h-12 w-full gap-2 rounded-xl text-sm font-semibold" type="submit" disabled={isLoading}>
            {isLoading ? 'Ingresando...' : 'Ingresar'}
            {!isLoading && <ArrowRight aria-hidden="true" size={17} />}
          </Button>
        </form>

      </Card>
    </div>
  )
}
