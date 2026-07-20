import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { authService } from '../../services/authService'

export default function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await authService.login({
        username: username.trim(),
        password,
      })

      localStorage.setItem('auth_access_token', response.data.access)
      localStorage.setItem('auth_refresh_token', response.data.refresh)
      window.dispatchEvent(new Event('auth-authenticated'))
      navigate('/dashboard')
    } catch (requestError) {
      if (!requestError.response) {
        setError('No se pudo conectar con el servidor.')
      } else if (requestError.response.status === 401) {
        setError('Usuario o contraseña incorrectos.')
      } else if (requestError.response.status === 403) {
        setError('No tienes permiso para acceder.')
      } else {
        const detail = requestError.response.data?.detail
        setError(typeof detail === 'string' ? detail : 'No fue posible iniciar sesión. Intenta nuevamente.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      <Card className="p-8">
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-500">Inicio de sesión</p>
          <h2 className="text-2xl font-semibold">Accede al sistema</h2>
          <p className="text-sm text-slate-500">Ingresa con tus credenciales para acceder al sistema.</p>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm font-medium">Usuario</label>
            <input
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none ring-0 dark:border-slate-700 dark:bg-slate-950"
              placeholder="Ingresa tu usuario"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              disabled={isLoading}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Contraseña</label>
            <input
              type="password"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none ring-0 dark:border-slate-700 dark:bg-slate-950"
              placeholder="********"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isLoading}
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button className="w-full" type="submit" disabled={isLoading}>
            {isLoading ? 'Ingresando...' : 'Ingresar'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
