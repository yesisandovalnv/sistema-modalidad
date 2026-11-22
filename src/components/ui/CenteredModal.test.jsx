import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect, useState } from 'react'
import { describe, expect, it } from 'vitest'
import { CenteredModal } from './CenteredModal'

function Harness({ sidebarInert = false }) {
  const [open, setOpen] = useState(true)
  return (
    <>
      <aside id="main-sidebar" inert={sidebarInert ? true : undefined}><a href="/postulantes">Postulantes</a></aside>
      {open && <CenteredModal title="Mi perfil" onClose={() => setOpen(false)}><p>Contenido</p></CenteredModal>}
    </>
  )
}

describe('CenteredModal', () => {
  it('bloquea el menú lateral mientras está abierta y lo libera al cerrar', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const sidebar = document.getElementById('main-sidebar')
    expect(sidebar).toHaveAttribute('inert')
    expect(sidebar).toHaveAttribute('data-modal-blocked')
    await user.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByRole('dialog', { name: 'Mi perfil' })).not.toBeInTheDocument()
    expect(sidebar).not.toHaveAttribute('inert')
    expect(sidebar).not.toHaveAttribute('data-modal-blocked')
  })

  it('si el menú ya estaba bloqueado (celular, menú cerrado) lo deja así al cerrar', async () => {
    const user = userEvent.setup()
    render(<Harness sidebarInert />)
    const sidebar = document.getElementById('main-sidebar')
    await user.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(sidebar).toHaveAttribute('inert')
    expect(sidebar).not.toHaveAttribute('data-modal-blocked')
  })

  it('en la app bloquea todo lo de atrás (menú, barra y página) y Escape cierra desde cualquier lado', async () => {
    const user = userEvent.setup()
    function App() {
      const [open, setOpen] = useState(true)
      return (
        <>
          <div className="app-shell">
            <aside id="main-sidebar"><a href="/postulantes">Postulantes</a></aside>
            <button type="button">Campana</button>
          </div>
          {open && <CenteredModal title="Mi perfil" onClose={() => setOpen(false)}><button type="button">Uno</button><button type="button" tabIndex={-1}>Oculto</button></CenteredModal>}
        </>
      )
    }
    render(<App />)
    const shell = document.querySelector('.app-shell')
    expect(shell).toHaveAttribute('inert')
    expect(document.getElementById('main-sidebar')).toHaveAttribute('data-modal-blocked')
    await user.tab(); await user.tab(); await user.tab()
    expect(document.activeElement.closest('[role="dialog"]')).not.toBeNull()
    document.body.focus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Mi perfil' })).not.toBeInTheDocument()
    expect(shell).not.toHaveAttribute('inert')
  })

  it('si hay una ventana interna abierta (como las del Expediente), Escape y Tab son de esa ventana', async () => {
    const user = userEvent.setup()
    function Inner() {
      const [open, setOpen] = useState(true)
      useEffect(() => {
        const onKey = (event) => { if (event.key === 'Escape') setOpen(false) }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
      }, [])
      return open ? <div role="dialog" aria-modal="true" aria-label="Subir documento"><button type="button">Uno</button><button type="button">Dos</button></div> : null
    }
    function App() {
      const [open, setOpen] = useState(true)
      return open ? <CenteredModal title="Expediente" layer="page" onClose={() => setOpen(false)}><Inner /></CenteredModal> : null
    }
    render(<App />)
    const inner = screen.getByRole('dialog', { name: 'Subir documento' })
    screen.getByRole('button', { name: 'Dos' }).focus()
    await user.tab()
    // El foco no salta a la X de la ventana flotante: sigue el orden normal.
    expect(screen.getByRole('button', { name: 'Cerrar' })).not.toHaveFocus()
    screen.getByRole('button', { name: 'Uno' }).focus()
    await user.keyboard('{Escape}')
    expect(inner).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Expediente' })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Expediente' })).not.toBeInTheDocument()
  })

  it('layer="page" deja la ventana por debajo de las ventanas internas', () => {
    render(<CenteredModal title="Expediente" layer="page" onClose={() => {}}><p>Contenido</p></CenteredModal>)
    expect(document.querySelector('.modal-overlay')).toHaveAttribute('data-layer', 'page')
    expect(document.querySelector('.modal-catcher')).toHaveAttribute('data-layer', 'page')
  })
})
