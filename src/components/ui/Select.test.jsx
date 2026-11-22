import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Select } from './Select'

const people = [
  { value: '1', label: '394090 - Luis Fernando Menacho', keywords: '394090 7700001' },
  { value: '2', label: '20260001 - Ana María Quispe', keywords: '20260001 9900001' },
  { value: '3', label: 'Opción bloqueada', disabled: true },
]

function Harness(props) {
  const [value, setValue] = useState('')
  return <><Select label="Estudiante" showLabel value={value} onChange={setValue} options={people} {...props} /><p>Elegido: {value || 'nada'}</p></>
}

describe('Select', () => {
  it('se despliega al tocarlo y filtra escribiendo en el mismo campo (sin tildes ni mayúsculas)', async () => {
    const user = userEvent.setup()
    render(<Harness searchable />)
    const combo = screen.getByRole('combobox', { name: 'Estudiante' })
    await user.click(combo)
    expect(screen.getAllByRole('option')).toHaveLength(3)
    await user.type(combo, 'maria')
    expect(screen.getAllByRole('option')).toHaveLength(1)
    await user.click(screen.getByRole('option', { name: /Ana María/ }))
    expect(screen.getByText('Elegido: 2')).toBeInTheDocument()
    expect(combo).toHaveValue('20260001 - Ana María Quispe')
  })

  it('busca también por R.U. o C.I. y avisa cuando nada coincide', async () => {
    const user = userEvent.setup()
    render(<Harness searchable emptyText="Ningún estudiante coincide" />)
    const combo = screen.getByRole('combobox', { name: 'Estudiante' })
    await user.type(combo, '7700001')
    expect(screen.getByRole('option', { name: /Luis Fernando/ })).toBeInTheDocument()
    await user.clear(combo)
    await user.type(combo, 'zzz')
    expect(screen.queryByRole('option')).not.toBeInTheDocument()
    expect(screen.getByText('Ningún estudiante coincide')).toBeInTheDocument()
  })

  it('no deja elegir opciones deshabilitadas y se maneja con teclado', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const combo = screen.getByRole('combobox', { name: 'Estudiante' })
    await user.click(combo)
    await user.click(screen.getByRole('option', { name: 'Opción bloqueada' }))
    expect(screen.getByText('Elegido: nada')).toBeInTheDocument()
    await user.keyboard('{ArrowDown}{Enter}')
    expect(screen.getByText('Elegido: 2')).toBeInTheDocument()
    await user.click(combo)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(combo).toHaveFocus()
  })

  it('se cierra al hacer clic en la etiqueta de arriba o en cualquier otro lugar', async () => {
    const user = userEvent.setup()
    render(<Harness searchable />)
    const combo = screen.getByRole('combobox', { name: 'Estudiante' })
    await user.click(combo)
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await user.click(screen.getByText('Estudiante'))
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    await user.click(combo)
    await user.click(screen.getByText(/Elegido:/))
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})
