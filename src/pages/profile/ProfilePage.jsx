import { useAuth } from '../../hooks/useAuth'
import { ProfileContent } from './ProfileContent'

// La ruta /perfil sigue existiendo para enlaces directos; desde el menú de usuario el perfil
// se abre en una ventana flotante con el mismo contenido (ProfileModal).
export default function ProfilePage() {
  const { user } = useAuth()
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-[var(--heading)]">Mi perfil</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Consulta la información asociada a tu cuenta.</p>
      </header>
      <ProfileContent user={user} />
    </div>
  )
}
