import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { usuariosService } from '../../services/usuariosService'

const EMPTY = { nombres: '', apellido_paterno: '', apellido_materno: '', ru: '', ci: '', correo_institucional: '' }

// Los estudiantes entran con su R.U. y su C.I.; el backend exige igualmente una contraseña
// inicial al crear la cuenta, así que se genera una aleatoria que nadie necesita conocer.
function initialPassword() {
  const bytes = new Uint8Array(18)
  crypto.getRandomValues(bytes)
  return `Est-${Array.from(bytes, (value) => value.toString(36).padStart(2, '0')).join('')}`.slice(0, 32)
}

/**
 * Registro rápido de un estudiante sin salir de "Nueva postulación". Crea la cuenta con el rol
 * Estudiante (el mismo camino que Usuarios → Nuevo usuario) y la devuelve con la forma de las
 * opciones del buscador para dejarla elegida.
 */
export function QuickStudentForm({ onCreated, onCancel }) {
  const [fields, setFields] = useState(EMPTY)
  const [state, setState] = useState({ saving: false, error: '' })
  const change = (name, value) => setFields((current) => ({ ...current, [name]: value }))

  const submit = async () => {
    const data = Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, value.trim()]))
    if (!data.nombres || !data.apellido_paterno || !data.ru || !data.ci) {
      setState({ saving: false, error: 'Completa nombres, apellido paterno, R.U. y C.I.' })
      return
    }
    setState({ saving: true, error: '' })
    try {
      const roles = await usuariosService.listRoles({ page_size: 100 })
      const role = (roles.results || roles).find((item) => String(item.codigo).toUpperCase() === 'ESTUDIANTE' && item.activo !== false)
      if (!role) throw new Error('No existe un rol Estudiante activo.')
      const created = await usuariosService.createUser({
        ...data,
        correo_institucional: data.correo_institucional || undefined,
        username: data.ru,
        role_id: role.id,
        is_active: true,
        password: initialPassword(),
      })
      onCreated({
        id: created.id,
        codigo: created.ru || data.ru,
        ru: created.ru || data.ru,
        ci: created.ci || data.ci,
        nombre_completo: created.nombre_completo || [data.nombres, data.apellido_paterno, data.apellido_materno].filter(Boolean).join(' '),
      })
    } catch (requestError) {
      setState({ saving: false, error: requestError.message || 'No se pudo registrar al estudiante.' })
    }
  }

  // Está dentro del formulario de la postulación: Enter registra al estudiante, no envía la postulación.
  const onKeyDown = (event) => {
    if (event.key === 'Enter') { event.preventDefault(); if (!state.saving) void submit() }
  }

  const input = (name, label, props = {}) => (
    <label className="form-label">{label}
      <input className="form-control" value={fields[name]} disabled={state.saving} onChange={(event) => change(name, event.target.value)} onKeyDown={onKeyDown} {...props} />
    </label>
  )

  return (
    <section className="quick-student" aria-labelledby="quick-student-title">
      <h3 id="quick-student-title" className="quick-student-title"><UserPlus className="h-4 w-4" aria-hidden="true" />Registrar estudiante</h3>
      <div className="grid gap-3 sm:grid-cols-3">
        {input('nombres', 'Nombres', { autoFocus: true, required: true })}
        {input('apellido_paterno', 'Apellido paterno', { required: true })}
        {input('apellido_materno', 'Apellido materno')}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {input('ru', 'R.U.', { required: true, inputMode: 'numeric' })}
        {input('ci', 'C.I.', { required: true })}
        {input('correo_institucional', 'Correo institucional (opcional)', { type: 'email' })}
      </div>
      <p className="form-help">El estudiante podrá ingresar al sistema con su R.U. y su C.I.</p>
      {state.error && <p role="alert" className="text-sm text-[var(--danger-text)]">{state.error}</p>}
      <div className="quick-student-actions">
        <Button type="button" variant="secondary" disabled={state.saving} onClick={onCancel}>Cancelar</Button>
        <Button type="button" disabled={state.saving} onClick={() => void submit()}>{state.saving ? 'Registrando…' : 'Registrar y elegir'}</Button>
      </div>
    </section>
  )
}
