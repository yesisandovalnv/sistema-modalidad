import { Card } from '../../components/ui/card'
import { useAuth } from '../../hooks/useAuth'

function ProfileField({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-[var(--text-secondary)]">{label}</dt>
      <dd className="mt-1 break-words font-medium text-[var(--text-primary)]">{value || 'No registrado'}</dd>
    </div>
  )
}

export default function ProfilePage() {
  const { user } = useAuth()
  const personalFields = [
    ['Nombre completo', user?.nombre_completo || user?.nombres],
    ['Usuario', user?.username],
    ['Correo institucional', user?.correo_institucional],
    ['Correo personal', user?.correo_personal],
    ['R.U.', user?.ru],
    ['C.I.', user?.ci],
    ['Rol', user?.rol?.nombre],
  ]

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Mi perfil</h1>
        <p className="mt-1 text-[var(--text-secondary)]">Consulta la información asociada a tu cuenta.</p>
      </header>

      <Card>
        <section aria-labelledby="profile-personal-heading">
          <h2 id="profile-personal-heading" className="text-lg font-semibold text-[var(--text-primary)]">Información personal</h2>
          <dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {personalFields.map(([label, value]) => <ProfileField key={label} label={label} value={value} />)}
          </dl>
        </section>
      </Card>

    </div>
  )
}
