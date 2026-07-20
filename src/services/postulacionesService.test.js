import { beforeEach, describe, expect, it, vi } from 'vitest'
import apiClient from './api'
import { postulacionesService } from './postulacionesService'

vi.mock('./api', () => ({ default: { get: vi.fn() } }))

describe('postulacionesService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('carga detalle y flujo una sola vez con la misma señal', async () => {
    const signal = new AbortController().signal
    apiClient.get
      .mockResolvedValueOnce({ data: { id: 7, codigo: 'EXP-007' } })
      .mockResolvedValueOnce({ data: { id: 7, etapas: [] } })

    await expect(postulacionesService.obtenerExpediente(7, signal)).resolves.toEqual({
      detalle: { id: 7, codigo: 'EXP-007' },
      flujo: { id: 7, etapas: [] },
    })
    expect(apiClient.get).toHaveBeenNthCalledWith(1, '/api/v1/postulaciones/7/', { signal })
    expect(apiClient.get).toHaveBeenNthCalledWith(2, '/api/v1/postulaciones/7/flujo/', { signal })
    expect(apiClient.get).toHaveBeenCalledTimes(2)
  })

  it.each([
    [403, 'No tienes autorización para consultar este expediente.'],
    [404, 'El expediente solicitado no está disponible.'],
  ])('normaliza %s sin revelar información sensible', async (status, message) => {
    apiClient.get.mockRejectedValue({ response: { status } })
    await expect(postulacionesService.obtenerExpediente(9)).rejects.toEqual({ status, message })
  })

  it('identifica una cancelación sin convertirla en error visible', async () => {
    apiClient.get.mockRejectedValue({ code: 'ERR_CANCELED' })
    await expect(postulacionesService.obtenerExpediente(9)).rejects.toEqual({ canceled: true })
  })
})
