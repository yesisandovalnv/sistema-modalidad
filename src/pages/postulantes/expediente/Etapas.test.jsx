import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import ExpedientePage from '../ExpedientePage'
import { postulacionesService } from '../../../services/postulacionesService'
import { AuthContext } from '../../../context/AuthContext'
import { prepararExpediente, deferred, definePropertyForTest, emptyProjectFlow, examInscriptionResponse, excellenceInscriptionResponse, futureProfileOrientation, historyResponse, inscriptionStageResponse, profileContracts, projectFlowAfterStart, projectStages, renderApplicationManagerPage, renderOwnerPage, renderPage, renderStudentPage, response, selectInitialTab, tribunalDocuments, tribunalResponse, tribunalStage } from './pruebas/utilidades'

vi.mock('../../../services/postulacionesService', () => import('./pruebas/servicioSimulado'))

describe('ExpedientePage · Etapas y flujo', () => {
  prepararExpediente()

  it('mantiene estable la vista estudiantil con orientación nula y flujo vacío', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      flujo: { ...response.flujo, porcentaje_avance: 0, etapas_completadas: 0, etapas_totales: 0, etapa_actual: null, etapas: [], orientacion_etapa_actual: null },
      cierre: { data: null, error: 'Estado de cierre técnico todavía no disponible' },
    })

    renderStudentPage()

    expect(await screen.findByText('0 de 0 etapas completadas')).toBeInTheDocument()
    expect(screen.getAllByText('Sin etapa actual').length).toBeGreaterThan(0)
    expect(screen.getByText('No hay una orientación pendiente para esta etapa.')).toBeInTheDocument()
    expect(screen.getByText('Todavía no se prepararon las etapas de tu proceso.')).toBeInTheDocument()
    expect(screen.getByText('El estado del cierre técnico todavía no está disponible.')).toBeInTheDocument()
  })

  it('actualiza la pestaña activa al recorrer el historial del navegador', async () => {
    const { container } = renderPage()
    await screen.findByRole('heading', { name: /Ana P/ })
    await userEvent.click(screen.getByRole('tab', { name: 'Documentos' }))
    await userEvent.click(screen.getByRole('tab', { name: 'Actores' }))

    window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}#documentos`)
    fireEvent.popState(window)

    expect(screen.getByRole('tab', { name: 'Documentos' })).toHaveAttribute('aria-selected', 'true')
    expect(container.querySelector('#panel-documentos')).toBeVisible()
    expect(container.querySelector('#panel-actores')).not.toBeVisible()
  })

  it('muestra la acción unificada de Proyecto de Grado solo cuando el flujo soportado está vacío', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: { ...response.detalle, estado_actual_detalle: { id: 1, codigo: 'REGISTRADA', nombre: 'Registrada' } },
      flujo: { ...response.flujo, etapa_actual: null, porcentaje_avance: 0, etapas: [] },
    })

    renderApplicationManagerPage()

    expect(await screen.findByRole('button', { name: 'Iniciar proceso de Proyecto de Grado' })).toBeInTheDocument()
  })

  it('oculta inicialización si el flujo existe o el usuario no tiene permiso', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    const initialized = renderApplicationManagerPage()
    await screen.findByRole('heading', { name: 'Estado actual de tu proceso académico' })
    expect(screen.queryByRole('button', { name: 'Iniciar proceso de Proyecto de Grado' })).not.toBeInTheDocument()
    initialized.unmount()

    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      flujo: { ...response.flujo, etapa_actual: null, porcentaje_avance: 0, etapas: [] },
    })
    renderOwnerPage()
    await screen.findByRole('heading', { name: 'Estado actual de tu proceso académico' })
    expect(screen.queryByRole('button', { name: 'Iniciar proceso de Proyecto de Grado' })).not.toBeInTheDocument()
  })

  it.each([
    ['modalidad no soportada', { soportada: false, configuracion_valida: false }, true],
    ['postulación inactiva', { soportada: true, configuracion_valida: true }, false],
  ])('oculta inicialización para %s', async (_case, capabilities, active) => {
    postulacionesService.obtenerCapacidadesModalidad.mockResolvedValue(capabilities)
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: { ...response.detalle, activo: active },
      flujo: { ...response.flujo, etapa_actual: null, porcentaje_avance: 0, etapas: [] },
    })

    renderApplicationManagerPage()

    await screen.findByRole('heading', { name: 'Estado actual de tu proceso académico' })
    expect(screen.queryByRole('button', { name: 'Iniciar proceso de Proyecto de Grado' })).not.toBeInTheDocument()
  })

  it('inicia el proceso con una sola llamada backend y deja Perfil en proceso', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValueOnce(emptyProjectFlow).mockResolvedValueOnce(projectFlowAfterStart('APROBADA', 'EN_PROCESO'))
    postulacionesService.inicializarFlujo.mockResolvedValue({ etapas: projectStages('PENDIENTE') })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderApplicationManagerPage('etapas')

    await userEvent.click(await screen.findByRole('button', { name: 'Iniciar proceso de Proyecto de Grado' }))

    await waitFor(() => expect(postulacionesService.inicializarFlujo).toHaveBeenCalledWith(7, expect.any(AbortSignal)))
    expect(postulacionesService.iniciarEtapa).not.toHaveBeenCalled()
    expect(postulacionesService.aprobarEtapa).not.toHaveBeenCalled()
    await waitFor(() => expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2))
    expect(screen.queryByRole('button', { name: 'Iniciar Perfil de Proyecto' })).not.toBeInTheDocument()
    const stagesCard = screen.getByRole('heading', { name: 'Etapas del flujo académico' }).parentElement
    // Estados en texto normal (no el código del servidor) y sin "Intento 1" repetido.
    expect(within(stagesCard).getAllByText('Pendiente')).toHaveLength(6)
    expect(within(stagesCard).getByText('Aprobada')).toBeInTheDocument()
    expect(within(stagesCard).getByText('En proceso')).toBeInTheDocument()
    expect(within(stagesCard).queryByText(/Intento/)).not.toBeInTheDocument()
    expect(projectFlowAfterStart('APROBADA', 'EN_PROCESO').flujo.etapas).toHaveLength(8)
    confirm.mockRestore()
  })

  it('bloquea el doble envío mientras inicia el proceso', async () => {
    let resolveInitialization
    postulacionesService.obtenerExpediente.mockResolvedValue(emptyProjectFlow)
    postulacionesService.inicializarFlujo.mockImplementation(() => new Promise((resolve) => { resolveInitialization = resolve }))
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderApplicationManagerPage()

    const button = await screen.findByRole('button', { name: 'Iniciar proceso de Proyecto de Grado' })
    fireEvent.click(button)
    fireEvent.click(button)
    expect(postulacionesService.inicializarFlujo).toHaveBeenCalledTimes(1)
    resolveInitialization({ etapas: projectStages('APROBADA') })
    await waitFor(() => expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2))
    confirm.mockRestore()
  })

  it('delega al backend la continuación idempotente de una inicialización previa', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValueOnce(emptyProjectFlow).mockResolvedValueOnce(projectFlowAfterStart())
    postulacionesService.inicializarFlujo.mockResolvedValue({ etapas: projectStages('EN_PROCESO') })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderApplicationManagerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Iniciar proceso de Proyecto de Grado' }))
    await waitFor(() => expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2))
    expect(postulacionesService.iniciarEtapa).not.toHaveBeenCalled()
    expect(postulacionesService.aprobarEtapa).not.toHaveBeenCalled()
    confirm.mockRestore()
  })

  it('no repite operaciones si Inscripción ya está aprobada', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValueOnce(emptyProjectFlow).mockResolvedValueOnce(projectFlowAfterStart())
    postulacionesService.inicializarFlujo.mockResolvedValue({ etapas: projectStages('APROBADA') })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderApplicationManagerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Iniciar proceso de Proyecto de Grado' }))
    await waitFor(() => expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2))
    expect(postulacionesService.iniciarEtapa).not.toHaveBeenCalled()
    expect(postulacionesService.aprobarEtapa).not.toHaveBeenCalled()
    confirm.mockRestore()
  })

  it('recarga el estado real y muestra un error si falla después de inicializar', async () => {
    const pendingFlow = projectFlowAfterStart('PENDIENTE')
    pendingFlow.flujo.etapa_actual = pendingFlow.flujo.etapas[0]
    postulacionesService.obtenerExpediente.mockResolvedValueOnce(emptyProjectFlow).mockResolvedValueOnce(pendingFlow)
    postulacionesService.inicializarFlujo.mockResolvedValue({ etapas: projectStages('PENDIENTE') })
    postulacionesService.inicializarFlujo.mockRejectedValue({ message: 'No se pudo iniciar la etapa. Intenta nuevamente.' })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderApplicationManagerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Iniciar proceso de Proyecto de Grado' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Se recargó el estado real del expediente.')
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2)
    expect(await screen.findByRole('button', { name: 'Iniciar Inscripción' })).toBeInTheDocument()
    confirm.mockRestore()
  })

  it('orienta a configurar Excelencia y bloquea el inicio cuando el backend no lo permite', async () => {
    const inscription = { id: 290, codigo: 'INSCRIPCION', nombre: 'Inscripción', estado: 'PENDIENTE', numero_intento: 1, activo: true, acciones_permitidas: [] }
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: { ...response.detalle, codigo: 'EA-2026-02', modalidad_detalle: { id: 6, codigo: 'EXCELENCIA_ACADEMICA', nombre: 'Excelencia Académica' }, estado_actual_detalle: { id: 1, codigo: 'REGISTRADA', nombre: 'Registrada' } },
      flujo: {
        ...response.flujo,
        modalidad: { id: 6, codigo: 'EXCELENCIA_ACADEMICA', nombre: 'Excelencia Académica' },
        etapa_actual: inscription,
        etapas: [inscription],
        porcentaje_avance: 0,
        etapas_completadas: 0,
        etapas_totales: 5,
        orientacion_etapa_actual: {
          operacion: 'CONFIGURAR_EXCELENCIA',
          mensaje: 'Selecciona el criterio normativo antes de iniciar el flujo.',
          requisitos: [],
          siguiente_accion: { codigo: 'CONFIGURAR_CRITERIO', titulo: 'Seleccionar criterio', descripcion: 'El criterio seleccionado queda inmutable al iniciar el flujo.', estado: 'PENDIENTE', estado_display: 'Pendiente', destino: '#excelencia', accion_label: 'Seleccionar criterio' },
          conflictos_identidad: [],
        },
      },
    })
    postulacionesService.obtenerExcelenciaAcademica.mockResolvedValue({ criterio: null, criterios: [], documentos_requeridos: [] })

    renderApplicationManagerPage()

    const summary = (await screen.findByRole('heading', { name: 'Qué debes hacer ahora' })).parentElement
    expect(within(summary).getByText('Selecciona el criterio normativo antes de iniciar el flujo.')).toBeInTheDocument()
    const configureLink = within(summary).getByRole('link', { name: 'Seleccionar criterio' })
    expect(configureLink).toHaveAttribute('href', '#excelencia')
    expect(screen.queryByRole('button', { name: 'Iniciar Inscripción' })).not.toBeInTheDocument()
    expect(postulacionesService.iniciarEtapa).not.toHaveBeenCalled()

    await userEvent.click(configureLink)
    expect(window.location.hash).toBe('#excelencia')
  })

  it('permite iniciar Inscripción de Excelencia solo cuando el backend autoriza iniciar y refresca el expediente', async () => {
    const pending = { id: 290, codigo: 'INSCRIPCION', nombre: 'Inscripción', estado: 'PENDIENTE', numero_intento: 1, activo: true, acciones_permitidas: ['iniciar'] }
    const inProgress = { ...pending, estado: 'EN_PROCESO', estado_display: 'En proceso', acciones_permitidas: [] }
    const excellenceResponse = (stage) => ({
      ...response,
      detalle: { ...response.detalle, codigo: 'EA-2026-02', modalidad_detalle: { id: 6, codigo: 'EXCELENCIA_ACADEMICA', nombre: 'Excelencia Académica' } },
      flujo: { ...response.flujo, modalidad: { id: 6, codigo: 'EXCELENCIA_ACADEMICA', nombre: 'Excelencia Académica' }, etapa_actual: stage, etapas: [stage], orientacion_etapa_actual: null },
    })
    postulacionesService.obtenerExpediente.mockResolvedValueOnce(excellenceResponse(pending)).mockResolvedValueOnce(excellenceResponse(inProgress))
    postulacionesService.obtenerExcelenciaAcademica.mockResolvedValue({ criterio: 'RENDIMIENTO_ACADEMICO', criterios: [], documentos_requeridos: [] })
    postulacionesService.iniciarEtapa.mockResolvedValue(inProgress)

    renderApplicationManagerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Iniciar Inscripción' }))

    expect(postulacionesService.iniciarEtapa).toHaveBeenCalledTimes(1)
    expect(postulacionesService.iniciarEtapa).toHaveBeenCalledWith(290, expect.any(AbortSignal))
    await waitFor(() => expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Iniciar InscripciÃ³n' })).not.toBeInTheDocument())
  })

  it('orienta al registro institucional y bloquea iniciar Desarrollo cuando el backend no autoriza', async () => {
    const stage = {
      id: 291,
      codigo: 'DESARROLLO_TRABAJO_DIRIGIDO',
      nombre: 'Desarrollo y seguimiento institucional',
      estado: 'PENDIENTE',
      numero_intento: 1,
      activo: true,
      acciones_permitidas: [],
    }
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: {
        ...response.detalle,
        modalidad_detalle: { id: 7, codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido' },
      },
      flujo: {
        ...response.flujo,
        modalidad: { id: 7, codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido' },
        etapa_actual: stage,
        etapas: [stage],
        orientacion_etapa_actual: {
          operacion: 'ORIENTAR_ETAPA',
          mensaje: 'Falta registrar la institución y el supervisor para iniciar Desarrollo.',
          requisitos: [{ tipo: 'INSTITUCION', codigo: 'INSTITUCION_SUPERVISOR_TD', nombre: 'Institución y supervisor', cumplido: false, estado: 'PENDIENTE', estado_display: 'Pendiente de registro', destino: '#trabajo-dirigido' }],
          siguiente_accion: { codigo: 'GESTIONAR_INSTITUCION', titulo: 'Registrar institución y supervisor', descripcion: 'Completa y guarda los datos institucionales necesarios para iniciar Desarrollo', estado: 'PENDIENTE', estado_display: 'Pendiente', destino: '#trabajo-dirigido', accion_label: 'Gestionar institución' },
        },
      },
    })
    postulacionesService.obtenerTrabajoDirigido.mockResolvedValue({ institucion: null, informes: [] })

    renderApplicationManagerPage()

    await waitFor(() => expect(postulacionesService.obtenerTrabajoDirigido).toHaveBeenCalledWith('7', expect.any(AbortSignal)))
    expect(await screen.findByText('Registrar institución y supervisor')).toBeInTheDocument()
    expect(screen.getByText('Completa y guarda los datos institucionales necesarios para iniciar Desarrollo')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Iniciar Desarrollo y seguimiento institucional' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Completar registro institucional' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: 'Gestionar institución' }))
    expect(await screen.findByRole('heading', { name: 'Institución y supervisor' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar institución' })).toBeInTheDocument()
  })

  it('permite iniciar Desarrollo de Trabajo Dirigido con institución cuando el backend habilita la acción', async () => {
    const pending = {
      id: 292,
      codigo: 'DESARROLLO_TRABAJO_DIRIGIDO',
      nombre: 'Desarrollo y seguimiento institucional',
      estado: 'PENDIENTE',
      numero_intento: 1,
      activo: true,
      acciones_permitidas: ['iniciar'],
    }
    const inProgress = { ...pending, estado: 'EN_PROCESO', acciones_permitidas: [] }
    const responseForStage = (stage) => ({
      ...response,
      detalle: {
        ...response.detalle,
        modalidad_detalle: { id: 7, codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido' },
      },
      flujo: {
        ...response.flujo,
        modalidad: { id: 7, codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido' },
        etapa_actual: stage,
        etapas: [stage],
      },
    })
    postulacionesService.obtenerExpediente
      .mockResolvedValueOnce(responseForStage(pending))
      .mockResolvedValue(responseForStage(inProgress))
    postulacionesService.obtenerTrabajoDirigido.mockResolvedValue({
      institucion: {
        institucion_nombre: 'Institución de prueba',
        supervisor_nombre: 'Supervisor de prueba',
        institucion_tipo: 'PUBLICA',
        tipo_ejecucion: 'INTERNO',
        constituida_legalmente: true,
        actividad_permanente: true,
      },
      informes: [],
    })
    postulacionesService.iniciarEtapa.mockResolvedValue(inProgress)

    renderApplicationManagerPage()

    expect(await screen.findByRole('button', { name: 'Iniciar Desarrollo y seguimiento institucional' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Completar registro institucional' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar Desarrollo y seguimiento institucional' }))
    expect(postulacionesService.iniciarEtapa).toHaveBeenCalledWith(292, expect.any(AbortSignal))
  })

  it('presenta de forma segura el motivo de validación al fallar el inicio de Trabajo Dirigido', async () => {
    const stage = {
      id: 294,
      codigo: 'DESARROLLO_TRABAJO_DIRIGIDO',
      nombre: 'Desarrollo y seguimiento institucional',
      estado: 'PENDIENTE',
      numero_intento: 1,
      activo: true,
      acciones_permitidas: ['iniciar'],
    }
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: {
        ...response.detalle,
        modalidad_detalle: { id: 7, codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido' },
      },
      flujo: {
        ...response.flujo,
        modalidad: { id: 7, codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido' },
        etapa_actual: stage,
        etapas: [stage],
      },
    })
    postulacionesService.obtenerTrabajoDirigido.mockResolvedValue({
      institucion: { institucion_nombre: 'Institución', supervisor_nombre: 'Supervisor' },
      informes: [],
    })
    postulacionesService.iniciarEtapa.mockRejectedValue({
      status: 400,
      message: 'Debe registrar la institución y el supervisor de Trabajo Dirigido.',
    })

    renderApplicationManagerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Iniciar Desarrollo y seguimiento institucional' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Debe registrar la institución y el supervisor de Trabajo Dirigido.')
  })

  it('oculta la orientación operativa futura mientras la etapa actual está pendiente', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...projectFlowAfterStart(),
      flujo: { ...projectFlowAfterStart().flujo, orientacion_etapa_actual: futureProfileOrientation },
    })
    renderApplicationManagerPage()

    const summary = (await screen.findByRole('heading', { name: 'Qué debes hacer ahora' })).parentElement
    expect(within(summary).getByText('La etapa está lista para iniciarse.')).toBeInTheDocument()
    expect(within(summary).queryByText('Requisitos de esta etapa')).not.toBeInTheDocument()
    expect(within(summary).queryByText('Tribunales')).not.toBeInTheDocument()
    expect(within(summary).queryByText(futureProfileOrientation.mensaje)).not.toBeInTheDocument()
    expect(within(summary).queryByText('Gestión de actores')).not.toBeInTheDocument()
    // En Resumen el botón para iniciar está en "Siguiente acción" (sin candado) y aparece una sola vez.
    expect(within(summary).getByRole('heading', { name: 'Siguiente acción' })).toBeInTheDocument()
    expect(within(summary).getByRole('button', { name: 'Iniciar Perfil de Proyecto' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Iniciar Perfil de Proyecto' })).toHaveLength(1)
    // En otra pestaña el mismo botón queda en la cabecera.
    await userEvent.click(screen.getByRole('tab', { name: 'Documentos' }))
    expect(screen.getAllByRole('button', { name: 'Iniciar Perfil de Proyecto' })).toHaveLength(1)
  })

  it('expediente sin etapas: en Resumen ofrece "Preparar etapas" con lenguaje claro y una sola vez', async () => {
    const td = { id: 3, codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido' }
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: { ...response.detalle, modalidad_detalle: td, estado_actual_detalle: { id: 1, codigo: 'REGISTRADA', nombre: 'Registrada' } },
      flujo: { ...response.flujo, modalidad: td, etapa_actual: null, porcentaje_avance: 0, etapas: [], etapas_totales: 0, etapas_completadas: 0, orientacion_etapa_actual: null },
      cierre: { data: null, error: '' },
    })
    postulacionesService.obtenerCapacidadesModalidad.mockResolvedValue({ soportada: true, configuracion_valida: true, etapas: Array.from({ length: 8 }, (_, index) => ({ orden: index + 1 })) })
    renderApplicationManagerPage('resumen')

    const summary = (await screen.findByRole('heading', { name: 'Qué debes hacer ahora' })).parentElement
    expect(within(summary).getByText('Etapas por preparar')).toBeInTheDocument()
    expect(within(summary).getByText('Preparar el expediente')).toBeInTheDocument()
    expect(within(summary).getByText('Se crean las 8 etapas de Trabajo Dirigido; ninguna se inicia ni se aprueba todavía.')).toBeInTheDocument()
    expect(within(summary).getByRole('button', { name: 'Preparar etapas' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Preparar etapas' })).toHaveLength(1)
    expect(screen.queryByText(/configuradas por el backend/)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: 'Etapas' }))
    expect(screen.getAllByRole('button', { name: 'Preparar etapas' })).toHaveLength(1)
    expect(screen.getByText('Todavía no se prepararon las etapas de este expediente.')).toBeInTheDocument()
  })

  it.each(['EN_PROCESO', 'OBSERVADA'])('muestra la siguiente acción del backend cuando la etapa está %s', async (estado) => {
    const contracts = profileContracts()
    const stage = { ...contracts.stage, estado }
    const flow = { ...contracts.flow, etapa_actual: stage, etapas: [stage] }
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: flow })
    renderApplicationManagerPage()

    const summary = (await screen.findByRole('heading', { name: 'Qué debes hacer ahora' })).parentElement
    expect(within(summary).getByRole('heading', { name: 'Siguiente acción' })).toBeInTheDocument()
    expect(within(summary).getByText('Completar composición formal')).toBeInTheDocument()
    // El mismo texto ya no se repite a la izquierda y en "Siguiente acción".
    expect(within(summary).getAllByText('Completa las posiciones formales pendientes.')).toHaveLength(1)
    expect(within(summary).getByRole('link', { name: 'Gestionar actores' })).toHaveAttribute('href', '#actores')
    expect(within(summary).queryByText('Mínimo requerido: 2')).not.toBeInTheDocument()
  })

  it.each([0, 1, 2, 3, 4])('Inscripción de Excelencia reutiliza la distribución integrada con %s de cuatro', async (completed) => {
    postulacionesService.obtenerExpediente.mockResolvedValue(excellenceInscriptionResponse(completed))
    renderApplicationManagerPage('resumen')
    const requirements = (await screen.findByRole('heading', { name: 'Requisitos de Inscripción', level: 3 })).closest('[aria-labelledby="inscription-requirements-title"]')
    expect(within(requirements).getByText(`${completed} de 4 cumplidos`)).toBeVisible()
    expect(within(requirements).getAllByRole('listitem')).toHaveLength(3)
    expect(within(requirements).queryByText(/Fólder/)).not.toBeInTheDocument()
    const summary = document.getElementById('panel-resumen')
    expect(within(summary).getByRole('heading', { name: 'Recepción física', level: 3 })).toBeVisible()
    expect(await within(summary).findByText('Cantidad técnica requerida: No definida')).toBeVisible()
    expect(within(summary).getAllByText('Fólder amarillo rotulado con el nombre del postulante y la modalidad elegida')).toHaveLength(1)
    expect(within(summary).queryByRole('heading', { name: 'Requisitos de esta etapa' })).not.toBeInTheDocument()
    if (completed === 4) expect(within(summary).getByRole('button', { name: 'Aprobar Inscripción' })).toBeEnabled()
    else expect(within(summary).queryByRole('button', { name: 'Aprobar Inscripción' })).not.toBeInTheDocument()
  })

  it('Inscripción de Excelencia registra recepción sin cantidad institucional y refresca la aprobación', async () => {
    let created = false
    let received = false
    const delivery = { id: 501, codigo: 'FOLDER_AMARILLO', nombre: 'Fólder amarillo rotulado con el nombre del postulante y la modalidad elegida', estado: 'PENDIENTE', cantidad: null, cantidad_recibida: 0 }
    postulacionesService.obtenerExpediente.mockImplementation(async () => excellenceInscriptionResponse(received ? 4 : 3))
    postulacionesService.obtenerEntregas.mockImplementation(async () => ({ results: created ? [{ ...delivery, estado: received ? 'COMPLETA' : 'PENDIENTE', cantidad_recibida: received ? 1 : 0 }] : [] }))
    postulacionesService.crearEntregaFisica.mockImplementation(async () => { created = true; return delivery })
    postulacionesService.registrarEntrega.mockImplementation(async () => { received = true; return {} })
    renderApplicationManagerPage('resumen')
    await userEvent.click(await screen.findByRole('button', { name: 'Registrar recepción' }))
    expect(postulacionesService.crearEntregaFisica).toHaveBeenCalledWith(7, 'FOLDER_AMARILLO', delivery.nombre, null, expect.any(AbortSignal))
    const form = await screen.findByRole('form', { name: `Registrar entrega: ${delivery.nombre}` })
    await userEvent.click(within(form).getByRole('button', { name: 'Guardar' }))
    expect(postulacionesService.registrarEntrega).toHaveBeenCalledWith(501, 1, '', expect.any(AbortSignal))
    expect(await screen.findByText('4 de 4 cumplidos')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Aprobar Inscripción' })).toBeEnabled()
  })

  it('Inscripción de Excelencia conserva los permisos de recepción y aprobación', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(excellenceInscriptionResponse(4))
    selectInitialTab('resumen')
    renderStudentPage()
    expect(await screen.findByRole('heading', { name: 'Excelencia Académica', level: 1 })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Registrar recepción' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Aprobar Inscripción' })).not.toBeInTheDocument()
  })

  it.each([0, 2, 3, 4])('Inscripción de Examen reutiliza los grupos y cuenta %s de cuatro requisitos', async (completed) => {
    postulacionesService.obtenerExpediente.mockResolvedValue(examInscriptionResponse(completed))
    renderApplicationManagerPage('resumen')
    const requirements = (await screen.findByRole('heading', { name: 'Requisitos de Inscripción', level: 3 })).closest('[aria-labelledby="inscription-requirements-title"]')
    expect(within(requirements).getByText(`${completed} de 4 cumplidos`)).toBeVisible()
    expect(within(requirements).getAllByRole('listitem')).toHaveLength(3)
    expect(within(requirements).getByText(/Carta de Solicitud de Examen/)).toBeVisible()
    expect(within(requirements).queryByText(/Fólder/)).not.toBeInTheDocument()
    const summary = document.getElementById('panel-resumen')
    expect(within(summary).getByRole('heading', { name: 'Recepción física', level: 3 })).toBeVisible()
    expect(await within(summary).findByText('Cantidad técnica requerida: No definida')).toBeVisible()
    expect(within(summary).getAllByText('Fólder amarillo rotulado con el nombre del postulante y la modalidad elegida')).toHaveLength(1)
    expect(within(document.getElementById('panel-documentos')).queryByRole('heading', { name: 'Recepción física', hidden: true })).not.toBeInTheDocument()
    if (completed === 4) expect(within(summary).getByRole('button', { name: 'Aprobar Inscripción' })).toBeEnabled()
    else expect(within(summary).queryByRole('button', { name: 'Aprobar Inscripción' })).not.toBeInTheDocument()
  })

  it('Inscripción de Examen registra recepción sin fijar cantidad normativa y refresca cuatro de cuatro', async () => {
    let created = false
    let received = false
    const delivery = { id: 501, codigo: 'FOLDER_AMARILLO', nombre: 'Fólder amarillo rotulado con el nombre del postulante y la modalidad elegida', estado: 'PENDIENTE', cantidad: null, cantidad_recibida: 0 }
    postulacionesService.obtenerExpediente.mockImplementation(async () => examInscriptionResponse(received ? 4 : 3))
    postulacionesService.obtenerEntregas.mockImplementation(async () => ({ results: created ? [{ ...delivery, estado: received ? 'COMPLETA' : 'PENDIENTE', cantidad_recibida: received ? 1 : 0 }] : [] }))
    postulacionesService.crearEntregaFisica.mockImplementation(async () => { created = true; return delivery })
    postulacionesService.registrarEntrega.mockImplementation(async () => { received = true; return {} })
    renderApplicationManagerPage('resumen')
    await userEvent.click(await screen.findByRole('button', { name: 'Registrar recepción' }))
    expect(postulacionesService.crearEntregaFisica).toHaveBeenCalledWith(7, 'FOLDER_AMARILLO', delivery.nombre, null, expect.any(AbortSignal))
    const form = await screen.findByRole('form', { name: `Registrar entrega: ${delivery.nombre}` })
    await userEvent.click(within(form).getByRole('button', { name: 'Guardar' }))
    expect(postulacionesService.registrarEntrega).toHaveBeenCalledWith(501, 1, '', expect.any(AbortSignal))
    expect(await screen.findByText('4 de 4 cumplidos')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Aprobar Inscripción' })).toBeEnabled()
  })

  it('muestra 0/4 requisitos y oculta Aprobar Inscripción cuando la policy no habilita aprobar', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(inscriptionStageResponse(false))
    renderApplicationManagerPage('resumen')

    const requirementsHeading = await screen.findByRole('heading', { name: 'Requisitos de Inscripción', level: 3 })
    const requirements = requirementsHeading.closest('[aria-labelledby="inscription-requirements-title"]')
    const summary = document.getElementById('panel-resumen')
    const documents = document.getElementById('panel-documentos')
    const orientationCard = summary.querySelector('#resumen > div')
    const orientation = within(summary).getByRole('heading', { name: 'Qué debes hacer ahora' })
    const physicalHeading = within(summary).getByRole('heading', { name: 'Recepción física', level: 3 })
    expect(orientation.compareDocumentPosition(requirementsHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(requirementsHeading.compareDocumentPosition(physicalHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(orientationCard).toContainElement(requirementsHeading)
    expect(orientationCard).toContainElement(physicalHeading)
    expect(orientationCard).toHaveClass('expediente-summary')
    expect(requirements).not.toHaveClass('rounded-xl', 'shadow-[var(--card-shadow)]')
    const requirementRows = within(requirements).getAllByRole('listitem')
    expect(requirements.querySelector('ul')).toHaveClass('mt-3', 'space-y-2')
    requirementRows.forEach((row) => expect(row).toHaveClass('expediente-req'))
    expect(within(requirements).getByText('0 de 4 cumplidos')).toBeInTheDocument()
    expect(within(requirements).getByRole('heading', { name: 'Documentación de Inscripción', level: 4 })).toBeInTheDocument()
    expect(within(requirements).getByText(/Carta de solicitud/)).toBeInTheDocument()
    expect(within(requirements).getByText(/Matrícula vigente/)).toBeInTheDocument()
    expect(within(requirements).getByText(/Historial académico de prerrequisitos/)).toBeInTheDocument()
    expect(within(requirements).queryByRole('button', { name: 'Cargar documentos de Inscripción' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Aprobar Inscripción' })).not.toBeInTheDocument()
    expect(within(documents).queryByRole('heading', { name: 'Requisitos de Inscripción' })).not.toBeInTheDocument()
    expect(within(documents).queryByRole('heading', { name: 'Recepción física' })).not.toBeInTheDocument()
    expect(within(documents).getByRole('heading', { name: 'Documentos', hidden: true })).toBeInTheDocument()
    expect(await within(summary).findByText(/Fólder amarillo rotulado con nombre y modalidad/)).toBeInTheDocument()
    expect(await within(summary).findByRole('button', { name: 'Registrar recepción' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Registrar recepción' }))
    await waitFor(() => expect(postulacionesService.crearEntregaFisica).toHaveBeenCalledWith(
      7,
      'FOLDER_AMARILLO',
      'Fólder amarillo rotulado con nombre y modalidad',
      1,
      expect.any(AbortSignal),
    ))
  })

  it('ofrece Aprobar Inscripción cuando backend expone la acción con los 4/4 cumplidos', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(inscriptionStageResponse(true))
    renderApplicationManagerPage('resumen')

    const requirementsHeading = await screen.findByRole('heading', { name: 'Requisitos de Inscripción', level: 3 })
    const requirements = requirementsHeading.closest('[aria-labelledby="inscription-requirements-title"]')
    expect(within(requirements).getByText('4 de 4 cumplidos')).toBeInTheDocument()
    expect(document.getElementById('panel-documentos').textContent).not.toContain('Requisitos de Inscripción')
    expect(document.getElementById('panel-documentos').textContent).not.toContain('Recepción física')
    // En Resumen el botón para aprobar está en "Siguiente acción"; la cabecera no lo repite.
    expect(screen.getByRole('button', { name: 'Aprobar Inscripción' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Aprobar etapa' })).not.toBeInTheDocument()
    // En otra pestaña el botón vuelve a la cabecera.
    await userEvent.click(screen.getByRole('tab', { name: 'Documentos' }))
    const headerButton = screen.getByRole('button', { name: 'Aprobar etapa' })
    expect(headerButton.parentElement).toHaveClass('expediente-hero-stage')
    expect(headerButton).toHaveClass('shrink-0')
  })

  it.each([
    ['la acción no está disponible', true, false],
    ['el usuario no tiene permisos', false, true],
  ])('oculta Aprobar etapa en el encabezado cuando %s', async (_case, hasPermission, actionAvailable) => {
    postulacionesService.obtenerExpediente.mockResolvedValue(inscriptionStageResponse(actionAvailable))
    if (hasPermission) renderApplicationManagerPage('documentos')
    else renderOwnerPage('documentos')

    await screen.findByText(/Ana P/)
    expect(screen.queryByRole('button', { name: 'Aprobar etapa' })).not.toBeInTheDocument()
  })

  it('aprueba desde el encabezado con una sola solicitud y actualiza el expediente', async () => {
    const approval = deferred()
    const approvedResponse = inscriptionStageResponse(true)
    approvedResponse.flujo.etapa_actual = { ...approvedResponse.flujo.etapa_actual, estado: 'APROBADA', acciones_permitidas: [] }
    approvedResponse.flujo.etapas = [approvedResponse.flujo.etapa_actual]
    approvedResponse.flujo.orientacion_etapa_actual = { mensaje: 'Etapa aprobada.', requisitos: [], siguiente_accion: null }
    postulacionesService.obtenerExpediente
      .mockResolvedValueOnce(inscriptionStageResponse(true))
      .mockResolvedValueOnce(approvedResponse)
    postulacionesService.aprobarEtapa.mockReturnValue(approval.promise)
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderApplicationManagerPage('etapas')

    const button = await screen.findByRole('button', { name: 'Aprobar etapa' })
    expect(screen.getByRole('tab', { name: 'Etapas' })).toHaveAttribute('aria-selected', 'true')
    fireEvent.click(button)
    fireEvent.click(button)

    expect(confirm).toHaveBeenCalledTimes(1)
    expect(postulacionesService.aprobarEtapa).toHaveBeenCalledTimes(1)
    expect(postulacionesService.aprobarEtapa).toHaveBeenCalledWith(31, expect.any(AbortSignal))
    expect(screen.getByRole('button', { name: 'Procesando…' })).toBeDisabled()

    await act(async () => approval.resolve({ id: 31, codigo: 'INSCRIPCION', estado: 'APROBADA' }))
    await waitFor(() => expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.getByRole('tab', { name: 'Resumen' })).toHaveAttribute('aria-selected', 'true'))
    expect(window.location.hash).toBe('#resumen')
    expect(screen.getAllByText('Inscripción').length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: 'Aprobar etapa' })).not.toBeInTheDocument()
    confirm.mockRestore()
  })

  it.each([
    ['la confirmación se cancela', false, null],
    ['la aprobación falla', true, { message: 'No se pudo aprobar la etapa.' }],
  ])('mantiene la pestaña actual cuando %s', async (_case, confirmed, approvalError) => {
    postulacionesService.obtenerExpediente.mockResolvedValue(inscriptionStageResponse(true))
    if (approvalError) postulacionesService.aprobarEtapa.mockRejectedValue(approvalError)
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(confirmed)
    renderApplicationManagerPage('documentos')

    await userEvent.click(await screen.findByRole('button', { name: 'Aprobar etapa' }))
    if (confirmed) await waitFor(() => expect(postulacionesService.aprobarEtapa).toHaveBeenCalledTimes(1))

    expect(screen.getByRole('tab', { name: 'Documentos' })).toHaveAttribute('aria-selected', 'true')
    expect(window.location.hash).toBe('#documentos')
    expect(postulacionesService.aprobarEtapa).toHaveBeenCalledTimes(confirmed ? 1 : 0)
    confirm.mockRestore()
  })

  it('muestra el faltante humano al fallar la aprobación de la etapa actual', async () => {
    const reviewStage = { id: 120, codigo: 'REVISION_FINAL_POST_PUBLICA', nombre: 'Revisión Final Post Pública', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      flujo: {
        ...response.flujo,
        etapa_actual: reviewStage,
        etapas: [reviewStage],
        orientacion_etapa_actual: {
          mensaje: 'Completa los requisitos de la etapa actual.',
          requisitos: [{ tipo: 'DOCUMENTO', codigo: 'HOJA_APROBACION', nombre: 'Hoja de Aprobación', cumplido: false, estado_display: 'Pendiente', destino: '#documentos' }],
          siguiente_accion: { codigo: 'APROBAR_ETAPA', titulo: 'Aprobar Revisión Final Post Pública', estado: 'DISPONIBLE', destino: '#resumen' },
        },
      },
    })
    postulacionesService.aprobarEtapa.mockRejectedValue({
      status: 400,
      message: 'No se puede aprobar la etapa. Falta completar: Hoja de Aprobación.',
      faltantes: ['DOCUMENTO:HOJA_APROBACION'],
      fields: { faltantes: ['DOCUMENTO:HOJA_APROBACION'] },
    })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderApplicationManagerPage()
    const scrollIntoView = vi.fn()
    definePropertyForTest(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoView })

    expect(await screen.findByText(/Hay 1 requisito pendiente/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Aprobar Revisión Final Post Pública' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No se puede aprobar la Revisión Final Post Pública. Falta completar: Hoja de Aprobación.')
    expect(screen.queryByText('DOCUMENTO:HOJA_APROBACION')).not.toBeInTheDocument()
    const orientation = screen.getByRole('heading', { name: 'Qué debes hacer ahora' }).parentElement
    expect(within(orientation).getByText('Falta completar: Hoja de Aprobación.', { exact: true })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Ir a documentos' })).toHaveLength(1)
    expect(screen.queryByRole('link', { name: 'Ir a documentos' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Ir a documentos' }))
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
    confirm.mockRestore()
  })

  it('mantiene orientación y aprobación de Preparación de Examen sin el aviso redundante', async () => {
    const stage = { id: 130, codigo: 'PREPARACION_EXAMEN', nombre: 'Preparación y habilitación', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: { ...response.detalle, modalidad_detalle: { id: 5, codigo: 'EXAMEN_GRADO', nombre: 'Examen de Grado' } },
      flujo: {
        ...response.flujo,
        modalidad: { id: 5, codigo: 'EXAMEN_GRADO', nombre: 'Examen de Grado' },
        etapa_actual: stage,
        etapas: [stage],
        orientacion_etapa_actual: {
          mensaje: 'Revisa los requisitos pendientes de preparación.',
          requisitos: Array.from({ length: 6 }, (_, index) => ({
            tipo: 'INFORMATIVO',
            codigo: `PREPARACION_${index + 1}`,
            nombre: `Requisito de preparación ${index + 1}`,
            cumplido: false,
          })),
          siguiente_accion: null,
        },
      },
    })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderApplicationManagerPage('resumen')

    expect(await screen.findByRole('heading', { name: 'Qué debes hacer ahora' })).toBeVisible()
    expect(screen.getByText('Revisa los requisitos pendientes de preparación.')).toBeVisible()
    expect(screen.queryByText(/Puedes intentar la aprobación/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Hay 6 requisitos pendientes/)).not.toBeInTheDocument()
    const approvalButton = screen.getByRole('button', { name: 'Aprobar Preparación y habilitación' })
    expect(approvalButton).toBeEnabled()

    await userEvent.click(approvalButton)

    expect(postulacionesService.aprobarEtapa).toHaveBeenCalledWith(130, expect.any(AbortSignal))
    confirm.mockRestore()
  })

  it('integra el historial legible, neutral, accesible y paginado', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerHistorial
      .mockResolvedValueOnce(historyResponse)
      .mockResolvedValueOnce({ count: 21, next: null, previous: 'page=1', results: [{ ...historyResponse.results[1], id: 21 }] })
    renderPage('historial')
    expect(await screen.findByRole('heading', { name: 'Historial' })).toBeInTheDocument()
    expect(screen.getByText((_, element) => element?.tagName === 'P' && element.textContent === 'Estado inicial → Registrada')).toBeInTheDocument()
    expect(screen.getByText((_, element) => element?.tagName === 'P' && element.textContent === 'Registrada → En proceso')).toBeInTheDocument()
    expect(screen.getByText('Sistema')).toBeInTheDocument()
    expect(screen.getByText('Sin comentario')).toBeInTheDocument()
    expect(screen.getByText('María Rojas')).toBeInTheDocument()
    expect(screen.getByText('Inicio de revisión')).toBeInTheDocument()
    expect(screen.queryByText(/kardex oficial/i)).not.toBeInTheDocument()
    expect(postulacionesService.obtenerHistorial).toHaveBeenCalledWith('7', 1, expect.any(AbortSignal))
    expect(postulacionesService.obtenerHistorial).toHaveBeenCalledTimes(1)
    await userEvent.click(within(document.querySelector('#historial')).getByRole('button', { name: 'Siguiente' }))
    await waitFor(() => expect(postulacionesService.obtenerHistorial).toHaveBeenLastCalledWith('7', 2, expect.any(AbortSignal)))
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['Debes iniciar sesión para consultar el historial.', 401],
    ['El historial solicitado no está disponible.', 404],
    ['No se pudo cargar el historial. Intenta nuevamente.', undefined],
  ])('mantiene el expediente ante error parcial de historial %s y permite reintentar', async (message, status) => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerHistorial.mockRejectedValueOnce({ status, message }).mockResolvedValueOnce(historyResponse)
    renderPage('historial')
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(screen.getByText(/Ana P/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar historial' }))
    expect(await screen.findByText((_, element) => element?.tagName === 'P' && element.textContent === 'Estado inicial → Registrada')).toBeInTheDocument()
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(1)
  })

  it('cancela historial al desmontar y usa el nuevo id al cambiar de expediente', async () => {
    const signals = []
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerHistorial.mockImplementation((_id, _page, signal) => {
      signals.push(signal)
      return new Promise(() => {})
    })
    const view = render(
      <MemoryRouter initialEntries={['/postulaciones/7']}>
        <Routes><Route path="/postulaciones/:id" element={<><ExpedientePage /><Link to="/postulaciones/8">Cambiar expediente</Link></>} /></Routes>
      </MemoryRouter>,
    )
    await waitFor(() => expect(signals).toHaveLength(1))
    await userEvent.click(screen.getByRole('link', { name: 'Cambiar expediente' }))
    await waitFor(() => expect(postulacionesService.obtenerHistorial).toHaveBeenCalledWith('8', 1, expect.any(AbortSignal)))
    expect(signals[0].aborted).toBe(true)
    view.unmount()
    expect(signals.at(-1).aborted).toBe(true)
  })

  it('mantiene disponible la corrección post-aprobación cuando la policy la autoriza', async () => {
    postulacionesService.obtenerDocumentosAplicables.mockResolvedValue({ documentos_aplicables: [
      { id: 47, codigo: 'DOCUMENTO_FINAL', nombre: 'Documento Final', capacidad_carga: { permitida: true, codigo: 'CORRECCION_POST_APROBACION' } },
    ] })
    renderOwnerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Cargar documento' }))

    expect(await screen.findByLabelText('Documento Final')).toBeInTheDocument()
    expect(screen.queryByText('No hay documentos pendientes de carga o corrección permitida.')).not.toBeInTheDocument()
  })

  it('registra SUFICIENTE y refresca informes y flujo para mostrar la aprobación', async () => {
    const user = userEvent.setup()
    const pendingStage = { ...tribunalStage, acciones_permitidas: [] }
    const pendingResponse = {
      ...tribunalResponse,
      flujo: {
        ...tribunalResponse.flujo,
        etapa_actual: pendingStage,
        orientacion_etapa_actual: {
          operacion: 'ORIENTAR_ETAPA',
          mensaje: 'El informe del tribunal está pendiente.',
          requisitos: [],
          siguiente_accion: null,
        },
      },
    }
    const approvableStage = { ...tribunalStage, acciones_permitidas: ['aprobar', 'observar', 'rechazar'] }
    const approvableResponse = {
      ...tribunalResponse,
      flujo: {
        ...tribunalResponse.flujo,
        etapa_actual: approvableStage,
        etapas: tribunalResponse.flujo.etapas.map((stage) => stage.id === approvableStage.id ? approvableStage : stage),
        orientacion_etapa_actual: {
          operacion: 'ORIENTAR_ETAPA',
          mensaje: 'Los requisitos de esta etapa están cumplidos. Está lista para aprobación administrativa.',
          requisitos: [],
          siguiente_accion: {
            codigo: 'APROBAR_ETAPA',
            titulo: 'Aprobar Revisión de Tribunal Previa',
            descripcion: 'La etapa está lista para aprobarse.',
            estado: 'DISPONIBLE',
            accion_label: 'Aprobar Revisión de Tribunal Previa',
          },
        },
      },
    }
    postulacionesService.obtenerExpediente.mockResolvedValueOnce(pendingResponse).mockResolvedValue(approvableResponse)
    postulacionesService.obtenerDocumentos.mockResolvedValue(tribunalDocuments)
    const auth = {
      user: { id: 9 },
      hasPermission: (name) => ['puede_gestionar_postulaciones', 'puede_gestionar_seguimiento'].includes(name),
    }
    selectInitialTab('informes-etapa')
    render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)
    await screen.findByText('El informe del tribunal está pendiente.')
    expect(screen.queryByRole('button', { name: 'Aprobar Revisión de Tribunal Previa' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Resumen' }))
    await user.click(await screen.findByRole('button', { name: 'Registrar informe del tribunal' }))
    const dialog = screen.getByRole('dialog', { name: 'Registrar informe del tribunal' })
    expect(within(dialog).getByText('Documento Final — Versión 1')).toBeInTheDocument()
    await user.selectOptions(within(dialog).getByLabelText('Resultado'), 'SUFICIENTE')
    await user.selectOptions(within(dialog).getByLabelText('Evidencia'), '602')
    fireEvent.change(within(dialog).getByLabelText(/Observaciones/), { target: { value: 'Consenso suficiente' } })
    await user.click(within(dialog).getByRole('button', { name: 'Registrar informe' }))

    await waitFor(() => expect(postulacionesService.registrarInformeRevisionTribunal).toHaveBeenCalledWith(4, {
      version_documento_revisada: 601, resultado: 'SUFICIENTE', observaciones: 'Consenso suficiente', evidencia_version: 602,
    }, expect.any(AbortSignal)))
    await waitFor(() => expect(postulacionesService.obtenerInformesRevisionTribunal).toHaveBeenCalledTimes(2))
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2)
    await user.click(screen.getByRole('tab', { name: 'Resumen' }))
    expect(await screen.findByRole('button', { name: 'Aprobar Revisión de Tribunal Previa' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Registrar informe del tribunal' })).not.toBeInTheDocument()
    expect(postulacionesService.obtenerDocumentos).toHaveBeenCalledTimes(1)
  })

  it('actualiza evidencia vencida sin duplicar informe y habilita aprobar tras refrescar acciones', async () => {
    const staleOrientation = {
      operacion: 'ORIENTAR_ETAPA',
      mensaje: 'El informe del tribunal utiliza una versión anterior de la evidencia. Actualiza el informe con la versión vigente.',
      requisitos: [{ tipo: 'DOCUMENTO', codigo: 'EVIDENCIA_INFORME_TRIBUNAL_VIGENTE', cumplido: false, estado: 'REQUIERE_ACTUALIZACION' }],
      siguiente_accion: { codigo: 'ACTUALIZAR_INFORME_TRIBUNAL', titulo: 'Actualizar informe del tribunal', estado: 'PENDIENTE', destino: '#informes-etapa' },
    }
    const staleResponse = {
      ...tribunalResponse,
      flujo: { ...tribunalResponse.flujo, orientacion_etapa_actual: staleOrientation },
    }
    const approvableStage = { ...tribunalStage, acciones_permitidas: ['aprobar', 'observar', 'rechazar'] }
    const validResponse = {
      ...tribunalResponse,
      flujo: {
        ...tribunalResponse.flujo,
        etapa_actual: approvableStage,
        etapas: tribunalResponse.flujo.etapas.map((stage) => stage.codigo === 'REVISION_TRIBUNAL_PREVIA' ? approvableStage : stage),
        orientacion_etapa_actual: { siguiente_accion: { codigo: 'APROBAR_ETAPA', estado: 'DISPONIBLE' }, requisitos: [] },
      },
    }
    const staleReport = {
      id: 771,
      seguimiento_etapa: 4,
      version_documento_revisada: 601,
      numero_version_revisada: 1,
      resultado: 'SUFICIENTE',
      resultado_display: 'Suficiente',
      evidencia_version: 602,
      evidencia_nombre_original: 'informe-tribunal.pdf',
      observaciones: 'Consenso suficiente',
      activo: true,
    }
    const updatedReport = { ...staleReport, evidencia_version: 603 }
    postulacionesService.obtenerExpediente.mockResolvedValueOnce(staleResponse).mockResolvedValue(validResponse)
    postulacionesService.obtenerDocumentos.mockResolvedValue({
      count: 2, next: null, previous: null, results: [
        { id: 41, tipo_documento_codigo: 'DOCUMENTO_FINAL', tipo_documento_nombre: 'Documento Final', activo: true, versiones: [{ id: 601, numero_version: 1, nombre_original: 'documento-final.pdf', es_version_actual: true, activo: true }] },
        { id: 42, tipo_documento_codigo: 'INFORME_REVISION_TRIBUNAL_PREVIA', tipo_documento_nombre: 'Informe de Evaluación del Tribunal', activo: true, versiones: [
          { id: 602, numero_version: 1, nombre_original: 'informe-tribunal.pdf', es_version_actual: false, activo: true },
          { id: 603, numero_version: 2, nombre_original: 'informe-tribunal-v2.pdf', es_version_actual: true, activo: true },
        ] },
      ],
    })
    let reportReads = 0
    const reportReadsObserved = []
    postulacionesService.obtenerInformesRevisionTribunal.mockImplementation(async (...args) => {
      reportReads += 1
      const payload = [reportReads === 1 ? staleReport : updatedReport]
      reportReadsObserved.push({ args, payload })
      return payload
    })
    postulacionesService.obtenerTribunalesActivos.mockResolvedValue([
      { id: 11, usuario: 45, tipo_participacion: 'TRIBUNAL', orden_cargo: 1, activo: true },
      { id: 12, usuario: 42, tipo_participacion: 'TRIBUNAL', orden_cargo: 2, activo: true },
      { id: 13, usuario: 43, tipo_participacion: 'TRIBUNAL', orden_cargo: 3, activo: true },
    ])
    const auth = { user: { id: 9 }, hasPermission: (name) => ['puede_gestionar_seguimiento', 'puede_gestionar_postulaciones'].includes(name) }
    selectInitialTab('informes-etapa')
    render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)

    expect((await screen.findAllByText(staleOrientation.mensaje))).toHaveLength(2)
    await waitFor(() => expect(reportReadsObserved.length).toBeGreaterThan(0))
    expect(reportReadsObserved[0].args[0]).toBe(4)
    expect(reportReadsObserved[0].args[1]).toBeInstanceOf(AbortSignal)
    expect(reportReadsObserved[0].payload).toEqual([staleReport])
    expect(screen.queryByRole('button', { name: 'Registrar informe del tribunal' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Resumen' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Actualizar informe del tribunal' }))
    let dialog = screen.getByRole('dialog', { name: 'Actualizar informe del tribunal' })
    expect(within(dialog).getByText(/Resultado conservado:/)).toHaveTextContent('Suficiente')
    expect(within(dialog).queryByLabelText('Resultado')).not.toBeInTheDocument()
    const evidence = within(dialog).getByRole('combobox', { name: 'Evidencia vigente' })
    expect(within(evidence).getAllByRole('option')).toHaveLength(2)
    expect(within(evidence).getByRole('option', { name: /Versión 2/ })).toHaveValue('603')
    await userEvent.selectOptions(evidence, '603')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Actualizar informe' }))

    await waitFor(() => expect(postulacionesService.actualizarEvidenciaInformeRevisionTribunal).toHaveBeenCalledWith(
      4,
      771,
      { evidencia_version: 603 },
      expect.any(AbortSignal),
    ))
    expect(postulacionesService.registrarInformeRevisionTribunal).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('tab', { name: 'Resumen' }))
    expect(await screen.findByRole('button', { name: 'Aprobar Revisión de Tribunal Previa' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Registrar informe del tribunal' })).not.toBeInTheDocument()
    expect(screen.getByText('Suficiente')).toBeInTheDocument()
  })

  it('ejecuta una sola aprobación desde Orientación y refresca al nuevo seguimiento', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const approvableStage = { ...tribunalStage, acciones_permitidas: ['aprobar', 'observar', 'rechazar'] }
    const approvableResponse = {
      ...tribunalResponse,
      flujo: {
        ...tribunalResponse.flujo,
        etapa_actual: approvableStage,
        etapas: tribunalResponse.flujo.etapas.map((stage) => stage.id === approvableStage.id ? approvableStage : stage),
        orientacion_etapa_actual: {
          operacion: 'ORIENTAR_ETAPA',
          mensaje: 'Los requisitos de esta etapa están cumplidos. Está lista para aprobación administrativa.',
          requisitos: [],
          siguiente_accion: {
            codigo: 'APROBAR_ETAPA',
            titulo: 'Aprobar Revisión de Tribunal Previa',
            descripcion: 'La aprobación cerrará esta etapa mediante el workflow y ejecutará la transición configurada.',
            estado: 'DISPONIBLE',
            estado_display: 'Disponible',
            destino: '#resumen',
            accion_label: 'Aprobar Revisión de Tribunal Previa',
          },
        },
      },
    }
    const privateStage = { id: 5, codigo: 'DEFENSA_PRIVADA', nombre: 'Defensa Privada', estado: 'EN_PROCESO', acciones_permitidas: ['observar', 'rechazar'] }
    const afterApprovalResponse = {
      ...approvableResponse,
      flujo: {
        ...approvableResponse.flujo,
        etapa_actual: privateStage,
        etapas: [...approvableResponse.flujo.etapas.map((stage) => stage.id === approvableStage.id ? { ...stage, estado: 'APROBADA', acciones_permitidas: [] } : stage), privateStage],
        orientacion_etapa_actual: {
          operacion: 'PROGRAMAR_EVENTO',
          mensaje: 'Los actores están listos para programar la defensa privada.',
          requisitos: [],
          siguiente_accion: { codigo: 'PROGRAMAR_EVENTO', titulo: 'Programar Defensa Privada', descripcion: 'Programa el evento según el workflow.', estado: 'DISPONIBLE', destino: '#defensas' },
        },
      },
    }
    postulacionesService.obtenerExpediente.mockResolvedValueOnce(approvableResponse).mockResolvedValue(afterApprovalResponse)
    postulacionesService.obtenerDocumentos.mockResolvedValue(tribunalDocuments)
    postulacionesService.obtenerInformesRevisionTribunal.mockResolvedValue([{
      id: 771,
      seguimiento_etapa: approvableStage.id,
      numero_version_revisada: 1,
      resultado: 'SUFICIENTE',
      resultado_display: 'Suficiente',
      evidencia_version: 602,
      evidencia_nombre_original: 'informe-tribunal.pdf',
      activo: true,
    }])
    const auth = {
      user: { id: 9 },
      hasPermission: (name) => ['puede_gestionar_postulaciones', 'puede_gestionar_seguimiento'].includes(name),
    }
    render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)

    const approveButton = await screen.findByRole('button', { name: 'Aprobar Revisión de Tribunal Previa' })
    const orientationLabel = screen.getByText('Orientación del expediente')
    const orientationCard = orientationLabel.parentElement
    expect(screen.getByRole('tab', { name: 'Resumen' })).toHaveAttribute('aria-selected', 'true')
    expect(within(orientationCard).getByText('Los requisitos de esta etapa están cumplidos. Está lista para aprobación administrativa.')).toBeInTheDocument()
    expect(within(orientationCard).getByRole('button', { name: 'Aprobar Revisión de Tribunal Previa' })).toBe(approveButton)
    expect(screen.getAllByRole('button', { name: 'Aprobar Revisión de Tribunal Previa' })).toHaveLength(1)
    await userEvent.click(approveButton)
    await waitFor(() => expect(postulacionesService.aprobarEtapa).toHaveBeenCalledWith(approvableStage.id, expect.any(AbortSignal)))
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('Los actores están listos para programar la defensa privada.')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Resumen' })).toHaveAttribute('aria-selected', 'true')
    expect(window.location.hash).toBe('#resumen')
    expect(screen.queryByRole('button', { name: 'Aprobar Revisión de Tribunal Previa' })).not.toBeInTheDocument()
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2)
    confirm.mockRestore()
  })

  it('muestra orientación informativa pero no aprobación a un usuario sin permiso', async () => {
    const readOnlyStage = { ...tribunalStage, acciones_permitidas: [] }
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...tribunalResponse,
      flujo: {
        ...tribunalResponse.flujo,
        etapa_actual: readOnlyStage,
        etapas: tribunalResponse.flujo.etapas.map((stage) => stage.id === readOnlyStage.id ? readOnlyStage : stage),
        orientacion_etapa_actual: {
          operacion: 'ORIENTAR_ETAPA',
          mensaje: 'La etapa está en curso. Las acciones administrativas corresponden al personal responsable.',
          requisitos: [],
          siguiente_accion: null,
        },
      },
    })
    const auth = { user: { id: 55 }, hasPermission: () => false }
    render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)

    const orientation = (await screen.findByText('Orientación del expediente')).parentElement
    expect(await within(orientation).findByText(/acciones administrativas corresponden al personal responsable/i)).toBeInTheDocument()
    expect(within(orientation).queryByRole('button', { name: /aprobar/i })).not.toBeInTheDocument()
  })

  it('refresca acciones tras rechazo concurrente y retira una aprobación que dejó de estar permitida', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const approvableStage = { ...tribunalStage, acciones_permitidas: ['aprobar', 'observar', 'rechazar'] }
    const approvableResponse = {
      ...tribunalResponse,
      flujo: {
        ...tribunalResponse.flujo,
        etapa_actual: approvableStage,
        etapas: tribunalResponse.flujo.etapas.map((stage) => stage.id === approvableStage.id ? approvableStage : stage),
        orientacion_etapa_actual: {
          mensaje: 'Los requisitos de esta etapa están cumplidos.',
          requisitos: [],
          siguiente_accion: { codigo: 'APROBAR_ETAPA', titulo: 'Aprobar Revisión de Tribunal Previa', estado: 'DISPONIBLE', accion_label: 'Aprobar Revisión de Tribunal Previa' },
        },
      },
    }
    const blockedResponse = {
      ...approvableResponse,
      flujo: {
        ...approvableResponse.flujo,
        etapa_actual: { ...approvableStage, acciones_permitidas: ['observar', 'rechazar'] },
        etapas: approvableResponse.flujo.etapas.map((stage) => stage.id === approvableStage.id
          ? { ...stage, acciones_permitidas: ['observar', 'rechazar'] }
          : stage),
        orientacion_etapa_actual: {
          mensaje: 'El informe dejó de cumplir las condiciones de aprobación.',
          requisitos: [{ tipo: 'DOCUMENTO', codigo: 'EVIDENCIA_INFORME_TRIBUNAL_VIGENTE', nombre: 'Evidencia vigente', cumplido: false }],
          siguiente_accion: { codigo: 'ACTUALIZAR_INFORME_TRIBUNAL', titulo: 'Actualizar informe del tribunal', estado: 'PENDIENTE', destino: '#informes-etapa' },
        },
      },
    }
    postulacionesService.obtenerExpediente.mockResolvedValueOnce(approvableResponse).mockResolvedValue(blockedResponse)
    postulacionesService.obtenerDocumentos.mockResolvedValue(tribunalDocuments)
    postulacionesService.aprobarEtapa.mockRejectedValue({ status: 400, message: 'El informe ya no cumple las condiciones.' })
    const auth = { user: { id: 9 }, hasPermission: (name) => ['puede_gestionar_postulaciones', 'puede_gestionar_seguimiento'].includes(name) }
    render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)

    await userEvent.click(await screen.findByRole('button', { name: 'Aprobar Revisión de Tribunal Previa' }))
    await waitFor(() => expect(postulacionesService.aprobarEtapa).toHaveBeenCalledWith(approvableStage.id, expect.any(AbortSignal)))
    expect(await screen.findAllByText('El informe dejó de cumplir las condiciones de aprobación.')).toHaveLength(2)
    expect(screen.queryByRole('button', { name: 'Aprobar Revisión de Tribunal Previa' })).not.toBeInTheDocument()
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2)
    confirm.mockRestore()
  })
})
