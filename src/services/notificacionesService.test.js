import { vi } from 'vitest'
import apiClient from '../api/client'
import { cleanParams, notificacionesService } from './notificacionesService'

vi.mock('../api/client', () => ({ default: { get: vi.fn(), post: vi.fn() } }))

describe('notificacionesService', () => {
  it('omite vacíos y conserva false y fechas', () => expect(cleanParams({ leida: false, tipo: '', fecha_desde: '2026-07-18', nulo: null })).toEqual({ leida: false, fecha_desde: '2026-07-18' }))
  it('lista con parámetros y AbortSignal', async () => { const signal = new AbortController().signal; apiClient.get.mockResolvedValue({ data: { count: 0, results: [] } }); await expect(notificacionesService.obtenerNotificaciones({ leida: false }, signal)).resolves.toEqual({ count: 0, results: [] }); expect(apiClient.get).toHaveBeenCalledWith('/v1/notificaciones/', { params: { leida: false }, signal }) })
  it('obtiene detalle', async () => { apiClient.get.mockResolvedValue({ data: { id: 3 } }); await expect(notificacionesService.obtenerNotificacion(3)).resolves.toEqual({ id: 3 }) })
  it('obtiene el contador real', async () => { apiClient.get.mockResolvedValue({ data: { count: 4 } }); await expect(notificacionesService.obtenerConteoNoLeidas()).resolves.toEqual({ count: 4 }) })
  it.each([['marcarLeida', '/v1/notificaciones/7/marcar-leida/', 7], ['marcarNoLeida', '/v1/notificaciones/7/marcar-no-leida/', 7], ['marcarTodasLeidas', '/v1/notificaciones/marcar-todas-leidas/', undefined]])('%s usa su POST contractual', async (method, url, id) => { apiClient.post.mockResolvedValue({ data: { ok: true } }); await notificacionesService[method](id); expect(apiClient.post).toHaveBeenCalledWith(url) })
  it('normaliza errores sin ocultar el estado', async () => { apiClient.get.mockRejectedValue({ response: { status: 401, data: { detail: 'Sesión vencida' } } }); await expect(notificacionesService.obtenerConteoNoLeidas()).rejects.toMatchObject({ status: 401, message: 'Sesión vencida' }) })
})
