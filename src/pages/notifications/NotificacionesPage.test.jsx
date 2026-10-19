import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NotificationContext } from '../../context/NotificationContext'
import { notificacionesService } from '../../services/notificacionesService'
import NotificacionesPage from './NotificacionesPage'

vi.mock('../../services/notificacionesService', () => ({
  notificacionesService: {
    obtenerNotificaciones: vi.fn(),
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
        <NotificacionesPage />
      </NotificationContext.Provider>,
    )

    await user.click(await screen.findByRole('button', { name: 'Ver detalle' }))

    const dialog = screen.getByRole('dialog', { name: 'Etapa aprobada' })
    expect(dialog).toHaveClass('fixed', 'inset-0', 'z-50', 'bg-black/60')
    expect(dialog).not.toHaveClass('bg-slate-950/60')
    fireEvent.mouseDown(dialog)
    expect(screen.queryByRole('dialog', { name: 'Etapa aprobada' })).not.toBeInTheDocument()
  })
})
