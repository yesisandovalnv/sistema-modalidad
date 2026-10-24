import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AuthLayout } from './AuthLayout'
import campusPhoto from '../../uab/Estudiantes_rumbo_al_éxito_universitario.png_2K_20261024134144.jpg'

describe('AuthLayout campus photograph', () => {
  it('muestra exclusivamente la fotografía nueva sin reproductor ni respaldo antiguo', () => {
    const { container } = render(<MemoryRouter><AuthLayout /></MemoryRouter>)
    const photo = screen.getByRole('img', { name: 'Estudiantes recorriendo el campus universitario.' })
    expect(photo).toHaveAttribute('src', campusPhoto)
    expect(photo).toHaveClass('lg:object-contain', 'lg:object-left')
    expect(container.querySelector('video')).toBeNull()
    expect(container.innerHTML).not.toContain('login-campus-poster')
    expect(screen.getByRole('region', { name: 'Mensaje institucional' })).toHaveClass('hidden', 'lg:block')
  })

  it('conserva los elementos institucionales y el contenido del panel derecho', () => {
    render(<MemoryRouter><Routes><Route element={<AuthLayout />}><Route path="/" element={<p>Formulario de acceso</p>} /></Route></Routes></MemoryRouter>)
    expect(screen.getByText(/Universidad Autónoma del Beni/)).toBeInTheDocument()
    expect(screen.getByText(/nuestro orgullo/)).toBeInTheDocument()
    expect(screen.getByText('Formulario de acceso')).toBeInTheDocument()
  })
})
