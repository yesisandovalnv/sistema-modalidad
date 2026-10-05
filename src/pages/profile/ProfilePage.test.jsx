import { render, screen } from '@testing-library/react'
import { AuthContext } from '../../context/AuthContext'
import ProfilePage from './ProfilePage'

function renderProfile(user) {
  return render(<AuthContext.Provider value={{ user }}><ProfilePage /></AuthContext.Provider>)
}

describe('ProfilePage', () => {
  it('muestra los datos disponibles desde el usuario autenticado', () => {
    renderProfile({
      nombre_completo: 'Agustin Fernando Pérez',
      username: 'agustin',
      correo_institucional: 'agustin@institucion.edu',
      correo_personal: 'agustin@example.com',
      ru: 'RU-123',
      ci: 'CI-456',
      rol: { codigo: 'ROL_FUTURO', nombre: 'Coordinación Académica' },
    })

    for (const value of [
      'Agustin Fernando Pérez',
      'agustin',
      'agustin@institucion.edu',
      'agustin@example.com',
      'RU-123',
      'CI-456',
      'Coordinación Académica',
    ]) expect(screen.getByText(value)).toBeInTheDocument()
    expect(screen.queryByText('Información de cuenta')).not.toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(1)
    expect(screen.queryByText('ROL_FUTURO')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Editar|Guardar|contraseña/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('presenta los campos sin dato como no registrados, sin condicionar por rol', () => {
    renderProfile({
      nombres: 'María Fernanda',
      username: 'maria',
      correo_institucional: 'maria@institucion.edu',
      rol: { codigo: 'ESTUDIANTE', nombre: 'Estudiante' },
    })

    expect(screen.getByText('María Fernanda')).toBeInTheDocument()
    expect(screen.getByText('Estudiante')).toBeInTheDocument()
    expect(screen.getAllByText('No registrado')).toHaveLength(3)
  })
})
