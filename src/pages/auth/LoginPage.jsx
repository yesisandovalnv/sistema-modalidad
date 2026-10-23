import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { authService } from '../../services/authService'

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

  const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none dark:border-slate-700 dark:bg-slate-950'
  return (
    <div className="w-full max-w-md">
      <Card className="p-8">
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-500">Inicio de sesión</p>
          <h2 className="text-2xl font-semibold">Accede al sistema</h2>
          <p className="text-sm text-slate-500">Selecciona el tipo de acceso que te corresponde.</p>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-2" role="tablist" aria-label="Tipo de acceso">
          <Button type="button" role="tab" aria-selected={mode === 'student'} variant={mode === 'student' ? 'default' : 'outline'} onClick={() => selectMode('student')} disabled={isLoading}>Estudiantes</Button>
          <Button type="button" role="tab" aria-selected={mode === 'administrative'} variant={mode === 'administrative' ? 'default' : 'outline'} onClick={() => selectMode('administrative')} disabled={isLoading}>Personal administrativo</Button>
        </div>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {mode === 'student' ? <>
            <div><label className="mb-2 block text-sm font-medium" htmlFor="student-ru">R.U.</label><input id="student-ru" name="ru" autoComplete="username" className={inputClass} placeholder="Ingresa tu R.U." value={ru} onChange={(event) => setRu(event.target.value)} disabled={isLoading} required /></div>
            <div><label className="mb-2 block text-sm font-medium" htmlFor="student-ci">C.I.</label><input id="student-ci" name="ci" type="password" autoComplete="current-password" className={inputClass} placeholder="Ingresa tu C.I." value={ci} onChange={(event) => setCi(event.target.value)} disabled={isLoading} required /></div>
          </> : <>
            <div><label className="mb-2 block text-sm font-medium" htmlFor="administrative-username">Usuario</label><input id="administrative-username" name="username" autoComplete="username" className={inputClass} placeholder="Ingresa tu usuario" value={username} onChange={(event) => setUsername(event.target.value)} disabled={isLoading} required /></div>
            <div><label className="mb-2 block text-sm font-medium" htmlFor="administrative-password">Contraseña</label><input id="administrative-password" name="password" type="password" autoComplete="current-password" className={inputClass} placeholder="********" value={password} onChange={(event) => setPassword(event.target.value)} disabled={isLoading} required /></div>
          </>}
          {error ? <p className="text-sm text-red-600" role="alert">{error}</p> : null}
          <Button className="w-full" type="submit" disabled={isLoading}>{isLoading ? 'Ingresando...' : 'Ingresar'}</Button>
        </form>
      </Card>
    </div>
  )
}
