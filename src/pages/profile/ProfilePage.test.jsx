import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthContext } from '../../context/AuthContext'
import ProfilePage from './ProfilePage'

function renderProfile(user) {
  return render(<AuthContext.Provider value={{ user }}><ProfilePage /></AuthContext.Provider>)
}

describe('ProfilePage', () => {
  it('muestra los datos disponibles desde el usuario autenticado, solo de lectura', () => {
    renderProfile({
      nombre_completo: 'Agustin Fernando Pérez',
      username: 'agustin',
      correo_institucional: 'agustin@institucion.edu',
      correo_personal: 'agustin@example.com',
      ru: 'RU-123',
      ci: 'CI-456',
      rol: { codigo: 'ROL_FUTURO', nombre: 'Coordinación Académica' },
    })

    for (const value of ['Agustin Fernando Pérez', 'agustin', 'agustin@institucion.edu', 'agustin@example.com', 'RU-123', 'CI-456', 'Coordinación Académica']) {
      expect(screen.getAllByText(value).length).toBeGreaterThan(0)
    }
    expect(screen.getByText('AP')).toBeInTheDocument()
    expect(screen.queryByText('ROL_FUTURO')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Editar|Guardar|contraseña/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('presenta los campos sin dato como no registrados, sin condicionar por rol', () => {
    renderProfile({ nombres: 'María Fernanda', username: 'maria', correo_institucional: 'maria@institucion.edu', rol: { codigo: 'ESTUDIANTE', nombre: 'Estudiante' } })

    expect(screen.getAllByText('María Fernanda').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Estudiante').length).toBeGreaterThan(0)
    expect(screen.getAllByText('No registrado')).toHaveLength(3)
  })

  it('el tema de color se elige en el perfil, se aplica al instante y queda guardado para el usuario', async () => {
    const user = userEvent.setup()
    renderProfile({ nombres: 'Ana', username: 'ana', rol: { nombre: 'Estudiante' } })
    const group = screen.getByRole('radiogroup', { name: 'Tema de color' })
    expect(screen.getByRole('radio', { name: /Azul marino/ })).toHaveAttribute('aria-checked', 'true')
    for (const name of ['Negro', 'Blanco', 'Turquesa', 'Verde azulado']) expect(screen.getByRole('radio', { name: new RegExp(name) })).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: /Negro/ }))
    expect(screen.getByRole('radio', { name: /Negro/ })).toHaveAttribute('aria-checked', 'true')
    expect(document.getElementById('color-theme')).not.toBeNull()
    expect(localStorage.getItem('sm_color_theme:ana')).toBe('negro')
    expect(group).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: /Azul marino/ }))
    expect(document.getElementById('color-theme')).toBeNull()
  })
})
