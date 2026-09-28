import { beforeEach, describe, expect, it, vi } from 'vitest'
import apiClient from './api'
import { postulacionesService } from './postulacionesService'

vi.mock('./api', () => ({ default: { get: vi.fn(), post: vi.fn() } }))

describe('postulacionesService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('obtiene todos los tribunales activos de una sola página con filtros canónicos', async () => {
    const signal = new AbortController().signal
    const tribunals = [{ id: 1, tipo_participacion: 'TRIBUNAL', orden_cargo: 1 }]
    apiClient.get.mockResolvedValue({ data: { next: null, results: tribunals } })

    await expect(postulacionesService.obtenerTribunalesActivos(7, { signal })).resolves.toEqual(tribunals)
    const [url, config] = apiClient.get.mock.calls[0]
    expect(url).toContain('/api/v1/asignaciones/?')
    expect(url).toContain('page=1')
    expect(url).toContain('postulacion=7')
    expect(url).toContain('activo=true')
    expect(url).toContain('tipo_participacion=TRIBUNAL')
    expect(config.signal).toBe(signal)
  })

  it('recorre next absoluto, relativo y relativo a la query hasta completar la colección', async () => {
    apiClient.get
      .mockResolvedValueOnce({ data: { next: 'https://backend.test/api/v1/asignaciones/?page=2', results: [{ id: 1, orden_cargo: 1 }] } })
      .mockResolvedValueOnce({ data: { next: '?page=3', results: [{ id: 2, orden_cargo: 2 }] } })
      .mockResolvedValueOnce({ data: { next: null, results: [{ id: 3, orden_cargo: 3 }] } })

    await expect(postulacionesService.obtenerTribunalesActivos(9)).resolves.toEqual([
      { id: 1, orden_cargo: 1 }, { id: 2, orden_cargo: 2 }, { id: 3, orden_cargo: 3 },
    ])
    expect(apiClient.get).toHaveBeenCalledTimes(3)
    for (const [url] of apiClient.get.mock.calls) {
      expect(url).toContain('postulacion=9')
      expect(url).toContain('activo=true')
      expect(url).toContain('tipo_participacion=TRIBUNAL')
    }
    expect(apiClient.get.mock.calls[1][0]).toContain('page=2')
    expect(apiClient.get.mock.calls[2][0]).toContain('page=3')
  })

  it('rechaza toda la carga si falla una página intermedia', async () => {
    apiClient.get
      .mockResolvedValueOnce({ data: { next: '/api/v1/asignaciones/?page=2', results: [{ id: 1 }] } })
      .mockRejectedValueOnce({ response: { status: 500 } })

    await expect(postulacionesService.obtenerTribunalesActivos(7)).rejects.toEqual({
      status: 500,
      message: 'No se pudieron cargar los actores. Comprueba tu conexión e intenta nuevamente.',
    })
  })

  it('rechaza ciclos de next sin continuar indefinidamente', async () => {
    apiClient.get.mockResolvedValue({ data: { next: '/api/v1/asignaciones/?page=1', results: [{ id: 1 }] } })

    await expect(postulacionesService.obtenerTribunalesActivos(7)).rejects.toEqual({
      status: undefined,
      message: 'No se pudieron cargar los actores. Comprueba tu conexión e intenta nuevamente.',
    })
    expect(apiClient.get).toHaveBeenCalledTimes(1)
  })

  it('normaliza una sola página de tipos documentales como un array completo', async () => {
    const signal = new AbortController().signal
    const types = [{ id: 1, codigo: 'ACTA_DEFENSA' }]
    apiClient.get.mockResolvedValue({ data: { count: 1, next: null, previous: null, results: types } })

    await expect(postulacionesService.obtenerTiposDocumento(signal)).resolves.toEqual(types)
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/documentos/tipos-documento/', {
      params: { activo: true, ordering: 'nombre' }, signal,
    })
    expect(apiClient.get).toHaveBeenCalledTimes(1)
  })

  it('recorre next absoluto o relativo y acumula todas las páginas sin depender de page_size', async () => {
    const signal = new AbortController().signal
    apiClient.get
      .mockResolvedValueOnce({ data: { count: 3, next: 'http://backend.test/api/v1/documentos/tipos-documento/?activo=true&ordering=nombre&page=2', results: [{ id: 1 }] } })
      .mockResolvedValueOnce({ data: { count: 3, next: '/api/v1/documentos/tipos-documento/?activo=true&ordering=nombre&page=3', results: [{ id: 2 }] } })
      .mockResolvedValueOnce({ data: { count: 3, next: null, results: [{ id: 3 }] } })

    await expect(postulacionesService.obtenerTiposDocumento(signal)).resolves.toEqual([{ id: 1 }, { id: 2 }, { id: 3 }])
    expect(apiClient.get).toHaveBeenNthCalledWith(2, '/api/v1/documentos/tipos-documento/?activo=true&ordering=nombre&page=2', { signal })
    expect(apiClient.get).toHaveBeenNthCalledWith(3, '/api/v1/documentos/tipos-documento/?activo=true&ordering=nombre&page=3', { signal })
    expect(apiClient.get.mock.calls.flatMap((call) => [call[0], JSON.stringify(call[1])]).join(' ')).not.toContain('page_size')
  })

  it('propaga el error de una página posterior sin devolver resultados parciales', async () => {
    apiClient.get
      .mockResolvedValueOnce({ data: { count: 2, next: '/api/v1/documentos/tipos-documento/?page=2', results: [{ id: 1 }] } })
      .mockRejectedValueOnce({ response: { status: 500 } })

    await expect(postulacionesService.obtenerTiposDocumento()).rejects.toEqual({
      status: 500,
      message: 'No se pudieron cargar los tipos documentales. Intenta nuevamente.',
    })
  })

  it('interrumpe una referencia next repetida en lugar de entrar en un ciclo', async () => {
    apiClient.get.mockResolvedValue({ data: { next: '/api/v1/documentos/tipos-documento/', results: [{ id: 1 }] } })

    await expect(postulacionesService.obtenerTiposDocumento()).rejects.toEqual({
      status: undefined,
      message: 'No se pudieron cargar los tipos documentales. Intenta nuevamente.',
    })
    expect(apiClient.get).toHaveBeenCalledTimes(1)
  })

  it('consulta las capacidades académicas de una modalidad', async () => {
    const signal = new AbortController().signal
    apiClient.get.mockResolvedValue({ data: { soportada: true, configuracion_valida: true } })

    await expect(postulacionesService.obtenerCapacidadesModalidad(3, signal)).resolves.toEqual({
      soportada: true,
      configuracion_valida: true,
    })
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/modalidades/3/capacidades/', { signal })
  })

  it('inicializa el flujo mediante la acción existente', async () => {
    const signal = new AbortController().signal
    apiClient.post.mockResolvedValue({ data: { etapa_actual: { codigo: 'INSCRIPCION' }, porcentaje_avance: 0 } })

    await postulacionesService.inicializarFlujo(7, signal)

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/postulaciones/7/flujo/inicializar/', {}, { signal })
  })

  it('inicia una etapa usando el endpoint real del seguimiento', async () => {
    const signal = new AbortController().signal
    apiClient.post.mockResolvedValue({ data: { id: 18, codigo: 'DOCUMENTO_FINAL', estado: 'EN_PROCESO' } })

    await postulacionesService.iniciarEtapa(18, signal)

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/seguimientos-etapa/18/iniciar/', {}, { signal })
  })

  it('aprueba una etapa usando el endpoint real del seguimiento', async () => {
    const signal = new AbortController().signal
    apiClient.post.mockResolvedValue({ data: { id: 18, codigo: 'DOCUMENTO_FINAL', estado: 'APROBADA' } })

    await postulacionesService.aprobarEtapa(18, signal)

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/seguimientos-etapa/18/aprobar/', {}, { signal })
  })

  it.each([
    [['DOCUMENTO:HOJA_APROBACION'], 'Hoja de Aprobación'],
    [['CONDICION:PLAN_ESTUDIOS', 'ENTREGA:CD_RESPALDO'], 'Plan de estudios, CD de respaldo'],
  ])('humaniza faltantes estructurados sin perder los códigos originales', async (faltantes, labels) => {
    apiClient.post.mockRejectedValue({ response: { status: 400, data: [`{'faltantes': [${faltantes.map((value) => `'${value}'`).join(', ')}], 'advertencias': []}`] } })

    await expect(postulacionesService.aprobarEtapa(120)).rejects.toEqual(expect.objectContaining({
      status: 400,
      message: `No se puede aprobar la etapa. Falta completar: ${labels}.`,
      fields: { faltantes, advertencias: [] },
      faltantes,
    }))
  })

  it.each([
    [401, 'Debes iniciar sesión para aprobar la etapa.'],
    [403, 'No tienes autorización para aprobar esta etapa.'],
    [404, 'El seguimiento o la etapa ya no están disponibles.'],
  ])('conserva el mensaje de autorización o disponibilidad para %s', async (status, message) => {
    apiClient.post.mockRejectedValue({ response: { status } })

    await expect(postulacionesService.aprobarEtapa(120)).rejects.toEqual({ status, message })
  })

  it('conserva un fallback genérico para errores desconocidos', async () => {
    apiClient.post.mockRejectedValue({ response: { status: 500 } })

    await expect(postulacionesService.aprobarEtapa(120)).rejects.toEqual({
      status: 500,
      message: 'No se pudo aprobar la etapa. Intenta nuevamente.',
    })
  })

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

  it.each([[true, 1], [false, 3]])('consulta actores por postulación, estado y página exactos', async (activo, page) => {
    const signal = new AbortController().signal
    apiClient.get.mockResolvedValue({ data: { count: 21, next: 'page=2', previous: null, results: [] } })
    await postulacionesService.obtenerActores(7, activo, page, signal)
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/asignaciones/', {
      params: { postulacion: 7, activo, page }, signal,
    })
    expect(apiClient.get).toHaveBeenCalledTimes(1)
  })

  it.each([
    [401, 'Debes iniciar sesión para consultar los actores.'],
    [404, 'Las asignaciones de actores solicitadas no están disponibles.'],
    [undefined, 'No se pudieron cargar los actores. Comprueba tu conexión e intenta nuevamente.'],
  ])('normaliza el error %s de actores', async (status, message) => {
    apiClient.get.mockRejectedValue({ response: status ? { status } : undefined })
    await expect(postulacionesService.obtenerActores(7, true, 1)).rejects.toEqual({ status, message })
  })

  it('cancela la consulta de actores', async () => {
    apiClient.get.mockRejectedValue({ code: 'ERR_CANCELED' })
    await expect(postulacionesService.obtenerActores(7, false, 1)).rejects.toEqual({ canceled: true })
  })

  it('consulta candidatos de asignación con búsqueda y paginación exactas', async () => {
    const signal = new AbortController().signal
    apiClient.get.mockResolvedValue({ data: { count: 2, next: null, previous: null, results: [] } })
    await postulacionesService.obtenerCandidatosAsignacion({ search: 'Rosas', rol: 'DOCENTE', ordering: 'apellido_paterno', page: 2 }, signal)
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/usuarios/candidatos-asignacion/', {
      params: { search: 'Rosas', rol: 'DOCENTE', ordering: 'apellido_paterno', page: 2 }, signal,
    })
  })

  it('crea una asignación con el payload intacto', async () => {
    const signal = new AbortController().signal
    const payload = { usuario: 41, tipo_participacion: 'TRIBUNAL', orden_cargo: 2, seguimiento_etapa: 4, observaciones: 'Revisión previa' }
    apiClient.post.mockResolvedValue({ data: { id: 90, ...payload } })
    await expect(postulacionesService.asignarActor(2, payload, signal)).resolves.toMatchObject({ id: 90 })
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/postulaciones/2/asignaciones/asignar/', payload, { signal })
  })

  it('conserva los errores por campo al rechazar una asignación', async () => {
    apiClient.post.mockRejectedValue({ response: { status: 400, data: { orden_cargo: ['Orden ocupado.'] } } })
    await expect(postulacionesService.asignarActor(2, {})).rejects.toEqual({
      status: 400, message: 'Revisa los datos de la asignación.', fields: { orden_cargo: ['Orden ocupado.'] },
    })
  })

  it.each([
    ['obtenerCandidatosAsignacion', [{ page: 1 }], 403, 'No tienes autorización para gestionar los candidatos de asignación.'],
    ['asignarActor', [2, {}], 404, 'La postulación, el candidato o la etapa ya no está disponible.'],
  ])('normaliza errores de gestión en %s', async (method, args, status, message) => {
    const clientMethod = method === 'asignarActor' ? apiClient.post : apiClient.get
    clientMethod.mockRejectedValue({ response: { status } })
    await expect(postulacionesService[method](...args)).rejects.toMatchObject({ status, message })
  })

  it.each([
    ['obtenerCandidatosAsignacion', [{}], 'get'],
    ['asignarActor', [2, {}], 'post'],
  ])('cancela %s', async (method, args, clientMethod) => {
    apiClient[clientMethod].mockRejectedValue({ code: 'ERR_CANCELED' })
    await expect(postulacionesService[method](...args)).rejects.toEqual({ canceled: true })
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

  it('consulta los informes de revisión del seguimiento exacto', async () => {
    const signal = new AbortController().signal
    apiClient.get.mockResolvedValue({ data: [{ id: 1, resultado: 'SUFICIENTE' }] })
    await expect(postulacionesService.obtenerInformesRevisionTribunal(4, signal)).resolves.toHaveLength(1)
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/seguimientos-etapa/4/informes-revision-tribunal/', { signal })
  })

  it('registra el informe de revisión con el payload intacto', async () => {
    const signal = new AbortController().signal
    const payload = { version_documento_revisada: 1, resultado: 'SUFICIENTE', observaciones: 'Conforme', evidencia_version: 2 }
    apiClient.post.mockResolvedValue({ data: { id: 8, ...payload } })
    await expect(postulacionesService.registrarInformeRevisionTribunal(4, payload, signal)).resolves.toMatchObject({ id: 8 })
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/seguimientos-etapa/4/informes-revision-tribunal/', payload, { signal })
  })

  it.each([
    ['obtenerInformesRevisionTribunal', [4], 403, 'No tienes autorización para gestionar los informes del tribunal.'],
    ['obtenerInformesRevisionTribunal', [4], 404, 'El seguimiento o informe solicitado ya no está disponible.'],
    ['registrarInformeRevisionTribunal', [4, {}], 400, 'La versión no corresponde al Documento Final.'],
  ])('normaliza el error %s de informes del tribunal', async (method, args, status, message) => {
    const clientMethod = method === 'registrarInformeRevisionTribunal' ? apiClient.post : apiClient.get
    const data = status === 400 ? { version_documento_revisada: ['Versión inválida.'], non_field_errors: ['La versión no corresponde al Documento Final.'] } : undefined
    clientMethod.mockRejectedValue({ response: { status, data } })
    await expect(postulacionesService[method](...args)).rejects.toMatchObject({ status, message, ...(data ? { fields: data } : {}) })
  })

  it.each([
    ['obtenerInformesRevisionTribunal', [4], 'get'],
    ['registrarInformeRevisionTribunal', [4, {}], 'post'],
  ])('cancela %s sin presentar error', async (method, args, clientMethod) => {
    apiClient[clientMethod].mockRejectedValue({ code: 'ERR_CANCELED' })
    await expect(postulacionesService[method](...args)).rejects.toEqual({ canceled: true })
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
    ['iniciarDefensa', [81], '/api/v1/eventos-defensa/81/iniciar/', { asistencias: [] }],
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

  it('envía las decisiones de asistencia pendientes al iniciar una defensa', async () => {
    const signal = new AbortController().signal
    const asistencias = [{ participante: 91, presente: true }, { participante: 92, presente: false }]
    apiClient.post.mockResolvedValue({ data: { id: 81, estado: 'EN_CURSO' } })

    await postulacionesService.iniciarDefensa(81, asistencias, signal)

    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/v1/eventos-defensa/81/iniciar/',
      { asistencias },
      { signal },
    )
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

  it('muestra el mensaje específico cuando el error 400 de defensa es una lista', async () => {
    const data = ['No existen asignaciones mínimas activas: PRESIDENTE, SECRETARIO.']
    apiClient.post.mockRejectedValue({ response: { status: 400, data } })
    await expect(postulacionesService.programarDefensa(7, {})).rejects.toEqual({
      status: 400, message: data[0], fields: {},
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

  it('descarga una versión como blob usando el endpoint protegido y conserva el nombre', async () => {
    const signal = new AbortController().signal
    const blob = new Blob(['contenido'])
    apiClient.get.mockResolvedValue({ data: blob, headers: { 'content-disposition': 'attachment; filename="informe-final.pdf"' } })

    await expect(postulacionesService.descargarVersion(302, 'respaldo.pdf', signal)).resolves.toEqual({
      blob,
      filename: 'informe-final.pdf',
    })
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/documentos/versiones/302/descargar/', { signal, responseType: 'blob' })
  })

  it('normaliza limpiamente los errores de descarga', async () => {
    apiClient.get.mockRejectedValue({ response: { status: 404 } })
    await expect(postulacionesService.descargarVersion(999, 'archivo.pdf')).rejects.toEqual({
      status: 404,
      message: 'El archivo solicitado no está disponible.',
    })
  })

  it('carga ACTA_DEFENSA con FormData exacto, File y evento, sin Content-Type manual', async () => {
    const signal = new AbortController().signal
    const archivo = new File(['%PDF-'], 'acta.pdf', { type: 'application/pdf' })
    apiClient.post.mockResolvedValue({ data: { id: 91, numero_version: 1 } })
    await postulacionesService.cargarDocumento({ postulacionId: 7, tipoDocumentoId: 5, archivo, eventoDefensaId: 81 }, signal)
    const [url, body, config] = apiClient.post.mock.calls[0]
    expect(url).toBe('/api/v1/documentos/documentos/subir/')
    expect([...body.keys()]).toEqual(['postulacion_id', 'tipo_documento_id', 'archivo', 'evento_defensa_id'])
    expect(body.get('postulacion_id')).toBe('7')
    expect(body.get('tipo_documento_id')).toBe('5')
    expect(body.get('archivo')).toBe(archivo)
    expect(body.get('evento_defensa_id')).toBe('81')
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

  it.each([
    ['aprobarRevisionFinal', ['Observación'], 'aprobar-revision-final', { observaciones: 'Observación' }],
    ['aprobarCierreDocumental', ['Cierre revisado'], 'aprobar-cierre-documental', { observaciones: 'Cierre revisado' }],
    ['concluirPostulacion', ['Conclusión técnica'], 'concluir', { observaciones: 'Conclusión técnica' }],
    ['reabrirCierre', ['Corrección'], 'reabrir', { motivo: 'Corrección' }],
  ])('ejecuta %s con el endpoint real de cierre', async (method, args, action, payload) => {
    const signal = new AbortController().signal
    apiClient.post.mockResolvedValue({ data: { estado_general: 'EN_PROCESO' } })
    await postulacionesService[method](7, ...args, signal)
    expect(apiClient.post).toHaveBeenCalledWith(`/api/v1/postulaciones/7/cierre/${action}/`, payload, { signal })
  })

  it('consulta cierre y normaliza conflictos con campos funcionales', async () => {
    const signal = new AbortController().signal
    apiClient.get.mockResolvedValueOnce({ data: { concluida: false } })
    await expect(postulacionesService.obtenerCierre(7, signal)).resolves.toEqual({ concluida: false })
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/postulaciones/7/cierre/', { signal })
    const fields = { faltantes: ['CONDICION:PLAZO_MAXIMO'] }
    apiClient.post.mockRejectedValue({ response: { status: 409, data: fields } })
    await expect(postulacionesService.concluirPostulacion(7, ''))
      .rejects.toEqual({ status: 409, message: 'La acción no cumple las precondiciones del cierre técnico.', fields })
  })
})
