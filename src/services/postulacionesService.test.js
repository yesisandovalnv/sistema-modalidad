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

  it.each([[true, 1], [false, 3]])('consulta actores por postulaciÃ³n, estado y pÃ¡gina exactos', async (activo, page) => {
    const signal = new AbortController().signal
    apiClient.get.mockResolvedValue({ data: { count: 21, next: 'page=2', previous: null, results: [] } })
    await postulacionesService.obtenerActores(7, activo, page, signal)
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/asignaciones/', {
      params: { postulacion: 7, activo, page }, signal,
    })
    expect(apiClient.get).toHaveBeenCalledTimes(1)
  })

  it.each([
    [401, 'Debes iniciar sesiÃ³n para consultar los actores.'],
    [404, 'Las asignaciones de actores solicitadas no estÃ¡n disponibles.'],
    [undefined, 'No se pudieron cargar los actores. Comprueba tu conexiÃ³n e intenta nuevamente.'],
  ])('normaliza el error %s de actores', async (status, message) => {
    apiClient.get.mockRejectedValue({ response: status ? { status } : undefined })
    await expect(postulacionesService.obtenerActores(7, true, 1)).rejects.toEqual({ status, message })
  })

  it('cancela la consulta de actores', async () => {
    apiClient.get.mockRejectedValue({ code: 'ERR_CANCELED' })
    await expect(postulacionesService.obtenerActores(7, false, 1)).rejects.toEqual({ canceled: true })
  })

  it('consulta una sola página de defensas con postulación y orden exactos', async () => {
    const signal = new AbortController().signal
    apiClient.get.mockResolvedValue({ data: { count: 21, next: 'page=3', previous: 'page=1', results: [] } })
    await expect(postulacionesService.obtenerDefensas(7, 2, signal)).resolves.toMatchObject({ count: 21 })
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/eventos-defensa/', {
      params: { postulacion: 7, ordering: '-fecha_programada,-id', page: 2 }, signal,
    })
    expect(apiClient.get).toHaveBeenCalledTimes(1)
  })

  it('consulta el quórum únicamente para el evento indicado', async () => {
    const signal = new AbortController().signal
    apiClient.get.mockResolvedValue({ data: { valido: true, conteos: {}, faltantes: {}, detalle: {} } })
    await postulacionesService.obtenerQuorumDefensa(81, signal)
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/eventos-defensa/81/quorum/', { signal })
    expect(apiClient.get).toHaveBeenCalledTimes(1)
  })

  it('consulta detalle y asignaciones candidatas sin IDs manuales', async () => {
    const signal = new AbortController().signal
    apiClient.get.mockResolvedValue({ data: { results: [] } })
    await postulacionesService.obtenerDefensa(81, signal)
    expect(apiClient.get).toHaveBeenLastCalledWith('/api/v1/eventos-defensa/81/', { signal })
    await postulacionesService.obtenerAsignacionesCandidatas(7, signal)
    expect(apiClient.get).toHaveBeenLastCalledWith('/api/v1/asignaciones/', { params: { postulacion: 7, activo: true }, signal })
  })

  it.each([
    ['obtenerDefensas', [7, 1], 401, 'Debes iniciar sesión para consultar las defensas.'],
    ['obtenerDefensas', [7, 1], 404, 'Las defensas solicitadas no están disponibles.'],
    ['obtenerDefensas', [7, 1], undefined, 'No se pudo consultar las defensas. Comprueba tu conexión e intenta nuevamente.'],
    ['obtenerQuorumDefensa', [81], 401, 'Debes iniciar sesión para consultar el quórum técnico.'],
    ['obtenerQuorumDefensa', [81], 404, 'El evento de defensa no está disponible.'],
    ['obtenerQuorumDefensa', [81], undefined, 'No se pudo consultar el quórum técnico. Comprueba tu conexión e intenta nuevamente.'],
  ])('normaliza errores de %s', async (method, args, status, message) => {
    apiClient.get.mockRejectedValue({ response: status ? { status } : undefined })
    await expect(postulacionesService[method](...args)).rejects.toEqual({ status, message })
  })

  it.each([['obtenerDefensas', [7, 1]], ['obtenerQuorumDefensa', [81]]])('cancela %s', async (method, args) => {
    apiClient.get.mockRejectedValue({ code: 'ERR_CANCELED' })
    await expect(postulacionesService[method](...args)).rejects.toEqual({ canceled: true })
  })

  it.each([
    ['programarDefensa', [7, { seguimiento_etapa: 12, tipo_evento: 'DEFENSA_PUBLICA', fecha_programada: '2026-08-20T14:00', lugar: 'Auditorio', modalidad_evento: 'MIXTA', enlace_virtual: 'https://meet.example.test', observaciones: 'Registro técnico' }], '/api/v1/postulaciones/7/eventos-defensa/programar/', { seguimiento_etapa: 12, tipo_evento: 'DEFENSA_PUBLICA', fecha_programada: '2026-08-20T14:00', lugar: 'Auditorio', modalidad_evento: 'MIXTA', enlace_virtual: 'https://meet.example.test', observaciones: 'Registro técnico' }],
    ['iniciarDefensa', [81], '/api/v1/eventos-defensa/81/iniciar/', {}],
    ['finalizarDefensa', [81], '/api/v1/eventos-defensa/81/finalizar/', {}],
    ['suspenderDefensa', [81, 'Pausa técnica'], '/api/v1/eventos-defensa/81/suspender/', { motivo: 'Pausa técnica' }],
    ['cancelarDefensa', [81, 'Cancelación técnica'], '/api/v1/eventos-defensa/81/cancelar/', { motivo: 'Cancelación técnica' }],
    ['reprogramarDefensa', [81, '2026-08-22T10:00', 'Nueva fecha'], '/api/v1/eventos-defensa/81/reprogramar/', { nueva_fecha: '2026-08-22T10:00', motivo: 'Nueva fecha' }],
    ['agregarParticipanteDefensa', [81, 14, 'TRIBUNAL'], '/api/v1/eventos-defensa/81/participantes/agregar/', { asignacion: 14, rol_evento: 'TRIBUNAL' }],
    ['retirarParticipanteDefensa', [81, 91], '/api/v1/eventos-defensa/81/participantes/91/remover/', {}],
    ['registrarAsistenciaDefensa', [81, 91, false, 'Ausente'], '/api/v1/eventos-defensa/81/asistencia/', { participante: 91, presente: false, observaciones: 'Ausente' }],
  ])('ejecuta %s con endpoint y payload exactos', async (method, args, url, payload) => {
    const signal = new AbortController().signal
    apiClient.post.mockResolvedValue({ data: { id: 81 } })
    await postulacionesService[method](...args, signal)
    expect(apiClient.post).toHaveBeenCalledWith(url, payload, { signal })
    expect(apiClient.post).toHaveBeenCalledTimes(1)
  })

  it.each([
    [400, 'No se pudo completar la acción. Revisa los datos y el estado técnico de la defensa.'],
    [401, 'Debes iniciar sesión para administrar defensas.'],
    [403, 'No tienes autorización para administrar defensas.'],
    [404, 'La postulación, etapa o defensa ya no está disponible.'],
    [undefined, 'No se pudo completar la acción sobre la defensa. Comprueba tu conexión e intenta nuevamente.'],
  ])('normaliza error %s al administrar defensas', async (status, message) => {
    const data = status === 400 ? { motivo: ['Este campo es obligatorio.'] } : undefined
    apiClient.post.mockRejectedValue({ response: status ? { status, data } : undefined })
    await expect(postulacionesService.suspenderDefensa(81, '')).rejects.toEqual({
      status, message, ...(status === 400 ? { fields: data } : {}),
    })
  })

  it('cancela una mutación de defensa sin mostrar error', async () => {
    apiClient.post.mockRejectedValue({ code: 'ERR_CANCELED' })
    await expect(postulacionesService.iniciarDefensa(81)).rejects.toEqual({ canceled: true })
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

  it.each([
    ['aprobarDocumento', [31, 'Revisión técnica'], '/api/v1/documentos/documentos/31/aprobar/', { comentario: 'Revisión técnica' }],
    ['rechazarDocumento', [31, 'Archivo incompleto'], '/api/v1/documentos/documentos/31/rechazar/', { motivo: 'Archivo incompleto' }],
    ['observarDocumento', [31, 'Corregir portada'], '/api/v1/documentos/documentos/31/observar/', { comentario: 'Corregir portada' }],
    ['marcarObservacionCorregida', [401], '/api/v1/documentos/observaciones/401/marcar-corregida/', {}],
  ])('ejecuta %s con endpoint y payload contractuales', async (method, args, url, payload) => {
    const signal = new AbortController().signal
    apiClient.post.mockResolvedValue({ data: { id: 31 } })
    await postulacionesService[method](...args, signal)
    expect(apiClient.post).toHaveBeenCalledWith(url, payload, { signal })
  })

  it.each([400, 409])('conserva campos y conflicto funcional de revisión %s', async (status) => {
    const fields = { motivo: ['Este campo es obligatorio.'] }
    apiClient.post.mockRejectedValue({ response: { status, data: fields } })
    await expect(postulacionesService.rechazarDocumento(31, ''))
      .rejects.toEqual({ status, message: 'La acción no es válida para el estado actual del documento.', fields })
  })
})
