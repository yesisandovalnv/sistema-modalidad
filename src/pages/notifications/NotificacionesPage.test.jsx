import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NotificationContext } from '../../context/NotificationContext'
import { notificacionesService } from '../../services/notificacionesService'
import NotificacionesPage from './NotificacionesPage'

vi.mock('../../services/notificacionesService', () => ({
  notificacionesService: {
    obtenerNotificaciones: vi.fn(),
    obtenerNotificacion: vi.fn(),
    marcarLeida: vi.fn(),
    marcarNoLeida: vi.fn(),
    marcarTodasLeidas: vi.fn(),
  },
}))

const notification = {
  id: 12,
  tipo: 'ETAPA_APROBADA',
  nivel: 'INFO',
  titulo: 'Etapa aprobada',
  mensaje: 'La etapa Inscripción fue aprobada.',
  leida: false,
  created_at: '2026-10-18T12:00:00Z',
  metadata: {},
}

describe('NotificacionesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    notificacionesService.marcarLeida.mockImplementation((id) => Promise.resolve({ ...notification, id, leida: true }))
    notificacionesService.obtenerNotificaciones.mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [notification],
    })
  })

  it('usa el overlay modal estándar al abrir el detalle de notificación', async () => {
    const user = userEvent.setup()
    const context = {
      unreadCount: 1,
      refreshUnreadCount: vi.fn(),
      decrementUnread: vi.fn(),
      incrementUnread: vi.fn(),
      clearUnread: vi.fn(),
    }
    render(
      <NotificationContext.Provider value={context}>
        <MemoryRouter><NotificacionesPage /></MemoryRouter>
      </NotificationContext.Provider>,
    )

    await user.click(await screen.findByRole('button', { name: /Etapa aprobada/ }))
    expect(notificacionesService.marcarLeida).toHaveBeenCalledWith(12)
    await vi.waitFor(() => expect(context.decrementUnread).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('button', { name: /Marcar (no )?leída/ })).not.toBeInTheDocument()

    const dialog = screen.getByRole('dialog', { name: 'Etapa aprobada' })
    expect(dialog).toHaveClass('fixed', 'inset-0', 'z-50', 'bg-black/60')
    expect(dialog).not.toHaveClass('bg-slate-950/60')
    fireEvent.mouseDown(dialog)
    expect(screen.queryByRole('dialog', { name: 'Etapa aprobada' })).not.toBeInTheDocument()
  })

  it('filtra con el menú Filtrar y la fecha Hasta incluye todo el día', async () => {
    const user = userEvent.setup()
    const context = { unreadCount: 0, refreshUnreadCount: vi.fn(), decrementUnread: vi.fn(), incrementUnread: vi.fn(), clearUnread: vi.fn() }
    render(<NotificationContext.Provider value={context}><MemoryRouter><NotificacionesPage /></MemoryRouter></NotificationContext.Provider>)
    await screen.findByRole('button', { name: /Etapa aprobada/ })
    await user.click(screen.getByRole('button', { name: /Filtrar/ }))
    await user.click(screen.getByRole('button', { name: 'Solo sin leer' }))
    expect(notificacionesService.obtenerNotificaciones).toHaveBeenLastCalledWith(expect.objectContaining({ leida: 'false', page: 1 }), expect.anything())
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-11-20' } })
    expect(notificacionesService.obtenerNotificaciones).toHaveBeenLastCalledWith(expect.objectContaining({ fecha_hasta: '2026-11-20T23:59:59' }), expect.anything())
  })

  it('abre el detalle de la notificación indicada en ?ver=', async () => {
    notificacionesService.obtenerNotificacion.mockResolvedValue({ ...notification, id: 99, titulo: 'Defensa programada' })
    const context = { unreadCount: 0, refreshUnreadCount: vi.fn(), decrementUnread: vi.fn(), incrementUnread: vi.fn(), clearUnread: vi.fn() }
    render(<NotificationContext.Provider value={context}><MemoryRouter initialEntries={['/notificaciones?ver=99']}><NotificacionesPage /></MemoryRouter></NotificationContext.Provider>)
    expect(await screen.findByRole('dialog', { name: 'Defensa programada' })).toBeInTheDocument()
    expect(notificacionesService.obtenerNotificacion).toHaveBeenCalledWith('99', expect.anything())
    expect(notificacionesService.marcarLeida).toHaveBeenCalledWith(99)
  })

  it('tiene un botón para volver', async () => {
    const context = { unreadCount: 0, refreshUnreadCount: vi.fn(), decrementUnread: vi.fn(), incrementUnread: vi.fn(), clearUnread: vi.fn() }
    render(<NotificationContext.Provider value={context}><MemoryRouter><NotificacionesPage /></MemoryRouter></NotificationContext.Provider>)
    expect(await screen.findByRole('button', { name: 'Volver' })).toBeInTheDocument()
  })
})
