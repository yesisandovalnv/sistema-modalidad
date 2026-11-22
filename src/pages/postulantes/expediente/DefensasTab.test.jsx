import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import ExpedientePage from '../ExpedientePage'
import { postulacionesService } from '../../../services/postulacionesService'
import { AuthContext } from '../../../context/AuthContext'
import { prepararExpediente, closureResponse, defenseRows, defensesResponse, futureProfileOrientation, genericProgrammingResponse, operativeFlowResponse, projectStageResponse, renderDefenseDocumentsAdminPage, renderDefenseEvaluationManagerPage, renderDefenseManagerPage, renderOwnerPage, renderPage, response, selectInitialTab, thesisPostPublicResponse, thesisPublicAuthoritiesResponse } from './pruebas/utilidades'

vi.mock('../../../services/postulacionesService', () => import('./pruebas/servicioSimulado'))

describe('ExpedientePage · Defensas', () => {
  prepararExpediente()

  it('mantiene visible el expediente y permite volver si el detalle de defensa PG llega incompleto', async () => {
    const incompleteDefense = { ...defenseRows[2], estado: 'PROGRAMADA', participantes: [] }
    delete incompleteDefense.evaluaciones
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, next: null, previous: null, results: [incompleteDefense] })
    selectInitialTab('defensas')
    renderDefenseManagerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Ver defensa' }))
    const dialog = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    expect(within(dialog).getByRole('alert')).toHaveTextContent('No se pudo cargar el detalle completo')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Volver al expediente' }))
    expect(screen.queryByRole('dialog', { name: 'Detalle de defensa' })).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Defensas' })).toBeVisible()
  })

  it.each([
    ['Defensa de Perfil', defenseRows[2]],
    ['Defensa Privada', defenseRows[1]],
    ['Defensa Pública', defenseRows[0]],
  ])('abre el detalle PG de %s dentro del expediente', async (_label, defense) => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, next: null, previous: null, results: [defense] })
    selectInitialTab('defensas')
    renderDefenseManagerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Ver defensa' }))

    const dialog = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    expect(within(dialog).getByRole('heading', { name: defense.tipo_display })).toBeInTheDocument()
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Defensas' })).toBeVisible()
  })

  it('contiene una excepción del detalle PG, conserva el expediente y permite regresar', async () => {
    const defenseWithRenderFailure = {
      ...defenseRows[2],
      estado: 'PROGRAMADA',
    }
    const privateMarker = 'PRIVATE_TEST_MESSAGE'
    Object.defineProperty(defenseWithRenderFailure, 'composicion_formal', {
      get() { throw new Error(privateMarker) },
    })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, next: null, previous: null, results: [defenseWithRenderFailure] })
    selectInitialTab('defensas')
    renderDefenseManagerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Ver defensa' }))

    const dialog = await screen.findByRole('dialog', { name: 'Detalle de defensa' })
    expect(within(dialog).getByRole('alert')).toHaveTextContent('No se pudo abrir el detalle de la defensa')
    expect(screen.getByRole('tab', { name: 'Defensas' })).toBeVisible()
    const diagnostic = consoleError.mock.calls.find(([message]) => message === 'Error al renderizar el detalle de defensa de Proyecto de Grado')
    expect(diagnostic).toBeDefined()
    expect(diagnostic[1].componentStack).toContain('DefenseDetail')
    expect(JSON.stringify(diagnostic[1])).not.toContain(privateMarker)

    await userEvent.click(within(dialog).getByRole('button', { name: 'Volver al expediente' }))
    expect(screen.queryByRole('dialog', { name: 'Detalle de defensa' })).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Defensas' })).toBeVisible()
  })

  it('guía a continuar la Defensa de Perfil cuando ya está programada', async () => {
    const profileDefense = { ...defenseRows[2], seguimiento_etapa: 11, estado: 'PROGRAMADA', estado_display: 'Programada' }
    const profileStage = { id: 11, codigo: 'PERFIL_PROYECTO', nombre: 'Perfil de Proyecto', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
    postulacionesService.obtenerDefensas.mockResolvedValue({ ...defensesResponse, results: [profileDefense] })
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      flujo: { ...response.flujo, etapa_actual: profileStage, etapas: [profileStage], orientacion_etapa_actual: futureProfileOrientation },
    })
    renderDefenseManagerPage('resumen')

    expect(await screen.findByText('Continuar Defensa de Perfil programada')).toBeInTheDocument()
    const openDefenseButton = screen.getByRole('button', { name: 'Ir a la defensa' })
    await userEvent.click(openDefenseButton)
    const detail = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    expect(within(detail).getByText('Programada')).toBeInTheDocument()
    expect(within(detail).getByText('Defensa de perfil')).toBeInTheDocument()
    // Proyecto de Grado registra el resultado directo: no consulta el quórum técnico.
    expect(postulacionesService.obtenerQuorumDefensa).not.toHaveBeenCalled()
    await userEvent.click(within(detail).getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByRole('dialog', { name: 'Detalle de defensa' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Aprobar Perfil de Proyecto' })).not.toBeInTheDocument()
  })

  it('abre directamente la única Defensa de Perfil del intento y etapa activos', async () => {
    const profileStage = { id: 110, codigo: 'PERFIL_PROYECTO', nombre: 'Perfil de Proyecto', estado: 'EN_PROCESO', numero_intento: 2, activo: true }
    const matchingDefense = {
      ...defenseRows[2], id: 181, postulacion: 7, postulacion_modalidad_codigo: 'PROYECTO_GRADO',
      seguimiento_etapa: profileStage.id, etapa_codigo: profileStage.codigo, numero_intento: 2,
      estado: 'PROGRAMADA', estado_display: 'Programada', activo: true,
    }
    const otherStageDefense = { ...matchingDefense, id: 182, seguimiento_etapa: 109 }
    const otherAttemptDefense = { ...matchingDefense, id: 183, numero_intento: 1 }
    postulacionesService.obtenerDefensas.mockResolvedValue({
      count: 3, next: null, previous: null, results: [otherStageDefense, otherAttemptDefense, matchingDefense],
    })
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      flujo: { ...response.flujo, etapa_actual: profileStage, etapas: [profileStage], orientacion_etapa_actual: {
        tipo_evento: 'DEFENSA_PERFIL', mensaje: 'Gestiona la Defensa de Perfil.', requisitos: [],
        siguiente_accion: { codigo: 'GESTIONAR_DEFENSA', titulo: 'Gestionar Defensa de Perfil', estado: 'DISPONIBLE', destino: '#defensas', accion_label: 'Ir a gestionar' },
      } },
    })
    renderDefenseManagerPage('resumen')

    await userEvent.click(await screen.findByRole('button', { name: 'Ir a la defensa' }))
    const detail = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    expect(within(detail).getByText('Programada')).toBeInTheDocument()
    expect(within(detail).getByText('Defensa de perfil')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ver defensa' })).not.toBeInTheDocument()
  })

  it.each([
    ['cancelada', (defense) => ({ ...defense, estado: 'CANCELADA', estado_display: 'Cancelada' }), true],
    ['inactiva', (defense) => ({ ...defense, activo: false }), true],
    ['etapa inactiva', (defense) => defense, false],
  ])('conserva la navegación genérica si la Defensa de Perfil está %s', async (_caseName, transform, stageActive) => {
    const profileStage = { id: 110, codigo: 'PERFIL_PROYECTO', nombre: 'Perfil de Proyecto', estado: 'EN_PROCESO', numero_intento: 2, activo: stageActive }
    const matchingDefense = {
      ...defenseRows[2], id: 184, postulacion: 7, postulacion_modalidad_codigo: 'PROYECTO_GRADO',
      seguimiento_etapa: profileStage.id, etapa_codigo: profileStage.codigo, numero_intento: 2,
      estado: 'PROGRAMADA', estado_display: 'Programada', activo: true,
    }
    const defense = transform(matchingDefense)
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, next: null, previous: null, results: [defense] })
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      flujo: { ...response.flujo, etapa_actual: profileStage, etapas: [profileStage], orientacion_etapa_actual: {
        tipo_evento: 'DEFENSA_PERFIL', mensaje: 'Gestiona la Defensa de Perfil.', requisitos: [],
        siguiente_accion: { codigo: 'GESTIONAR_DEFENSA', titulo: 'Gestionar Defensa de Perfil', estado: 'DISPONIBLE', destino: '#defensas', accion_label: 'Ir a gestionar' },
      } },
    })
    renderDefenseManagerPage('resumen')

    expect(await screen.findByRole('link', { name: 'Ir a gestionar' })).toHaveAttribute('href', '#defensas')
    expect(screen.queryByRole('dialog', { name: 'Detalle de defensa' })).not.toBeInTheDocument()
  })

  it('conserva la navegación genérica si hay más de una Defensa de Perfil válida', async () => {
    const profileStage = { id: 110, codigo: 'PERFIL_PROYECTO', nombre: 'Perfil de Proyecto', estado: 'EN_PROCESO', numero_intento: 2, activo: true }
    const matchingDefense = {
      ...defenseRows[2], id: 185, postulacion: 7, postulacion_modalidad_codigo: 'PROYECTO_GRADO',
      seguimiento_etapa: profileStage.id, etapa_codigo: profileStage.codigo, numero_intento: 2,
      estado: 'PROGRAMADA', estado_display: 'Programada', activo: true,
    }
    postulacionesService.obtenerDefensas.mockResolvedValue({
      count: 2, next: null, previous: null, results: [matchingDefense, { ...matchingDefense, id: 186 }],
    })
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      flujo: { ...response.flujo, etapa_actual: profileStage, etapas: [profileStage], orientacion_etapa_actual: {
        tipo_evento: 'DEFENSA_PERFIL', mensaje: 'Gestiona la Defensa de Perfil.', requisitos: [],
        siguiente_accion: { codigo: 'GESTIONAR_DEFENSA', titulo: 'Gestionar Defensa de Perfil', estado: 'DISPONIBLE', destino: '#defensas', accion_label: 'Ir a gestionar' },
      } },
    })
    renderDefenseManagerPage('resumen')

    expect(await screen.findByRole('link', { name: 'Ir a gestionar' })).toHaveAttribute('href', '#defensas')
    expect(screen.queryByRole('dialog', { name: 'Detalle de defensa' })).not.toBeInTheDocument()
  })

  it.each(['TESIS_GRADO', 'TRABAJO_DIRIGIDO'])('no activa el acceso directo de Defensa de Perfil para %s', async (modality) => {
    const profileStage = { id: 110, codigo: 'PERFIL_PROYECTO', nombre: 'Perfil de Proyecto', estado: 'EN_PROCESO', numero_intento: 2, activo: true }
    const matchingDefense = {
      ...defenseRows[2], id: 187, postulacion: 7, postulacion_modalidad_codigo: modality,
      seguimiento_etapa: profileStage.id, etapa_codigo: profileStage.codigo, numero_intento: 2,
      estado: 'PROGRAMADA', estado_display: 'Programada', activo: true,
    }
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, next: null, previous: null, results: [matchingDefense] })
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: { ...response.detalle, modalidad_detalle: { id: 2, codigo: modality, nombre: modality } },
      flujo: { ...response.flujo, modalidad: { id: 2, codigo: modality, nombre: modality }, etapa_actual: profileStage, etapas: [profileStage], orientacion_etapa_actual: {
        tipo_evento: 'DEFENSA_PERFIL', mensaje: 'Gestiona la Defensa de Perfil.', requisitos: [],
        siguiente_accion: { codigo: 'GESTIONAR_DEFENSA', titulo: 'Gestionar Defensa de Perfil', estado: 'DISPONIBLE', destino: '#defensas', accion_label: 'Ir a gestionar' },
      } },
    })
    renderDefenseManagerPage('resumen')

    expect(await screen.findByRole('link', { name: 'Ir a gestionar' })).toHaveAttribute('href', '#defensas')
    expect(screen.queryByRole('button', { name: 'Ir a la defensa' })).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Detalle de defensa' })).not.toBeInTheDocument()
  })

  it('abre directamente la Defensa Privada vinculada a la etapa e intento activos', async () => {
    const privateStage = { id: 120, codigo: 'DEFENSA_PRIVADA', nombre: 'Defensa Privada', estado: 'EN_PROCESO', numero_intento: 2, activo: true }
    const matchingDefense = { ...defenseRows[1], id: 182, seguimiento_etapa: privateStage.id, etapa_codigo: privateStage.codigo, numero_intento: 2 }
    const otherStageDefense = { ...matchingDefense, id: 183, seguimiento_etapa: 119 }
    const otherAttemptDefense = { ...matchingDefense, id: 184, numero_intento: 1 }
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 3, next: null, previous: null, results: [otherStageDefense, otherAttemptDefense, matchingDefense] })
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      flujo: { ...response.flujo, etapa_actual: privateStage, etapas: [privateStage], orientacion_etapa_actual: {
        tipo_evento: 'DEFENSA_PRIVADA', mensaje: 'La defensa está programada.', requisitos: [],
        siguiente_accion: { codigo: 'PROGRAMAR_EVENTO', titulo: 'Programar defensa', estado: 'DISPONIBLE', destino: '#defensas', accion_label: 'Ir a gestionar' },
      } },
    })
    renderDefenseManagerPage('resumen')

    // La defensa ya existe: la siguiente acción dice continuarla (no "Programar defensa").
    expect(await screen.findByText('Continuar Defensa Privada programada')).toBeInTheDocument()
    await userEvent.click(await screen.findByRole('button', { name: 'Ir a la defensa' }))
    const detail = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    expect(within(detail).getByText('Programada')).toBeInTheDocument()
    expect(within(detail).getByText('Defensa privada')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ver defensa' })).not.toBeInTheDocument()
  })

  it.each([
    ['cancelada', (defense) => ({ ...defense, estado: 'CANCELADA', estado_display: 'Cancelada' })],
    ['ambigua', (defense) => ({ ...defense, id: defense.id + 1 })],
  ])('mantiene la navegación a la lista si la Defensa Privada es %s', async (_caseName, transform) => {
    const privateStage = { id: 120, codigo: 'DEFENSA_PRIVADA', nombre: 'Defensa Privada', estado: 'EN_PROCESO', numero_intento: 2, activo: true }
    const matchingDefense = { ...defenseRows[1], id: 182, seguimiento_etapa: privateStage.id, etapa_codigo: privateStage.codigo, numero_intento: 2 }
    const candidates = _caseName === 'ambigua' ? [matchingDefense, transform(matchingDefense)] : [transform(matchingDefense)]
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: candidates.length, next: null, previous: null, results: candidates })
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      flujo: { ...response.flujo, etapa_actual: privateStage, etapas: [privateStage], orientacion_etapa_actual: {
        tipo_evento: 'DEFENSA_PRIVADA', mensaje: 'La defensa está programada.', requisitos: [],
        siguiente_accion: { codigo: _caseName === 'ambigua' ? 'PROGRAMAR_EVENTO' : 'GESTIONAR_DEFENSA', titulo: 'Gestionar Defensa Privada', estado: 'DISPONIBLE', destino: '#defensas', accion_label: 'Ir a gestionar' },
      } },
    })
    renderDefenseManagerPage('resumen')

    expect(await screen.findByRole('link', { name: 'Ir a gestionar' })).toHaveAttribute('href', '#defensas')
    expect(screen.queryByRole('dialog', { name: 'Detalle de defensa' })).not.toBeInTheDocument()
  })

  it.each(['TESIS_GRADO', 'TRABAJO_DIRIGIDO'])('no activa el acceso directo de Defensa Privada para %s', async (modality) => {
    const privateStage = { id: 120, codigo: 'DEFENSA_PRIVADA', nombre: 'Defensa Privada', estado: 'EN_PROCESO', numero_intento: 2, activo: true }
    const matchingDefense = { ...defenseRows[1], id: 182, seguimiento_etapa: privateStage.id, etapa_codigo: privateStage.codigo, numero_intento: 2 }
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, next: null, previous: null, results: [matchingDefense] })
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: { ...response.detalle, modalidad_detalle: { id: 2, codigo: modality, nombre: modality } },
      flujo: { ...response.flujo, modalidad: { id: 2, codigo: modality, nombre: modality }, etapa_actual: privateStage, etapas: [privateStage], orientacion_etapa_actual: {
        tipo_evento: 'DEFENSA_PRIVADA', mensaje: 'La defensa está programada.', requisitos: [],
        siguiente_accion: { codigo: 'GESTIONAR_DEFENSA', titulo: 'Gestionar Defensa Privada', estado: 'DISPONIBLE', destino: '#defensas', accion_label: 'Ir a gestionar' },
      } },
    })
    renderDefenseManagerPage('resumen')

    expect(await screen.findByRole('link', { name: 'Ir a gestionar' })).toHaveAttribute('href', '#defensas')
    expect(screen.queryByRole('button', { name: 'Ir a gestionar' })).not.toBeInTheDocument()
  })

  it('abre directamente la Defensa Pública vinculada a la etapa e intento activos', async () => {
    const publicStage = { id: 130, codigo: 'DEFENSA_PUBLICA', nombre: 'Defensa Pública', estado: 'EN_PROCESO', numero_intento: 2, activo: true }
    const matchingDefense = { ...defenseRows[0], id: 190, seguimiento_etapa: publicStage.id, etapa_codigo: publicStage.codigo, numero_intento: 2, estado: 'PROGRAMADA', estado_display: 'Programada' }
    const otherStageDefense = { ...matchingDefense, id: 191, seguimiento_etapa: 129 }
    const otherAttemptDefense = { ...matchingDefense, id: 192, numero_intento: 1 }
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 3, next: null, previous: null, results: [otherStageDefense, otherAttemptDefense, matchingDefense] })
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      flujo: { ...response.flujo, etapa_actual: publicStage, etapas: [publicStage], orientacion_etapa_actual: {
        tipo_evento: 'DEFENSA_PUBLICA', mensaje: 'La defensa está programada.', requisitos: [],
        siguiente_accion: { codigo: 'PROGRAMAR_EVENTO', titulo: 'Programar defensa', estado: 'DISPONIBLE', destino: '#defensas', accion_label: 'Ir a gestionar' },
      } },
    })
    renderDefenseManagerPage('resumen')

    // La defensa ya existe: la siguiente acción dice continuarla (no "Programar defensa").
    expect(await screen.findByText('Continuar Defensa Pública programada')).toBeInTheDocument()
    await userEvent.click(await screen.findByRole('button', { name: 'Ir a la defensa' }))
    const detail = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    expect(within(detail).getByRole('heading', { name: 'Defensa pública' })).toBeInTheDocument()
    expect(within(detail).getByText('Programada')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ver defensa' })).not.toBeInTheDocument()
  })

  it.each([
    ['cancelada', (defense) => ({ ...defense, estado: 'CANCELADA', estado_display: 'Cancelada' }), 'GESTIONAR_DEFENSA'],
    ['ambigua', (defense) => ({ ...defense, id: defense.id + 1 }), 'GESTIONAR_DEFENSA'],
  ])('mantiene la navegación a la lista si la Defensa Pública es %s', async (_caseName, transform, actionCode) => {
    const publicStage = { id: 130, codigo: 'DEFENSA_PUBLICA', nombre: 'Defensa Pública', estado: 'EN_PROCESO', numero_intento: 2, activo: true }
    const matchingDefense = { ...defenseRows[0], id: 190, seguimiento_etapa: publicStage.id, etapa_codigo: publicStage.codigo, numero_intento: 2, estado: 'PROGRAMADA', estado_display: 'Programada' }
    const candidates = _caseName === 'ambigua' ? [matchingDefense, transform(matchingDefense)] : [transform(matchingDefense)]
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: candidates.length, next: null, previous: null, results: candidates })
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      flujo: { ...response.flujo, etapa_actual: publicStage, etapas: [publicStage], orientacion_etapa_actual: {
        tipo_evento: 'DEFENSA_PUBLICA', mensaje: 'Gestiona la Defensa Pública.', requisitos: [],
        siguiente_accion: { codigo: actionCode, titulo: 'Gestionar Defensa Pública', estado: 'DISPONIBLE', destino: '#defensas', accion_label: 'Ir a gestionar' },
      } },
    })
    renderDefenseManagerPage('resumen')

    expect(await screen.findByRole('link', { name: 'Ir a gestionar' })).toHaveAttribute('href', '#defensas')
    expect(screen.queryByRole('dialog', { name: 'Detalle de defensa' })).not.toBeInTheDocument()
  })

  it.each(['TESIS_GRADO', 'TRABAJO_DIRIGIDO'])('no activa el acceso directo de Defensa Pública para %s', async (modality) => {
    const publicStage = { id: 130, codigo: 'DEFENSA_PUBLICA', nombre: 'Defensa Pública', estado: 'EN_PROCESO', numero_intento: 2, activo: true }
    const matchingDefense = { ...defenseRows[0], id: 190, seguimiento_etapa: publicStage.id, etapa_codigo: publicStage.codigo, numero_intento: 2, estado: 'PROGRAMADA' }
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, next: null, previous: null, results: [matchingDefense] })
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: { ...response.detalle, modalidad_detalle: { id: 2, codigo: modality, nombre: modality } },
      flujo: { ...response.flujo, modalidad: { id: 2, codigo: modality, nombre: modality }, etapa_actual: publicStage, etapas: [publicStage], orientacion_etapa_actual: {
        tipo_evento: 'DEFENSA_PUBLICA', mensaje: 'Gestiona la Defensa Pública.', requisitos: [],
        siguiente_accion: { codigo: 'GESTIONAR_DEFENSA', titulo: 'Gestionar Defensa Pública', estado: 'DISPONIBLE', destino: '#defensas', accion_label: 'Ir a gestionar' },
      } },
    })
    renderDefenseManagerPage('resumen')

    expect(await screen.findByRole('link', { name: 'Ir a gestionar' })).toHaveAttribute('href', '#defensas')
    expect(screen.queryByRole('button', { name: 'Ir a gestionar' })).not.toBeInTheDocument()
  })

  it('muestra espera administrativa al estudiante cuando la Defensa de Perfil está en curso', async () => {
    const profileStage = { id: 11, codigo: 'PERFIL_PROYECTO', nombre: 'Perfil de Proyecto', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
    const profileDefense = { ...defenseRows[2], seguimiento_etapa: 11, estado: 'EN_CURSO', estado_display: 'En curso' }
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, next: null, previous: null, results: [profileDefense] })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: { ...response.flujo, etapa_actual: profileStage, etapas: [profileStage], orientacion_etapa_actual: futureProfileOrientation } })
    renderOwnerPage('resumen')

    const summary = (await screen.findByRole('heading', { name: 'Gestión administrativa pendiente' })).parentElement
    expect(within(summary).getByText('La defensa está pendiente de finalización por el personal responsable.')).toBeInTheDocument()
    expect(within(summary).queryByText('Gestionar y finalizar Defensa de Perfil')).not.toBeInTheDocument()
  })

  it('muestra espera administrativa al estudiante para registrar la evaluación de Perfil', async () => {
    const profileStage = { id: 11, codigo: 'PERFIL_PROYECTO', nombre: 'Perfil de Proyecto', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
    const profileDefense = { ...defenseRows[2], seguimiento_etapa: 11, estado: 'FINALIZADA', estado_display: 'Finalizada', evaluaciones: [], resultado_consolidado: null }
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, next: null, previous: null, results: [profileDefense] })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: { ...response.flujo, etapa_actual: profileStage, etapas: [profileStage], orientacion_etapa_actual: futureProfileOrientation } })
    renderOwnerPage('resumen')

    const summary = (await screen.findByRole('heading', { name: 'Gestión administrativa pendiente' })).parentElement
    expect(within(summary).getByText('La evaluación está pendiente de registro por el personal responsable.')).toBeInTheDocument()
    expect(within(summary).queryByText('Registrar evaluación de Perfil')).not.toBeInTheDocument()
  })

  it('muestra espera administrativa al estudiante para consolidar el resultado de Perfil', async () => {
    const profileStage = { id: 11, codigo: 'PERFIL_PROYECTO', nombre: 'Perfil de Proyecto', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
    const profileDefense = { ...defenseRows[2], seguimiento_etapa: 11, estado: 'FINALIZADA', estado_display: 'Finalizada', evaluaciones: [{ id: 301, tipo_evaluacion: 'PERFIL', modalidad_registro: 'CONSENSO', es_resultado_final_evento: false, resultado_cualitativo: 'SUFICIENTE' }], resultado_consolidado: null }
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, next: null, previous: null, results: [profileDefense] })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: { ...response.flujo, etapa_actual: profileStage, etapas: [profileStage], orientacion_etapa_actual: futureProfileOrientation } })
    renderOwnerPage('resumen')

    const summary = (await screen.findByRole('heading', { name: 'Gestión administrativa pendiente' })).parentElement
    expect(within(summary).getByText('El resultado está pendiente de consolidación por el personal responsable.')).toBeInTheDocument()
    expect(within(summary).queryByText('Consolidar resultado de Perfil')).not.toBeInTheDocument()
  })

  it('conserva la orientación operativa para administración con capacidad de gestionar defensas', async () => {
    const profileStage = { id: 11, codigo: 'PERFIL_PROYECTO', nombre: 'Perfil de Proyecto', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
    const profileDefense = { ...defenseRows[2], seguimiento_etapa: 11, estado: 'EN_CURSO', estado_display: 'En curso' }
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, next: null, previous: null, results: [profileDefense] })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: { ...response.flujo, etapa_actual: profileStage, etapas: [profileStage], orientacion_etapa_actual: futureProfileOrientation } })
    renderDefenseManagerPage('resumen')

    const summary = (await screen.findByRole('heading', { name: 'Qué debes hacer ahora' })).parentElement
    expect(within(summary).getByText('Gestionar y finalizar Defensa de Perfil')).toBeInTheDocument()
    expect(within(summary).queryByText('La defensa está pendiente de finalización por el personal responsable.')).not.toBeInTheDocument()
  })

  it.each(['DEFENSA_PRIVADA', 'DEFENSA_PUBLICA'])('muestra defensas y resultado durante %s', async (codigo) => {
    postulacionesService.obtenerExpediente.mockResolvedValue(projectStageResponse(codigo))
    renderPage('defensas')

    expect(await screen.findByRole('heading', { name: 'Defensas' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Resultado y cierre' }))
    expect(screen.getByRole('heading', { name: 'Resultado académico técnico' }).closest('details')).toBeNull()
  })

  it('oculta Programar defensa mientras la orientación reporta precondiciones pendientes', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(projectStageResponse('PERFIL_PROYECTO'))
    renderDefenseManagerPage('resumen')

    await screen.findByRole('heading', { name: 'Qué debes hacer ahora' })
    expect(screen.queryByRole('button', { name: 'Programar defensa' })).not.toBeInTheDocument()
  })

  it('oculta Programar defensa cuando Proyecto no tiene orientación de programación', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...projectStageResponse('DOCUMENTO_FINAL'),
      flujo: { ...projectStageResponse('DOCUMENTO_FINAL').flujo, orientacion_etapa_actual: null },
    })
    renderDefenseManagerPage()

    expect(screen.queryByRole('button', { name: 'Programar defensa' })).not.toBeInTheDocument()
  })

  it('oculta Programar defensa para Documento Final pendiente sin PROGRAMAR_EVENTO', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(projectStageResponse('DOCUMENTO_FINAL'))
    renderDefenseManagerPage()

    expect(screen.queryByRole('button', { name: 'Programar defensa' })).not.toBeInTheDocument()
  })

  const programmingStageResponse = (codigo, tipoEvento, numeroIntento = 1, evento = null) => {
    const stage = { id: 12, codigo, nombre: codigo, estado: 'EN_PROCESO', numero_intento: numeroIntento, activo: true }
    const orientation = {
      tipo_evento: tipoEvento,
      requisitos: [],
      siguiente_accion: { codigo: 'PROGRAMAR_EVENTO', titulo: 'Programar defensa', estado: 'DISPONIBLE', destino: '#defensas' },
    }
    return {
      ...response,
      flujo: { ...response.flujo, etapa_actual: stage, etapas: [stage], orientacion_etapa_actual: orientation },
      defenses: evento ? { count: 1, next: null, previous: null, results: [evento] } : { count: 0, next: null, previous: null, results: [] },
    }
  }

  it('abre desde Siguiente acción el diálogo contextual existente de programación', async () => {
    const data = programmingStageResponse('DEFENSA_PRIVADA', 'DEFENSA_PRIVADA')
    postulacionesService.obtenerExpediente.mockResolvedValue(data)
    postulacionesService.obtenerDefensas.mockResolvedValue(data.defenses)
    renderDefenseManagerPage('resumen')

    await userEvent.click(await screen.findByRole('button', { name: 'Ir a gestionar' }))

    const dialog = await screen.findByRole('dialog', { name: 'Programar Defensa privada' })
    expect(within(dialog).getByText('DEFENSA_PRIVADA · Intento 1')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Resumen' })).toHaveAttribute('aria-selected', 'true')
    expect(window.location.hash).toBe('#resumen')
  })

  const directedProfileProgrammingResponse = (attempt = 1) => {
    const data = programmingStageResponse('PERFIL_TRABAJO_DIRIGIDO', 'DEFENSA_PERFIL', attempt)
    const stage = { ...data.flujo.etapa_actual, id: 163, nombre: 'Perfil de Trabajo Dirigido' }
    return { ...data, detalle: { ...data.detalle, id: 54, codigo: 'TD-2026-03', modalidad_detalle: { codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido' } },
      flujo: { ...data.flujo, modalidad: { codigo: 'TRABAJO_DIRIGIDO' }, etapa_actual: stage, etapas: [stage],
        orientacion_etapa_actual: { ...data.flujo.orientacion_etapa_actual,
          siguiente_accion: { ...data.flujo.orientacion_etapa_actual.siguiente_accion, titulo: 'Programar Defensa de Perfil', accion_label: 'Ir a programar defensa' } } } }
  }

  it.each(['resumen', 'defensas'])('Perfil TD: abre desde %s sin POST, evita duplicación y conserva Escape', async (origin) => {
    postulacionesService.obtenerExpediente.mockResolvedValue(directedProfileProgrammingResponse())
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 0, results: [] })
    renderDefenseManagerPage(origin)
    const trigger = await screen.findByRole('button', { name: origin === 'resumen' ? 'Ir a programar defensa' : 'Programar Defensa de Perfil' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await userEvent.dblClick(trigger)
    const dialog = screen.getByRole('dialog', { name: 'Programar Defensa de Perfil' })
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(within(dialog).getByText('Perfil de Trabajo Dirigido · Intento 1')).toBeVisible()
    expect(dialog.querySelector('[name="tipo_evento"]')).toHaveValue('DEFENSA_PERFIL')
    expect(dialog.querySelector('[name="seguimiento_etapa"]')).toHaveValue('163')
    expect(within(dialog).queryByLabelText('Tipo de defensa')).not.toBeInTheDocument()
    expect(window.location.hash).toBe(`#${origin}`)
    expect(postulacionesService.programarDefensa).not.toHaveBeenCalled()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    await userEvent.click(trigger)
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(postulacionesService.programarDefensa).not.toHaveBeenCalled()
  })

  it.each([1, 2])('Perfil TD: conserva el payload y el intento %s al confirmar explícitamente', async (attempt) => {
    postulacionesService.obtenerExpediente.mockResolvedValue(directedProfileProgrammingResponse(attempt))
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 0, results: [] })
    postulacionesService.programarDefensa.mockRejectedValueOnce({ message: 'Validación backend de prueba' })
    renderDefenseManagerPage('resumen')
    await userEvent.click(await screen.findByRole('button', { name: 'Ir a programar defensa' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(`Perfil de Trabajo Dirigido · Intento ${attempt}`)).toBeVisible()
    fireEvent.change(within(dialog).getByLabelText('Fecha y hora programada'), { target: { value: '2026-11-20T15:00' } })
    await userEvent.type(within(dialog).getByLabelText('Lugar'), 'Sala de prueba')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Programar Defensa de Perfil' }))
    await waitFor(() => expect(postulacionesService.programarDefensa).toHaveBeenCalledWith(54, {
      seguimiento_etapa: 163, tipo_evento: 'DEFENSA_PERFIL', fecha_programada: '2026-11-20T15:00',
      lugar: 'Sala de prueba', modalidad_evento: 'PRESENCIAL', enlace_virtual: '', observaciones: '',
    }, expect.any(AbortSignal)))
    expect(await within(dialog).findByText('Validación backend de prueba')).toBeVisible()
    expect(postulacionesService.programarDefensa).toHaveBeenCalledTimes(1)
  })

  it.each(['permiso', 'pendiente', 'existente', 'ambiguo', 'incompleto', 'inactivo'])('Perfil TD: mantiene fallback seguro con contexto %s', async (reason) => {
    const data = directedProfileProgrammingResponse()
    if (reason === 'pendiente') data.flujo.orientacion_etapa_actual.siguiente_accion.estado = 'PENDIENTE'
    if (reason === 'incompleto') delete data.flujo.orientacion_etapa_actual.tipo_evento
    if (reason === 'inactivo') data.flujo.etapa_actual.activo = false
    if (reason === 'ambiguo') data.flujo.etapas.push({ ...data.flujo.etapa_actual, id: 999 })
    postulacionesService.obtenerExpediente.mockResolvedValue(data)
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: reason === 'existente' ? 1 : 0, results: reason === 'existente' ? [{ id: 500, seguimiento_etapa: 163, tipo_evento: 'DEFENSA_PERFIL', numero_intento: 1, activo: true, estado: 'PROGRAMADA' }] : [] })
    if (reason === 'permiso') renderPage('resumen')
    else renderDefenseManagerPage('resumen')
    expect(await screen.findByRole('link', { name: 'Ir a programar defensa' })).toHaveAttribute('href', '#defensas')
    expect(screen.queryByRole('button', { name: 'Ir a programar defensa' })).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(postulacionesService.programarDefensa).not.toHaveBeenCalled()
  })

  it('no abre la programación desde Resumen sin el permiso de gestión de defensas', async () => {
    const data = programmingStageResponse('DEFENSA_PRIVADA', 'DEFENSA_PRIVADA')
    postulacionesService.obtenerExpediente.mockResolvedValue(data)
    postulacionesService.obtenerDefensas.mockResolvedValue(data.defenses)
    renderPage('resumen')

    expect(await screen.findByRole('link', { name: 'Ir a gestionar' })).toHaveAttribute('href', '#defensas')
    expect(screen.queryByRole('button', { name: 'Ir a gestionar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Programar Defensa privada' })).not.toBeInTheDocument()
  })

  it('abre el modal contextual desde PROGRAMAR_EVENTO de Tesis', async () => {
    const data = programmingStageResponse('DEFENSA_PRIVADA', 'DEFENSA_PRIVADA')
    data.detalle = { ...data.detalle, modalidad_detalle: { id: 2, codigo: 'TESIS_GRADO', nombre: 'Tesis de Grado' } }
    data.flujo = {
      ...data.flujo,
      modalidad: { id: 2, codigo: 'TESIS_GRADO', nombre: 'Tesis de Grado' },
      orientacion_etapa_actual: {
        ...data.flujo.orientacion_etapa_actual,
        siguiente_accion: { ...data.flujo.orientacion_etapa_actual.siguiente_accion, accion_label: 'Ir a programar defensa' },
      },
    }
    postulacionesService.obtenerExpediente.mockResolvedValue(data)
    postulacionesService.obtenerDefensas.mockResolvedValue(data.defenses)
    renderDefenseManagerPage('resumen')

    await userEvent.click(await screen.findByRole('button', { name: 'Ir a programar defensa' }))
    const dialog = screen.getByRole('dialog', { name: 'Programar Defensa privada' })
    expect(within(dialog).queryByLabelText('Tipo de defensa')).not.toBeInTheDocument()
  })

  it('muestra Programar defensa cuando no existe evento activo del contexto actual', async () => {
    const data = programmingStageResponse('DEFENSA_PRIVADA', 'DEFENSA_PRIVADA')
    postulacionesService.obtenerExpediente.mockResolvedValue(data)
    postulacionesService.obtenerDefensas.mockResolvedValue(data.defenses)
    renderDefenseManagerPage()

    expect(await screen.findByRole('button', { name: 'Programar Defensa privada' })).toBeInTheDocument()
  })

  it('muestra Defensa Pública cuando la anticipación mínima es informativa', async () => {
    const data = programmingStageResponse('DEFENSA_PUBLICA', 'DEFENSA_PUBLICA')
    data.flujo.orientacion_etapa_actual = {
      tipo_evento: 'DEFENSA_PUBLICA',
      requisitos: [
        { codigo: 'TRIBUNAL', cumplido: true, estado: 'CUMPLIDO' },
        { codigo: 'PRESIDENTE', cumplido: true, estado: 'CUMPLIDO' },
        { codigo: 'SECRETARIO', cumplido: true, estado: 'CUMPLIDO' },
        { codigo: 'ANTICIPACION_MINIMA', cumplido: null, estado: 'INFORMATIVO', valor: 48, unidad: 'horas' },
      ],
      siguiente_accion: { codigo: 'PROGRAMAR_EVENTO', titulo: 'Programar defensa', estado: 'DISPONIBLE', destino: '#defensas' },
    }
    data.defenses = { count: 0, next: null, previous: null, results: [] }
    postulacionesService.obtenerExpediente.mockResolvedValue(data)
    postulacionesService.obtenerDefensas.mockResolvedValue(data.defenses)
    renderDefenseManagerPage()

    expect(await screen.findByRole('button', { name: 'Programar Defensa pública' })).toBeInTheDocument()
  })

  it.each(['PROGRAMADA', 'EN_CURSO', 'SUSPENDIDA', 'FINALIZADA', 'CANCELADA'])('oculta Programar defensa cuando existe evento privado activo en estado %s', async (estado) => {
    const data = programmingStageResponse('DEFENSA_PRIVADA', 'DEFENSA_PRIVADA', 1, {
      id: 901, tipo_evento: 'DEFENSA_PRIVADA', seguimiento_etapa: 12, etapa_codigo: 'DEFENSA_PRIVADA', numero_intento: 1, estado, activo: true,
    })
    postulacionesService.obtenerExpediente.mockResolvedValue(data)
    postulacionesService.obtenerDefensas.mockResolvedValue(data.defenses)
    renderDefenseManagerPage()

    await screen.findByRole('heading', { name: 'Defensas' })
    if (estado === 'CANCELADA') expect(await screen.findByRole('button', { name: 'Programar Defensa privada' })).toBeInTheDocument()
    else expect(screen.queryByRole('button', { name: 'Programar Defensa privada' })).not.toBeInTheDocument()
  })

  it.each(['TESIS_GRADO', 'TRABAJO_DIRIGIDO'])('dirige %s desde una cancelación a la reprogramación relacionada', async (modalidad) => {
    const cancelled = {
      id: 906, tipo_evento: 'DEFENSA_PRIVADA', postulacion_modalidad_codigo: modalidad,
      seguimiento_etapa: 12, etapa_codigo: 'DEFENSA_PRIVADA', numero_intento: 1,
      estado: 'CANCELADA', activo: true, fecha_programada: '2026-09-20T10:00:00Z',
      fecha_cancelacion: '2026-09-20T12:00:00Z', participantes: [], evaluaciones: [], reprogramaciones: [],
    }
    const data = programmingStageResponse('DEFENSA_PRIVADA', 'DEFENSA_PRIVADA', 1, cancelled)
    const nombre = modalidad === 'TESIS_GRADO' ? 'Tesis de Grado' : 'Trabajo Dirigido'
    data.detalle = { ...data.detalle, modalidad_detalle: { id: 3, codigo: modalidad, nombre } }
    data.flujo = { ...data.flujo, modalidad: { id: 3, codigo: modalidad, nombre } }
    postulacionesService.obtenerExpediente.mockResolvedValue(data)
    postulacionesService.obtenerDefensas.mockResolvedValue(data.defenses)
    renderDefenseManagerPage()

    expect(screen.queryByRole('button', { name: 'Programar Defensa privada' })).not.toBeInTheDocument()
    await userEvent.click(await screen.findByRole('button', { name: 'Ver defensa' }))
    const detail = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    expect(within(detail).getByRole('button', { name: 'Reprogramar defensa' })).toBeInTheDocument()
  })

  it('no bloquea por un evento de otro tipo ni por un intento anterior', async () => {
    const data = programmingStageResponse('DEFENSA_PRIVADA', 'DEFENSA_PRIVADA', 2, {
      id: 902, tipo_evento: 'DEFENSA_PRIVADA', seguimiento_etapa: 11, etapa_codigo: 'DEFENSA_PRIVADA', numero_intento: 1, estado: 'EN_CURSO', activo: true,
    })
    postulacionesService.obtenerExpediente.mockResolvedValue(data)
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 2, next: null, previous: null, results: [
      ...data.defenses.results,
      { id: 903, tipo_evento: 'DEFENSA_PUBLICA', seguimiento_etapa: 12, etapa_codigo: 'DEFENSA_PRIVADA', numero_intento: 2, estado: 'EN_CURSO', activo: true },
    ]})
    renderDefenseManagerPage()

    expect(await screen.findByRole('button', { name: 'Programar Defensa privada' })).toBeInTheDocument()
  })

  it('aplica el mismo mecanismo cuando la orientación indica Defensa Pública', async () => {
    const data = programmingStageResponse('DEFENSA_PUBLICA', 'DEFENSA_PUBLICA', 1, {
      id: 904, tipo_evento: 'DEFENSA_PUBLICA', seguimiento_etapa: 12, etapa_codigo: 'DEFENSA_PUBLICA', numero_intento: 1, estado: 'PROGRAMADA', activo: true,
    })
    postulacionesService.obtenerExpediente.mockResolvedValue(data)
    postulacionesService.obtenerDefensas.mockResolvedValue(data.defenses)
    renderDefenseManagerPage()

    await screen.findByRole('heading', { name: 'Defensas' })
    expect(screen.queryByRole('button', { name: 'Programar Defensa pública' })).not.toBeInTheDocument()
  })

  it('orienta a cargar el Acta cuando la Defensa Pública de Tesis ya está aprobada', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(thesisPostPublicResponse)
    postulacionesService.obtenerDocumentos.mockResolvedValue({ count: 0, next: null, previous: null, results: [] })
    renderPage()

    expect(await screen.findByText('Cargar Acta de Defensa')).toBeInTheDocument()
    expect(screen.getByText(/debes cargar y vincular el Acta de Defensa vigente/i)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ir a documentos' })).not.toBeInTheDocument()
    expect(screen.queryByText('Aprobar etapa')).not.toBeInTheDocument()
    expect(screen.getByText('2 de 3 cumplidos')).toBeInTheDocument()
    expect(screen.getByText(/Resultado final aprobatorio/)).toHaveTextContent('77.00/100')
    expect(screen.getByText('Avance de tu proceso')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Avance de tu proceso' })).toHaveValue(100)
  })

  it('transita de autoridades de Tesis a la programación pública existente tras completar el último cargo', async () => {
    const ready = thesisPublicAuthoritiesResponse({ president: 1, secretary: 1, action: {
      codigo: 'PROGRAMAR_EVENTO', titulo: 'Programar Defensa Pública', descripcion: 'Programa la defensa correspondiente a esta etapa.',
      estado: 'DISPONIBLE', destino: '#defensas', accion_label: 'Ir a programar defensa', requiere_permiso: undefined,
    } })
    ready.flujo.orientacion_etapa_actual.tipo_evento = 'DEFENSA_PUBLICA'
    postulacionesService.obtenerExpediente.mockResolvedValueOnce(thesisPublicAuthoritiesResponse({ president: 1 })).mockResolvedValue(ready)
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 0, results: [] })
    selectInitialTab('resumen')
    const auth = { user: { id: 9 }, hasPermission: (name) => ['puede_gestionar_asignaciones', 'puede_gestionar_defensas'].includes(name) }
    render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)
    await userEvent.click(await screen.findByRole('button', { name: 'Completar autoridades' }))
    const dialog = screen.getByRole('dialog', { name: 'Completar autoridades' })
    await within(dialog).findByRole('option', { name: /Johnny Rosas/ })
    await userEvent.selectOptions(within(dialog).getByLabelText('Seleccionar persona para Secretario'), '41')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar autoridades' }))
    const program = await screen.findByRole('button', { name: 'Ir a programar defensa' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await userEvent.click(program)
    const programming = screen.getByRole('dialog')
    expect(within(programming).getByText(/Intento 1/)).toBeInTheDocument()
    expect(within(programming).getByLabelText('Fecha y hora programada')).toBeInTheDocument()
    expect(postulacionesService.programarDefensa).not.toHaveBeenCalled()
  })

  it('consulta y lista defensas de Perfil, Privada y Pública con cinco estados técnicos', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    renderPage('defensas')
    const card = (await screen.findByRole('heading', { name: 'Defensas' })).parentElement
    expect(within(card).getByText('Defensas registradas en tu proceso académico.')).toBeInTheDocument()
    expect(within(card).queryByText('Eventos técnicos registrados para esta postulación.')).not.toBeInTheDocument()
    expect(within(card).getByText('Defensa pública')).toBeInTheDocument()
    expect(within(card).getAllByText('Defensa privada')).toHaveLength(2)
    expect(within(card).getAllByText('Defensa de perfil')).toHaveLength(2)
    for (const state of ['Programada', 'En curso', 'Finalizada', 'Suspendida', 'Cancelada']) expect(within(card).getByText(state)).toBeInTheDocument()
    expect(within(card).getAllByText('Intento 2').length).toBeGreaterThan(0)
    expect(within(card).getByText('Auditorio central')).toBeInTheDocument()
    expect(within(card).getByText('Mixta')).toBeInTheDocument()
    expect(within(card).getByText('Defensa Pública')).toBeInTheDocument()
    expect(within(card).getAllByText('Etapa').length).toBeGreaterThan(0)
    expect(within(card).queryByText('Etapa técnica')).not.toBeInTheDocument()
    expect(within(card).queryByText('Información institucional')).not.toBeInTheDocument()
    expect(within(card).queryByLabelText('Alcance contractual de las defensas')).not.toBeInTheDocument()
    expect(postulacionesService.obtenerDefensas).toHaveBeenCalledWith('7', 1, expect.any(AbortSignal))
    expect(postulacionesService.obtenerDefensas).toHaveBeenCalledTimes(1)
    expect(postulacionesService.obtenerQuorumDefensa).not.toHaveBeenCalled()
    expect(within(card).queryByRole('button', { name: /programar|reprogramar|iniciar|finalizar|suspender|cancelar|asistencia|evaluación|consolidar/i })).not.toBeInTheDocument()
  })

  it('abre detalle de solo lectura y consulta quórum únicamente para el evento seleccionado', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(operativeFlowResponse)
    renderPage('defensas')
    fireEvent.click((await screen.findAllByRole('button', { name: 'Ver defensa' }))[0])
    const dialog = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    expect(postulacionesService.obtenerQuorumDefensa).toHaveBeenCalledWith(81, expect.any(AbortSignal))
    expect(postulacionesService.obtenerQuorumDefensa).toHaveBeenCalledTimes(1)
    expect(await within(dialog).findByText(/Quórum: Válido/)).toBeInTheDocument()
    expect(within(dialog).getByRole('heading', { name: 'Estado operativo' })).toBeInTheDocument()
    expect(within(dialog).getByText('Información técnica del quórum').closest('details')).not.toHaveAttribute('open')
    expect(within(dialog).queryByText(/La incorporación como participante no sustituye memorando/i)).not.toBeInTheDocument()
    expect(within(dialog).queryByText('Información institucional')).not.toBeInTheDocument()
    expect(within(dialog).getAllByText('Tribunal: 2').length).toBeGreaterThan(0)
    expect(within(dialog).queryByText('Sin participantes faltantes.')).not.toBeInTheDocument()
    expect(within(dialog).getAllByText('María Tribunal').length).toBeGreaterThan(0)
    expect(within(dialog).getByText('Tribunal · Convocado · Presente')).toBeInTheDocument()
    expect(within(dialog).getByText('Presente en sala')).toBeInTheDocument()
    expect(within(dialog).getAllByText('60.00').length).toBeGreaterThan(0)
    expect(within(dialog).getAllByText('70.00').length).toBeGreaterThan(0)
    expect(within(dialog).getByRole('link', { name: 'Abrir enlace virtual de la defensa' })).toHaveAttribute('href', 'https://meet.example.test/defensa')
    expect(within(dialog).getByText(/no certifica validez institucional/i)).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: /programar|reprogramar|iniciar|finalizar|suspender|cancelar|registrar|consolidar/i })).not.toBeInTheDocument()
  })

  it('presenta la jerarquía operativa de una Defensa Pública programada', async () => {
    const scheduledPublicDefense = {
      ...defenseRows[0],
      estado: 'PROGRAMADA',
      estado_display: 'Programada',
      numero_intento: 1,
      fecha_programada: '2026-09-18T09:00:00Z',
      fecha_inicio_real: null,
      fecha_fin_real: null,
      lugar: 'Salón Bicentenario',
      modalidad_evento: 'PRESENCIAL',
      modalidad_display: 'Presencial',
      participantes: [],
      evaluaciones: [],
      resultado_consolidado: null,
    }
    postulacionesService.obtenerExpediente.mockResolvedValue(operativeFlowResponse)
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, next: null, previous: null, results: [scheduledPublicDefense] })
    postulacionesService.obtenerQuorumDefensa.mockResolvedValue({ valido: false, conteos: {}, faltantes: { TRIBUNAL: 2 }, detalle: {} })
    renderDefenseManagerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Ver defensa' }))
    const dialog = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    expect(within(dialog).getByRole('heading', { name: 'Defensa pública' })).toBeInTheDocument()
    expect(within(dialog).getByText('Programada')).toBeInTheDocument()
    expect(within(dialog).getByRole('heading', { name: 'Estado operativo' })).toBeInTheDocument()
    const operationalSummary = within(dialog).getByRole('heading', { name: 'Estado operativo' }).closest('section')
    expect(operationalSummary).toHaveTextContent('Participantes: 0 · Quórum: No válido · Resultado: Pendiente')
    expect(operationalSummary.querySelectorAll('div.rounded-lg.border')).toHaveLength(0)
    expect(within(dialog).queryByRole('heading', { name: 'Resultado' })).not.toBeInTheDocument()
    expect(within(dialog).getByRole('heading', { name: 'Participantes' })).toBeInTheDocument()
    expect(within(dialog).queryByText(/de 3 incorporados/)).not.toBeInTheDocument()
    expect(within(dialog).queryByText(/Mínimo requerido:/)).not.toBeInTheDocument()
    expect(within(dialog).queryByText('Pendientes de incorporar')).not.toBeInTheDocument()
    expect(within(dialog).getByRole('heading', { name: 'Más acciones' })).toBeInTheDocument()
    expect(within(dialog).getByRole('heading', { name: 'Acción principal' })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Iniciar defensa' })).toBeInTheDocument()
    expect(within(dialog).getByRole('heading', { name: 'Acción destructiva' })).toBeInTheDocument()
    expect(within(dialog).queryByRole('heading', { name: 'Evaluación' })).not.toBeInTheDocument()
    expect(within(dialog).getByText('Intento 1 · Etapa Defensa Pública')).toBeInTheDocument()
    expect(within(dialog).queryByText('Inicio real')).not.toBeInTheDocument()
    expect(within(dialog).queryByText('Finalización real')).not.toBeInTheDocument()
    expect(within(dialog).getByText('Información técnica del quórum').closest('details')).not.toHaveAttribute('open')
    expect(within(dialog).queryByText('Información institucional')).not.toBeInTheDocument()
  })

  it('presenta la cancelación separada del fin real y ofrece reprogramar desde una defensa cancelada', async () => {
    const cancelled = {
      ...defenseRows[2], postulacion_modalidad_codigo: 'PROYECTO_GRADO', estado: 'CANCELADA', estado_display: 'Cancelada',
      fecha_inicio_real: null, fecha_fin_real: null, fecha_cancelacion: '2026-09-20T12:00:00Z',
      reprogramada_desde: null, reprogramaciones: [],
      evaluaciones: [], resultado_consolidado: null,
    }
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, next: null, previous: null, results: [cancelled] })
    renderDefenseManagerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Ver defensa' }))
    const detail = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    expect(within(detail).getByText('Cancelada el')).toBeInTheDocument()
    expect(within(detail).queryByText('Finalización real')).not.toBeInTheDocument()
    expect(within(detail).getByRole('button', { name: 'Reprogramar defensa' })).toBeInTheDocument()
  })

  it.each([
    ['PROYECTO_GRADO', 'DEFENSA_PERFIL', true],
    ['PROYECTO_GRADO', 'DEFENSA_PRIVADA', true],
    ['PROYECTO_GRADO', 'DEFENSA_PUBLICA', true],
    ['TESIS_GRADO', 'DEFENSA_TEMATICA', true],
    ['TESIS_GRADO', 'DEFENSA_PERFIL', true],
    ['TESIS_GRADO', 'DEFENSA_PRIVADA', true],
    ['TESIS_GRADO', 'DEFENSA_PUBLICA', true],
    ['TRABAJO_DIRIGIDO', 'DEFENSA_PERFIL', true],
    ['TRABAJO_DIRIGIDO', 'DEFENSA_PRIVADA', true],
    ['TRABAJO_DIRIGIDO', 'DEFENSA_PUBLICA', true],
    ['TRABAJO_DIRIGIDO', 'DEFENSA_TEMATICA', false],
    ['EXAMEN_GRADO', 'DEFENSA_PRIVADA', false],
  ])('ofrece reprogramar canceladas según modalidad y tipo real (%s, %s)', async (modalidad, tipo, expected) => {
    const modalityNames = {
      PROYECTO_GRADO: 'Proyecto de Grado',
      TESIS_GRADO: 'Tesis de Grado',
      TRABAJO_DIRIGIDO: 'Trabajo Dirigido',
      EXAMEN_GRADO: 'Examen de Grado',
    }
    const cancelled = {
      ...defenseRows[2], id: 885, tipo_evento: tipo, estado: 'CANCELADA', estado_display: 'Cancelada',
      postulacion_modalidad_codigo: modalidad, fecha_inicio_real: null, fecha_fin_real: null,
      fecha_cancelacion: '2026-09-20T12:00:00Z', reprogramaciones: [], evaluaciones: [], resultado_consolidado: null,
    }
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: { ...response.detalle, modalidad_detalle: { id: 2, codigo: modalidad, nombre: modalityNames[modalidad] } },
      flujo: { ...response.flujo, modalidad: { id: 2, codigo: modalidad, nombre: modalityNames[modalidad] } },
    })
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, next: null, previous: null, results: [cancelled] })
    renderDefenseManagerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Ver defensa' }))
    const detail = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    if (expected) {
      expect(within(detail).getByRole('heading', { name: 'Nueva programación' })).toBeInTheDocument()
      expect(within(detail).getByRole('button', { name: 'Reprogramar defensa' })).toBeInTheDocument()
    } else {
      expect(within(detail).queryByRole('heading', { name: 'Nueva programación' })).not.toBeInTheDocument()
      expect(within(detail).queryByRole('button', { name: 'Reprogramar defensa' })).not.toBeInTheDocument()
    }
  })

  it.each([
    ['Cerrar/×', async (dialog) => userEvent.click(within(dialog).getByRole('button', { name: 'Cerrar' }))],
    ['backdrop', async (dialog) => fireEvent.mouseDown(dialog.closest('.modal-overlay'))],
    ['Escape', async () => fireEvent.keyDown(document, { key: 'Escape' })],
  ])('regresa a Resumen después de consolidar y cerrar mediante %s', async (_mechanism, close) => {
    postulacionesService.obtenerExpediente.mockResolvedValue(operativeFlowResponse)
    const consolidatable = {
      ...defenseRows[1],
      estado: 'FINALIZADA',
      estado_display: 'Finalizada',
      postulacion_modalidad_codigo: 'TRABAJO_DIRIGIDO',
      participantes: [{ id: 92, usuario_nombre: 'Tribunal', rol_evento: 'TRIBUNAL', activo: true, presente: true }],
      evaluaciones: [{ id: 201, tipo_evaluacion: 'PRIVADA', modalidad_registro: 'CONSENSO', resultado_cualitativo: 'SUFICIENTE', nota_numerica: 28 }],
    }
    const completed = {
      ...consolidatable,
      resultado_consolidado: { id: 202, tipo_evaluacion: 'RESULTADO_FINAL', modalidad_registro: 'CONSENSO', resultado_cualitativo: 'SUFICIENTE', nota_numerica: 28 },
    }
    postulacionesService.obtenerDefensas.mockResolvedValue({ ...defensesResponse, results: [consolidatable] })
    postulacionesService.obtenerDefensa.mockResolvedValue(completed)
    postulacionesService.consolidarEvaluacionDefensa.mockResolvedValue(completed.resultado_consolidado)
    renderDefenseEvaluationManagerPage()

    const opener = await screen.findByRole('button', { name: 'Ver defensa' })
    await userEvent.click(opener)
    const dialog = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Consolidar resultado del evento' }))
    await waitFor(() => expect(postulacionesService.consolidarEvaluacionDefensa).toHaveBeenCalledTimes(1))
    await close(screen.getByRole('dialog', { name: 'Detalle de defensa' }))

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Detalle de defensa' })).not.toBeInTheDocument())
    const summaryTab = screen.getByRole('tab', { name: 'Resumen' })
    expect(window.location.hash).toBe('#resumen')
    expect(summaryTab).toHaveAttribute('aria-selected', 'true')
    expect(document.querySelector('#panel-resumen')).not.toHaveAttribute('hidden')
    await waitFor(() => expect(document.activeElement).toBe(summaryTab))
    expect(document.querySelector('[data-expediente-panel="defensas"]')).toHaveAttribute('hidden')
  })

  it('conserva Defensas y el foco del abridor al consultar una defensa finalizada sin operar', async () => {
    renderDefenseManagerPage()
    const opener = (await screen.findAllByRole('button', { name: 'Ver defensa' }))[0]
    await userEvent.click(opener)
    const dialog = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cerrar' }))

    expect(window.location.hash).toBe('#defensas')
    expect(screen.getByRole('tab', { name: 'Defensas' })).toHaveAttribute('aria-selected', 'true')
    expect(opener.closest('[hidden]')).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(opener))
  })

  it('no navega a Resumen si falla la consolidación de la defensa', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(operativeFlowResponse)
    const consolidatable = {
      ...defenseRows[1],
      estado: 'FINALIZADA',
      estado_display: 'Finalizada',
      postulacion_modalidad_codigo: 'TRABAJO_DIRIGIDO',
      participantes: [{ id: 92, usuario_nombre: 'Tribunal', rol_evento: 'TRIBUNAL', activo: true, presente: true }],
      evaluaciones: [{ id: 201, tipo_evaluacion: 'PRIVADA', modalidad_registro: 'CONSENSO', resultado_cualitativo: 'SUFICIENTE', nota_numerica: 28 }],
    }
    postulacionesService.obtenerDefensas.mockResolvedValue({ ...defensesResponse, results: [consolidatable] })
    postulacionesService.obtenerDefensa.mockResolvedValue(consolidatable)
    postulacionesService.consolidarEvaluacionDefensa.mockRejectedValue({ message: 'No se pudo consolidar.' })
    renderDefenseEvaluationManagerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Ver defensa' }))
    const dialog = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Consolidar resultado del evento' }))
    expect(await within(dialog).findByText('No se pudo consolidar.')).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cerrar' }))

    expect(window.location.hash).toBe('#defensas')
    expect(screen.getByRole('tab', { name: 'Defensas' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByRole('tab', { name: 'Resumen' })).toHaveAttribute('aria-selected', 'false')
  })

  it('oculta PROGRAMAR_EVENTO dentro de una defensa existente en curso', async () => {
    const runningDefense = { ...defenseRows[2], estado: 'EN_CURSO', estado_display: 'En curso', fecha_inicio_real: '2026-09-21T16:36:51Z' }
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      flujo: { ...response.flujo, orientacion_etapa_actual: { requisitos: [], siguiente_accion: { codigo: 'PROGRAMAR_EVENTO', titulo: 'Programar defensa', descripcion: 'Programa la defensa.' } } },
    })
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, next: null, previous: null, results: [runningDefense] })
    renderDefenseManagerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Ver defensa' }))
    const dialog = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    expect(within(dialog).getByText('En curso')).toBeInTheDocument()
    expect(within(dialog).queryByText('Programar defensa')).not.toBeInTheDocument()
    expect(within(dialog).queryByText(/Siguiente acción:.*Programar defensa/)).not.toBeInTheDocument()
  })

  it('conserva una orientación compatible con el estado de la defensa', async () => {
    const runningDefense = { ...defenseRows[2], estado: 'EN_CURSO', estado_display: 'En curso' }
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...operativeFlowResponse,
      flujo: { ...operativeFlowResponse.flujo, orientacion_etapa_actual: { requisitos: [], siguiente_accion: { codigo: 'FINALIZAR_DEFENSA', titulo: 'Finalizar defensa', descripcion: 'Finaliza el evento en curso.' } } },
    })
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, next: null, previous: null, results: [runningDefense] })
    postulacionesService.obtenerQuorumDefensa.mockResolvedValue({ valido: true, conteos: { TRIBUNAL: 2 }, faltantes: {}, detalle: { TRIBUNAL: 2 } })
    renderDefenseManagerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Ver defensa' }))
    const dialog = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    expect(within(dialog).getByRole('heading', { name: 'Acción principal' })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Finalizar defensa' })).toBeEnabled()
    expect(within(dialog).getByText('Finaliza el evento en curso.')).toBeInTheDocument()
  })

  it('abre el registro de asistencia múltiple desde el flujo rápido de Perfil cuando hay participantes pendientes', async () => {
    const profileDefense = {
      ...defenseRows[2],
      estado: 'EN_CURSO',
      estado_display: 'En curso',
      participantes: [
        { id: 191, asignacion: 21, usuario_nombre: 'Raúl', rol_evento: 'TRIBUNAL', rol_display: 'Tribunal', activo: true, presente: null },
        { id: 192, asignacion: 22, usuario_nombre: 'Mirna', rol_evento: 'TRIBUNAL', rol_display: 'Tribunal', activo: true, presente: true },
      ],
    }
    postulacionesService.obtenerExpediente.mockResolvedValue(operativeFlowResponse)
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, next: null, previous: null, results: [profileDefense] })
    postulacionesService.obtenerQuorumDefensa.mockResolvedValue({ valido: true, conteos: { TRIBUNAL: 2 }, faltantes: {}, detalle: { TRIBUNAL: 2 } })
    renderDefenseManagerPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Ver defensa' }))
    const detail = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    expect(await within(detail).findByRole('button', { name: 'Registrar resultado de la defensa' })).toBeInTheDocument()
    expect(within(detail).queryByText('Registrar resultado de la defensa', { selector: 'p' })).not.toBeInTheDocument()
    fireEvent.click(within(detail).getByRole('button', { name: 'Registrar resultado de la defensa' }))

    const flow = screen.getByRole('dialog', { name: 'Registrar resultado de la defensa' })
    expect(within(flow).getByText('Hay participantes con asistencia pendiente.')).toBeInTheDocument()
    fireEvent.click(within(flow).getByRole('button', { name: 'Revisar asistencias' }))
    expect(await screen.findByRole('dialog', { name: 'Registrar asistencia múltiple' })).toBeInTheDocument()
  })

  it('omite secciones técnicas vacías y conserva el detalle colapsable', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(operativeFlowResponse)
    postulacionesService.obtenerQuorumDefensa.mockResolvedValue({ valido: false, conteos: {}, faltantes: {}, detalle: {} })
    renderPage('defensas')
    await userEvent.click((await screen.findAllByRole('button', { name: 'Ver defensa' }))[1])
    const dialog = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    const technical = within(dialog).getByText('Información técnica del quórum').closest('details')
    expect(technical).not.toHaveAttribute('open')
    expect(within(technical).queryByRole('heading', { name: /Conteos|Faltantes|Detalles/ })).not.toBeInTheDocument()
    expect(within(technical).queryByText(/Sin conteos|Sin participantes faltantes|Sin detalle adicional/)).not.toBeInTheDocument()
  })

  it('no abre automáticamente los detalles técnicos de quórum y evaluación para administradores', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(operativeFlowResponse)
    renderDefenseEvaluationManagerPage()

    fireEvent.click((await screen.findAllByRole('button', { name: 'Ver defensa' }))[0])
    const dialog = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    expect(await within(dialog).findByText(/Quórum: Válido/)).toBeInTheDocument()
    expect(within(dialog).getByText('Información técnica del quórum').closest('details')).not.toHaveAttribute('open')
    within(dialog).getAllByText('Detalles de la evaluación').forEach((summary) => {
      expect(summary.closest('details')).not.toHaveAttribute('open')
    })
    expect(within(dialog).getAllByText('60.00').length).toBeGreaterThan(0)
  })

  it('no repite el resultado final entre las evaluaciones cuando ya hay resultado consolidado', async () => {
    const finalResult = { id: 712, tipo_evaluacion: 'RESULTADO_FINAL', resultado_cualitativo: 'SUFICIENTE', modalidad_registro: 'CONSENSO', es_resultado_final_evento: true }
    const profileDefense = {
      ...defenseRows[2],
      estado: 'FINALIZADA', estado_display: 'Finalizada',
      evaluaciones: [
        { id: 711, tipo_evaluacion: 'PERFIL', resultado_cualitativo: 'SUFICIENTE', modalidad_registro: 'CONSENSO', es_resultado_final_evento: false },
        finalResult,
      ],
      resultado_consolidado: finalResult,
    }
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, next: null, previous: null, results: [profileDefense] })
    renderDefenseDocumentsAdminPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Ver defensa' }))
    const dialog = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    const evaluationsSection = within(dialog).getByRole('heading', { name: 'Evaluaciones registradas' }).closest('section')
    expect(within(evaluationsSection).getAllByRole('listitem')).toHaveLength(1)
    expect(within(evaluationsSection).queryByText('Resultado final')).not.toBeInTheDocument()
    expect(within(dialog).getByRole('heading', { name: 'Resultado' })).toBeInTheDocument()
  })

  it('Proyecto de Grado: reprogramar y cancelar van juntos en "Otras acciones" con un texto correcto', async () => {
    const programmed = { ...defenseRows[2], estado: 'PROGRAMADA', estado_display: 'Programada', acciones_permitidas: ['reprogramar', 'cancelar'] }
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, next: null, previous: null, results: [programmed] })
    renderDefenseDocumentsAdminPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Ver defensa' }))
    const dialog = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    const more = within(dialog).getByRole('heading', { name: 'Otras acciones' }).closest('section')
    expect(within(dialog).queryByRole('heading', { name: 'Acción destructiva' })).not.toBeInTheDocument()
    expect(within(more).queryByText(/La fecha cancelada/)).not.toBeInTheDocument()
    expect(within(more).getByRole('button', { name: 'Reprogramar defensa' })).toBeInTheDocument()
  })

  it('muestra y descarga la hoja de observaciones de una Defensa de Perfil finalizada', async () => {
    const profileDefense = {
      ...defenseRows[2],
      estado: 'FINALIZADA', estado_display: 'Finalizada',
      hoja_observaciones: {
        id: 901, tipo_documento_nombre: 'Hoja de observaciones de Defensa de Perfil', fecha_subida: '2026-06-02T10:00:00Z',
        versiones: [{ id: 902, numero_version: 1, nombre_original: 'observaciones-perfil.pdf', fecha_subida: '2026-06-02T10:00:00Z', tamano_bytes: 1024, subido_por_nombre: 'Administradora', es_version_actual: true, activo: true }],
      },
    }
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, next: null, previous: null, results: [profileDefense] })
    postulacionesService.descargarVersion.mockResolvedValue({ blob: new Blob(['pdf']), filename: 'observaciones-perfil.pdf' })
    renderDefenseDocumentsAdminPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Ver defensa' }))
    const dialog = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    expect(within(dialog).getByRole('heading', { name: 'Hoja de observaciones' })).toBeInTheDocument()
    expect(within(dialog).getByText('Versión 1')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Descargar' })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Cargar nueva versión' })).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Descargar' }))
    expect(postulacionesService.descargarVersion).toHaveBeenCalledWith(902, 'observaciones-perfil.pdf')
  })

  it('permite al estudiante consultar y descargar la hoja de observaciones sin ofrecer cargas', async () => {
    const profileDefense = {
      ...defenseRows[2], estado: 'FINALIZADA', estado_display: 'Finalizada',
      hoja_observaciones: {
        id: 901, tipo_documento_nombre: 'Hoja de observaciones de Defensa de Perfil',
        versiones: [{ id: 902, numero_version: 1, nombre_original: 'observaciones-perfil.pdf', fecha_subida: '2026-06-02T10:00:00Z', es_version_actual: true, activo: true }],
      },
    }
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, next: null, previous: null, results: [profileDefense] })
    postulacionesService.descargarVersion.mockResolvedValue({ blob: new Blob(['pdf']), filename: 'observaciones-perfil.pdf' })
    renderOwnerPage('defensas')

    await userEvent.click(await screen.findByRole('button', { name: 'Ver defensa' }))
    const dialog = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    expect(within(dialog).getByRole('heading', { name: 'Hoja de observaciones' })).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: /cargar hoja|cargar nueva versión/i })).not.toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Descargar' }))
    expect(postulacionesService.descargarVersion).toHaveBeenCalledWith(902, 'observaciones-perfil.pdf')
  })

  it('muestra el estado vacío y no ofrece carga administrativa al estudiante', async () => {
    const profileDefense = { ...defenseRows[2], estado: 'FINALIZADA', estado_display: 'Finalizada', hoja_observaciones: null }
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, next: null, previous: null, results: [profileDefense] })
    renderOwnerPage('defensas')

    await userEvent.click(await screen.findByRole('button', { name: 'Ver defensa' }))
    const dialog = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    expect(within(dialog).getByText('No se registró una hoja de observaciones para esta defensa.')).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: /cargar hoja|cargar nueva versión/i })).not.toBeInTheDocument()
  })

  it('permite al administrador cargar una hoja de observaciones vinculada al evento', async () => {
    const profileDefense = { ...defenseRows[2], estado: 'FINALIZADA', estado_display: 'Finalizada', hoja_observaciones: null }
    const file = new File(['%PDF-1.4'], 'observaciones.pdf', { type: 'application/pdf' })
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, next: null, previous: null, results: [profileDefense] })
    postulacionesService.obtenerDefensa.mockResolvedValue(profileDefense)
    postulacionesService.obtenerTiposDocumento.mockResolvedValue([
      { id: 4, codigo: 'INFORME_FINAL', nombre: 'Informe final' },
      { id: 99, codigo: 'OBSERVACIONES_DEFENSA_PERFIL', nombre: 'Hoja de observaciones de Defensa de Perfil' },
    ])
    postulacionesService.cargarDocumento.mockResolvedValue({ id: 100 })
    renderDefenseDocumentsAdminPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Ver defensa' }))
    const detail = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    await userEvent.click(within(detail).getByRole('button', { name: 'Cargar hoja de observaciones' }))
    expect(screen.queryByRole('dialog', { name: 'Detalle de defensa' })).not.toBeInTheDocument()
    const upload = screen.getByRole('dialog', { name: 'Cargar nueva versión' })
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    const uploadOpener = within(detail).getByRole('button', { name: 'Cargar hoja de observaciones' })
    await userEvent.upload(within(upload).getByLabelText('Archivo'), file)
    await userEvent.click(within(upload).getByRole('button', { name: 'Cargar nueva versión' }))

    await waitFor(() => expect(postulacionesService.cargarDocumento).toHaveBeenCalledWith({ postulacionId: 7, tipoDocumentoId: 99, archivo: file, eventoDefensaId: 83 }, expect.any(AbortSignal)))
    expect(postulacionesService.obtenerDefensa).toHaveBeenCalledWith(83, expect.any(AbortSignal))
    await userEvent.click(within(upload).getAllByRole('button', { name: 'Cerrar' })[1])
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Cargar nueva versión' })).not.toBeInTheDocument())
    expect(document.activeElement).not.toBe(uploadOpener)
  })

  it('muestra quórum inválido, faltantes y resultado consolidado ausente sin calcular cero', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(operativeFlowResponse)
    postulacionesService.obtenerQuorumDefensa.mockResolvedValue({ valido: false, conteos: { TRIBUNAL: 1 }, faltantes: { TRIBUNAL: 1, SECRETARIO: 1 }, detalle: {} })
    renderPage('defensas')
    fireEvent.click((await screen.findAllByRole('button', { name: 'Ver defensa' }))[1])
    const dialog = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    expect(await within(dialog).findByText(/Quórum: No válido/)).toBeInTheDocument()
    expect(within(dialog).getByText('Secretario: 1')).toBeInTheDocument()
    expect(within(dialog).getByText('No se registraron participantes.')).toBeInTheDocument()
    expect(within(dialog).getByText('No se registraron evaluaciones.')).toBeInTheDocument()
    expect(within(dialog).getByText(/Resultado:\s*Pendiente/)).toBeInTheDocument()
    expect(within(dialog).queryByRole('heading', { name: 'Resultado' })).not.toBeInTheDocument()
    expect(within(dialog).queryByText(/^0(?:\.00)?$/)).not.toBeInTheDocument()
  })

  it('orienta el quórum de Perfil y permite incorporar explícitamente un tribunal elegible', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(operativeFlowResponse)
    const raul = { id: 191, asignacion: 21, usuario_nombre: 'Raúl Marcelo Calderon Fuertes', rol_evento: 'TRIBUNAL', rol_display: 'Tribunal', activo: true }
    const profileDefense = { ...defenseRows[2], postulacion: 7, estado: 'PROGRAMADA', participantes: [raul] }
    postulacionesService.obtenerDefensas.mockResolvedValue({ ...defensesResponse, results: [defenseRows[0], defenseRows[1], profileDefense] })
    postulacionesService.obtenerQuorumDefensa.mockResolvedValue({ valido: false, conteos: { TRIBUNAL: 1 }, faltantes: { TRIBUNAL: 1 }, detalle: { TRIBUNAL: 1 } })
    postulacionesService.obtenerAsignacionesCandidatas.mockResolvedValue({ results: [
      { id: 21, usuario_nombre: 'Raúl Marcelo Calderon Fuertes', tipo_participacion: 'TRIBUNAL', activo: true },
      { id: 22, usuario_nombre: 'Mirna Fernández Rojas', tipo_participacion: 'TRIBUNAL', activo: true },
      { id: 23, usuario_nombre: 'Tribunal Histórico', tipo_participacion: 'TRIBUNAL', activo: false },
      { id: 24, usuario_nombre: 'Tutor Activo', tipo_participacion: 'TUTOR', activo: true },
    ] })
    postulacionesService.obtenerDefensa.mockResolvedValue({ ...profileDefense, participantes: [...profileDefense.participantes, { id: 192, asignacion: 22, usuario_nombre: 'Mirna Fernández Rojas', rol_evento: 'TRIBUNAL', rol_display: 'Tribunal', activo: true }] })
    renderDefenseManagerPage()

    await userEvent.click((await screen.findAllByRole('button', { name: 'Ver defensa' }))[2])
    const dialog = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    expect(await within(dialog).findByText('1 de 3 incorporados')).toBeInTheDocument()
    expect(within(dialog).getByText('1 presente')).toBeInTheDocument()
    expect(within(dialog).getByText('Mínimo requerido: 2')).toBeInTheDocument()
    expect(within(dialog).getByText('Falta 1 presencia para alcanzar el quórum.')).toBeInTheDocument()
    expect(within(dialog).getByText('Raúl Marcelo Calderon Fuertes')).toBeInTheDocument()
    expect(within(dialog).getByText('Tribunal · Incorporado · Asistencia pendiente')).toBeInTheDocument()
    expect(await within(dialog).findByText('Mirna Fernández Rojas')).toBeInTheDocument()
    expect(within(dialog).queryByText('Tribunal Histórico')).not.toBeInTheDocument()
    expect(within(dialog).queryByText('Tutor Activo')).not.toBeInTheDocument()
    expect(postulacionesService.agregarParticipanteDefensa).not.toHaveBeenCalled()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Agregar a la defensa' }))
    await waitFor(() => expect(postulacionesService.agregarParticipanteDefensa).toHaveBeenCalledWith(83, 22, 'TRIBUNAL', expect.any(AbortSignal)))
    expect(within(dialog).getByRole('button', { name: 'Agregar participante' })).toBeInTheDocument()
    expect(within(dialog).getAllByRole('button', { name: 'Retirar participante' }).length).toBeGreaterThan(0)
  })

  it('muestra quórum mínimo en Perfil usando la respuesta del backend', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(operativeFlowResponse)
    const profileDefense = { ...defenseRows[2], postulacion: 7, estado: 'PROGRAMADA', participantes: [
      { id: 191, asignacion: 21, usuario_nombre: 'Raúl', rol_evento: 'TRIBUNAL', rol_display: 'Tribunal', activo: true, presente: true },
      { id: 192, asignacion: 22, usuario_nombre: 'Mirna', rol_evento: 'TRIBUNAL', rol_display: 'Tribunal', activo: true, presente: true },
    ] }
    postulacionesService.obtenerDefensas.mockResolvedValue({ ...defensesResponse, results: [profileDefense] })
    postulacionesService.obtenerQuorumDefensa.mockResolvedValue({ valido: true, conteos: { TRIBUNAL: 2 }, faltantes: {}, detalle: { TRIBUNAL: 2 } })
    renderDefenseManagerPage()

    await userEvent.click((await screen.findAllByRole('button', { name: 'Ver defensa' }))[0])
    const dialog = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    expect(await within(dialog).findByText('2 de 3 incorporados')).toBeInTheDocument()
    expect(within(dialog).getByText('2 presentes')).toBeInTheDocument()
    expect(within(dialog).getByText('Mínimo requerido: 2')).toBeInTheDocument()
    expect(within(dialog).getByText('✓ Válido')).toBeInTheDocument()
    expect(within(dialog).queryByText('Tribunal completo')).not.toBeInTheDocument()
  })

  it('vuelve a consultar el quórum backend y refleja 1/2 después de retirar un tribunal', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(operativeFlowResponse)
    const raul = { id: 191, asignacion: 21, usuario_nombre: 'Raúl Marcelo Calderon Fuertes', rol_evento: 'TRIBUNAL', rol_display: 'Tribunal', activo: true }
    const mirna = { id: 192, asignacion: 22, usuario_nombre: 'Mirna Fernández Rojas', rol_evento: 'TRIBUNAL', rol_display: 'Tribunal', activo: true }
    const profileDefense = { ...defenseRows[2], postulacion: 7, estado: 'PROGRAMADA', participantes: [raul, mirna] }
    postulacionesService.obtenerDefensas.mockResolvedValue({ ...defensesResponse, results: [profileDefense] })
    postulacionesService.obtenerDefensa.mockResolvedValue({ ...profileDefense, participantes: [raul] })
    postulacionesService.obtenerQuorumDefensa
      .mockResolvedValueOnce({ valido: true, conteos: { TRIBUNAL: 2 }, faltantes: {}, detalle: { TRIBUNAL: 2 } })
      .mockResolvedValueOnce({ valido: false, conteos: { TRIBUNAL: 1 }, faltantes: { TRIBUNAL: 1 }, detalle: { TRIBUNAL: 1 } })
    renderDefenseManagerPage()

    await userEvent.click((await screen.findAllByRole('button', { name: 'Ver defensa' }))[0])
    const detail = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    expect(await within(detail).findByText('2 de 3 incorporados')).toBeInTheDocument()
    fireEvent.click(within(within(detail).getByText('Mirna Fernández Rojas').closest('li')).getByRole('button', { name: 'Retirar participante' }))
    const removal = screen.getByRole('dialog', { name: 'Retirar participante' })
    fireEvent.click(within(removal).getByRole('button', { name: 'Confirmar retiro' }))

    expect(await within(detail).findByText('1 de 3 incorporados')).toBeInTheDocument()
    expect(postulacionesService.obtenerQuorumDefensa).toHaveBeenCalledTimes(2)
    expect(within(detail).getByText('1 presente')).toBeInTheDocument()
    expect(within(detail).getByText('Falta 1 presencia para alcanzar el quórum.')).toBeInTheDocument()
  })

  it('pagina defensas sin recargar las demás secciones ni duplicar la consulta', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDefensas
      .mockResolvedValueOnce(defensesResponse)
      .mockResolvedValueOnce({ count: 21, next: null, previous: 'page=1', results: [defenseRows[1]] })
    renderPage('defensas')
    const card = (await screen.findByRole('heading', { name: 'Defensas' })).parentElement
    fireEvent.click(within(card).getByRole('button', { name: 'Siguiente' }))
    await waitFor(() => expect(postulacionesService.obtenerDefensas).toHaveBeenLastCalledWith('7', 2, expect.any(AbortSignal)))
    expect(postulacionesService.obtenerDefensas).toHaveBeenCalledTimes(2)
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(1)
    expect(postulacionesService.obtenerHistorial).toHaveBeenCalledTimes(1)
    expect(postulacionesService.obtenerDocumentos).toHaveBeenCalledTimes(1)
  })

  it('muestra vacío de defensas sin afectar el expediente', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 0, next: null, previous: null, results: [] })
    renderPage()
    expect(await screen.findByText('No se registraron defensas.')).toBeInTheDocument()
    expect(screen.getByText(/Ana P/)).toBeInTheDocument()
  })

  it.each([
    ['Debes iniciar sesión para consultar las defensas.', 401],
    ['Las defensas solicitadas no están disponibles.', 404],
    ['No se pudo consultar las defensas. Comprueba tu conexión e intenta nuevamente.', undefined],
  ])('mantiene el expediente ante error parcial de defensas %s y permite reintentar', async (message, status) => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDefensas.mockRejectedValueOnce({ status, message }).mockResolvedValueOnce(defensesResponse)
    renderPage('defensas')
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(screen.getByText(/Ana P/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar defensas' }))
    expect(await screen.findByText('Defensa pública')).toBeInTheDocument()
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(1)
  })

  it('aísla error de quórum, permite reintentar y cancela al cerrar el evento', async () => {
    let pendingSignal
    postulacionesService.obtenerExpediente.mockResolvedValue(operativeFlowResponse)
    postulacionesService.obtenerDefensas.mockResolvedValue({
      count: 1, next: null, previous: null, results: [defenseRows[0]],
    })
    postulacionesService.obtenerQuorumDefensa
      .mockRejectedValueOnce({ status: 404, message: 'El evento de defensa no está disponible.' })
      .mockImplementationOnce((_event, signal) => { pendingSignal = signal; return new Promise(() => {}) })
    renderPage('defensas')
    const defensesTab = await screen.findByText('Defensas', { selector: '[role="tab"]' })
    expect(defensesTab).toHaveAttribute('aria-selected', 'true')
    const defensesPanel = document.getElementById(defensesTab.getAttribute('aria-controls'))
    expect(defensesPanel).not.toHaveAttribute('hidden')
    const defenseButtons = await within(defensesPanel).findAllByText('Ver defensa', { selector: 'button' })
    fireEvent.click(defenseButtons[0])
    const dialog = screen.getByLabelText('Detalle de defensa', { selector: '[role="dialog"]' })
    const errorMessage = await within(dialog).findByText('El evento de defensa no está disponible.')
    expect(errorMessage.closest('[role="alert"]')).toBeInTheDocument()
    fireEvent.click(within(dialog).getByText('Reintentar quórum', { selector: 'button' }))
    await waitFor(() => expect(pendingSignal).toBeInstanceOf(AbortSignal))
    fireEvent.click(within(dialog).getByLabelText('Cerrar', { selector: 'button' }))
    expect(pendingSignal.aborted).toBe(true)
  })

  it('cancela defensas al cambiar de expediente y usa la nueva postulación', async () => {
    const signals = []
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDefensas.mockImplementation((_id, _page, signal) => { signals.push(signal); return new Promise(() => {}) })
    const view = render(<MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<><ExpedientePage /><Link to="/postulaciones/8">Cambiar expediente de defensas</Link></>} /></Routes></MemoryRouter>)
    await waitFor(() => expect(signals).toHaveLength(1))
    fireEvent.click(screen.getByRole('link', { name: 'Cambiar expediente de defensas' }))
    await waitFor(() => expect(postulacionesService.obtenerDefensas).toHaveBeenCalledWith('8', 1, expect.any(AbortSignal)))
    expect(signals[0].aborted).toBe(true)
    view.unmount()
    expect(signals.at(-1).aborted).toBe(true)
  })

  it('encuentra una Defensa Pública finalizada aunque no esté en la página visible', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDefensas.mockImplementation((_postulacion, page) => Promise.resolve(page === 1
      ? { count: 21, next: 'page=2', previous: null, results: [{ ...defenseRows[1], id: 86, tipo_evento: 'DEFENSA_PUBLICA', estado: 'PROGRAMADA' }] }
      : { count: 21, next: null, previous: 'page=1', results: [defenseRows[0]] }))
    renderOwnerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Cargar documento' }))
    const selector = await screen.findByLabelText('Defensa Pública finalizada')
    expect([...selector.options].map((option) => option.value)).toEqual(['', '81'])
    expect(postulacionesService.obtenerDefensas).toHaveBeenCalledWith(7, 2, expect.any(AbortSignal))
  })

  it('muestra administración solo con puede_gestionar_defensas y programa con postulación, etapa y payload exactos', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(genericProgrammingResponse)
    renderDefenseManagerPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Programar defensa' }))
    const dialog = screen.getByRole('dialog', { name: 'Programar defensa' })
    // El aviso institucional es una línea discreta (ya no un desplegable amarillo).
    expect(within(dialog).getByRole('note')).toHaveTextContent(/no acreditan autorización normativa/i)
    expect(within(dialog).queryByText(/regla de 48 horas/i)).not.toBeInTheDocument()
    // Botones a la derecha: Cancelar y después la acción principal.
    expect([...dialog.querySelector('.form-footer').querySelectorAll('button')].map((button) => button.textContent)).toEqual(['Cancelar', 'Programar defensa'])
    fireEvent.change(within(dialog).getByLabelText('Tipo de defensa'), { target: { value: 'DEFENSA_PRIVADA' } })
    expect(within(dialog).getByRole('option', { name: 'Defensa Privada — intento 2' })).toBeInTheDocument()
    fireEvent.change(within(dialog).getByLabelText('Etapa compatible'), { target: { value: '12' } })
    fireEvent.change(within(dialog).getByLabelText('Fecha y hora programada'), { target: { value: '2026-08-20T14:00' } })
    fireEvent.change(within(dialog).getByLabelText('Lugar'), { target: { value: 'Sala técnica' } })
    fireEvent.change(within(dialog).getByLabelText('Observaciones (opcional)'), { target: { value: 'Registro técnico' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Programar defensa' }))
    await waitFor(() => expect(postulacionesService.programarDefensa).toHaveBeenCalledWith(7, {
      seguimiento_etapa: 12, tipo_evento: 'DEFENSA_PRIVADA', fecha_programada: '2026-08-20T14:00', lugar: 'Sala técnica', modalidad_evento: 'PRESENCIAL', enlace_virtual: '', observaciones: 'Registro técnico',
    }, expect.any(AbortSignal)))
    await waitFor(() => expect(postulacionesService.obtenerDefensas).toHaveBeenCalledTimes(2))
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(1)
  })

  it('usa programación contextual para Defensa de Perfil sin selectores redundantes', async () => {
    const profileStage = { id: 11, codigo: 'PERFIL_PROYECTO', nombre: 'Perfil de Proyecto', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
    const orientation = {
      tipo_evento: 'DEFENSA_PERFIL',
      siguiente_accion: { codigo: 'PROGRAMAR_EVENTO', titulo: 'Programar Defensa de Perfil', descripcion: 'Programa la Defensa de Perfil.', estado: 'DISPONIBLE', destino: '#defensas', accion_label: 'Ir a programar defensa' },
      requisitos: [{ codigo: 'TRIBUNAL', actual: 2, minimo: 2, cumplido: true, estado_display: '2/2 cumplido' }],
    }
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      flujo: { ...response.flujo, etapa_actual: profileStage, etapas: [profileStage], orientacion_etapa_actual: orientation },
    })
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 0, next: null, previous: null, results: [] })

    renderDefenseManagerPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Programar Defensa de Perfil' }))
    const dialog = screen.getByRole('dialog', { name: 'Programar Defensa de Perfil' })
    expect(within(dialog).getByText('Perfil de Proyecto · Intento 1')).toBeInTheDocument()
    expect(within(dialog).queryByLabelText('Tipo de defensa')).not.toBeInTheDocument()
    expect(within(dialog).queryByLabelText('Etapa compatible')).not.toBeInTheDocument()
    expect(within(dialog).queryByText(/regla de 48 horas/i)).not.toBeInTheDocument()

    fireEvent.change(within(dialog).getByLabelText('Fecha y hora programada'), { target: { value: '2026-08-20T14:00' } })
    fireEvent.change(within(dialog).getByLabelText('Modalidad técnica'), { target: { value: 'VIRTUAL' } })
    fireEvent.change(within(dialog).getByLabelText('Enlace virtual'), { target: { value: 'https://meet.example.test/perfil' } })
    fireEvent.change(within(dialog).getByLabelText('Observaciones (opcional)'), { target: { value: 'Defensa de perfil' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Programar Defensa de Perfil' }))

    await waitFor(() => expect(postulacionesService.programarDefensa).toHaveBeenCalledWith(7, {
      seguimiento_etapa: 11, tipo_evento: 'DEFENSA_PERFIL', fecha_programada: '2026-08-20T14:00', lugar: '', modalidad_evento: 'VIRTUAL', enlace_virtual: 'https://meet.example.test/perfil', observaciones: 'Defensa de perfil',
    }, expect.any(AbortSignal)))
  })

  it('usa programación contextual para Defensa Privada y conserva el payload explícito', async () => {
    const privateStage = { id: 12, codigo: 'DEFENSA_PRIVADA', nombre: 'Defensa Privada', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
    const orientation = {
      tipo_evento: 'DEFENSA_PRIVADA',
      siguiente_accion: { codigo: 'PROGRAMAR_EVENTO', titulo: 'Programar defensa', estado: 'DISPONIBLE', destino: '#defensas' },
      requisitos: [
        { tipo: 'ACTOR', codigo: 'TRIBUNAL', nombre: 'Tribunales', actual: 3, minimo: 2, cumplido: true },
        { tipo: 'ACTOR', codigo: 'DOCENTE_MODALIDAD', nombre: 'Docente de modalidad', actual: 1, minimo: 1, cumplido: true },
      ],
    }
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: { ...response.flujo, etapa_actual: privateStage, etapas: [privateStage], orientacion_etapa_actual: orientation } })
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 0, next: null, previous: null, results: [] })
    renderDefenseManagerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Programar Defensa privada' }))
    const dialog = screen.getByRole('dialog', { name: 'Programar Defensa privada' })
    expect(within(dialog).getByText('Defensa privada')).toBeInTheDocument()
    expect(within(dialog).getByText('Defensa Privada · Intento 1')).toBeInTheDocument()
    expect(within(dialog).queryByLabelText('Tipo de defensa')).not.toBeInTheDocument()
    expect(within(dialog).queryByLabelText('Etapa compatible')).not.toBeInTheDocument()
    expect(within(dialog).queryByText(/48 horas/i)).not.toBeInTheDocument()

    fireEvent.change(within(dialog).getByLabelText('Fecha y hora programada'), { target: { value: '2026-08-20T14:00' } })
    await userEvent.type(within(dialog).getByLabelText('Lugar'), 'Sala privada')
    await userEvent.type(within(dialog).getByLabelText('Observaciones (opcional)'), 'Defensa privada')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Programar Defensa privada' }))

    await waitFor(() => expect(postulacionesService.programarDefensa).toHaveBeenCalledWith(7, {
      seguimiento_etapa: 12, tipo_evento: 'DEFENSA_PRIVADA', fecha_programada: '2026-08-20T14:00', lugar: 'Sala privada', modalidad_evento: 'PRESENCIAL', enlace_virtual: '', observaciones: 'Defensa privada',
    }, expect.any(AbortSignal)))
  })

  it('muestra la anticipación pública solo cuando la orientación la informa', async () => {
    const publicStage = { id: 13, codigo: 'DEFENSA_PUBLICA', nombre: 'Defensa Pública', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
    const orientation = {
      tipo_evento: 'DEFENSA_PUBLICA',
      siguiente_accion: { codigo: 'PROGRAMAR_EVENTO', titulo: 'Programar defensa', estado: 'DISPONIBLE', destino: '#defensas' },
      requisitos: [{ tipo: 'ANTICIPACION', codigo: 'ANTICIPACION_MINIMA', valor: 48, unidad: 'HORAS', cumplido: true, estado_display: '48 h' }],
    }
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: { ...response.flujo, etapa_actual: publicStage, etapas: [publicStage], orientacion_etapa_actual: orientation } })
    renderDefenseManagerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Programar Defensa pública' }))
    const dialog = screen.getByRole('dialog', { name: 'Programar Defensa pública' })
    expect(within(dialog).getByText('Anticipación mínima informada')).toBeInTheDocument()
    expect(within(dialog).getByText('48 HORAS')).toBeInTheDocument()
  })

  it('conserva el formulario genérico cuando el contexto no es inequívoco', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(genericProgrammingResponse)
    renderDefenseManagerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Programar defensa' }))
    const dialog = screen.getByRole('dialog', { name: 'Programar defensa' })
    expect(within(dialog).getByLabelText('Tipo de defensa')).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Etapa compatible')).toBeInTheDocument()
  })

  it.each([
    ['VIRTUAL', false, true],
    ['MIXTA', true, true],
  ])('aplica campos condicionales de modalidad %s', async (mode, hasPlace, hasLink) => {
    postulacionesService.obtenerExpediente.mockResolvedValue(genericProgrammingResponse)
    renderDefenseManagerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Programar defensa' }))
    const dialog = screen.getByRole('dialog', { name: 'Programar defensa' })
    await userEvent.selectOptions(within(dialog).getByLabelText('Modalidad técnica'), mode)
    expect(Boolean(within(dialog).queryByLabelText('Lugar'))).toBe(hasPlace)
    expect(Boolean(within(dialog).queryByLabelText('Enlace virtual'))).toBe(hasLink)
    expect(within(dialog).getByRole('note')).toHaveTextContent(/no acreditan autorización normativa/i)
    expect(within(dialog).getByRole('note')).not.toHaveTextContent(/48 horas.*no acredita publicación/i)
  })

  it('valida fecha, etapa y campos presenciales sin invocar backend', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(genericProgrammingResponse)
    renderDefenseManagerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Programar defensa' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Programar defensa' }))
    expect(await screen.findByText('Selecciona un tipo de defensa.')).toBeInTheDocument()
    expect(screen.getByText('Selecciona una etapa compatible.')).toBeInTheDocument()
    expect(screen.getByText('La fecha y hora son obligatorias.')).toBeInTheDocument()
    expect(screen.getByText('El lugar es obligatorio para esta modalidad.')).toBeInTheDocument()
    expect(postulacionesService.programarDefensa).not.toHaveBeenCalled()
  })

  it.each([
    [82, 'Iniciar defensa', 'iniciarDefensa', []],
    [82, 'Suspender defensa', 'suspenderDefensa', ['Motivo técnico']],
    [82, 'Cancelar defensa', 'cancelarDefensa', ['Motivo técnico']],
    [82, 'Reprogramar defensa', 'reprogramarDefensa', ['2026-09-01T10:00', 'Motivo técnico']],
    [83, 'Finalizar defensa', 'finalizarDefensa', []],
  ])('ejecuta %s respetando confirmación y contrato', async (eventId, label, method, args) => {
    postulacionesService.obtenerExpediente.mockResolvedValue(operativeFlowResponse)
    if (eventId === 83) {
      const profileWithEvaluation = { ...defenseRows[2], evaluaciones: [{ id: 103, tipo_evaluacion: 'PERFIL', modalidad_registro: 'CONSENSO', es_resultado_final_evento: false, resultado_cualitativo: 'SUFICIENTE' }] }
      postulacionesService.obtenerDefensas.mockResolvedValue({ ...defensesResponse, results: defensesResponse.results.map((row) => row.id === 83 ? profileWithEvaluation : row) })
    }
    renderDefenseManagerPage()
    const buttons = await screen.findAllByRole('button', { name: 'Ver defensa' })
    await userEvent.click(buttons[defenseRows.findIndex((row) => row.id === eventId)])
    const detail = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    await userEvent.click(within(detail).getByRole('button', { name: label }))
    // El botón principal para Finalizar solo aplicaba a la Defensa de Perfil de Proyecto de Grado, que hoy usa resultado directo.
    if (label === 'Suspender defensa') expect(within(detail).getByRole('button', { name: label })).toHaveClass('app-button--secondary')
    if (label === 'Cancelar defensa') expect(within(detail).getByRole('button', { name: label })).toHaveClass('app-button--outline')
    const confirm = screen.getAllByRole('dialog').at(-1)
    if (label === 'Reprogramar defensa') fireEvent.change(within(confirm).getByLabelText('Nueva fecha y hora'), { target: { value: args[0] } })
    if (args.at(-1)) await userEvent.type(within(confirm).getByLabelText('Motivo'), args.at(-1))
    const confirmLabel = method === 'iniciarDefensa' ? 'Iniciar defensa' : 'Confirmar'
    await userEvent.click(within(confirm).getByRole('button', { name: confirmLabel }))
    if (method === 'iniciarDefensa') {
      await waitFor(() => expect(postulacionesService[method]).toHaveBeenCalledWith(eventId, [], expect.any(AbortSignal)))
    } else {
      await waitFor(() => expect(postulacionesService[method]).toHaveBeenCalledWith(eventId, ...args, expect.any(AbortSignal)))
    }
    expect(postulacionesService.obtenerDefensas).toHaveBeenCalledTimes(2)
  })

  it('no muestra la advertencia de 48 horas para Tesis', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: { ...response.detalle, modalidad_detalle: { id: 2, codigo: 'TESIS_GRADO', nombre: 'Tesis de Grado' } },
      flujo: { ...response.flujo, modalidad: { id: 2, codigo: 'TESIS_GRADO', nombre: 'Tesis de Grado' }, orientacion_etapa_actual: {
        siguiente_accion: { codigo: 'PROGRAMAR_EVENTO', estado: 'DISPONIBLE', destino: '#defensas' },
      } },
    })
    renderDefenseManagerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Programar defensa' }))
    expect(screen.queryByText(/regla de 48 horas/i)).not.toBeInTheDocument()
  })

  it('exige motivo, bloquea doble envío, muestra Procesando y cancela la solicitud al cerrar', async () => {
    let signal
    postulacionesService.obtenerExpediente.mockResolvedValue(operativeFlowResponse)
    postulacionesService.suspenderDefensa.mockImplementation((_id, _motivo, receivedSignal) => { signal = receivedSignal; return new Promise(() => {}) })
    renderDefenseManagerPage()
    await userEvent.click((await screen.findAllByRole('button', { name: 'Ver defensa' }))[1])
    await userEvent.click(screen.getByRole('button', { name: 'Suspender defensa' }))
    let dialog = screen.getAllByRole('dialog').at(-1)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirmar' }))
    expect(await within(dialog).findByText('El motivo es obligatorio.')).toBeInTheDocument()
    await userEvent.type(within(dialog).getByLabelText('Motivo'), 'Pausa técnica')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirmar' }))
    expect(await within(dialog).findByRole('button', { name: 'Procesando…' })).toBeDisabled()
    expect(postulacionesService.suspenderDefensa).toHaveBeenCalledTimes(1)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cerrar' }))
    expect(signal.aborted).toBe(true)
  })

  it.each([
    [400, 'No se pudo completar la acción. Revisa los datos y el estado técnico de la defensa.'],
    [401, 'Debes iniciar sesión para administrar defensas.'],
    [403, 'No tienes autorización para administrar defensas.'],
    [404, 'La postulación, etapa o defensa ya no está disponible.'],
    [undefined, 'No se pudo completar la acción sobre la defensa. Comprueba tu conexión e intenta nuevamente.'],
  ])('muestra error administrativo %s sin recargar el expediente', async (status, message) => {
    postulacionesService.obtenerExpediente.mockResolvedValue(operativeFlowResponse)
    postulacionesService.iniciarDefensa.mockRejectedValue({ status, message, fields: status === 400 ? { non_field_errors: ['Transición inválida.'] } : {} })
    renderDefenseManagerPage()
    fireEvent.click((await screen.findAllByRole('button', { name: 'Ver defensa' }))[1])
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar defensa' }))
    fireEvent.click(within(screen.getAllByRole('dialog').at(-1)).getByRole('button', { name: 'Iniciar defensa' }))
    expect(await screen.findByText(message)).toBeInTheDocument()
    if (status === 400) expect(screen.getByText('Transición inválida.')).toBeInTheDocument()
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(1)
  })

  it('actualiza el detalle seleccionado y vuelve a consultar quórum al iniciar', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(operativeFlowResponse)
    renderDefenseManagerPage()
    fireEvent.click((await screen.findAllByRole('button', { name: 'Ver defensa' }))[1])
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar defensa' }))
    fireEvent.click(within(screen.getAllByRole('dialog').at(-1)).getByRole('button', { name: 'Iniciar defensa' }))
    await waitFor(() => expect(postulacionesService.obtenerQuorumDefensa).toHaveBeenCalledTimes(2))
    expect(within(screen.getByRole('dialog', { name: 'Detalle de defensa' })).getByText('En curso')).toBeInTheDocument()
  })

  it('confirma solo asistencias pendientes, preserva las previas y refresca participantes y quórum', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(operativeFlowResponse)
    const participants = [
      { id: 901, usuario_nombre: 'Tribunal Presente', rol_evento: 'TRIBUNAL', rol_display: 'Tribunal', convocado: true, activo: true, presente: true, fecha_asistencia: '2026-09-27T17:00:00Z' },
      { id: 902, usuario_nombre: 'Tribunal Ausente', rol_evento: 'TRIBUNAL', rol_display: 'Tribunal', convocado: true, activo: true, presente: false, fecha_asistencia: '2026-09-27T17:01:00Z' },
      { id: 903, usuario_nombre: 'Tribunal Pendiente', rol_evento: 'TRIBUNAL', rol_display: 'Tribunal', convocado: true, activo: true, presente: null },
      { id: 905, usuario_nombre: 'Tribunal Pendiente 2', rol_evento: 'TRIBUNAL', rol_display: 'Tribunal', convocado: true, activo: true, presente: null },
      { id: 904, usuario_nombre: 'Retirado', rol_evento: 'TRIBUNAL', rol_display: 'Tribunal', convocado: true, activo: false, presente: null },
    ]
    const scheduled = { ...defenseRows[1], participantes: participants }
    const started = {
      ...scheduled,
      estado: 'EN_CURSO',
      estado_display: 'En curso',
      fecha_inicio_real: '2026-09-27T18:15:20Z',
      participantes: participants.map((participant) => participant.id === 903
        ? { ...participant, presente: false, fecha_asistencia: '2026-09-27T18:15:21Z' }
        : participant.id === 905
          ? { ...participant, presente: true, fecha_asistencia: '2026-09-27T18:15:22Z' }
          : participant),
    }
    let resolveStart
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, next: null, previous: null, results: [scheduled] })
    postulacionesService.iniciarDefensa
      .mockRejectedValueOnce({ status: 400, message: 'Fallo temporal al registrar asistencia.' })
      .mockReturnValueOnce(new Promise((resolve) => { resolveStart = resolve }))
    renderDefenseManagerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Ver defensa' }))
    const detail = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    await userEvent.click(within(detail).getByRole('button', { name: 'Iniciar defensa' }))
    const start = screen.getByRole('dialog', { name: 'Iniciar defensa' })

    expect(detail).toHaveClass('modal-window')
    expect(start).toHaveClass('modal-window')
    expect(screen.getAllByRole('dialog')).toEqual([detail, start])
    // Las ventanas se dibujan en <body>, fuera del contenido del expediente.
    expect(document.querySelector('.expediente-root').contains(detail)).toBe(false)
    expect(document.querySelector('.expediente-root').contains(start)).toBe(false)
    expect(within(start).getByText('Confirma los participantes presentes antes de iniciar la defensa.')).toBeInTheDocument()
    expect(within(start).getByRole('checkbox', { name: 'Tribunal Pendiente — Tribunal' })).toBeChecked()
    expect(within(start).getByRole('checkbox', { name: 'Tribunal Pendiente 2 — Tribunal' })).toBeChecked()
    expect(within(start).queryByRole('checkbox', { name: 'Tribunal Presente — Tribunal' })).not.toBeInTheDocument()
    expect(within(start).queryByRole('checkbox', { name: 'Tribunal Ausente — Tribunal' })).not.toBeInTheDocument()
    expect(within(start).getByText('Asistencia ya registrada · Presente')).toBeInTheDocument()
    expect(within(start).getByText('Asistencia ya registrada · Ausente')).toBeInTheDocument()
    expect(within(start).queryByText('Retirado')).not.toBeInTheDocument()
    await userEvent.click(within(start).getByRole('checkbox', { name: 'Tribunal Pendiente — Tribunal' }))
    await userEvent.click(within(start).getByRole('button', { name: 'Iniciar defensa' }))
    expect(await within(start).findByRole('alert')).toHaveTextContent('Fallo temporal al registrar asistencia.')
    expect(within(start).getByRole('button', { name: 'Iniciar defensa' })).toBeEnabled()
    await userEvent.click(within(start).getByRole('button', { name: 'Iniciar defensa' }))
    expect(await within(start).findByRole('button', { name: 'Procesando…' })).toBeDisabled()
    await userEvent.click(within(start).getByRole('button', { name: 'Procesando…' }))
    expect(postulacionesService.iniciarDefensa).toHaveBeenCalledTimes(2)
    expect(postulacionesService.iniciarDefensa).toHaveBeenLastCalledWith(82, [
      { participante: 903, presente: false },
      { participante: 905, presente: true },
    ], expect.any(AbortSignal))
    resolveStart(started)

    await waitFor(() => expect(postulacionesService.obtenerQuorumDefensa).toHaveBeenCalledTimes(2))
    const refreshedDetail = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    expect(screen.queryByRole('dialog', { name: 'Iniciar defensa' })).not.toBeInTheDocument()
    expect(within(refreshedDetail).getByText('Tribunal Presente')).toBeInTheDocument()
    expect(within(refreshedDetail).getByText('Tribunal Ausente')).toBeInTheDocument()
    expect(within(refreshedDetail).getByText('Tribunal Pendiente')).toBeInTheDocument()
    expect(within(refreshedDetail).getByText('Tribunal Pendiente 2')).toBeInTheDocument()
    const absentParticipantRow = within(refreshedDetail).getByText('Tribunal Ausente').closest('li')
    const pendingParticipantRow = within(refreshedDetail).getByText('Tribunal Pendiente').closest('li')
    expect(within(absentParticipantRow).getByText('Tribunal · Convocado · Ausente')).toBeInTheDocument()
    expect(within(pendingParticipantRow).getByText('Tribunal · Convocado · Ausente')).toBeInTheDocument()
    const newlyPresentRow = within(refreshedDetail).getByText('Tribunal Pendiente 2').closest('li')
    expect(within(newlyPresentRow).getByText('Tribunal · Convocado · Presente')).toBeInTheDocument()
    expect(within(refreshedDetail).queryByRole('button', { name: 'Registrar asistencia múltiple' })).not.toBeInTheDocument()
    expect(postulacionesService.registrarAsistenciaDefensa).not.toHaveBeenCalled()
    await userEvent.click(within(refreshedDetail).getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByRole('dialog', { name: 'Detalle de defensa' })).not.toBeInTheDocument()
    expect(postulacionesService.retirarParticipanteDefensa).not.toHaveBeenCalled()
  })

  it('sincroniza flujo, resultado y cierre en la misma sesión después de consolidar', async () => {
    const privateDefense = {
      ...defenseRows[1],
      estado: 'FINALIZADA',
      estado_display: 'Finalizada',
      evaluaciones: [{ id: 201, tipo_evaluacion: 'PRIVADA', modalidad_registro: 'CONSENSO', resultado_cualitativo: 'SUFICIENTE', nota_numerica: '28.00', ponderacion: '30.00', aporte_ponderado: '28.00' }],
    }
    const stale = {
      ...response,
      flujo: {
        ...response.flujo,
        etapa_actual: { id: 12, codigo: 'DEFENSA_PRIVADA', nombre: 'Defensa Privada', estado: 'EN_PROCESO', orden: 5 },
      },
      resultado: { data: { nota_privada: null, nota_publica: null, nota_final: null }, error: '' },
      cierre: { data: { ...closureResponse, etapa_actual: 'DEFENSA_PRIVADA' }, error: '' },
    }
    const synchronized = {
      ...stale,
      flujo: {
        ...stale.flujo,
        etapa_actual: { id: 13, codigo: 'DEFENSA_PUBLICA', nombre: 'Defensa Pública', estado: 'PENDIENTE', orden: 6 },
        etapas: stale.flujo.etapas.map((stage) => stage.codigo === 'DEFENSA_PRIVADA'
          ? { ...stage, estado: 'APROBADA' }
          : stage),
      },
      resultado: { data: { nota_privada: '28.00', nota_publica: null, aporte_privada: '28.00', semantica_privada: 'LEGACY_PONDERADA', nota_final: null }, error: '' },
      cierre: { data: { ...closureResponse, etapa_actual: 'DEFENSA_PUBLICA' }, error: '' },
    }
    postulacionesService.obtenerExpediente.mockResolvedValueOnce(stale).mockResolvedValue(synchronized)
    postulacionesService.obtenerDefensas.mockResolvedValue({ ...defensesResponse, results: [defenseRows[0], privateDefense] })
    postulacionesService.registrarResultadoDirectoDefensa.mockResolvedValue({})
    postulacionesService.obtenerDefensa.mockResolvedValue({
      ...privateDefense,
      resultado_consolidado: { id: 202, tipo_evaluacion: 'RESULTADO_FINAL', resultado_cualitativo: 'SUFICIENTE', nota_numerica: '28.00', ponderacion: '30.00', aporte_ponderado: '28.00', semantica_nota: 'LEGACY_PONDERADA' },
    })

    renderDefenseEvaluationManagerPage()
    await userEvent.click((await screen.findAllByRole('button', { name: 'Ver defensa' }))[1])
    // Proyecto de Grado registra el resultado en un solo paso (resultado directo).
    await userEvent.click(await screen.findByRole('button', { name: 'Finalizar y consolidar resultado existente' }))
    await userEvent.click(screen.getByRole('button', { name: 'Finalizar y consolidar' }))

    await waitFor(() => expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2))
    await userEvent.click(screen.getByRole('tab', { name: 'Resultado y cierre' }))
    expect(within(screen.getByRole('heading', { name: 'Resultado académico técnico' }).parentElement).getAllByText('28,00').length).toBeGreaterThan(0)
    expect(within(screen.getByRole('heading', { name: 'Resultado académico técnico' }).parentElement).getAllByText('/ 30')).toHaveLength(1)
    expect(within(screen.getByRole('heading', { name: 'Resultado académico técnico' }).parentElement).getByText('Registro con escala anterior')).toBeInTheDocument()
    expect(within(screen.getByRole('heading', { name: 'Cierre técnico' }).parentElement).getByText('Defensa Pública')).toBeInTheDocument()
    expect(screen.getAllByText('Defensa Pública').length).toBeGreaterThan(0)
  })

  it('no muestra acciones para finalizada/cancelada ni funcionalidades de historias posteriores', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    renderDefenseManagerPage()
    const buttons = await screen.findAllByRole('button', { name: 'Ver defensa' })
    for (const index of [0, 4]) {
      await userEvent.click(buttons[index])
      const dialog = screen.getByRole('dialog', { name: 'Detalle de defensa' })
      expect(within(dialog).queryByRole('heading', { name: 'Administración técnica' })).not.toBeInTheDocument()
      expect(within(dialog).queryByRole('button', { name: /asistencia|evaluar|consolidar|condición|entrega|cierre/i })).not.toBeInTheDocument()
      await userEvent.click(within(dialog).getByRole('button', { name: 'Cerrar' }))
    }
  })
})
