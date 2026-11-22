import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NotificationContext } from '../../context/NotificationContext'
import { notificacionesService } from '../../services/notificacionesService'
import { NotificationsMenu } from './NotificationsMenu'

vi.mock('../../services/notificacionesService', () => ({
  notificacionesService: {
    obtenerNotificaciones: vi.fn(),
    marcarLeida: vi.fn(),
    marcarTodasLeidas: vi.fn(),
  },
}))

const items = [
  { id: 7, tipo: 'DOCUMENTO_OBSERVADO', nivel: 'WARNING', titulo: 'Documento observado', mensaje: 'El documento Perfil tiene observaciones pendientes.', leida: false, created_at: new Date(Date.now() - 2 * 3600e3).toISOString() },
  { id: 8, tipo: 'ETAPA_APROBADA', nivel: 'SUCCESS', titulo: 'Etapa aprobada', mensaje: 'La etapa Inscripción fue aprobada.', leida: true, created_at: new Date(Date.now() - 3 * 86400e3).toISOString() },
]

function Where() {
  const location = useLocation()
  return <p data-testid="ruta">{location.pathname}{location.search}</p>
}

function renderMenu(context = {}) {
  const value = { unreadCount: 1, decrementUnread: vi.fn(), clearUnread: vi.fn(), refreshUnreadCount: vi.fn(), ...context }
  render(
    <NotificationContext.Provider value={value}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <NotificationsMenu />
        <Routes><Route path="*" element={<Where />} /></Routes>
      </MemoryRouter>
    </NotificationContext.Provider>,
  )
  return value
}

describe('NotificationsMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    notificacionesService.obtenerNotificaciones.mockResolvedValue({ count: 2, results: items })
    notificacionesService.marcarLeida.mockResolvedValue({ ...items[0], leida: true })
    notificacionesService.marcarTodasLeidas.mockResolvedValue({ actualizadas: 1 })
  })

  it('abre una ventana sin filtros con Nuevas y Anteriores, y el botón Ver todas', async () => {
    const user = userEvent.setup()
    renderMenu()
    await user.click(screen.getByRole('button', { name: 'Notificaciones, 1 sin leer' }))
    const dialog = screen.getByRole('dialog', { name: 'Notificaciones' })
    const nuevas = await within(dialog).findByRole('region', { name: 'Nuevas' })
    expect(within(nuevas).getByText('Documento observado')).toBeInTheDocument()
    expect(within(within(dialog).getByRole('region', { name: 'Anteriores' })).getByText('Etapa aprobada')).toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: /Ver todas/ })).toHaveAttribute('href', '/notificaciones')
    expect(within(dialog).queryByRole('button', { name: 'Leídas' })).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Advertencia' })).not.toBeInTheDocument()
    expect(notificacionesService.obtenerNotificaciones).toHaveBeenCalledWith({ page_size: 8 }, expect.anything())
  })

  it('al elegir una notificación abre su detalle en la página (ahí se marca como leída)', async () => {
    const user = userEvent.setup()
    renderMenu()
    await user.click(screen.getByRole('button', { name: /Notificaciones/ }))
    await user.click(await screen.findByText('Documento observado'))
    expect(screen.getByTestId('ruta')).toHaveTextContent('/notificaciones?ver=7')
    expect(screen.queryByRole('dialog', { name: 'Notificaciones' })).not.toBeInTheDocument()
  })

  it('marca todas como leídas y se cierra con Escape devolviendo el foco', async () => {
    const user = userEvent.setup()
    const context = renderMenu()
    const bell = screen.getByRole('button', { name: /Notificaciones/ })
    await user.click(bell)
    await screen.findByText('Documento observado')
    await user.click(screen.getByRole('button', { name: 'Marcar todas como leídas' }))
    expect(notificacionesService.marcarTodasLeidas).toHaveBeenCalled()
    expect(context.clearUnread).toHaveBeenCalled()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Notificaciones' })).not.toBeInTheDocument()
    expect(bell).toHaveFocus()
  })
})
