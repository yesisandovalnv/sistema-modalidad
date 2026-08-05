import { beforeEach, describe, expect, it, vi } from 'vitest'
import apiClient from './api'
import { postulacionesService } from './postulacionesService'

vi.mock('./api', () => ({ default: { get: vi.fn(), post: vi.fn() } }))

describe('postulacionesService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('obtiene el detalle básico con AbortSignal', async () => {
    const signal = new AbortController().signal
    apiClient.get.mockResolvedValue({ data: { id: 5, codigo: 'BASIC-005' } })
    await expect(postulacionesService.obtenerDetalle(5, signal)).resolves.toEqual({
      id: 5,
      codigo: 'BASIC-005',
    })
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/postulaciones/5/', { signal })
  })

  it.each([
    [403, 'No tienes autorización para consultar esta postulación.'],
    [404, 'La postulación solicitada no está disponible.'],
  ])('normaliza el error %s del detalle', async (status, message) => {
    apiClient.get.mockRejectedValue({ response: { status } })
    await expect(postulacionesService.obtenerDetalle(5)).rejects.toEqual({ status, message })
  })

  it('carga cada recurso del expediente una sola vez con la misma señal', async () => {
    const signal = new AbortController().signal
    apiClient.get
      .mockResolvedValueOnce({ data: { id: 7, codigo: 'EXP-007' } })
      .mockResolvedValueOnce({ data: { id: 7, etapas: [] } })
      .mockResolvedValueOnce({ data: { nota_final: null } })
      .mockResolvedValueOnce({ data: { advertencias_normativas: [] } })

    await expect(postulacionesService.obtenerExpediente(7, signal)).resolves.toEqual({
      detalle: { id: 7, codigo: 'EXP-007' },
      flujo: { id: 7, etapas: [] },
      resultado: { data: { nota_final: null }, error: '' },
      cierre: { data: { advertencias_normativas: [] }, error: '' },
    })
    expect(apiClient.get).toHaveBeenNthCalledWith(1, '/api/v1/postulaciones/7/', { signal })
    expect(apiClient.get).toHaveBeenNthCalledWith(2, '/api/v1/postulaciones/7/flujo/', { signal })
    expect(apiClient.get).toHaveBeenNthCalledWith(3, '/api/v1/postulaciones/7/resultado-final/', { signal })
    expect(apiClient.get).toHaveBeenNthCalledWith(4, '/api/v1/postulaciones/7/cierre/', { signal })
    expect(apiClient.get).toHaveBeenCalledTimes(4)
  })

  it('conserva detalle y flujo ante errores de resultado y cierre', async () => {
    apiClient.get
      .mockResolvedValueOnce({ data: { id: 7 } })
      .mockResolvedValueOnce({ data: { etapas: [] } })
      .mockRejectedValueOnce({ response: { status: 400 } })
      .mockRejectedValueOnce(new Error('red'))
    const data = await postulacionesService.obtenerExpediente(7)
    expect(data.resultado.error).toBe('Resultado final todavía no disponible')
    expect(data.cierre.error).toBe('Estado de cierre técnico todavía no disponible')
  })

  it.each([
    [401, 'Debes iniciar sesión para consultar este expediente.'],
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

  it('consulta una sola página de historial con filtro exacto y orden cronológico', async () => {
    const signal = new AbortController().signal
    apiClient.get.mockResolvedValue({ data: { count: 21, next: 'page=2', previous: null, results: [] } })
    await expect(postulacionesService.obtenerHistorial(7, 1, signal)).resolves.toMatchObject({ count: 21 })
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/postulaciones/historial/', {
      params: { postulacion: 7, ordering: 'fecha_cambio', page: 1 },
      signal,
    })
    expect(apiClient.get).toHaveBeenCalledTimes(1)
  })

  it.each([
    [401, 'Debes iniciar sesión para consultar el historial.'],
    [404, 'El historial solicitado no está disponible.'],
    [undefined, 'No se pudo cargar el historial. Intenta nuevamente.'],
  ])('normaliza el error %s del historial', async (status, message) => {
    apiClient.get.mockRejectedValue({ response: status ? { status } : undefined })
    await expect(postulacionesService.obtenerHistorial(7, 1)).rejects.toEqual({ status, message })
  })

  it('cancela la consulta del historial', async () => {
    apiClient.get.mockRejectedValue({ code: 'ERR_CANCELED' })
    await expect(postulacionesService.obtenerHistorial(7, 1)).rejects.toEqual({ canceled: true })
  })

  it.each([
    ['obtenerDocumentos', [7, 2], '/api/v1/documentos/documentos/', { postulacion: 7, ordering: '-fecha_subida', page: 2 }],
    ['obtenerVersiones', [31, 3], '/api/v1/documentos/versiones/', { documento: 31, ordering: 'numero_version', page: 3 }],
    ['obtenerObservaciones', [301, 4], '/api/v1/documentos/observaciones/', { version_documento: 301, ordering: 'fecha_observacion', page: 4 }],
  ])('consulta %s una sola vez con filtro exacto y paginación', async (method, args, url, params) => {
    const signal = new AbortController().signal
    apiClient.get.mockResolvedValue({ data: { count: 21, results: [] } })
    await postulacionesService[method](...args, signal)
    expect(apiClient.get).toHaveBeenCalledWith(url, { params, signal })
    expect(apiClient.get).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['obtenerDocumentos', 'los documentos'],
    ['obtenerVersiones', 'las versiones'],
    ['obtenerObservaciones', 'las observaciones'],
  ])('normaliza errores y cancelación de %s', async (method, resource) => {
    apiClient.get.mockRejectedValueOnce({ response: { status: 401 } })
    await expect(postulacionesService[method](1, 1)).rejects.toEqual({ status: 401, message: `Debes iniciar sesión para consultar ${resource}.` })
    apiClient.get.mockRejectedValueOnce({ response: { status: 404 } })
    await expect(postulacionesService[method](1, 1)).rejects.toEqual({ status: 404, message: `${resource[0].toUpperCase()}${resource.slice(1)} no disponibles.` })
    apiClient.get.mockRejectedValueOnce(new Error('red'))
    await expect(postulacionesService[method](1, 1)).rejects.toEqual({ status: undefined, message: `No se pudieron cargar ${resource}. Intenta nuevamente.` })
    apiClient.get.mockRejectedValueOnce({ code: 'ERR_CANCELED' })
    await expect(postulacionesService[method](1, 1)).rejects.toEqual({ canceled: true })
  })

  it('carga con FormData exacto, URL fija, señal y sin Content-Type manual', async () => {
    const signal = new AbortController().signal
    const archivo = new File(['%PDF-'], 'informe.pdf', { type: 'application/pdf' })
    apiClient.post.mockResolvedValue({ data: { id: 91, numero_version: 1 } })
    await postulacionesService.cargarDocumento({ postulacionId: 7, tipoDocumentoId: 4, archivo }, signal)
    const [url, body, config] = apiClient.post.mock.calls[0]
    expect(url).toBe('/api/v1/documentos/documentos/subir/')
    expect([...body.keys()]).toEqual(['postulacion_id', 'tipo_documento_id', 'archivo'])
    expect(body.get('postulacion_id')).toBe('7')
    expect(body.get('tipo_documento_id')).toBe('4')
    expect(body.get('archivo')).toBe(archivo)
    expect(config).toEqual({ signal })
    expect(config.headers).toBeUndefined()
  })

  it('conserva errores DRF por campo en una carga inválida', async () => {
    const fields = { archivo: ['El archivo no puede estar vacío.'], tipo_documento_id: ['Tipo inactivo.'] }
    apiClient.post.mockRejectedValue({ response: { status: 400, data: fields } })
    await expect(postulacionesService.cargarDocumento({ postulacionId: 7, tipoDocumentoId: 4, archivo: new File([], 'vacio.pdf') }))
      .rejects.toEqual({ status: 400, message: 'Revisa los datos del documento.', fields })
  })
})
