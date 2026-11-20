import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GraduationCap, IdCard, LockKeyhole, UserRound } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { authService } from '../../services/authService'
import careerLogo from '../../../uab/logo/Logo-ac.png'
import './LoginPage.css'

const STUDENT_ERROR = 'No fue posible iniciar sesión con los datos proporcionados.'

export default function LoginPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('student')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [ru, setRu] = useState('')
  const [ci, setCi] = useState('')
  const [studentPassword, setStudentPassword] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [studentScreen, setStudentScreen] = useState('login')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const selectMode = (nextMode) => { setMode(nextMode); setError(''); setNotice(''); setStudentScreen('login') }

  const requestStudentCode = async (purpose) => {
    const credentials = { ru: ru.trim().toUpperCase(), ci: ci.trim() }
    if (purpose === 'activation') await authService.requestStudentActivation(credentials)
    else await authService.requestStudentRecovery(credentials)
    setStudentScreen(purpose === 'activation' ? 'activation-confirm' : 'recovery-confirm')
    setNotice('Si los datos corresponden a una cuenta elegible, recibirás un código en tu correo institucional.')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      if (mode === 'student' && studentScreen === 'activation-request') {
        await requestStudentCode('activation')
        return
      }
      if (mode === 'student' && studentScreen === 'recovery-request') {
        await requestStudentCode('recovery')
        return
      }
      if (mode === 'student' && ['activation-confirm', 'recovery-confirm'].includes(studentScreen)) {
        const credentials = { ru: ru.trim().toUpperCase(), ci: ci.trim(), code: code.trim(), password: newPassword }
        if (studentScreen === 'activation-confirm') await authService.confirmStudentActivation(credentials)
        else await authService.confirmStudentRecovery(credentials)
        setStudentScreen('login')
        setStudentPassword(newPassword)
        setNewPassword('')
        setCode('')
        setNotice('Contraseña actualizada. Ya puedes iniciar sesión.')
        return
      }
      const response = mode === 'student'
        ? await authService.studentLogin({ ru: ru.trim().toUpperCase(), password: studentPassword })
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

  const inputClass = 'w-full rounded-xl border border-blue-200 bg-blue-50/80 min-h-11 py-2.5 pl-11 pr-3 text-sm text-slate-900 outline-none transition motion-reduce:transition-none focus:border-blue-700 focus:ring-4 focus:ring-blue-700/10 disabled:cursor-not-allowed disabled:bg-slate-100'
  const isStudent = mode === 'student'
  const studentRequest = ['activation-request', 'recovery-request'].includes(studentScreen)
  const studentConfirm = ['activation-confirm', 'recovery-confirm'].includes(studentScreen)
  return (
    <div className="login-page w-full">
      <Card className="login-card rounded-3xl border-white/80 p-5 sm:p-7" style={{ colorScheme: 'light', '--surface': '#ffffff', '--text-primary': '#0f172a' }}>
        <div className="mb-2 text-center">
          <img src={careerLogo} alt="Escudo de la Carrera de Ingeniería de Sistemas" className="login-logo mx-auto object-contain" />
          <div className="mx-auto mt-2 max-w-xs">
            <p className="text-base font-bold leading-tight text-slate-900 sm:text-lg">
              Sistema de Modalidades<br />de Graduación
            </p>
          </div>
          <div className="login-gradient mx-auto mt-3 h-0.5 w-16 rounded-full" />
        </div>
        <header className="space-y-1 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            Bienvenido
          </h1>
          <p className="mx-auto max-w-md text-sm leading-5 text-slate-600">
            Ingresa con tus credenciales institucionales
          </p>
        </header>

        <div className="mt-4 grid grid-cols-2 gap-1 rounded-2xl bg-indigo-50 p-1" role="tablist" aria-label="Tipo de acceso">
          <Button
            type="button"
            id="student-access-tab"
            role="tab"
            aria-selected={isStudent}
            aria-controls="login-form"
            variant={isStudent ? 'default' : 'ghost'}
            className={`login-access-tab min-h-11 min-w-0 gap-2 whitespace-normal rounded-xl px-2 text-xs leading-4 sm:text-sm ${isStudent ? 'login-gradient text-white shadow-sm' : 'text-slate-600 hover:bg-white/70'}`}
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
            className={`login-access-tab min-h-11 min-w-0 gap-2 whitespace-normal rounded-xl px-2 text-xs leading-4 sm:text-sm ${!isStudent ? 'login-gradient text-white shadow-sm' : 'text-slate-600 hover:bg-white/70'}`}
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
          <p className="text-xs leading-5 text-slate-500">
            {isStudent
              ? studentScreen === 'login' ? 'Ingresa con tu Registro Universitario y contraseña.' : 'Verifica tu identidad con tu Registro Universitario y Cédula de Identidad.'
              : 'Utiliza el usuario y la contraseña asignados.'}
          </p>

          {isStudent && studentScreen === 'login' ? <>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-800" htmlFor="student-ru">R.U.</label>
              <div className="relative">
                <IdCard aria-hidden="true" size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input id="student-ru" name="ru" autoComplete="username" className={inputClass} placeholder="Ingresa tu R.U." value={ru} onChange={(event) => setRu(event.target.value)} disabled={isLoading} required />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-800" htmlFor="student-password">Contraseña</label>
              <div className="relative">
                <LockKeyhole aria-hidden="true" size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input id="student-password" name="password" type="password" autoComplete="current-password" className={inputClass} placeholder="Ingresa tu contraseña" value={studentPassword} onChange={(event) => setStudentPassword(event.target.value)} disabled={isLoading} required />
              </div>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
              <button type="button" className="font-medium text-blue-800 underline" onClick={() => { setStudentScreen('activation-request'); setError(''); setNotice('') }}>Activar cuenta</button>
              <button type="button" className="font-medium text-blue-800 underline" onClick={() => { setStudentScreen('recovery-request'); setError(''); setNotice('') }}>Olvidé mi contraseña</button>
            </div>
          </> : null}
          {isStudent && studentRequest ? <>
            <label className="block text-sm font-medium text-slate-800" htmlFor="student-ru-request">R.U.
              <input id="student-ru-request" name="ru" autoComplete="username" className={`${inputClass} mt-1`} placeholder="Ingresa tu R.U." value={ru} onChange={(event) => setRu(event.target.value)} disabled={isLoading} required />
            </label>
            <label className="block text-sm font-medium text-slate-800" htmlFor="student-ci-request">C.I.
              <input id="student-ci-request" name="ci" type="password" autoComplete="off" className={`${inputClass} mt-1`} placeholder="Ingresa tu C.I." value={ci} onChange={(event) => setCi(event.target.value)} disabled={isLoading} required />
            </label>
          </> : null}
          {isStudent && studentConfirm ? <>
            <label className="block text-sm font-medium text-slate-800" htmlFor="student-code">Código de verificación
              <input id="student-code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className={`${inputClass} mt-1`} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} disabled={isLoading} required />
            </label>
            <label className="block text-sm font-medium text-slate-800" htmlFor="student-new-password">Nueva contraseña
              <input id="student-new-password" name="new-password" type="password" autoComplete="new-password" className={`${inputClass} mt-1`} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} disabled={isLoading} required />
            </label>
          </> : <>
          {!isStudent && <>
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
          </>}
          {notice && <p className="text-sm text-emerald-800" role="status">{notice}</p>}
          {error ? <p className="text-sm font-medium text-red-600" role="alert">{error}</p> : null}
          <Button className="login-gradient min-h-11 w-full gap-2 rounded-xl text-sm font-semibold text-white" type="submit" disabled={isLoading}>
            {isLoading ? 'Procesando...' : studentScreen === 'activation-request' ? 'Enviar código de activación' : studentScreen === 'recovery-request' ? 'Enviar código de recuperación' : studentConfirm ? 'Actualizar contraseña' : 'Ingresar'}
          </Button>
          {isStudent && studentScreen !== 'login' && <button type="button" className="w-full text-sm font-medium text-blue-800 underline" onClick={() => { setStudentScreen('login'); setError(''); setNotice('') }}>Volver al inicio de sesión</button>}
          <p className="text-center text-xs font-normal leading-4 text-slate-500">
            Universidad Autónoma del Beni «José Ballivián»
          </p>
        </form>

      </Card>
    </div>
  )
}
