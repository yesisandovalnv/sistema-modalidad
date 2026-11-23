import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { postulacionesService } from '../../../services/postulacionesService'
import { prepararExpediente, closureResponse, deferred, definePropertyForTest, inscriptionStageResponse, projectStageResponse, renderApplicationManagerPage, renderClosureManagerPage, renderOwnerPage, renderPage, renderStudentPage, response } from './pruebas/utilidades'

vi.mock('../../../services/postulacionesService', () => import('./pruebas/servicioSimulado'))

describe('ExpedientePage · Resultado y cierre', () => {
  prepararExpediente()

  const directedConclusionResponse = ({ concluded = false, blocked = false, nota = '91.25' } = {}) => {
    const stage = { id: 901, codigo: 'CIERRE_DOCUMENTAL', nombre: 'Cierre Documental', orden: 8, estado: 'APROBADA', activo: true, acciones_permitidas: [] }
    const result = { nota_final: nota, clasificacion: 'APROBACION_PLENA_CON_FELICITACION' }
    const title = concluded ? 'Proceso académico concluido' : blocked ? 'Etapas completadas. Conclusión académica bloqueada' : 'Etapas completadas. Conclusión académica pendiente'
    const message = concluded ? 'La conclusión académica está formalizada.' : blocked ? 'La conclusión requiere ACTA_DEFENSA_TD aprobada y vinculada al intento vigente.' : `Las 8 etapas están aprobadas y el resultado final es ${nota.replace('.', ',')}/100 — Aprobación plena con felicitación. Falta formalizar la conclusión académica de la postulación.`
    return { ...response,
      capacidades: { soportada: true, configuracion_valida: true, cierre_soportado: false },
      detalle: { ...response.detalle, modalidad_detalle: { codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido' }, estado_actual_detalle: { codigo: concluded ? 'CONCLUIDA' : 'EN_PROCESO', nombre: concluded ? 'Concluida' : 'En proceso' } },
      flujo: { ...response.flujo, modalidad: { codigo: 'TRABAJO_DIRIGIDO' }, etapa_actual: stage,
        etapas: [...Array.from({ length: 7 }, (_, index) => ({ id: 910 + index, codigo: `ETAPA_${index}`, nombre: `Etapa ${index}`, estado: 'APROBADA', activo: true })), stage], porcentaje_avance: 100, etapas_completadas: 8, etapas_totales: 8,
        orientacion_etapa_actual: { operacion: 'ORIENTAR_CONCLUSION_ACADEMICA', mensaje: message, resultado_final: result, requisitos: [], siguiente_accion: { codigo: concluded ? 'CONSULTAR_RESULTADO' : blocked ? 'REVISAR_BLOQUEO_CONCLUSION' : 'CONCLUIR_ACADEMICAMENTE', titulo: title, estado: blocked ? 'PENDIENTE' : 'DISPONIBLE', destino: blocked ? '#documentos' : '#modalidad', accion_label: blocked ? 'Revisar bloqueo' : 'Concluir académicamente' } },
      }, resultado: { data: result, error: '' }, cierre: { data: null, error: '' },
    }
  }

  it.each(['resumen', 'modalidad'])('conclusión TD: ejecuta desde %s y refresca estado, orientación e historial', async (tab) => {
    const data = directedConclusionResponse()
    postulacionesService.obtenerExpediente.mockResolvedValue(data)
    postulacionesService.concluirTrabajoDirigido.mockImplementation(async () => {
      postulacionesService.obtenerExpediente.mockResolvedValue(directedConclusionResponse({ concluded: true }))
      return { etapa: 'CIERRE_DOCUMENTAL', estado: 'APROBADA' }
    })
    renderApplicationManagerPage(tab)
    const button = await screen.findByRole('button', { name: 'Concluir académicamente' })
    expect(postulacionesService.concluirTrabajoDirigido).not.toHaveBeenCalled()
    const historyCalls = postulacionesService.obtenerHistorial.mock.calls.length
    await userEvent.click(button)
    await waitFor(() => expect(postulacionesService.concluirTrabajoDirigido).toHaveBeenCalledWith(7, expect.any(AbortSignal)))
    await waitFor(() => expect(postulacionesService.obtenerHistorial.mock.calls.length).toBeGreaterThan(historyCalls))
    if (tab === 'modalidad') await userEvent.click(screen.getByRole('tab', { name: 'Resumen' }))
    expect(await screen.findByRole('heading', { name: 'Proceso académico concluido' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Concluir académicamente' })).not.toBeInTheDocument()
    expect(postulacionesService.concluirTrabajoDirigido).toHaveBeenCalledTimes(1)
  })

  it('conclusión TD: comparte bloqueo de envío entre Resumen y Modalidad, sin POST por navegación', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(directedConclusionResponse())
    const pending = deferred()
    postulacionesService.concluirTrabajoDirigido.mockReturnValue(pending.promise)
    renderApplicationManagerPage('resumen')
    const button = await screen.findByRole('button', { name: 'Concluir académicamente' })
    expect(screen.getByText(/Las 8 etapas.*91,25\/100/)).toBeVisible()
    await userEvent.click(screen.getByRole('link', { name: 'Consultar resultado' }))
    await userEvent.click(screen.getByRole('tab', { name: 'Resumen' }))
    expect(postulacionesService.concluirTrabajoDirigido).not.toHaveBeenCalled()
    fireEvent.click(button)
    fireEvent.click(button)
    await userEvent.click(screen.getByRole('tab', { name: 'Modalidad' }))
    expect(screen.getByRole('button', { name: 'Concluyendo…' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Concluyendo…' }))
    expect(postulacionesService.concluirTrabajoDirigido).toHaveBeenCalledTimes(1)
    await act(async () => pending.resolve({}))
    await userEvent.click(screen.getByRole('tab', { name: 'Resumen' }))
    expect(screen.queryByText('Proceso académico concluido')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Actualizando expediente…' })).toBeDisabled()
  })

  it('conclusión TD: presenta el error compartido y permite reintentar sin falso éxito', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(directedConclusionResponse())
    postulacionesService.concluirTrabajoDirigido.mockRejectedValue({ message: 'El Acta dejó de estar vigente.' })
    renderApplicationManagerPage('resumen')
    await userEvent.click(await screen.findByRole('button', { name: 'Concluir académicamente' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('El Acta dejó de estar vigente.')
    expect(screen.queryByText('Proceso académico concluido')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Modalidad' }))
    expect(screen.getByRole('alert')).toHaveTextContent('El Acta dejó de estar vigente.')
    expect(screen.getByRole('button', { name: 'Concluir académicamente' })).toBeEnabled()
  })

  it('conclusión TD: bloqueo oficial impide ambos accesos y orienta a documentos', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(directedConclusionResponse({ blocked: true }))
    renderApplicationManagerPage('resumen')
    expect(await screen.findByRole('heading', { name: /Conclusión académica bloqueada/ })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Revisar bloqueo' })).toHaveAttribute('href', '#documentos')
    expect(screen.queryByRole('button', { name: 'Concluir académicamente' })).not.toBeInTheDocument()
    await userEvent.click(await screen.findByRole('tab', { name: 'Modalidad' }))
    const button = screen.getByRole('button', { name: 'Concluir académicamente' })
    expect(button).toBeDisabled()
    fireEvent.click(button)
    expect(postulacionesService.concluirTrabajoDirigido).not.toHaveBeenCalled()
  })

  it.each([false, true])('conclusión TD: consulta sin permiso administrativo, concluida %s', async (concluded) => {
    postulacionesService.obtenerExpediente.mockResolvedValue(directedConclusionResponse({ concluded, nota: '89.75' }))
    renderPage('resumen')
    expect(await screen.findByRole('heading', { name: concluded ? 'Proceso académico concluido' : /Conclusión académica pendiente/ })).toBeVisible()
    expect(screen.getByText(/Nota final: 89,75\/100/)).toBeVisible()
    expect(screen.getByRole('link', { name: 'Consultar resultado' })).toHaveAttribute('href', '#resultado-y-cierre')
    if (!concluded) expect(screen.getByText('La formalización corresponde al personal administrativo autorizado.')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Concluir académicamente' })).not.toBeInTheDocument()
    expect(postulacionesService.concluirTrabajoDirigido).not.toHaveBeenCalled()
  })

  it('conclusión TD: el estudiante consulta la orientación sin poder formalizar', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(directedConclusionResponse())
    renderStudentPage()
    expect(await screen.findByText('La formalización corresponde al personal administrativo autorizado.')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Concluir académicamente' })).not.toBeInTheDocument()
    expect(postulacionesService.concluirTrabajoDirigido).not.toHaveBeenCalled()
  })

  it('renderiza un expediente histórico como registro histórico y no como workflow operativo', async () => {
    const historicalDetail = {
      ...response,
      detalle: {
        ...response.detalle,
        tipo_registro: 'HISTORICO',
        vigencia: 'CERRADA',
        estado_actual_detalle: { id: 9, codigo: 'CONCLUIDA', nombre: 'Concluida' },
      },
      flujo: {
        ...response.flujo,
        etapa_actual: null,
        porcentaje_avance: 0,
        etapas: [],
        orientacion_etapa_actual: null,
      },
      resultado: { data: null, error: '' },
      cierre: { data: null, error: 'Estado de cierre técnico todavía no disponible' },
    }
    postulacionesService.obtenerExpediente.mockResolvedValue(historicalDetail)
    postulacionesService.obtenerDocumentos.mockResolvedValue({ count: 1, next: null, previous: null, results: [{ id: 99, tipo_documento_nombre: 'Acta de defensa histórica', requiere_correccion: false, versiones: [{ id: 991, numero_version: 1, es_version_actual: true, activo: true }] }] })

    renderPage()

    expect(await screen.findByText('Registro histórico')).toBeInTheDocument()
    expect(screen.getByText(/Concluida/i)).toBeInTheDocument()
    expect(screen.queryByText('Avance de tu proceso')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Iniciar proceso de Proyecto de Grado/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Inicializar flujo académico|Preparar etapas/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/Todavía no se prepararon las etapas/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Resultado académico técnico/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Cierre técnico/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/Condiciones técnicas/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Entregas técnicas/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Etapas del flujo académico/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Participación actual/i })).not.toBeInTheDocument()
  })

  it('renderiza el resumen, macroetapa, avance y advertencia institucional', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    renderPage()
    expect(screen.getByRole('status')).toHaveTextContent(/Cargando/)
    expect(await screen.findByRole('heading', { name: 'Estado actual de tu proceso académico' })).toBeInTheDocument()
    expect(screen.getByText(/Ana P/)).toBeInTheDocument()
    expect(screen.getByText('RU-300 - Ana Pérez')).toBeInTheDocument()
    expect(screen.getByText('Proyecto de Grado')).toBeInTheDocument()
    expect(screen.getByText('Gestión 2026 - Semestre II')).toBeInTheDocument()
    expect(within(screen.getByRole('heading', { name: 'Estado actual de tu proceso académico' }).parentElement).getByText('En proceso')).toBeInTheDocument()
    expect(within(screen.getByRole('heading', { name: 'Estado actual de tu proceso académico' }).parentElement).getByText('Perfil de Proyecto')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Avance de tu proceso' })).toHaveValue(25)
    expect(screen.getByRole('navigation', { name: 'Secciones del expediente' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Documentos' })).toHaveAttribute('href', '#documentos')
    expect(screen.getByRole('heading', { name: 'Qué debes hacer ahora' })).toBeInTheDocument()
    expect(screen.getByText('0 de 3 etapas completadas')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Resultado y cierre' }))
    expect(screen.getByRole('heading', { name: 'Resultado académico técnico' })).toBeInTheDocument()
    expect(screen.getAllByText('24,00')).toHaveLength(1)
    expect(screen.queryByText('60,00')).not.toBeInTheDocument()
    expect(screen.getAllByText('84,00')).toHaveLength(1)
    expect(screen.getAllByText('Registro con escala anterior')).toHaveLength(1)
    expect(screen.getAllByText('Nota de Defensa Privada').length).toBeGreaterThan(0)
    expect(screen.queryByText('Aporte de Defensa Privada')).not.toBeInTheDocument()
    expect(screen.queryByText('Nota de Defensa Pública')).not.toBeInTheDocument()
    expect(screen.queryByText('Aporte de Defensa Pública')).not.toBeInTheDocument()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
    expect(screen.queryByRole('note', { name: 'Límites normativos' })).not.toBeInTheDocument()
    expect(screen.queryByText(/nota privada es el aporte consensuado/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/aprobación y originalidad del tema/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/escala específica confirmada/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/cantidad oficial de ejemplares/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/proyectos grupales/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/plazos reglamentarios/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/no equivale a legalización/i)).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Cierre técnico' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Resultado académico técnico' }).parentElement).toHaveClass('overflow-hidden')
    expect(within(screen.getByRole('heading', { name: 'Cierre técnico' }).parentElement).getByText('En proceso')).toBeInTheDocument()
    // Proyecto de Grado muestra el cierre técnico resumido: solo el conteo de documentos pendientes.
    expect(screen.getByRole('region', { name: 'Documentos pendientes' })).toHaveTextContent('1')
    expect(screen.queryByRole('region', { name: 'Condiciones pendientes' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver a postulaciones' })).toHaveAttribute('href', '/postulantes')
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(1)
  })

  it('orienta a consultar la conclusion explicita de Diplomado sin ofrecer aprobacion al estudiante', async () => {
    const stage = { id: 90, codigo: 'CONCLUSION_ACADEMICA', nombre: 'Conclusión académica', estado: 'PENDIENTE', activo: true, numero_intento: 1 }
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response, detalle: { ...response.detalle, modalidad_detalle: { codigo: 'GRADUACION_VIA_DIPLOMADO', nombre: 'Graduación Vía Diplomado' } }, cierre: { data: null, error: '' },
      flujo: { ...response.flujo, etapa_actual: stage, etapas: [stage],
        orientacion_etapa_actual: { operacion: 'ORIENTAR_CONCLUSION_ACADEMICA', mensaje: 'Los requisitos están cumplidos. Falta formalizar la conclusión académica mediante la operación administrativa existente.', requisitos: [],
          siguiente_accion: { codigo: 'GESTIONAR_ETAPA', titulo: 'Consultar conclusión académica', descripcion: 'La conclusión corresponde al personal administrativo autorizado y requiere una operación explícita.', estado: 'DISPONIBLE', destino: '#diplomado', accion_label: 'Consultar conclusión en Modalidad' } },
      },
    })
    postulacionesService.obtenerDiplomado.mockResolvedValue({ modulos: [] })
    renderOwnerPage('resumen')
    const link = await screen.findByRole('link', { name: 'Consultar conclusión en Modalidad' })
    expect(link).toHaveAttribute('href', '#diplomado')
    expect(screen.queryByRole('button', { name: 'Concluir académicamente' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Aprobar etapa/ })).not.toBeInTheDocument()
    expect(postulacionesService.concluirAcademicamente).not.toHaveBeenCalled()
  })

  it('prioriza el modo consulta cuando el expediente está concluido', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: { ...response.detalle, estado_actual_detalle: { codigo: 'CONCLUIDA', nombre: 'Concluida' } },
      cierre: { data: { ...closureResponse, estado_general: 'CONCLUIDA', concluida: true, documentos_faltantes: [], condiciones_faltantes: [], entregas_faltantes: [] }, error: '' },
    })
    renderPage()

    expect(await screen.findByText('Expediente concluido')).toBeInTheDocument()
    expect(screen.getByText(/Todas las etapas académicas y el cierre documental/)).toBeInTheDocument()
    expect(screen.getByText('Nota final: 84,00')).toBeInTheDocument()
    expect(screen.getAllByText('Aprobación plena').length).toBeGreaterThan(0)
  })

  it('completa 3/4 a 4/4 al registrar la recepción física del fólder', async () => {
    let folderReceived = false
    let delivery = null
    let deliveryLoads = 0
    const creation = deferred()
    const refreshedDeliveries = deferred()
    postulacionesService.obtenerExpediente.mockImplementation(async () => inscriptionStageResponse(folderReceived ? 4 : 3))
    postulacionesService.obtenerEntregas.mockImplementation(() => {
      deliveryLoads += 1
      if (deliveryLoads <= 2) return Promise.resolve({ results: [] })
      return refreshedDeliveries.promise
    })
    postulacionesService.crearEntregaFisica.mockImplementation(() => {
      delivery = { id: 99, codigo: 'FOLDER_AMARILLO', nombre: 'Fólder amarillo rotulado con nombre y modalidad', estado: 'PENDIENTE', estado_display: 'Pendiente de recepción', cantidad: 1, cantidad_recibida: 0 }
      return creation.promise.then(() => delivery)
    })
    postulacionesService.registrarEntrega.mockImplementation(async () => {
      folderReceived = true
      delivery = { ...delivery, estado: 'COMPLETA', estado_display: 'Completa', cantidad_recibida: 1 }
    })
    renderApplicationManagerPage('resumen')

    expect(await screen.findByText('3 de 4 cumplidos')).toBeInTheDocument()
    const physicalSection = document.getElementById('inscripcion-entregas')
    expect(physicalSection.closest('[data-expediente-panel]')).toHaveAttribute('data-expediente-panel', 'resumen')
    expect(document.getElementById('panel-documentos').textContent).not.toContain('Recepción física')
    window.history.replaceState(window.history.state, '', '#inscripcion-entregas')
    const hash = window.location.hash
    const folder = await screen.findByText('Fólder amarillo rotulado con nombre y modalidad')
    const item = folder.closest('li')
    await userEvent.click(within(item).getByRole('button', { name: 'Registrar recepción' }))
    await waitFor(() => expect(postulacionesService.crearEntregaFisica).toHaveBeenCalledTimes(1))
    expect(within(item).getByRole('button', { name: 'Preparando…' })).toBeDisabled()
    expect(postulacionesService.registrarEntrega).not.toHaveBeenCalled()
    const expedienteLoads = postulacionesService.obtenerExpediente.mock.calls.length

    await act(async () => creation.resolve())
    await waitFor(() => expect(postulacionesService.obtenerEntregas).toHaveBeenCalledTimes(3))
    expect(screen.queryByRole('form', { name: 'Registrar entrega: Fólder amarillo rotulado con nombre y modalidad' })).not.toBeInTheDocument()
    await act(async () => refreshedDeliveries.resolve({ results: [delivery] }))
    const form = await screen.findByRole('form', { name: 'Registrar entrega: Fólder amarillo rotulado con nombre y modalidad' })
    expect(form).toBeVisible()
    expect(form.isConnected).toBe(true)
    expect(document.getElementById('inscripcion-entregas')).toBe(physicalSection)
    expect(window.location.hash).toBe(hash)
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(expedienteLoads)
    expect(postulacionesService.registrarEntrega).not.toHaveBeenCalled()
    expect(screen.getByText('Estado: Pendiente de recepción')).toBeInTheDocument()
    expect(screen.queryByText('Cantidad recibida: 0')).not.toBeInTheDocument()
    expect(screen.queryByText('Receptor: Pendiente')).not.toBeInTheDocument()
    expect(within(form).getByRole('button', { name: 'Guardar' })).toBeEnabled()
    await userEvent.click(within(form).getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('4 de 4 cumplidos')).toBeInTheDocument()
    expect(postulacionesService.registrarEntrega).toHaveBeenCalledWith(99, 1, '', expect.any(AbortSignal))
    expect(screen.queryByRole('dialog', { name: /Cargar documentos de Inscripción/ })).not.toBeInTheDocument()
  })

  it('mantiene la información futura de Perfil dentro de una sección colapsada', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(projectStageResponse('PERFIL_PROYECTO'))
    renderOwnerPage('resultado-y-cierre')

    const future = await screen.findByText('Información de etapas posteriores')
    expect(future.closest('details')).not.toHaveAttribute('open')
    expect(within(future.closest('details')).getByRole('heading', { name: 'Resultado académico técnico' })).toBeInTheDocument()
    expect(within(future.closest('details')).getByText('Preparación para cierre')).toBeInTheDocument()
  })

  it('muestra preparación de cierre y sus recursos durante Cierre Documental', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(projectStageResponse('CIERRE_DOCUMENTAL'))
    renderPage('resultado-y-cierre')

    const closure = await screen.findByRole('heading', { name: 'Cierre técnico' })
    expect(closure.closest('details')).toHaveAttribute('open')
    // Proyecto de Grado resume el cierre técnico con el conteo de documentos pendientes.
    expect(screen.getByRole('region', { name: 'Documentos pendientes' })).toHaveTextContent('1')
  })

  it('restaura condiciones técnicas después del refresh por verificar condiciones seleccionadas', async () => {
    const refreshedExpediente = deferred()
    const pendingConditions = [
      { id: 101, nombre: 'Condición uno', estado: 'PENDIENTE', estado_display: 'Pendiente' },
      { id: 102, nombre: 'Condición dos', estado: 'PENDIENTE', estado_display: 'Pendiente' },
    ]
    const closureStage = projectStageResponse('CIERRE_DOCUMENTAL')
    postulacionesService.obtenerExpediente
      .mockResolvedValueOnce(closureStage)
      .mockReturnValueOnce(refreshedExpediente.promise)
    postulacionesService.obtenerCondiciones
      .mockResolvedValueOnce({ results: pendingConditions })
      .mockResolvedValue({ results: pendingConditions.map((item) => ({ ...item, estado: 'CUMPLE', estado_display: 'Cumple' })) })
    const scrollIntoView = vi.fn()
    definePropertyForTest(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoView })
    window.history.replaceState(window.history.state, '', window.location.pathname)
    renderClosureManagerPage()

    await userEvent.click(await screen.findByRole('checkbox', { name: 'Seleccionar pendientes' }))
    await userEvent.click(screen.getByRole('button', { name: 'Verificar seleccionadas (2)' }))

    await waitFor(() => expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2))
    expect(screen.queryByRole('heading', { name: 'Condiciones y entregas técnicas' })).not.toBeInTheDocument()
    expect(window.location.hash).toBe('#condiciones-tecnicas')
    expect(scrollIntoView).not.toHaveBeenCalled()

    await act(async () => refreshedExpediente.resolve(closureStage))

    await screen.findByRole('heading', { name: 'Condiciones y entregas técnicas' })
    expect(scrollIntoView).toHaveBeenCalledTimes(1)
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' })
    expect(window.location.hash).toBe('#condiciones-tecnicas')
  })

  it('restaura condiciones técnicas después del refresh por registrar entregas seleccionadas', async () => {
    const refreshedExpediente = deferred()
    const pendingDeliveries = [
      { id: 201, codigo: 'CD_RESPALDO', nombre: 'CD de respaldo', estado: 'PENDIENTE', estado_display: 'Pendiente', cantidad: 1, cantidad_recibida: 0 },
      { id: 202, codigo: 'EJEMPLARES_IMPRESOS', nombre: 'Ejemplares impresos', estado: 'PENDIENTE', estado_display: 'Pendiente', cantidad: 2, cantidad_recibida: 0 },
    ]
    const closureStage = projectStageResponse('CIERRE_DOCUMENTAL')
    postulacionesService.obtenerExpediente
      .mockResolvedValueOnce(closureStage)
      .mockReturnValueOnce(refreshedExpediente.promise)
    postulacionesService.obtenerEntregas
      .mockResolvedValueOnce({ results: pendingDeliveries })
      .mockResolvedValue({ results: pendingDeliveries.map((item) => ({ ...item, estado: 'COMPLETA', estado_display: 'Completa', cantidad_recibida: item.cantidad })) })
    const scrollIntoView = vi.fn()
    definePropertyForTest(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoView })
    window.history.replaceState(window.history.state, '', window.location.pathname)
    renderClosureManagerPage()

    await userEvent.click(await screen.findByRole('checkbox', { name: 'Seleccionar pendientes (entregas)' }))
    await userEvent.click(screen.getByRole('button', { name: 'Registrar seleccionadas (2)' }))
    const form = screen.getByRole('form', { name: 'Registrar entregas seleccionadas (2)' })
    await userEvent.type(within(form).getByLabelText('Cantidad recibida: CD de respaldo'), '1')
    await userEvent.type(within(form).getByLabelText('Cantidad recibida: Ejemplares impresos'), '2')
    await userEvent.click(within(form).getByRole('button', { name: 'Guardar lotes' }))

    await waitFor(() => expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2))
    expect(screen.queryByRole('heading', { name: 'Condiciones y entregas técnicas' })).not.toBeInTheDocument()
    expect(window.location.hash).toBe('#condiciones-tecnicas')
    expect(scrollIntoView).not.toHaveBeenCalled()

    await act(async () => refreshedExpediente.resolve(closureStage))

    await screen.findByRole('heading', { name: 'Condiciones y entregas técnicas' })
    expect(scrollIntoView).toHaveBeenCalledTimes(1)
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' })
    expect(window.location.hash).toBe('#condiciones-tecnicas')
  })

  it('no restaura condiciones técnicas durante un refresh ajeno a esa sección', async () => {
    const closureStage = projectStageResponse('CIERRE_DOCUMENTAL')
    postulacionesService.obtenerExpediente
      .mockRejectedValueOnce({ message: 'No se pudo cargar temporalmente.' })
      .mockResolvedValueOnce(closureStage)
    const scrollIntoView = vi.fn()
    definePropertyForTest(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoView })
    renderClosureManagerPage('documentos')

    await userEvent.click(await screen.findByRole('button', { name: 'Reintentar' }))

    const technicalConditions = await screen.findByRole('heading', { name: 'Condiciones y entregas técnicas', hidden: true })
    expect(technicalConditions).not.toBeVisible()
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2)
    expect(scrollIntoView).not.toHaveBeenCalled()
    expect(window.location.hash).toBe('#documentos')
  })

  it('no presenta controles de cierre de Proyecto en un expediente de Tesis', async () => {
    postulacionesService.obtenerCapacidadesModalidad.mockResolvedValue({ soportada: true, configuracion_valida: true, cierre_soportado: false })
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: { ...response.detalle, modalidad_detalle: { id: 2, codigo: 'TESIS_GRADO', nombre: 'Tesis de Grado' } },
      flujo: { ...response.flujo, modalidad: { id: 2, codigo: 'TESIS_GRADO', nombre: 'Tesis de Grado' } },
    })
    renderPage('resultado-y-cierre')
    await screen.findByText(/Ana P/)
    expect(screen.queryByRole('heading', { name: 'Cierre técnico' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Condiciones y entregas técnicas' })).not.toBeInTheDocument()
    expect(screen.queryByRole('note', { name: 'Límites normativos' })).not.toBeInTheDocument()
  })

  it('muestra resultado de Tesis con nota pública sobre 100 y aporte ponderado del backend', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: { ...response.detalle, modalidad_detalle: { id: 2, codigo: 'TESIS_GRADO', nombre: 'Tesis de Grado' } },
      flujo: { ...response.flujo, modalidad: { id: 2, codigo: 'TESIS_GRADO', nombre: 'Tesis de Grado' }, orientacion_etapa_actual: { mensaje: 'Completa los actores de Tesis.', requisitos: [], siguiente_accion: { codigo: 'GESTIONAR_ACTORES', titulo: 'Actores de la postulación', descripcion: 'Completa las asignaciones de Tesis.', estado: 'PENDIENTE', estado_display: 'Pendiente', destino: '#actores', accion_label: 'Ir a actores' } } },
      resultado: { data: { nota_privada: '20.00', nota_publica: '80.00', aporte_publica: '56.00', nota_final: '76.00', clasificacion: 'APROBACION_PLENA', resultado: 'APROBACION_PLENA', limitacion_normativa: '' }, error: '' },
    })
    renderPage('resultado-y-cierre')
    await screen.findByText(/Ana P/)
    const result = (await screen.findByRole('heading', { name: 'Resultado académico técnico' })).parentElement
    expect(within(result).getAllByText('/ 100')).toHaveLength(2)
    expect(within(result).getByText('Aporte pública')).toBeInTheDocument()
    expect(within(result).getByText('56.00')).toBeInTheDocument()
    expect(within(result).getByText('/ 70')).toBeInTheDocument()
    expect(within(result).getByText('76.00')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Resumen' }))
    expect(screen.getByRole('heading', { name: 'Siguiente acción' })).toBeInTheDocument()
    expect(screen.getByText('Completa las asignaciones de Tesis.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir a actores' })).toHaveAttribute('href', '#actores')
  })

  it.each([false, true])('presenta la formalización pendiente de Examen con última etapa devuelta=%s aunque falle el resultado genérico', async (returnsLastStage) => {
    const completedStages = Array.from({ length: 8 }, (_, index) => ({
      id: 500 + index,
      codigo: index === 7 ? 'CONCLUSION_ACADEMICA' : `ETAPA_${index + 1}`,
      nombre: index === 7 ? 'Conclusión académica' : `Etapa ${index + 1}`,
      estado: 'APROBADA',
      activo: true,
    }))
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: {
        ...response.detalle,
        codigo: 'EG-2026-02',
        modalidad_detalle: { id: 5, codigo: 'EXAMEN_GRADO', nombre: 'Examen de Grado' },
        estado_actual_detalle: { id: 4, codigo: 'EN_PROCESO', nombre: 'En proceso' },
      },
      flujo: {
        ...response.flujo,
        modalidad: { id: 5, codigo: 'EXAMEN_GRADO', nombre: 'Examen de Grado' },
        etapa_actual: returnsLastStage ? completedStages.at(-1) : null,
        porcentaje_avance: 100,
        etapas: completedStages,
        orientacion_etapa_actual: null,
      },
      resultado: { data: null, error: 'Resultado final todavía no disponible' },
      cierre: { data: null, error: 'Estado de cierre técnico todavía no disponible' },
    })
    postulacionesService.obtenerCapacidadesModalidad.mockResolvedValue({ soportada: true, configuracion_valida: true, cierre_soportado: false })
    postulacionesService.obtenerExamenGrado.mockResolvedValue({
      areas: [], tribunales: [],
      resultado_final: { completo: true, nota_final: '94.25', clasificacion: 'APROBACION_PLENA_CON_FELICITACION' },
    })

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Conclusión de la postulación pendiente' })).toBeInTheDocument()
    expect(screen.getByText('Calificación final: 94,25/100')).toBeInTheDocument()
    expect(screen.getByText(/el flujo académico terminó, pero la postulación continúa En proceso/i)).toBeInTheDocument()
    expect(screen.queryByText('No existe una etapa actual disponible.')).not.toBeInTheDocument()
    expect(screen.queryByText('Resultado final todavía no disponible')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir a concluir académicamente' })).toHaveAttribute('href', '#examen')
    expect(postulacionesService.concluirExamenGrado).not.toHaveBeenCalled()
    expect(postulacionesService.concluirAcademicamente).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('tab', { name: 'Resultado y cierre' }))
    const result = screen.getByRole('heading', { name: 'Resultado académico técnico' }).parentElement
    expect(within(result).getByText('94,25')).toBeInTheDocument()
    expect(within(result).getByText('/ 100')).toBeInTheDocument()
    expect(within(result).getByText('Aprobación plena con felicitación')).toBeInTheDocument()
  })

  const academicExcellenceResponse = ({ conclusionState = 'APROBADA' } = {}) => {
    const stages = ['INSCRIPCION', 'REVISION_REQUISITOS', 'EVALUACION_TRIBUNAL', 'REGISTRO_ACTA', 'CONCLUSION_ACADEMICA'].map((codigo, index) => ({
      id: 700 + index,
      codigo,
      nombre: codigo === 'CONCLUSION_ACADEMICA' ? 'Conclusión académica' : `Etapa ${index + 1}`,
      estado: codigo === 'CONCLUSION_ACADEMICA' ? conclusionState : 'APROBADA',
      activo: true,
    }))
    return {
      ...response,
      detalle: {
        ...response.detalle,
        codigo: 'EA-2026-02',
        modalidad_detalle: { id: 6, codigo: 'EXCELENCIA_ACADEMICA', nombre: 'Excelencia Académica' },
        estado_actual_detalle: { id: 4, codigo: 'EN_PROCESO', nombre: 'En proceso' },
      },
      flujo: {
        ...response.flujo,
        modalidad: { id: 6, codigo: 'EXCELENCIA_ACADEMICA', nombre: 'Excelencia Académica' },
        etapa_actual: stages.at(-1),
        porcentaje_avance: conclusionState === 'APROBADA' ? 100 : 80,
        etapas: stages,
        orientacion_etapa_actual: null,
      },
      cierre: { data: null, error: 'Estado de cierre técnico todavía no disponible' },
    }
  }

  it('Excelencia muestra su resultado y formaliza únicamente mediante la acción explícita existente', async () => {
    let formalized = false
    postulacionesService.obtenerExpediente.mockImplementation(async () => {
      const value = academicExcellenceResponse()
      value.resultado = { data: null, error: '' }
      value.cierre = { data: null, error: '' }
      if (formalized) value.detalle.estado_actual_detalle = { codigo: 'CONCLUIDA', nombre: 'Concluida' }
      return value
    })
    postulacionesService.obtenerExcelenciaAcademica.mockResolvedValue({
      criterio: 'RENDIMIENTO_ACADEMICO', resultado: { estado: 'FAVORABLE', promedio_general: '100.00' }, criterios: [], documentos_requeridos: [],
    })
    postulacionesService.concluirExcelenciaAcademica.mockImplementation(async () => { formalized = true })
    renderApplicationManagerPage('resultado-y-cierre')
    const heading = await screen.findByRole('heading', { name: 'Resultado académico de Excelencia' })
    const panel = heading.closest('[role="tabpanel"]')
    expect(within(panel).getByText('FAVORABLE')).toBeVisible()
    expect(within(panel).getByText('100.00')).toBeVisible()
    expect(within(panel).getByText(/Falta formalizar/)).toBeVisible()
    expect(within(panel).queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()
    expect(postulacionesService.concluirExcelenciaAcademica).not.toHaveBeenCalled()
    await userEvent.click(within(panel).getByRole('button', { name: 'Concluir académicamente' }))
    await waitFor(() => expect(within(panel).getByText('La conclusión de la postulación está formalizada.')).toBeVisible())
    expect(postulacionesService.concluirExcelenciaAcademica).toHaveBeenCalledExactlyOnceWith(7)
    expect(within(panel).queryByRole('button', { name: 'Concluir académicamente' })).not.toBeInTheDocument()
    expect(postulacionesService.concluirAcademicamente).not.toHaveBeenCalled()
  })

  it('presenta el cierre académico de Rendimiento con su promedio aunque el estado administrativo siga En proceso', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(academicExcellenceResponse())
    postulacionesService.obtenerExcelenciaAcademica.mockResolvedValue({
      criterio: 'RENDIMIENTO_ACADEMICO',
      resultado: { estado: 'FAVORABLE', promedio_general: '90.00' },
      criterios: [], documentos_requeridos: [],
    })

    renderApplicationManagerPage()

    await waitFor(() => expect(postulacionesService.obtenerExcelenciaAcademica).toHaveBeenCalled())
    const summary = (await screen.findByRole('heading', { name: 'Resultado académico final' })).parentElement
    expect(within(summary).getByText('Conclusión académica')).toBeInTheDocument()
    expect(within(summary).getByText('Aprobada')).toBeInTheDocument()
    expect(within(summary).getByText('Resultado académico')).toBeInTheDocument()
    expect(within(summary).getByText(/Favorable/)).toBeInTheDocument()
    expect(within(summary).getByText('Promedio académico')).toBeInTheDocument()
    expect(within(summary).getByText('90.00')).toBeInTheDocument()
    expect(within(summary).getByText(/independientemente del estado administrativo general/i)).toBeInTheDocument()
    expect(screen.queryByText('No existe una etapa actual disponible.')).not.toBeInTheDocument()
    expect(screen.queryByText(/Nota final/)).not.toBeInTheDocument()
  })

  it('presenta el cierre de Reconocimiento a la calidad sin una calificación numérica', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(academicExcellenceResponse())
    postulacionesService.obtenerExcelenciaAcademica.mockResolvedValue({
      criterio: 'RECONOCIMIENTO_CALIDAD',
      resultado: { estado: 'FAVORABLE', promedio_general: null },
      criterios: [], documentos_requeridos: [],
    })

    renderApplicationManagerPage()

    await waitFor(() => expect(postulacionesService.obtenerExcelenciaAcademica).toHaveBeenCalled())
    const summary = (await screen.findByRole('heading', { name: 'Resultado académico final' })).parentElement
    expect(within(summary).getByText(/Favorable/)).toBeInTheDocument()
    expect(within(summary).queryByText('Promedio académico')).not.toBeInTheDocument()
    expect(within(summary).queryByText(/Nota final/)).not.toBeInTheDocument()
  })

  it.each([
    ['la conclusión está pendiente', { conclusionState: 'PENDIENTE' }, { criterio: 'RENDIMIENTO_ACADEMICO', resultado: { estado: 'FAVORABLE', promedio_general: '90.00' } }],
    ['el resultado está pendiente', {}, { criterio: 'RENDIMIENTO_ACADEMICO', resultado: { estado: 'PENDIENTE', promedio_general: null } }],
    ['el resultado está incompleto', {}, { criterio: 'RENDIMIENTO_ACADEMICO', resultado: null }],
  ])('no presenta un cierre académico exitoso cuando %s', async (_case, flowOptions, excellence) => {
    postulacionesService.obtenerExpediente.mockResolvedValue(academicExcellenceResponse(flowOptions))
    postulacionesService.obtenerExcelenciaAcademica.mockResolvedValue({ ...excellence, criterios: [], documentos_requeridos: [] })

    renderApplicationManagerPage()

    await waitFor(() => expect(postulacionesService.obtenerExcelenciaAcademica).toHaveBeenCalled())
    expect(screen.queryByRole('heading', { name: 'Resultado académico final' })).not.toBeInTheDocument()
    expect(screen.queryByText('Promedio académico')).not.toBeInTheDocument()
  })

  it('presenta el resultado Desfavorable sin identificarlo como favorable', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(academicExcellenceResponse())
    postulacionesService.obtenerExcelenciaAcademica.mockResolvedValue({
      criterio: 'RECONOCIMIENTO_CALIDAD',
      resultado: { estado: 'DESFAVORABLE', promedio_general: null },
      criterios: [], documentos_requeridos: [],
    })

    renderApplicationManagerPage()

    await waitFor(() => expect(postulacionesService.obtenerExcelenciaAcademica).toHaveBeenCalled())
    expect(await screen.findByRole('heading', { name: 'Resultado académico final' })).toBeInTheDocument()
    expect(screen.getByText('Desfavorable')).toBeInTheDocument()
    expect(screen.queryByText('Favorable')).not.toBeInTheDocument()
  })

  it('no presenta una calificación definitiva de Examen cuando el resultado específico está incompleto', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: { ...response.detalle, modalidad_detalle: { id: 5, codigo: 'EXAMEN_GRADO', nombre: 'Examen de Grado' } },
      flujo: { ...response.flujo, modalidad: { id: 5, codigo: 'EXAMEN_GRADO', nombre: 'Examen de Grado' } },
      resultado: { data: { nota_final: '99.00', clasificacion: 'APROBACION_PLENA' }, error: '' },
    })
    postulacionesService.obtenerExamenGrado.mockResolvedValue({
      areas: [], tribunales: [],
      resultado_final: { completo: false, nota_final: null, clasificacion: null, areas: { AREA_1: '85.00', AREA_2: null } },
    })

    renderPage('resultado-y-cierre')

    const result = (await screen.findByRole('heading', { name: 'Resultado académico técnico' })).parentElement
    expect(within(result).getByText('Pendiente')).toBeInTheDocument()
    expect(within(result).queryByText('99.00')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Conclusión de la postulación pendiente' })).not.toBeInTheDocument()
  })

  it('muestra solo nota privada, nota final y clasificación de Proyecto nuevo', async () => {
    const closureStage = { id: 14, codigo: 'CIERRE_DOCUMENTAL', nombre: 'Cierre documental', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
    postulacionesService.obtenerCapacidadesModalidad.mockResolvedValue({ soportada: true, configuracion_valida: true, cierre_soportado: true })
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      flujo: { ...response.flujo, etapa_actual: closureStage, etapas: [...response.flujo.etapas, closureStage] },
      resultado: { data: {
        nota_privada: '85.00', aporte_privada: '25.50', semantica_privada: 'BRUTA_100',
        nota_publica: '95.00', aporte_publica: '66.50', semantica_publica: 'BRUTA_100',
        nota_final: '92.00', clasificacion: 'APROBACION_PLENA_CON_FELICITACION',
      }, error: '' },
    })
    renderPage('resultado-y-cierre')

    const result = (await screen.findByRole('heading', { name: 'Resultado académico técnico' })).parentElement
    await within(result).findByText('Nota de Defensa Privada')
    expect(within(result).getByText('85,00')).toBeInTheDocument()
    expect(within(result).getAllByText('/ 100')).toHaveLength(2)
    expect(within(result).queryByText('Aporte de Defensa Privada')).not.toBeInTheDocument()
    expect(within(result).queryByText('Nota de Defensa Pública')).not.toBeInTheDocument()
    expect(within(result).queryByText('Aporte de Defensa Pública')).not.toBeInTheDocument()
    expect(within(result).getByText('Nota Final')).toBeInTheDocument()
    expect(within(result).getAllByText('Calificación')).toHaveLength(1)
    expect(within(result).queryByText('25,50')).not.toBeInTheDocument()
    expect(within(result).queryByText('66,50')).not.toBeInTheDocument()
    expect(within(result).queryByText('Ponderación 30%')).not.toBeInTheDocument()
    expect(within(result).queryByText('Ponderación 70%')).not.toBeInTheDocument()
    expect(within(result).queryByText('/ 30')).not.toBeInTheDocument()
    expect(within(result).queryByText('/ 70')).not.toBeInTheDocument()
    expect(within(result).getByText('92,00')).toBeInTheDocument()
    expect(within(result).getByText('Aprobación plena con felicitación')).toBeInTheDocument()

    const closureSection = screen.getByRole('heading', { name: 'Cierre técnico' }).closest('details')
    const closure = screen.getByRole('heading', { name: 'Cierre técnico' }).parentElement
    expect(within(closure).getByText('En proceso')).toBeInTheDocument()
    expect(within(closure).queryByText('Nota final')).not.toBeInTheDocument()
    expect(within(closure).queryByText('92,00')).not.toBeInTheDocument()
    expect(within(closure).queryByText('Aprobación plena con felicitación')).not.toBeInTheDocument()
    const conditionsSummary = await within(closureSection).findByText(/Condiciones técnicas/)
    const deliveriesSummary = within(closureSection).getByText(/Entregas técnicas/)
    expect(conditionsSummary.closest('details')).not.toHaveAttribute('open')
    expect(deliveriesSummary.closest('details')).not.toHaveAttribute('open')
  })

  it('mantiene expediente y advertencias ante errores parciales y permite reintentar', async () => {
    const partial = {
      ...response,
      resultado: { data: null, error: 'Resultado final todavía no disponible' },
      cierre: { data: null, error: 'Estado de cierre técnico todavía no disponible' },
    }
    postulacionesService.obtenerExpediente.mockResolvedValueOnce(partial).mockResolvedValueOnce(response)
    renderPage('resultado-y-cierre')
    expect(await screen.findByText(/Ana P/)).toBeInTheDocument()
    expect(screen.getByText('Resultado final todavía no disponible')).toBeInTheDocument()
    expect(screen.getByText('Estado de cierre técnico todavía no disponible')).toBeInTheDocument()
    expect(screen.queryByRole('note', { name: 'Límites normativos' })).not.toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('button', { name: 'Reintentar' })[0])
    expect(await screen.findByText('84,00')).toBeInTheDocument()
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2)
  })

  it('integra el cierre técnico con faltantes, resultado y advertencia legal sin acciones para lectura', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    renderOwnerPage('resultado-y-cierre')
    const closure = await screen.findByRole('heading', { name: 'Cierre técnico' })
    const card = closure.parentElement
    // Proyecto de Grado resume el cierre técnico con el conteo de documentos pendientes.
    expect(within(card).getByRole('region', { name: 'Documentos pendientes' })).toHaveTextContent('1')
    expect(within(card).queryByRole('button', { name: /aprobar|concluir|reabrir/i })).not.toBeInTheDocument()
  })

  it.each([true, false])('orienta al cierre técnico con workflow completo aunque puede_concluir sea %s', async (puedeConcluir) => {
    const completedStages = Array.from({ length: 8 }, (_, index) => ({
      id: 100 + index,
      codigo: `ETAPA_${index + 1}`,
      nombre: index === 7 ? 'Cierre Documental' : `Etapa ${index + 1}`,
      estado: 'APROBADA',
      activo: true,
    }))
    const pendingClosure = {
      ...response,
      flujo: {
        ...response.flujo,
        etapa_actual: completedStages.at(-1),
        porcentaje_avance: 100,
        etapas: completedStages,
        orientacion_etapa_actual: null,
      },
      cierre: {
        data: {
          ...closureResponse,
          estado_general: 'EN_PROCESO',
          etapa_actual: null,
          cierre_documental_aprobado: true,
          concluida: false,
          puede_concluir: puedeConcluir,
        },
        error: '',
      },
    }
    postulacionesService.obtenerExpediente.mockResolvedValue(pendingClosure)
    postulacionesService.obtenerCapacidadesModalidad.mockResolvedValue({ soportada: true, configuracion_valida: true, cierre_soportado: true })

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Flujo académico completado' })).toBeInTheDocument()
    expect(screen.getByText('8 de 8 etapas completadas · 100% de etapas')).toBeInTheDocument()
    expect(screen.getByText(/aún está en proceso y requiere completar el cierre técnico/i)).toBeInTheDocument()
    expect(screen.queryByText('No existe una etapa actual disponible.')).not.toBeInTheDocument()
    const manageClosure = screen.getByRole('link', { name: 'Gestionar cierre técnico' })
    expect(manageClosure).toHaveAttribute('href', '#condiciones-tecnicas')
    await userEvent.click(manageClosure)
    expect(window.location.hash).toBe('#condiciones-tecnicas')
  })

  it('mantiene el estado concluido con prioridad sobre la orientación de cierre', async () => {
    const completedStages = Array.from({ length: 8 }, (_, index) => ({ id: 200 + index, codigo: `ETAPA_${index + 1}`, nombre: `Etapa ${index + 1}`, estado: 'APROBADA', activo: true }))
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: { ...response.detalle, estado_actual_detalle: { codigo: 'CONCLUIDA', nombre: 'Concluida' } },
      flujo: { ...response.flujo, etapa_actual: completedStages.at(-1), porcentaje_avance: 100, etapas: completedStages, orientacion_etapa_actual: null },
      cierre: { data: { ...closureResponse, estado_general: 'CONCLUIDA', cierre_documental_aprobado: true, concluida: true }, error: '' },
    })
    postulacionesService.obtenerCapacidadesModalidad.mockResolvedValue({ soportada: true, configuracion_valida: true, cierre_soportado: true })

    renderPage()

    expect(await screen.findByText('Expediente concluido')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Gestionar cierre técnico' })).not.toBeInTheDocument()
  })

  it('concluye con refetch canónico demorado y restaura únicamente el resumen final', async () => {
    const readyToConclude = {
      ...response,
      cierre: { data: { ...closureResponse, revision_final_aprobada: true, cierre_documental_aprobado: true, puede_aprobar_revision_final: false, puede_aprobar_cierre: false, puede_concluir: true }, error: '' },
    }
    const concludedClosure = { ...readyToConclude.cierre.data, estado_general: 'CONCLUIDA', etapa_actual: null, concluida: true, puede_concluir: false }
    const concludedExpediente = {
      ...readyToConclude,
      detalle: { ...response.detalle, estado_actual_detalle: { codigo: 'CONCLUIDA', nombre: 'Concluida' } },
      flujo: { ...response.flujo, etapa_actual: null },
      cierre: { data: concludedClosure, error: '' },
    }
    const refreshedExpediente = deferred()
    postulacionesService.obtenerExpediente
      .mockResolvedValueOnce(readyToConclude)
      .mockReturnValueOnce(refreshedExpediente.promise)
    postulacionesService.concluirPostulacion.mockResolvedValue(concludedClosure)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const scrolledIds = []
    definePropertyForTest(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(function scrollIntoView() { scrolledIds.push(this.id) }),
    })
    window.history.replaceState(window.history.state, '', '#condiciones-tecnicas')
    renderClosureManagerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Concluir técnicamente' }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }))

    await waitFor(() => expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2))
    expect(window.location.hash).toBe('#resumen')
    expect(screen.queryByText('Expediente concluido')).not.toBeInTheDocument()
    expect(scrolledIds).toEqual([])

    await act(async () => refreshedExpediente.resolve(concludedExpediente))

    expect(await screen.findByText('Expediente concluido')).toBeInTheDocument()
    expect(screen.getByText('Nota final: 84,00')).toBeInTheDocument()
    expect(screen.getAllByText('Aprobación plena').length).toBeGreaterThan(0)
    expect(window.location.hash).toBe('#resumen')
    expect(scrolledIds).toEqual(['resumen'])
  })

  it('exige motivo al reabrir y conserva errores funcionales por campo', async () => {
    const closed = { ...response, cierre: { data: { ...closureResponse, revision_final_aprobada: true, cierre_documental_aprobado: true, puede_aprobar_revision_final: false, puede_concluir: true }, error: '' } }
    postulacionesService.obtenerExpediente.mockResolvedValue(closed)
    postulacionesService.reabrirCierre.mockRejectedValue({ status: 409, message: 'La acción no cumple las precondiciones del cierre técnico.', fields: { motivo: ['Reapertura no permitida.'] } })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderClosureManagerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Reabrir cierre' }))
    fireEvent.submit(screen.getByRole('button', { name: 'Confirmar' }).closest('form'))
    expect(await screen.findByText('motivo: El motivo es obligatorio.')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Motivo'), 'Corrección técnica')
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(await screen.findByText('motivo: Reapertura no permitida.')).toBeInTheDocument()
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(1)
    vi.restoreAllMocks()
  })
})
