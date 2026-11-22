import { AtSign, IdCard, Mail, Palette, ShieldCheck } from 'lucide-react'
import { ThemePicker } from './ThemePicker'

function initialsOf(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toLocaleUpperCase('es')
}

function Field({ label, value, wide = false }) {
  return (
    <div className={`min-w-0 ${wide ? 'sm:col-span-2' : ''}`}>
      <dt className="text-xs font-medium text-[var(--text-secondary)]">{label}</dt>
      <dd className={`break-words text-sm font-semibold ${value ? 'text-[var(--heading)]' : 'text-[var(--text-muted)]'}`}>{value || 'No registrado'}</dd>
    </div>
  )
}

function Section({ title, icon: Icon, index, className = '', plain = false, aside, children }) {
  return (
    <section className={`profile-section animate-enter ${className}`} style={{ '--stagger': index }} aria-label={title}>
      <h3 className="profile-section-title">
        <span className="profile-section-icon" aria-hidden="true"><Icon className="h-4 w-4" strokeWidth={2} /></span>
        {title}
        {aside && <span className="ml-auto text-xs font-normal text-[var(--text-secondary)]">{aside}</span>}
      </h3>
      {plain ? children : <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">{children}</dl>}
    </section>
  )
}

/**
 * Perfil del usuario, pensado para verse entero sin desplazarse: arriba la tarjeta de identidad
 * y sus datos (solo lectura); abajo, en una fila, los temas de color.
 */
export function ProfileContent({ user }) {
  const name = user?.nombre_completo || user?.nombres || user?.nombre || user?.username || 'Usuario'
  const role = user?.rol?.nombre || (user?.is_superuser ? 'Administrador del sistema' : 'Sin rol asignado')
  const access = user?.is_superuser ? 'Acceso total (superusuario)' : 'Según su rol'

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="profile-card animate-enter" style={{ '--stagger': 0 }} aria-label="Identidad">
          <span className="profile-band" aria-hidden="true" />
          <span className="profile-avatar" aria-hidden="true">{initialsOf(name)}</span>
          <p className="mt-2 text-base font-bold leading-tight text-[var(--heading)]">{name}</p>
          <p className="profile-role">{role}</p>
          {user?.username && <p className="mt-1.5 inline-flex items-center gap-1 text-sm text-[var(--text-secondary)]"><AtSign className="h-3.5 w-3.5" aria-hidden="true" />{user.username}</p>}
        </aside>

        <div className="grid gap-4 md:grid-cols-2">
          <Section title="Identificación" icon={IdCard} index={1}>
            <Field label="R.U." value={user?.ru} />
            <Field label="C.I." value={user?.ci} />
          </Section>
          <Section title="Contacto" icon={Mail} index={2}>
            <Field label="Correo institucional" value={user?.correo_institucional} />
            <Field label="Correo personal" value={user?.correo_personal} />
          </Section>
          <Section title="Cuenta" icon={ShieldCheck} index={3} className="md:col-span-2" aside="Solo la administración puede corregir estos datos.">
            <Field label="Nombre completo" value={user?.nombre_completo || user?.nombres} />
            <Field label="Usuario" value={user?.username} />
            <Field label="Rol" value={user?.rol?.nombre} />
            <Field label="Acceso" value={access} />
          </Section>
        </div>
      </div>

      <Section title="Tema de color" icon={Palette} index={4} plain aside="Cambia el menú, la barra, los botones y las cabeceras.">
        <ThemePicker username={user?.username} />
      </Section>
    </div>
  )
}
