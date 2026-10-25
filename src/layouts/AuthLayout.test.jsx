import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AuthLayout } from './AuthLayout'
import campusPhoto from '../assets/login-campus-panorama.webp'

describe('AuthLayout campus photograph', () => {
  it('muestra exclusivamente la fotografía nueva sin reproductor ni respaldo antiguo', () => {
    const { container } = render(<MemoryRouter><AuthLayout /></MemoryRouter>)
    const photo = screen.getByRole('img', { name: 'Estudiantes recorriendo el campus universitario.' })
    expect(photo).toHaveStyle({ backgroundImage: `url("${campusPhoto}")` })
    expect(photo).toHaveClass('fixed', 'inset-0', 'bg-cover', 'bg-center', 'bg-no-repeat')
    expect(screen.getAllByRole('img')).toHaveLength(1)
    expect(container.innerHTML).not.toMatch(/blur|object-contain|grid-cols-2|overflow-hidden/)
    expect(container.querySelector('video')).toBeNull()
    expect(container.innerHTML).not.toContain('login-campus-poster')
    expect(screen.getByRole('region', { name: 'Mensaje institucional' })).toHaveClass('hidden', 'lg:block')
  })

  it('conserva el mensaje a la izquierda y el panel flotante a la derecha', () => {
    render(<MemoryRouter><Routes><Route element={<AuthLayout />}><Route path="/" element={<p>Formulario de acceso</p>} /></Route></Routes></MemoryRouter>)
    expect(screen.getByText(/Universidad Autónoma del Beni/)).toBeInTheDocument()
    expect(screen.getByText(/nuestro orgullo/)).toBeInTheDocument()
    expect(screen.getByText('Formulario de acceso')).toBeInTheDocument()
    expect(screen.getByText('Formulario de acceso').parentElement).toHaveClass('max-w-md', 'md:ml-auto', 'md:mr-0')
    expect(screen.getByRole('region', { name: 'Mensaje institucional' })).toHaveClass('left-12', 'xl:left-16')
  })
})
