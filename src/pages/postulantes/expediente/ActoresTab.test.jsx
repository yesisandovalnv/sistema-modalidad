import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import ExpedientePage from '../ExpedientePage'
import { postulacionesService } from '../../../services/postulacionesService'
import { AuthContext } from '../../../context/AuthContext'
import { prepararExpediente, activeActorsResponse, candidateList, chooseCandidate, defensesResponse, deferred, expectCandidateValue, findCandidateOptionList, futureProfileOrientation, historicalActorsResponse, profileContracts, profileThesisApplicable, renderApplicationManagerPage, renderAssignmentManagerPage, renderPage, renderProfileThesisAction, renderStudentPage, renderTutorDictamenContext, renderWorkflowAssignmentManagerPage, renderWorkflowManagerPage, response, selectCandidate, selectInitialTab, thesisPublicAuthoritiesResponse, trabajoDirigidoPublicDefenseResponse, tribunalDocuments, tribunalResponse } from './pruebas/utilidades'

vi.mock('../../../services/postulacionesService', () => import('./pruebas/servicioSimulado'))

describe('ExpedientePage · Actores', () => {
  prepararExpediente()

  it('no muestra la acción de finalización si el usuario no puede gestionar asignaciones', async () => {
    postulacionesService.obtenerActores.mockImplementation((_id, activo) => Promise.resolve(activo ? activeActorsResponse : historicalActorsResponse))
    renderPage()

    await userEvent.click(await screen.findByRole('tab', { name: 'Actores' }))
    const activeHeading = await screen.findByRole('heading', { name: 'Participación actual' })
    const activeGroup = activeHeading.closest('section')
    expect(within(activeGroup).queryByRole('button', { name: /Finalizar asignación/i })).not.toBeInTheDocument()
  })

  it('muestra el botón de finalización sólo para actores vigentes y abre la confirmación', async () => {
    const contracts = profileContracts({ assignedTribunals: [{ id: 1, name: 'Tribunal Uno', order: 1 }], proposalApproved: true })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.obtenerActores.mockImplementation((_id, activo) => Promise.resolve(activo ? activeActorsResponse : historicalActorsResponse))
    renderAssignmentManagerPage()

    const activeHeading = await screen.findByRole('heading', { name: 'Participación actual' })
    const activeGroup = activeHeading.closest('section')
    expect(within(activeGroup).queryByRole('button', { name: /Finalizar asignación/i })).not.toBeInTheDocument()
    const actorsCard = activeHeading.closest('[aria-labelledby="actores-title"]')
    fireEvent.click(within(actorsCard).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    const position = within(dialog).getByRole('heading', { name: 'Tribunal 1 *' }).closest('section')
    await userEvent.click(within(position).getByRole('button', { name: 'Finalizar asignación' }))
    expect(within(position).getByLabelText('Motivo u observación')).toBeInTheDocument()
  })

  it('confirma finalización con motivo y evita doble submit', async () => {
    const contracts = profileContracts({ assignedTribunals: [{ id: 1, name: 'Tribunal Uno', order: 1 }], proposalApproved: true })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.obtenerActores.mockImplementation((_id, activo) => Promise.resolve(activo ? activeActorsResponse : historicalActorsResponse))
    let resolveFinalization
    postulacionesService.finalizarAsignacion.mockImplementation(() => new Promise((resolve) => { resolveFinalization = resolve }))
    renderAssignmentManagerPage()

    const actorsCard = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('[aria-labelledby="actores-title"]')
    await userEvent.click(within(actorsCard).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    const position = within(dialog).getByRole('heading', { name: 'Tribunal 1 *' }).closest('section')
    fireEvent.click(within(position).getByRole('button', { name: 'Finalizar asignación' }))

    const reason = within(position).getByLabelText('Motivo u observación')
    fireEvent.change(reason, { target: { value: 'Regularización por conflicto de roles' } })
    const submit = within(position).getByRole('button', { name: 'Confirmar finalización' })
    fireEvent.click(submit)
    await waitFor(() => expect(postulacionesService.finalizarAsignacion).toHaveBeenCalledWith(1, { observaciones: 'Regularización por conflicto de roles' }, expect.any(AbortSignal)))
    expect(submit).toBeDisabled()
    expect(postulacionesService.finalizarAsignacion).toHaveBeenCalledTimes(1)
    await act(async () => resolveFinalization({ id: 1, activo: false }))
  })

  it('muestra el error específico del backend al finalizar', async () => {
    const contracts = profileContracts({ assignedTribunals: [{ id: 1, name: 'Tribunal Uno', order: 1 }], proposalApproved: true })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.obtenerActores.mockImplementation((_id, activo) => Promise.resolve(activo ? activeActorsResponse : historicalActorsResponse))
    const error = 'No se puede finalizar la asignación porque participa activamente en un evento PROGRAMADA o EN_CURSO.'
    postulacionesService.finalizarAsignacion.mockRejectedValue({
      message: error,
      response: { status: 400, data: { non_field_errors: ['No se puede finalizar la asignación porque participa activamente en un evento PROGRAMADA o EN_CURSO.'] } },
    })
    renderAssignmentManagerPage()

    const actorsCard = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('[aria-labelledby="actores-title"]')
    fireEvent.click(within(actorsCard).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    const position = within(dialog).getByRole('heading', { name: 'Tribunal 1 *' }).closest('section')
    fireEvent.click(within(position).getByRole('button', { name: 'Finalizar asignación' }))
    const reason = within(position).getByLabelText('Motivo u observación')
    fireEvent.change(reason, { target: { value: 'Motivo inválido' } })
    fireEvent.click(within(position).getByRole('button', { name: 'Confirmar finalización' }))

    expect((await within(position).findAllByText(error)).length).toBeGreaterThan(0)
  })

  it('usa los códigos documentales de Trabajo Dirigido para presentar y enviar el informe del tribunal', async () => {
    const trabajoDirigidoResponse = {
      ...tribunalResponse,
      detalle: { ...tribunalResponse.detalle, modalidad_detalle: { id: 8, codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido' } },
      flujo: {
        ...tribunalResponse.flujo,
        modalidad: { id: 8, codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido' },
      },
    }
    postulacionesService.obtenerExpediente.mockResolvedValue(trabajoDirigidoResponse)
    postulacionesService.obtenerDocumentos.mockResolvedValue({
      count: 2, next: null, previous: null, results: [
        { id: 57, tipo_documento_codigo: 'DOCUMENTO_FINAL_TD', tipo_documento_nombre: 'Documento Final de Trabajo Dirigido', activo: true, versiones: [{ id: 537, numero_version: 1, nombre_original: 'documento-final-td.pdf', es_version_actual: true, activo: true }] },
        { id: 59, tipo_documento_codigo: 'INFORME_REVISION_TRIBUNAL_TD', tipo_documento_nombre: 'Informe de revisión del Tribunal', activo: true, versiones: [{ id: 541, numero_version: 3, nombre_original: 'informe-tribunal-td.pdf', es_version_actual: true, activo: true }] },
      ],
    })
    renderWorkflowManagerPage()

    await userEvent.click(await screen.findByRole('tab', { name: 'Documentos' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Registrar informe del tribunal' }))
    const dialog = screen.getByRole('dialog', { name: 'Registrar informe del tribunal' })
    expect(within(dialog).getByText('Documento Final — Versión 1')).toBeInTheDocument()
    expect(within(dialog).getByRole('option', { name: 'informe-tribunal-td.pdf — Versión 3' })).toHaveValue('541')
    await userEvent.selectOptions(within(dialog).getByLabelText('Resultado'), 'SUFICIENTE')
    await userEvent.selectOptions(within(dialog).getByLabelText('Evidencia'), '541')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Registrar informe' }))

    await waitFor(() => expect(postulacionesService.registrarInformeRevisionTribunal).toHaveBeenCalledWith(4, {
      version_documento_revisada: 537,
      resultado: 'SUFICIENTE',
      observaciones: '',
      evidencia_version: 541,
    }, expect.any(AbortSignal)))
  }, 15000)

  it('presenta el origen y el estado de los actores con los rótulos visuales del expediente', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...tribunalResponse,
      flujo: { ...tribunalResponse.flujo, orientacion_etapa_actual: { requisitos: [], siguiente_accion: null } },
    })
    postulacionesService.obtenerActores.mockImplementation((_id, activo) => Promise.resolve(activo ? activeActorsResponse : historicalActorsResponse))

    renderPage()

    const designations = await screen.findAllByText('Designado desde')
    expect(designations.length).toBeGreaterThan(0)
    expect(screen.getAllByText('Estado').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Vigente').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Perfil de Proyecto').length).toBeGreaterThan(0)
  })

  it('abre el mismo modal genérico desde el CTA de orientación', async () => {
    const contracts = profileContracts()
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    renderAssignmentManagerPage()

    await userEvent.click(await screen.findByRole('tab', { name: 'Resumen' }))
    const summary = (await screen.findByRole('heading', { name: 'Qué debes hacer ahora' })).parentElement
    await userEvent.click(within(summary).getByRole('link', { name: 'Gestionar actores' }))

    expect(screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Actores' })).toHaveAttribute('aria-selected', 'true')
  })

  it('abre desde Siguiente acción el diálogo existente cuando hay una decisión registrable única', async () => {
    const contracts = profileContracts({ assignedTribunals: [
      { id: 1, name: 'Tribunal Uno', order: 1 },
      { id: 2, name: 'Tribunal Dos', order: 2 },
      { id: 3, name: 'Tribunal Tres', order: 3 },
    ] })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    renderApplicationManagerPage('resumen')

    await userEvent.click(await screen.findByRole('button', { name: 'Registrar decisión' }))

    const dialog = await screen.findByRole('dialog', { name: 'Confirmar autorización del perfil' })
    expect(within(dialog).getByRole('button', { name: 'Confirmar autorización' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Resumen' })).toHaveAttribute('aria-selected', 'true')
  })

  it('mantiene la navegación a Decisiones cuando la siguiente acción no está permitida', async () => {
    const contracts = profileContracts({
      assignedTribunals: [
        { id: 1, name: 'Tribunal Uno', order: 1 },
        { id: 2, name: 'Tribunal Dos', order: 2 },
        { id: 3, name: 'Tribunal Tres', order: 3 },
      ],
      canRegister: false,
    })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    renderApplicationManagerPage('resumen')

    expect(await screen.findByRole('link', { name: 'Registrar decisión' })).toHaveAttribute('href', '#decisiones-academicas')
    expect(screen.queryByRole('dialog', { name: 'Aprobación de propuesta' })).not.toBeInTheDocument()
  })

  it('resume ocupación en la tarjeta y muestra las posiciones del contrato en el modal', async () => {
    const contracts = profileContracts({
      assignedTribunals: [
        { id: 51, name: 'Tribunal Uno', order: 1 },
        { id: 52, name: 'Tribunal Dos', order: 2 },
        { id: 53, name: 'Tribunal Tres', order: 3 },
      ],
      proposalApproved: true,
      tutorAssigned: true,
    })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.obtenerActores.mockImplementation((_id, activo) => Promise.resolve(activo
      ? { count: 1, next: null, previous: null, results: [{ id: 90, usuario: 80, tipo_participacion: 'TUTOR', tipo_participacion_display: 'Tutor', usuario_nombre: 'María Tutora', activo: true }] }
      : historicalActorsResponse))
    renderAssignmentManagerPage()

    await userEvent.click(await screen.findByRole('tab', { name: 'Actores' }))
    const actors = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('section')
    expect(within(actors).getByText('María Tutora')).toBeInTheDocument()
    expect(within(actors).getByText('4 de 4 posiciones ocupadas')).toBeInTheDocument()
    await userEvent.click(within(actors).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    for (const order of [1, 2, 3]) {
      expect(within(dialog).getByRole('heading', { name: `Tribunal ${order} *` })).toBeInTheDocument()
    }
    expect(within(dialog).getByRole('heading', { name: 'Tutor *' })).toBeInTheDocument()
    expect(within(dialog).getAllByText(/^Asignada$/)).toHaveLength(4)
    expect(within(dialog).getByText('María Tutora')).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Archivo')).toBeInTheDocument()
    expect(within(actors).queryByText('Recomendado')).not.toBeInTheDocument()
  })

  it('publica el memorándum desde Gestionar actores sin exigir Tutor ni registrar la decisión', async () => {
    const contracts = profileContracts({
      assignedTribunals: [
        { id: 51, name: 'Tribunal Uno', order: 1 },
        { id: 52, name: 'Tribunal Dos', order: 2 },
        { id: 53, name: 'Tribunal Tres', order: 3 },
      ],
    })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.obtenerMemorandumsDesignacion
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{
        id: 8,
        vigente: true,
        fecha_publicacion: '2026-10-17T10:00:00Z',
        version: { id: 81, numero_version: 1, nombre_original: 'memorandum.pdf' },
      }])
    let resolvePublication
    postulacionesService.publicarMemorandumDesignacion.mockImplementation(() => new Promise((resolve) => { resolvePublication = resolve }))
    renderAssignmentManagerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    for (const order of [1, 2, 3]) {
      expect(within(dialog).getByRole('heading', { name: `Tribunal ${order} *` })).toBeInTheDocument()
    }
    expect(within(dialog).getByRole('heading', { name: 'Tutor *' })).toBeInTheDocument()
    expect(within(dialog).queryByText('Asignada a María Tutora')).not.toBeInTheDocument()
    const file = new File(['%PDF-1.4'], 'memorandum.pdf', { type: 'application/pdf' })
    const fileInput = within(dialog).getByLabelText('Archivo')
    expect(fileInput).toHaveAttribute('accept', '.pdf,application/pdf')
    expect(fileInput).toHaveClass('mt-1', 'block', 'w-full', 'rounded-lg', 'border', 'p-2', 'text-sm')
    await userEvent.upload(fileInput, file)
    expect(fileInput.files).toHaveLength(1)
    expect(fileInput.files[0]).toBe(file)
    const publish = within(dialog).getByRole('button', { name: 'Publicar memorándum' })
    fireEvent.click(publish)
    fireEvent.click(publish)

    await waitFor(() => expect(postulacionesService.publicarMemorandumDesignacion).toHaveBeenCalledWith(7, 22, file))
    expect(postulacionesService.publicarMemorandumDesignacion).toHaveBeenCalledTimes(1)
    expect(postulacionesService.registrarDecisionAcademica).not.toHaveBeenCalled()
    expect(postulacionesService.asignarActor).not.toHaveBeenCalled()
    expect(postulacionesService.reemplazarActor).not.toHaveBeenCalled()
    expect(publish).toBeDisabled()
    await act(async () => resolvePublication({ id: 8, vigente: true }))
    expect(await within(dialog).findByText('Memorándum publicado correctamente.')).toBeInTheDocument()
    await waitFor(() => expect(postulacionesService.obtenerMemorandumsDesignacion).toHaveBeenCalledTimes(2))
    expect(await within(dialog).findByText(/Documento publicado y vigente/)).toBeInTheDocument()
    await userEvent.click(within(dialog).getAllByRole('button', { name: 'Cerrar' }).at(-1))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })).not.toBeInTheDocument())
    expect(window.location.hash).toBe('#resumen')
    expect(screen.getByRole('tab', { name: 'Resumen' })).toHaveAttribute('aria-selected', 'true')
    expect(document.getElementById('panel-resumen')).toBeVisible()
    expect(document.getElementById('panel-actores')).not.toBeVisible()
  }, 15000)

  it.each([
    ['el botón Cerrar', async (dialog) => userEvent.click(within(dialog).getAllByRole('button', { name: 'Cerrar' }).at(-1))],
    ['el botón ×', async (dialog) => userEvent.click(within(dialog).getAllByRole('button', { name: 'Cerrar' })[0])],
    ['el clic fuera', async (dialog) => fireEvent.mouseDown(dialog.closest('.modal-overlay'))],
    ['la tecla Escape', async () => fireEvent.keyDown(document, { key: 'Escape' })],
  ])('navega a Resumen tras publicar y cerrar mediante %s', async (_mechanism, close) => {
    const contracts = profileContracts({
      assignedTribunals: [
        { id: 51, name: 'Tribunal Uno', order: 1 },
        { id: 52, name: 'Tribunal Dos', order: 2 },
        { id: 53, name: 'Tribunal Tres', order: 3 },
      ],
    })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.obtenerMemorandumsDesignacion
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 8, vigente: true, fecha_publicacion: '2026-10-17T10:00:00Z', version: { id: 81, numero_version: 1, nombre_original: 'memorandum.pdf' } }])
    postulacionesService.publicarMemorandumDesignacion.mockResolvedValue({ id: 8, vigente: true })
    selectInitialTab('actores')
    renderAssignmentManagerPage()
    const actors = await screen.findByRole('heading', { name: 'Gestión de actores' })
    const opener = within(actors.closest('section')).getByRole('button', { name: 'Gestionar actores' })
    await userEvent.click(opener)
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    const fileInput = within(dialog).getByLabelText('Archivo')
    await userEvent.upload(fileInput, new File(['%PDF-1.4'], 'memorandum.pdf', { type: 'application/pdf' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Publicar memorándum' }))
    expect(await within(dialog).findByText('Memorándum publicado correctamente.')).toBeInTheDocument()
    await close(dialog)

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })).not.toBeInTheDocument())
    expect(window.location.hash).toBe('#resumen')
    expect(screen.getByRole('tab', { name: 'Resumen' })).toHaveAttribute('aria-selected', 'true')
    expect(document.getElementById('panel-resumen')).toBeVisible()
    expect(document.getElementById('panel-actores')).not.toBeVisible()
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Resumen' })))
  })

  it('conserva la pestaña anterior al cerrar sin publicación exitosa', async () => {
    const contracts = profileContracts({
      assignedTribunals: [
        { id: 51, name: 'Tribunal Uno', order: 1 },
        { id: 52, name: 'Tribunal Dos', order: 2 },
        { id: 53, name: 'Tribunal Tres', order: 3 },
      ],
    })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    renderAssignmentManagerPage('actores')
    const actors = await screen.findByRole('heading', { name: 'Gestión de actores' })
    const opener = within(actors.closest('section')).getByRole('button', { name: 'Gestionar actores' })
    await userEvent.click(opener)
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    await userEvent.click(within(dialog).getAllByRole('button', { name: 'Cerrar' }).at(-1))

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })).not.toBeInTheDocument())
    expect(window.location.hash).toBe('#actores')
    expect(screen.getByRole('tab', { name: 'Actores' })).toHaveAttribute('aria-selected', 'true')
    expect(document.getElementById('panel-actores')).toBeVisible()
    expect(document.getElementById('panel-resumen')).not.toBeVisible()
  })

  it('no navega automáticamente cuando falla la publicación y permite cerrar', async () => {
    const contracts = profileContracts({
      assignedTribunals: [
        { id: 51, name: 'Tribunal Uno', order: 1 },
        { id: 52, name: 'Tribunal Dos', order: 2 },
        { id: 53, name: 'Tribunal Tres', order: 3 },
      ],
    })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.publicarMemorandumDesignacion.mockRejectedValue(new Error('Publicación rechazada'))
    renderAssignmentManagerPage('actores')
    const actors = await screen.findByRole('heading', { name: 'Gestión de actores' })
    await userEvent.click(within(actors.closest('section')).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    await userEvent.upload(within(dialog).getByLabelText('Archivo'), new File(['%PDF-1.4'], 'memorandum.pdf', { type: 'application/pdf' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Publicar memorándum' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Publicación rechazada')
    await userEvent.click(within(dialog).getAllByRole('button', { name: 'Cerrar' }).at(-1))

    expect(window.location.hash).toBe('#actores')
    expect(screen.getByRole('tab', { name: 'Actores' })).toHaveAttribute('aria-selected', 'true')
    expect(document.getElementById('panel-actores')).toBeVisible()
  })

  it('bloquea el cierre mientras la publicación está en curso', async () => {
    const contracts = profileContracts({
      assignedTribunals: [
        { id: 51, name: 'Tribunal Uno', order: 1 },
        { id: 52, name: 'Tribunal Dos', order: 2 },
        { id: 53, name: 'Tribunal Tres', order: 3 },
      ],
    })
    const publication = deferred()
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.publicarMemorandumDesignacion.mockReturnValue(publication.promise)
    renderAssignmentManagerPage('actores')
    const actors = await screen.findByRole('heading', { name: 'Gestión de actores' })
    await userEvent.click(within(actors.closest('section')).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    await userEvent.upload(within(dialog).getByLabelText('Archivo'), new File(['%PDF-1.4'], 'memorandum.pdf', { type: 'application/pdf' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Publicar memorándum' }))
    await waitFor(() => expect(postulacionesService.publicarMemorandumDesignacion).toHaveBeenCalled())
    fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.mouseDown(dialog)
    expect(screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })).toBeInTheDocument()
    expect(window.location.hash).toBe('#actores')
    await act(async () => publication.resolve({ id: 8, vigente: true }))
  })

  it('guarda los actores antes de mostrar el selector y permite publicar después de la recarga', async () => {
    const pendingContracts = profileContracts({ assignedTribunals: [
      { id: 51, name: 'Tribunal Uno', order: 1 },
      { id: 52, name: 'Tribunal Dos', order: 2 },
    ] })
    const savedContracts = profileContracts({ assignedTribunals: [
      { id: 51, name: 'Tribunal Uno', order: 1 },
      { id: 52, name: 'Tribunal Dos', order: 2 },
      { id: 53, name: 'Tribunal Tres', order: 3 },
    ] })
    postulacionesService.obtenerExpediente
      .mockResolvedValueOnce({ ...response, flujo: pendingContracts.flow })
      .mockResolvedValue({ ...response, flujo: savedContracts.flow })
    postulacionesService.obtenerCandidatosElegibles.mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [{ id: 43, username: 'tribunal-tres', nombre_completo: 'Tribunal Tres', rol_nombre: 'Docente' }],
    })
    renderAssignmentManagerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Gestionar actores' }))
    let dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    const memorandumTitle = within(dialog).getByRole('heading', { name: 'Memorándum oficial de designación' })
    const memorandumSection = memorandumTitle.closest('section')

    const tribunalSelector = within(dialog).getByLabelText('Seleccionar candidato para Tribunal 3')
    await within(candidateList(tribunalSelector)).findByRole('option', { name: /Tribunal Tres/ })
    await chooseCandidate(tribunalSelector, '43')
    const save = within(dialog).getByRole('button', { name: 'Guardar asignaciones' })
    expect(save.compareDocumentPosition(memorandumSection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(within(dialog).getAllByRole('button', { name: 'Cerrar' }).at(-1).compareDocumentPosition(memorandumSection) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy()
    expect(within(memorandumSection).getByText('Guarda primero las asignaciones para publicar el memorándum.')).toBeInTheDocument()
    expect(within(memorandumSection).queryByLabelText('Archivo')).not.toBeInTheDocument()
    expect(within(memorandumSection).queryByRole('button', { name: 'Publicar memorándum' })).not.toBeInTheDocument()
    expect(postulacionesService.publicarMemorandumDesignacion).not.toHaveBeenCalled()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar asignaciones' }))
    await waitFor(() => expect(postulacionesService.asignarActor).toHaveBeenCalledWith(7, {
      usuario: 43,
      tipo_participacion: 'TRIBUNAL',
      observaciones: '',
      orden_cargo: 3,
      seguimiento_etapa: 22,
    }, expect.any(AbortSignal)))
    dialog = await screen.findByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    const fileInput = await within(dialog).findByLabelText('Archivo')
    const file = new File(['%PDF-1.4'], 'memorandum.pdf', { type: 'application/pdf' })
    await userEvent.upload(fileInput, file)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Publicar memorándum' }))
    await waitFor(() => expect(postulacionesService.publicarMemorandumDesignacion).toHaveBeenCalledWith(7, 22, file))
    expect(postulacionesService.registrarDecisionAcademica).not.toHaveBeenCalled()
  }, 15000)

  it('recarga el expediente tras publicar el memorándum y muestra Programar defensa al volver al resumen', async () => {
    const contracts = profileContracts({
      assignedTribunals: [
        { id: 51, name: 'Tribunal Uno', order: 1 },
        { id: 52, name: 'Tribunal Dos', order: 2 },
        { id: 53, name: 'Tribunal Tres', order: 3 },
      ],
      tutorAssigned: true,
    })
    const pendingFlow = {
      ...contracts.flow,
      orientacion_etapa_actual: {
        mensaje: 'Publica el memorándum oficial de designación.',
        requisitos: [{ tipo: 'DOCUMENTO', codigo: 'MEMORANDUM_DESIGNACION_PROYECTO', nombre: 'Memorándum oficial de designación', cumplido: false, estado: 'PENDIENTE', estado_display: 'Pendiente' }],
        siguiente_accion: { codigo: 'PUBLICAR_MEMORANDUM', titulo: 'Publicar memorándum oficial', estado: 'PENDIENTE', accion_label: 'Gestionar actores', destino: '#actores' },
      },
    }
    const readyFlow = {
      ...contracts.flow,
      orientacion_etapa_actual: {
        mensaje: 'Los actores requeridos están completos. Programa la defensa respetando la anticipación mínima.',
        requisitos: [],
        siguiente_accion: { codigo: 'PROGRAMAR_EVENTO', titulo: 'Programar defensa', descripcion: 'Los actores requeridos están completos. Programa la defensa respetando la anticipación mínima.', estado: 'DISPONIBLE', accion_label: 'Programar defensa', destino: '#defensas' },
      },
    }
    postulacionesService.obtenerExpediente
      .mockResolvedValueOnce({ ...response, flujo: pendingFlow })
      .mockResolvedValue({ ...response, flujo: readyFlow })
    postulacionesService.obtenerMemorandumsDesignacion
      .mockResolvedValueOnce([])
      .mockResolvedValue([{ id: 8, vigente: true, version: { id: 81, numero_version: 1, nombre_original: 'memorandum.pdf' } }])

    renderAssignmentManagerPage('resumen')

    let summary = (await screen.findByRole('heading', { name: 'Qué debes hacer ahora' })).parentElement
    expect(within(summary).getByText('Publicar memorándum oficial')).toBeInTheDocument()
    expect(within(summary).getByText(/Memorándum oficial de designación/)).toBeInTheDocument()
    await userEvent.click(await screen.findByRole('tab', { name: 'Actores' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Gestionar actores' }))

    const dialog = await screen.findByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    const file = new File(['%PDF-1.4'], 'memorandum.pdf', { type: 'application/pdf' })
    await userEvent.upload(within(dialog).getByLabelText('Archivo'), file)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Publicar memorándum' }))

    await waitFor(() => expect(postulacionesService.publicarMemorandumDesignacion).toHaveBeenCalledWith(7, 22, file))
    expect(await within(dialog).findByText(/Documento publicado y vigente/)).toBeInTheDocument()
    await waitFor(() => expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(postulacionesService.obtenerMemorandumsDesignacion).toHaveBeenCalledTimes(2))
    expect(postulacionesService.registrarDecisionAcademica).not.toHaveBeenCalled()
    expect(postulacionesService.registrarEvaluacionDefensa).not.toHaveBeenCalled()

    await userEvent.click(within(dialog).getAllByRole('button', { name: 'Cerrar' }).at(-1))
    summary = (await screen.findByRole('heading', { name: 'Qué debes hacer ahora' })).parentElement
    expect(within(summary).getAllByText('Programar defensa')).toHaveLength(2)
    expect(within(summary).queryByText('Publicar memorándum oficial')).not.toBeInTheDocument()
    expect(within(summary).queryByText(/Memorándum oficial de designación/)).not.toBeInTheDocument()
  })

  it('ofrece publicar una nueva versión cuando ya existe un memorándum vigente', async () => {
    const contracts = profileContracts({ assignedTribunals: [
      { id: 51, name: 'Tribunal Uno', order: 1 },
      { id: 52, name: 'Tribunal Dos', order: 2 },
      { id: 53, name: 'Tribunal Tres', order: 3 },
    ] })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.obtenerMemorandumsDesignacion.mockResolvedValue([{
      id: 8,
      vigente: true,
      fecha_publicacion: '2026-10-17T10:00:00Z',
      version: { id: 81, numero_version: 1, nombre_original: 'memorandum.pdf' },
    }])
    renderAssignmentManagerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    expect(await within(dialog).findByText(/Documento publicado y vigente/)).toBeInTheDocument()
    await userEvent.upload(within(dialog).getByLabelText('Archivo'), new File(['%PDF-1.4'], 'memorandum-v2.pdf', { type: 'application/pdf' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Publicar nueva versión' }))

    await waitFor(() => expect(postulacionesService.publicarMemorandumDesignacion).toHaveBeenCalledWith(
      7,
      22,
      expect.objectContaining({ name: 'memorandum-v2.pdf' }),
    ))
    expect(postulacionesService.registrarDecisionAcademica).not.toHaveBeenCalled()
  })

  it('muestra errores de publicación en el modal de gestión de actores', async () => {
    const contracts = profileContracts({
      assignedTribunals: [
        { id: 51, name: 'Tribunal Uno', order: 1 },
        { id: 52, name: 'Tribunal Dos', order: 2 },
      ],
    })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.publicarMemorandumDesignacion.mockRejectedValue({
      message: 'Revisa los datos de la asignación.',
      fields: { asignaciones: ['Se requieren los tres tribunales oficiales con órdenes 1, 2 y 3.'] },
    })
    renderAssignmentManagerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    await userEvent.upload(within(dialog).getByLabelText('Archivo'), new File(['%PDF-1.4'], 'memorandum.pdf', { type: 'application/pdf' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Publicar memorándum' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Revisa los datos de la asignación. Se requieren los tres tribunales oficiales con órdenes 1, 2 y 3.')
    expect(postulacionesService.registrarDecisionAcademica).not.toHaveBeenCalled()
  })

  it('indica cuando una publicación existente no está vigente', async () => {
    const contracts = profileContracts()
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.obtenerMemorandumsDesignacion.mockResolvedValue([{ id: 8, vigente: false, version: { id: 81, nombre_original: 'memorandum.pdf' } }])
    renderAssignmentManagerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    expect(await within(dialog).findByText('Existe una publicación, pero el documento no está vigente.')).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Descargar' })).not.toBeInTheDocument()
  })

  it('permite al estudiante consultar y descargar el memorándum vigente desde el expediente', async () => {
    const contracts = profileContracts()
    const published = {
      id: 8,
      vigente: true,
      fecha_publicacion: '2026-10-17T10:00:00Z',
      version: { id: 81, numero_version: 1, nombre_original: 'memorandum.pdf' },
    }
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.obtenerMemorandumsDesignacion.mockResolvedValue([published])
    renderStudentPage()

    const card = await screen.findByRole('heading', { name: 'Memorándum de designación de tribunales' })
    const memorandumCard = card.closest('section')
    expect(await within(memorandumCard).findByText(/Documento publicado y vigente/)).toBeInTheDocument()
    await userEvent.click(within(memorandumCard).getByRole('button', { name: 'Descargar' }))
    await waitFor(() => expect(postulacionesService.descargarVersion).toHaveBeenCalledWith(81, 'memorandum.pdf'))
  })

  it('dirige el contrato contextual del memorándum al modal de gestión de actores', async () => {
    const contracts = profileContracts()
    const memorandum = contracts.flow.gestion_decisiones_academicas.decisiones[0].memorandum_designacion
    contracts.flow.gestion_decisiones_academicas = {
      ...contracts.flow.gestion_decisiones_academicas,
      decisiones: [],
      memorandum_designacion_contextual: memorandum,
    }
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    renderAssignmentManagerPage('etapas')

    await userEvent.click(await screen.findByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    expect(within(dialog).getByLabelText('Archivo')).toBeInTheDocument()
    expect(within(dialog).getByText(/independiente del registro de la decisión académica/)).toBeInTheDocument()
  }, 15000)

  it('ofrece una única entrada genérica cuando la modalidad no declara posiciones', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: { ...response.detalle, modalidad_detalle: { codigo: 'TESIS_GRADO', nombre: 'Tesis de Grado' } },
      flujo: {
        ...response.flujo,
        modalidad: { codigo: 'TESIS_GRADO', nombre: 'Tesis de Grado' },
        gestion_actores: {},
        gestion_decisiones_academicas: { contexto: null, decisiones: [] },
        orientacion_etapa_actual: { requisitos: [] },
      },
    })
    renderAssignmentManagerPage()

    await userEvent.click(await screen.findByRole('tab', { name: 'Actores' }))
    const actors = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('section')
    expect(within(actors).getAllByRole('button', { name: 'Gestionar actores' })).toHaveLength(1)
    await userEvent.click(within(actors).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    expect(within(dialog).getByText('No hay posiciones de actores declaradas para este contexto.')).toBeInTheDocument()
    expect(within(dialog).queryByRole('combobox')).not.toBeInTheDocument()
    expect(within(actors).queryByRole('button', { name: /Conformar equipo|Asignar Tutor|Asignar Tribunal/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Decisiones académicas' })).not.toBeInTheDocument()
  })

  it('conserva el fallback genérico para requisitos distintos de Tribunal', async () => {
    const orientation = {
      mensaje: 'Completa el requisito documental.',
      requisitos: [{ tipo: 'DOCUMENTO', codigo: 'DOCUMENTO_FINAL', nombre: 'Documento Final', cumplido: false, estado_display: 'Pendiente', destino: '#documentos' }],
      siguiente_accion: { codigo: 'GESTIONAR_DOCUMENTOS', titulo: 'Gestionar documentos', descripcion: 'Carga el Documento Final.', estado: 'PENDIENTE', destino: '#documentos', accion_label: 'Ir a documentos' },
    }
    postulacionesService.obtenerDefensas.mockResolvedValue({ ...defensesResponse, results: [] })
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      flujo: { ...response.flujo, orientacion_etapa_actual: orientation },
    })
    renderApplicationManagerPage()

    const summary = (await screen.findByRole('heading', { name: 'Qué debes hacer ahora' })).parentElement
    expect(within(summary).getByRole('heading', { name: 'Siguiente acción' })).toBeInTheDocument()
    const goToDocuments = within(summary).getByRole('link', { name: 'Ir a documentos' })
    expect(goToDocuments).toHaveAttribute('href', '#documentos')
    expect(within(summary).getByRole('heading', { name: 'Requisitos de esta etapa' })).toBeInTheDocument()
    await userEvent.click(goToDocuments)
    expect(screen.getByRole('tab', { name: 'Documentos' })).toHaveAttribute('aria-selected', 'true')
    expect(window.location.hash).toBe('#documentos')
  })

  it.each([
    ['SIN_DOCUMENTO', false], ['SIN_DOCUMENTO', true], ['RECHAZADO', false],
    ['CORRECCION_REQUERIDA', true], ['CORRECCION_POST_APROBACION', false],
  ])('Perfil contextual de Tesis: abre con capacidad %s y tutor asignado %s sin duplicar consultas', async (code, tutor) => {
    postulacionesService.obtenerDocumentosAplicables.mockResolvedValue(profileThesisApplicable(code))
    renderProfileThesisAction({ tutor })
    const trigger = await screen.findByRole('button', { name: 'Ir a documentos' })
    await userEvent.click(trigger)
    const dialog = await screen.findByRole('dialog', { name: 'Cargar documentos' })
    expect(screen.getAllByRole('dialog', { name: 'Cargar documentos' })).toHaveLength(1)
    expect(within(dialog).getByText('Informe del tutor de Tesis')).toBeInTheDocument()
    expect(postulacionesService.obtenerDocumentosAplicables).toHaveBeenCalledExactlyOnceWith('53', expect.any(AbortSignal))
    expect(window.location.hash).toBe('#resumen')
    expect(postulacionesService.asignarActor).not.toHaveBeenCalled()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Cargar documentos' })).not.toBeInTheDocument())
    await waitFor(() => expect(trigger).toHaveFocus())
    expect(screen.getByText('Completa el tutor y los documentos requeridos del perfil.')).toBeInTheDocument()
  })

  it('Perfil contextual de Tesis: deriva a Actores cuando solo falta tutor, sin consultar tipos ni abrir un formulario', async () => {
    renderProfileThesisAction({ complete: true })
    const link = await screen.findByRole('link', { name: 'Ir a actores' })
    expect(link).toHaveAttribute('href', '#actores')
    expect(screen.queryByRole('button', { name: 'Ir a documentos' })).not.toBeInTheDocument()
    expect(postulacionesService.obtenerDocumentosAplicables).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  const profileTutorManagement = () => ({
    contexto: { tipo: 'ETAPA', codigo_etapa: 'PERFIL_TESIS', seguimiento_etapa: 156 },
    posiciones: [{
      clave: 'TUTOR_TESIS_1', nombre: 'Tutor de Tesis', tipo_participacion: 'TUTOR', ambito: 'POSTULACION',
      seguimiento_etapa: null, orden_cargo: null, estado_ocupacion: 'VACANTE', habilitada: true,
      asignacion_actual: null, asignacion_actual_detalle: null, acciones_permitidas: ['ASIGNAR'], bloqueo: null,
      precondicion: { codigo: 'TEMATICA_TESIS_APROBADA', enforcement: 'ACTIVO', estado: 'CUMPLIDA' },
    }],
  })

  const profileTutorCandidates = { count: 1, results: [{ id: 81, nombre_completo: 'Tutora elegible', elegible: true }] }

  const privateSecretaryManagement = () => ({
    contexto: { tipo: 'ETAPA', codigo_etapa: 'DEFENSA_PRIVADA', seguimiento_etapa: 160 },
    posiciones: [
      { ...profileTutorManagement().posiciones[0], estado_ocupacion: 'ASIGNADA', asignacion_actual: 59,
        asignacion_actual_detalle: { id: 59, usuario: { id: 45, nombre: 'Tutor vigente' } }, acciones_permitidas: ['REEMPLAZAR', 'FINALIZAR'] },
      { clave: 'DOCENTE_MODALIDAD_DEFENSA_PRIVADA_TESIS_1', nombre: 'Docente de Modalidad', tipo_participacion: 'DOCENTE_MODALIDAD',
        ambito: 'POSTULACION', seguimiento_etapa: null, orden_cargo: null, estado_ocupacion: 'VACANTE', habilitada: true,
        asignacion_actual: null, asignacion_actual_detalle: null, acciones_permitidas: ['ASIGNAR'], bloqueo: null, precondicion: null },
    ],
  })

  const renderPrivateSecretary = ({ management = privateSecretaryManagement(), canAssign = true, modality = 'TESIS_GRADO', stageCode = 'DEFENSA_PRIVADA', hash = 'resumen' } = {}) => {
    const stage = { id: 160, codigo: stageCode, nombre: 'Defensa Privada', estado: 'EN_PROCESO', activo: true, numero_intento: 1 }
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response,
      detalle: { ...response.detalle, id: 53, codigo: 'TG-2026-02', modalidad_detalle: { codigo: modality } },
      flujo: { ...response.flujo, modalidad: { codigo: modality }, etapa_actual: stage, etapas: [stage], gestion_actores: management,
        orientacion_etapa_actual: { requisitos: [{ codigo: 'PRECONDICIONES_DEFENSA', cumplido: false, destino: '#actores' }],
          siguiente_accion: { codigo: 'GESTIONAR_PRECONDICIONES', titulo: 'Completar precondiciones de defensa', descripcion: 'Precondición pendiente', estado: 'PENDIENTE', destino: '#actores', accion_label: 'Ir a precondiciones' } } },
    })
    selectInitialTab(hash)
    const permissions = ['puede_gestionar_postulaciones', ...(canAssign ? ['puede_gestionar_asignaciones'] : [])]
    return render(<AuthContext.Provider value={{ user: { id: 9 }, hasPermission: (name) => permissions.includes(name) }}><MemoryRouter initialEntries={['/postulaciones/53']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)
  }

  it('Gestionar actores muestra el alcance y el estado de cada puesto en palabras, sin códigos internos', async () => {
    const management = privateSecretaryManagement()
    management.posiciones.push({
      clave: 'TRIBUNAL_1', nombre: 'Tribunal 1', tipo_participacion: 'TRIBUNAL', ambito: 'ETAPA', seguimiento_etapa: 160, orden_cargo: 1,
      estado_ocupacion: 'VACANTE', habilitada: true, asignacion_actual: null, asignacion_actual_detalle: null, acciones_permitidas: ['ASIGNAR'], bloqueo: null, precondicion: null,
    })
    renderPrivateSecretary({ management })
    await userEvent.click(await screen.findByRole('link', { name: 'Ir a precondiciones' }))
    const dialog = await screen.findByRole('dialog', { name: 'Gestionar actores — Defensa Privada' })
    expect(within(dialog).queryByText(/DEFENSA_PRIVADA|POSTULACION|ETAPA|VACANTE|ASIGNADA|Orden 1/)).not.toBeInTheDocument()
    expect(within(dialog).getAllByText('Para toda la postulación')).toHaveLength(2)
    expect(within(dialog).getByText('Para esta etapa')).toBeInTheDocument()
    expect(within(dialog).getAllByText('Vacante')).toHaveLength(2)
    expect(within(dialog).getByText('Asignada')).toBeInTheDocument()
  })

  it('Secretario contextual de Tesis: abre desde Resumen sin POST y conserva cierre, foco y ambos puestos', async () => {
    renderPrivateSecretary()
    const trigger = await screen.findByRole('link', { name: 'Ir a precondiciones' })
    await userEvent.dblClick(trigger)
    const dialog = await screen.findByRole('dialog', { name: 'Gestionar actores — Defensa Privada' })
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(window.location.hash).toBe('#resumen')
    expect(within(dialog).getByText('Tutor vigente')).toBeVisible()
    expect(within(dialog).getByLabelText('Seleccionar candidato para Docente de Modalidad')).toBeVisible()
    expect(postulacionesService.obtenerCandidatosElegibles).toHaveBeenCalledWith(53, expect.objectContaining({ posicion: 'DOCENTE_MODALIDAD_DEFENSA_PRIVADA_TESIS_1', accion: 'ASIGNAR' }), expect.any(AbortSignal))
    expect(postulacionesService.obtenerCandidatosElegibles.mock.calls.filter(([, params]) => params.posicion === 'DOCENTE_MODALIDAD_DEFENSA_PRIVADA_TESIS_1')).toHaveLength(1)
    expect(postulacionesService.asignarActor).not.toHaveBeenCalled()
    expect(postulacionesService.reemplazarActor).not.toHaveBeenCalled()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(trigger).toHaveFocus())
    await userEvent.click(trigger)
    await userEvent.click(within(await screen.findByRole('dialog')).getByText('Cerrar', { selector: 'button' }))
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it.each([
    { canAssign: false }, { management: null }, { modality: 'PROYECTO_GRADO' }, { modality: 'TRABAJO_DIRIGIDO' },
    ...[
      { estado_ocupacion: 'ASIGNADA', asignacion_actual: 80 }, { habilitada: false }, { bloqueo: { codigo: 'BLOQUEO' } },
      { precondicion: { estado: 'PENDIENTE' } }, { acciones_permitidas: [] }, { ambito: 'ETAPA' }, { seguimiento_etapa: 160 },
      { tipo_participacion: 'SECRETARIO' }, { clave: 'OTRO_PUESTO' },
    ].map((changes) => { const management = privateSecretaryManagement(); Object.assign(management.posiciones[1], changes); return { management } }),
    { management: { ...privateSecretaryManagement(), contexto: { tipo: 'ETAPA', codigo_etapa: 'DEFENSA_PRIVADA', seguimiento_etapa: 999 } } },
    { management: { ...privateSecretaryManagement(), posiciones: [...privateSecretaryManagement().posiciones, privateSecretaryManagement().posiciones[1]] } },
  ])('Secretario contextual de Tesis: conserva navegación segura %j', async (options) => {
    renderPrivateSecretary(options)
    await userEvent.click(await screen.findByRole('link', { name: 'Ir a precondiciones' }))
    expect(window.location.hash).toBe('#actores')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(postulacionesService.asignarActor).not.toHaveBeenCalled()
  })

  it('Secretario contextual de Tesis: conserva apertura manual sin automatismo por hash', async () => {
    renderPrivateSecretary({ hash: 'actores' })
    const trigger = await screen.findByRole('button', { name: 'Gestionar actores' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await userEvent.click(trigger)
    expect(await screen.findByRole('dialog', { name: 'Gestionar actores — Defensa Privada' })).toBeVisible()
  })

  it('Secretario contextual de Tesis: conserva candidatos vacíos sin asignaciones automáticas', async () => {
    postulacionesService.obtenerCandidatosElegibles.mockResolvedValue({ count: 0, results: [] })
    renderPrivateSecretary()
    await userEvent.click(await screen.findByRole('link', { name: 'Ir a precondiciones' }))
    const dialog = await screen.findByRole('dialog')
    await waitFor(() => expect(within(dialog).getAllByText('No se encontraron candidatos elegibles.')).toHaveLength(2))
    expect(within(dialog).queryByRole('button', { name: 'Guardar asignaciones' })).not.toBeInTheDocument()
    expect(postulacionesService.asignarActor).not.toHaveBeenCalled()
  })

  it('Ocupaciones informativas: conserva habilitado al Tutor compatible y bloquea candidatos no elegibles incluso al enviar', async () => {
    postulacionesService.obtenerCandidatosElegibles.mockResolvedValue({ count: 2, results: [
      { id: 45, nombre_completo: 'Tutor compatible', elegible: true, asignaciones_vigentes: ['Tutor', 'Tribunal 1'] },
      { id: 82, nombre_completo: 'Docente incompatible', elegible: false, motivo_bloqueo: 'OCUPADO', asignaciones_vigentes: ['Docente de modalidad'] },
    ] })
    renderPrivateSecretary({ modality: 'TRABAJO_DIRIGIDO' })
    await userEvent.click(await screen.findByRole('link', { name: 'Ir a precondiciones' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Gestionar actores' }))
    const dialog = await screen.findByRole('dialog')
    const selector = within(dialog).getByLabelText('Seleccionar candidato para Docente de Modalidad')
    expect(await within(candidateList(selector)).findByRole('option', { name: /Tutor compatible.*Asignación vigente: Tutor, Tribunal 1/ })).toBeEnabled()
    expect(within(candidateList(selector)).getByRole('option', { name: /Docente incompatible.*Docente de modalidad/ })).toBeDisabled()
    selectCandidate(selector, '82')
    fireEvent.submit(dialog.querySelector('form'))
    expect(postulacionesService.asignarActor).not.toHaveBeenCalled()
    await chooseCandidate(selector, '45')
    expect(within(dialog).getByRole('button', { name: 'Guardar asignaciones' })).toBeEnabled()
  })

  it('Ocupaciones informativas: excluye del payload una selección que deja de ser elegible después de buscar', async () => {
    let stale = false
    postulacionesService.obtenerCandidatosElegibles.mockImplementation(async (_id, params) => ({ count: 1, results: [
      { id: 81, nombre_completo: 'Docente cambiante', elegible: params.posicion === 'TUTOR_TESIS_1' || !stale, asignaciones_vigentes: stale ? ['Tribunal 1'] : [], asignaciones_vigentes_detalle: [] },
    ] }))
    renderPrivateSecretary()
    await userEvent.click(await screen.findByRole('link', { name: 'Ir a precondiciones' }))
    const dialog = await screen.findByRole('dialog')
    const selector = within(dialog).getByLabelText('Seleccionar candidato para Docente de Modalidad')
    await within(candidateList(selector)).findByRole('option', { name: /Docente cambiante/ })
    await chooseCandidate(selector, '81')
    expect(within(dialog).getByRole('button', { name: 'Guardar asignaciones' })).toBeEnabled()
    stale = true
    await userEvent.type(within(dialog).getByLabelText('Seleccionar candidato para Docente de Modalidad'), 'Docente')
    await waitFor(() => expect(postulacionesService.obtenerCandidatosElegibles).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ search: 'Docente', page: 1 }), expect.any(AbortSignal)))
    await waitFor(() => expect(within(candidateList(within(dialog).getByLabelText('Seleccionar candidato para Docente de Modalidad'))).getByRole('option', { name: /Docente cambiante.*Tribunal 1/ })).toBeDisabled())
    fireEvent.submit(dialog.querySelector('form'))
    expect(postulacionesService.asignarActor).not.toHaveBeenCalled()
    expect(within(dialog).queryByRole('button', { name: 'Guardar asignaciones' })).not.toBeInTheDocument()
  })

  const secretaryOccupation = (overrides = {}) => ({ id: 59, postulacion: 53, usuario: 81, codigo_posicion: 'TUTOR_TESIS_1',
    tipo_participacion: 'TUTOR', ambito: 'POSTULACION', seguimiento_etapa: null, activo: true, ...overrides })

  const directedSecretaryOccupation = (overrides = {}) => secretaryOccupation({ postulacion: 54,
    codigo_posicion: 'TUTOR_TRABAJO_DIRIGIDO_1', ...overrides })

  const openDirectedSecretary = async ({ details = [], own = false, candidates, modality = 'TRABAJO_DIRIGIDO' } = {}) => {
    const management = privateSecretaryManagement()
    management.posiciones[0].clave = 'TUTOR_TRABAJO_DIRIGIDO_1'
    Object.assign(management.posiciones[1], { clave: 'DOCENTE_MODALIDAD_DEFENSA_PRIVADA_TD_1', ambito: 'ETAPA', seguimiento_etapa: 160 })
    if (own) Object.assign(management.posiciones[1], { estado_ocupacion: 'ASIGNADA', asignacion_actual: 88,
      asignacion_actual_detalle: { id: 88, usuario: { id: 81, nombre: 'Titular propio' } }, acciones_permitidas: ['REEMPLAZAR', 'FINALIZAR'] })
    const stage = { id: 160, codigo: 'DEFENSA_PRIVADA', nombre: 'Defensa Privada', estado: 'EN_PROCESO', activo: true, numero_intento: 1 }
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response,
      detalle: { ...response.detalle, id: 54, modalidad_detalle: { codigo: modality } },
      flujo: { ...response.flujo, etapa_actual: stage, etapas: [
        { id: 155, codigo: 'PERFIL_TRABAJO_DIRIGIDO', estado: 'APROBADA', activo: true, numero_intento: 2 },
        { id: 123, codigo: 'PERFIL_TRABAJO_DIRIGIDO', estado: 'APROBADA', activo: true, numero_intento: 1 }, stage,
      ], gestion_actores: management, orientacion_etapa_actual: null },
    })
    postulacionesService.obtenerCandidatosElegibles.mockImplementation(candidates || (() => Promise.resolve({ count: 2, results: [
      { id: 81, nombre_completo: 'Docente candidato', elegible: true, asignaciones_vigentes: details?.length ? ['Ocupación informada'] : [], asignaciones_vigentes_detalle: details },
      { id: 82, nombre_completo: 'Docente libre', elegible: true, asignaciones_vigentes_detalle: [] },
    ] })))
    renderAssignmentManagerPage('actores')
    await userEvent.click(await screen.findByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Defensa Privada' })
    const selector = within(dialog).getByLabelText(`${own ? 'Seleccionar reemplazo' : 'Seleccionar candidato'} para Docente de Modalidad`)
    await within(candidateList(selector)).findByRole('option', { name: /Docente candidato/ })
    return { dialog, selector }
  }

  it.each([
    ['Tutor', [directedSecretaryOccupation()], true],
    ...[1, 2, 3].map((order) => [`Tribunal ${order}`, [directedSecretaryOccupation({ tipo_participacion: 'TRIBUNAL', codigo_posicion: `TRIBUNAL_PROPUESTA_TD_${order}`, ambito: 'ETAPA', seguimiento_etapa: 155, orden_cargo: order })], true]),
    ['Libre', [], false], ['Inactiva', [directedSecretaryOccupation({ activo: false })], false],
    ['Otro expediente', [directedSecretaryOccupation({ postulacion: 999 })], false],
    ['Histórica', [directedSecretaryOccupation({ tipo_participacion: 'TRIBUNAL', codigo_posicion: 'TRIBUNAL_PROPUESTA_TD_1', ambito: 'ETAPA', seguimiento_etapa: 123 })], false],
    ['Otro tribunal', [directedSecretaryOccupation({ tipo_participacion: 'TRIBUNAL', codigo_posicion: 'TRIBUNAL_AJENO_1', ambito: 'ETAPA', seguimiento_etapa: 155 })], false],
    ['Otro rol', [directedSecretaryOccupation({ tipo_participacion: 'PRESIDENTE', codigo_posicion: 'PRESIDENTE_TD_1', ambito: 'ETAPA', seguimiento_etapa: 160 })], false],
    ['Información ausente', null, true],
  ])('Docente TD: verifica ocupación %s', async (_label, details, blocked) => {
    const { dialog, selector } = await openDirectedSecretary({ details })
    const option = within(candidateList(selector)).getByRole('option', { name: /Docente candidato/ })
    if (blocked) expect(option).toBeDisabled()
    else expect(option).toBeEnabled()
    expect(within(candidateList(selector)).getByRole('option', { name: 'Docente libre' })).toBeEnabled()
    if (details?.length) expect(option).toHaveAccessibleName(/Asignación vigente: Ocupación informada/)
    if (blocked) {
      selectCandidate(selector, '81')
      fireEvent.submit(dialog.querySelector('form'))
      expect(postulacionesService.asignarActor).not.toHaveBeenCalled()
    }
  })

  it('Docente TD: conserva al titular propio y el payload de un candidato libre', async () => {
    const { dialog, selector } = await openDirectedSecretary({ own: true, details: [directedSecretaryOccupation()] })
    expect(within(candidateList(selector)).getByRole('option', { name: /Docente candidato/ })).toBeEnabled()
    expect(within(dialog).getByText('Titular propio')).toBeVisible()
    await chooseCandidate(selector, '82')
    postulacionesService.reemplazarActor.mockRejectedValueOnce({ message: 'Validación backend de prueba' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar asignaciones' }))
    await waitFor(() => expect(postulacionesService.reemplazarActor).toHaveBeenCalledWith(88, { nuevo_usuario: 82, observaciones: '' }, expect.any(AbortSignal)))
  })

  it('Docente TD: actualiza drafts y evita enviar duplicados temporales', async () => {
    const { dialog, selector } = await openDirectedSecretary()
    const tutor = within(dialog).getByLabelText('Seleccionar reemplazo para Tutor de Tesis')
    const calls = postulacionesService.obtenerCandidatosElegibles.mock.calls.length
    await chooseCandidate(tutor, '81')
    expect(within(candidateList(selector)).getByRole('option', { name: /Docente candidato.*Seleccionado como/ })).toBeDisabled()
    await chooseCandidate(tutor, '82')
    expect(within(candidateList(selector)).getByRole('option', { name: 'Docente candidato' })).toBeEnabled()
    await chooseCandidate(tutor, '')
    expect(within(candidateList(selector)).getByRole('option', { name: 'Docente libre' })).toBeEnabled()
    await chooseCandidate(selector, '81')
    await chooseCandidate(tutor, '81')
    fireEvent.submit(dialog.querySelector('form'))
    expect(postulacionesService.asignarActor).not.toHaveBeenCalled()
    expect(postulacionesService.reemplazarActor).not.toHaveBeenCalled()
    expect(postulacionesService.obtenerCandidatosElegibles).toHaveBeenCalledTimes(calls)
  })

  it('Docente TD: conserva bloqueo en búsqueda y paginación', async () => {
    const { selector } = await openDirectedSecretary({ candidates: () => Promise.resolve({ count: 21, next: '?page=2', results: [
      { id: 81, nombre_completo: 'Docente candidato', elegible: true, asignaciones_vigentes_detalle: [directedSecretaryOccupation()] },
    ] }) })
    const section = selector.closest('section')
    await userEvent.type(within(section).getByRole('combobox'), 'Docente')
    await waitFor(() => expect(postulacionesService.obtenerCandidatosElegibles).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ search: 'Docente', page: 1 }), expect.any(AbortSignal)))
    expect(await within(candidateList(within(section).getByRole('combobox'))).findByRole('option', { name: /Docente candidato/ })).toBeDisabled()
    await userEvent.click(within(section).getByRole('button', { name: 'Siguiente' }))
    await waitFor(() => expect(postulacionesService.obtenerCandidatosElegibles).toHaveBeenCalledWith(54,
      expect.objectContaining({ posicion: 'DOCENTE_MODALIDAD_DEFENSA_PRIVADA_TD_1', page: 2, search: 'Docente' }), expect.any(AbortSignal)))
    expect(await within(candidateList(within(section).getByRole('combobox'))).findByRole('option', { name: /Docente candidato/ })).toBeDisabled()
  })

  it.each(['TESIS_GRADO', 'PROYECTO_GRADO'])('Docente TD: no extiende la prevención a %s', async (modality) => {
    const { selector } = await openDirectedSecretary({ modality, details: [directedSecretaryOccupation()] })
    expect(within(candidateList(selector)).getByRole('option', { name: /Docente candidato/ })).toBeEnabled()
  })

  it.each([
    ['Tutor', [secretaryOccupation()], true],
    ...[1, 2, 3].map((order) => [`Tribunal ${order}`, [secretaryOccupation({ codigo_posicion: `TRIBUNAL_TEMATICA_TESIS_${order}`, tipo_participacion: 'TRIBUNAL', ambito: 'ETAPA', seguimiento_etapa: 155 })], true]),
    ['Varias ocupaciones', [secretaryOccupation(), secretaryOccupation({ id: 60, codigo_posicion: 'DOCENTE_MODALIDAD_DEFENSA_PRIVADA_TESIS_1', tipo_participacion: 'DOCENTE_MODALIDAD' })], true],
    ['Sin ocupaciones', [], false], ['Inactiva', [secretaryOccupation({ activo: false })], false],
    ['Otro expediente', [secretaryOccupation({ postulacion: 54 })], false],
    ['Sin contrato', undefined, true], ['Ambiguo', [secretaryOccupation(), secretaryOccupation()], true],
    ['Sin posición', [secretaryOccupation({ codigo_posicion: null })], true], ['Otro usuario', [secretaryOccupation({ usuario: 82 })], true],
  ])('Prevención privada de Tesis: %s se resuelve por datos estructurados', async (label, details, blocked) => {
    postulacionesService.obtenerCandidatosElegibles.mockResolvedValue({ count: 1, results: [
      { id: 81, nombre_completo: 'Docente candidato', elegible: true, asignaciones_vigentes: [label], asignaciones_vigentes_detalle: details },
    ] })
    renderPrivateSecretary()
    await userEvent.click(await screen.findByRole('link', { name: 'Ir a precondiciones' }))
    const dialog = await screen.findByRole('dialog')
    const selector = within(dialog).getByLabelText('Seleccionar candidato para Docente de Modalidad')
    const option = await within(candidateList(selector)).findByRole('option', { name: new RegExp(`Docente candidato.*${label}`) })
    if (blocked) {
      expect(option).toBeDisabled()
      selectCandidate(selector, '81')
      fireEvent.submit(dialog.querySelector('form'))
      expect(postulacionesService.asignarActor).not.toHaveBeenCalled()
    } else expect(option).toBeEnabled()
    const tutor = within(dialog).getByLabelText('Seleccionar reemplazo para Tutor de Tesis')
    expect(await within(candidateList(tutor)).findByRole('option', { name: /Docente candidato/ })).toBeEnabled()
  })

  it('Prevención privada de Tesis: una ocupación nueva impide guardar aunque elegible siga siendo true', async () => {
    let occupied = false
    postulacionesService.obtenerCandidatosElegibles.mockImplementation(async () => ({ count: 1, results: [
      { id: 81, nombre_completo: 'Docente candidato', elegible: true, asignaciones_vigentes: occupied ? ['Tutor'] : [], asignaciones_vigentes_detalle: occupied ? [secretaryOccupation()] : [] },
    ] }))
    renderPrivateSecretary()
    await userEvent.click(await screen.findByRole('link', { name: 'Ir a precondiciones' }))
    const dialog = await screen.findByRole('dialog')
    const selector = within(dialog).getByLabelText('Seleccionar candidato para Docente de Modalidad')
    await within(candidateList(selector)).findByRole('option', { name: /Docente candidato/ })
    await chooseCandidate(selector, '81')
    expect(within(dialog).getByRole('button', { name: 'Guardar asignaciones' })).toBeEnabled()
    occupied = true
    // Cambiar la búsqueda solicita datos nuevos mediante el mecanismo existente.
    await userEvent.type(within(dialog).getByLabelText('Seleccionar candidato para Docente de Modalidad'), 'Docente')
    await waitFor(() => expect(postulacionesService.obtenerCandidatosElegibles).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ search: 'Docente', page: 1 }), expect.any(AbortSignal)))
    await waitFor(() => expect(within(candidateList(within(dialog).getByLabelText('Seleccionar candidato para Docente de Modalidad'))).getByRole('option', { name: /Docente candidato.*Tutor/ })).toBeDisabled())
    fireEvent.submit(dialog.querySelector('form'))
    expect(postulacionesService.asignarActor).not.toHaveBeenCalled()
  })

  it('Secretario contextual de Tesis: conserva errores, búsqueda, paginación y payload de postulación', async () => {
    let failed = false
    postulacionesService.obtenerCandidatosElegibles.mockImplementation(async (_id, params) => {
      if (params.posicion === 'TUTOR_TESIS_1') return { count: 0, results: [] }
      if (!failed) { failed = true; throw { message: 'Error al consultar Secretario.' } }
      return { count: 21, next: '?page=2', results: [{ id: 81, nombre_completo: 'Docente elegible', elegible: true, asignaciones_vigentes_detalle: [] }] }
    })
    postulacionesService.asignarActor.mockRejectedValueOnce({ message: 'Asignación rechazada por backend.' })
    renderPrivateSecretary()
    await userEvent.click(await screen.findByRole('link', { name: 'Ir a precondiciones' }))
    const dialog = await screen.findByRole('dialog')
    expect(await within(dialog).findByText('Error al consultar Secretario.')).toBeVisible()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Reintentar candidatos' }))
    await (await findCandidateOptionList(dialog, { name: /Docente elegible/ })).findByRole('option', { name: /Docente elegible/ })
    await userEvent.click(within(dialog).getAllByRole('button', { name: 'Siguiente' }).at(-1))
    await waitFor(() => expect(postulacionesService.obtenerCandidatosElegibles).toHaveBeenLastCalledWith(53, expect.objectContaining({ posicion: 'DOCENTE_MODALIDAD_DEFENSA_PRIVADA_TESIS_1', page: 2 }), expect.any(AbortSignal)))
    await (await findCandidateOptionList(dialog, { name: /Docente elegible/ })).findByRole('option', { name: /Docente elegible/ })
    await userEvent.type(within(dialog).getByLabelText('Seleccionar candidato para Docente de Modalidad'), 'Docente')
    await waitFor(() => expect(postulacionesService.obtenerCandidatosElegibles).toHaveBeenLastCalledWith(53, expect.objectContaining({ posicion: 'DOCENTE_MODALIDAD_DEFENSA_PRIVADA_TESIS_1', search: 'Docente', page: 1 }), expect.any(AbortSignal)))
    await (await findCandidateOptionList(dialog, { name: /Docente elegible/ })).findByRole('option', { name: /Docente elegible/ })
    await chooseCandidate(within(dialog).getByLabelText('Seleccionar candidato para Docente de Modalidad'), '81')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar asignaciones' }))
    expect(postulacionesService.asignarActor).toHaveBeenCalledExactlyOnceWith(53, { usuario: 81, tipo_participacion: 'DOCENTE_MODALIDAD', observaciones: '' }, expect.any(AbortSignal))
    expect(await within(dialog).findByText('Asignación rechazada por backend.')).toBeVisible()
    expect(within(dialog).getByText('Tutor vigente')).toBeVisible()
    expect(postulacionesService.reemplazarActor).not.toHaveBeenCalled()
  })

  it.each(['Ir a gestionar', 'Ir a actores'])('Tutor contextual de Tesis: abre desde %s, conserva foco y evita aperturas duplicadas', async (label) => {
    postulacionesService.obtenerCandidatosElegibles.mockResolvedValue(profileTutorCandidates)
    renderProfileThesisAction({ complete: true, actorManagement: profileTutorManagement() })
    const trigger = await screen.findByRole('link', { name: label })
    await userEvent.dblClick(trigger)
    const dialog = await screen.findByRole('dialog', { name: 'Gestionar actores — Perfil de Tesis' })
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(window.location.hash).toBe('#resumen')
    const selector = within(dialog).getByLabelText('Seleccionar candidato para Tutor de Tesis')
    expect(await within(candidateList(selector)).findByRole('option', { name: /Tutora elegible/ })).toBeEnabled()
    expect(postulacionesService.obtenerCandidatosElegibles).toHaveBeenCalledExactlyOnceWith(53, expect.objectContaining({ posicion: 'TUTOR_TESIS_1', accion: 'ASIGNAR' }), expect.any(AbortSignal))
    expect(postulacionesService.obtenerDocumentosAplicables).not.toHaveBeenCalled()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(trigger).toHaveFocus())
    await userEvent.click(trigger)
    await userEvent.click(within(await screen.findByRole('dialog')).getByText('Cerrar', { selector: 'button' }))
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it('Tutor contextual de Tesis: usa el payload canónico de postulación y conserva errores backend', async () => {
    postulacionesService.obtenerCandidatosElegibles.mockResolvedValue(profileTutorCandidates)
    postulacionesService.asignarActor.mockRejectedValueOnce({ message: 'La asignación no está permitida.' })
    renderProfileThesisAction({ actorManagement: profileTutorManagement() })
    await userEvent.click(await screen.findByRole('link', { name: 'Ir a gestionar' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Tesis' })
    const selector = within(dialog).getByLabelText('Seleccionar candidato para Tutor de Tesis')
    await within(candidateList(selector)).findByRole('option', { name: /Tutora elegible/ })
    await chooseCandidate(selector, '81')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar asignaciones' }))
    expect(postulacionesService.asignarActor).toHaveBeenCalledExactlyOnceWith(53, { usuario: 81, tipo_participacion: 'TUTOR', observaciones: '' }, expect.any(AbortSignal))
    expect(await within(dialog).findByText('La asignación no está permitida.')).toBeInTheDocument()
    expect(postulacionesService.reemplazarActor).not.toHaveBeenCalled()
    expect(postulacionesService.obtenerDocumentosAplicables).not.toHaveBeenCalled()
  })

  it.each([
    ['sin contrato', (contract) => { delete contract.contexto }],
    ['sin posiciones', (contract) => { contract.posiciones = [] }],
    ['ambiguo', (contract) => { contract.posiciones.push({ ...contract.posiciones[0], clave: 'OTRO_TUTOR' }) }],
    ['otra etapa', (contract) => { contract.contexto.codigo_etapa = 'TEMATICA_TESIS' }],
    ['otro seguimiento', (contract) => { contract.contexto.seguimiento_etapa = 999 }],
    ['sin seguimiento', (contract) => { delete contract.contexto.seguimiento_etapa }],
    ['otro puesto', (contract) => { contract.posiciones[0].clave = 'TUTOR_PROYECTO_1' }],
    ['otro ámbito', (contract) => { contract.posiciones[0].ambito = 'ETAPA' }],
    ['seguimiento en tutor', (contract) => { contract.posiciones[0].seguimiento_etapa = 156 }],
    ['asignado', (contract) => { Object.assign(contract.posiciones[0], { estado_ocupacion: 'ASIGNADA', asignacion_actual: 98, acciones_permitidas: ['REEMPLAZAR'] }) }],
    ['asignación incoherente', (contract) => { contract.posiciones[0].asignacion_actual = 98 }],
    ['deshabilitado', (contract) => { contract.posiciones[0].habilitada = false }],
    ['sin ASIGNAR', (contract) => { contract.posiciones[0].acciones_permitidas = [] }],
    ['bloqueado', (contract) => { contract.posiciones[0].bloqueo = { codigo: 'BLOQUEO', mensaje: 'No permitido' } }],
    ['precondición pendiente', (contract) => { contract.posiciones[0].precondicion.estado = 'PENDIENTE' }],
  ])('Tutor contextual de Tesis: conserva navegación ante contrato %s', async (_label, change) => {
    const contract = profileTutorManagement()
    change(contract)
    renderProfileThesisAction({ complete: true, actorManagement: contract })
    for (const label of ['Ir a gestionar', 'Ir a actores']) {
      const link = await screen.findByRole('link', { name: label })
      expect(link).toHaveAttribute('href', '#actores')
      const click = new MouseEvent('click', { bubbles: true, cancelable: true })
      fireEvent(link, click)
      expect(window.location.hash).toBe('#actores')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      await userEvent.click(screen.getByRole('tab', { name: 'Resumen' }))
    }
    expect(postulacionesService.obtenerCandidatosElegibles).not.toHaveBeenCalled()
    expect(postulacionesService.reemplazarActor).not.toHaveBeenCalled()
  })

  it.each([{ canAssign: false }, { tutor: true }, { modality: 'PROYECTO_GRADO' }, { modality: 'TRABAJO_DIRIGIDO' }, { stageCode: 'INSCRIPCION' }])('Tutor contextual de Tesis: no intercepta otros permisos o contextos %j', async (options) => {
    renderProfileThesisAction({ actorManagement: profileTutorManagement(), ...options })
    const link = await screen.findByRole('link', { name: 'Ir a gestionar' })
    const click = new MouseEvent('click', { bubbles: true, cancelable: true })
    fireEvent(link, click)
    expect(window.location.hash).toBe('#actores')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(postulacionesService.obtenerCandidatosElegibles).not.toHaveBeenCalled()
  })

  it('Tutor contextual de Tesis: conserva la apertura manual y no abre por hash', async () => {
    postulacionesService.obtenerCandidatosElegibles.mockResolvedValue({ count: 0, results: [] })
    renderProfileThesisAction({ actorManagement: profileTutorManagement(), hash: 'actores' })
    const trigger = await screen.findByRole('button', { name: 'Gestionar actores' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(postulacionesService.obtenerCandidatosElegibles).not.toHaveBeenCalled()
    await userEvent.click(trigger)
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Tesis' })
    expect(await within(dialog).findByText('No se encontraron candidatos elegibles.')).toBeInTheDocument()
    await userEvent.click(within(dialog).getByText('Cerrar', { selector: 'button' }))
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it('Tutor contextual de Tesis: conserva error, reintento, búsqueda y paginación de candidatos', async () => {
    postulacionesService.obtenerCandidatosElegibles.mockRejectedValueOnce({ message: 'No fue posible consultar candidatos.' }).mockResolvedValue({ ...profileTutorCandidates, count: 21, next: '?page=2' })
    renderProfileThesisAction({ actorManagement: profileTutorManagement() })
    await userEvent.click(await screen.findByRole('link', { name: 'Ir a gestionar' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Tesis' })
    expect(await within(dialog).findByText('No fue posible consultar candidatos.')).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Reintentar candidatos' }))
    await (await findCandidateOptionList(dialog, { name: /Tutora elegible/ })).findByRole('option', { name: /Tutora elegible/ })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Siguiente' }))
    await waitFor(() => expect(postulacionesService.obtenerCandidatosElegibles).toHaveBeenLastCalledWith(53, expect.objectContaining({ posicion: 'TUTOR_TESIS_1', page: 2 }), expect.any(AbortSignal)))
    await (await findCandidateOptionList(dialog, { name: /Tutora elegible/ })).findByRole('option', { name: /Tutora elegible/ })
    await userEvent.type(within(dialog).getByLabelText('Seleccionar candidato para Tutor de Tesis'), 'Tutora')
    await waitFor(() => expect(postulacionesService.obtenerCandidatosElegibles).toHaveBeenLastCalledWith(53, expect.objectContaining({ posicion: 'TUTOR_TESIS_1', search: 'Tutora', page: 1 }), expect.any(AbortSignal)))
  })

  it.each([{ incompleteTribunal: true }, { canManage: false }, { ambiguous: true }, { blocked: true }, { documentError: true }, { status: 'PENDIENTE' }, { modality: 'PROYECTO_GRADO' }, { modality: 'TRABAJO_DIRIGIDO' }])('Tribunal contextual de Tesis: conserva navegación segura %j', async (options) => {
    renderTutorDictamenContext({ type: 'TRIBUNAL', ...options })
    const trigger = await screen.findByRole('link', { name: 'Ir a registrar dictamen' })
    await waitFor(() => expect(screen.queryByText('Cargando dictámenes…')).not.toBeInTheDocument())
    await userEvent.click(trigger)
    expect(window.location.hash).toBe('#dictamen-tribunal')
    expect(screen.queryByRole('dialog', { hidden: true })).not.toBeInTheDocument()
    expect(postulacionesService.registrarDictamenRevision).not.toHaveBeenCalled()
  })

  it('Tribunal contextual de Tesis: conserva apertura manual sin automatismo por hash', async () => {
    renderTutorDictamenContext({ type: 'TRIBUNAL', hash: 'dictamen-tribunal' })
    const trigger = await screen.findByRole('button', { name: 'Registrar dictamen' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await userEvent.click(trigger)
    expect(screen.getByRole('dialog', { name: 'Dictamen del Tribunal' })).toBeVisible()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it('muestra la revisión de tribunal cuando esa etapa es la actual', async () => {
    const reviewStage = { id: 14, codigo: 'REVISION_TRIBUNAL_PREVIA', nombre: 'Revisión de Tribunal Previa', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: { ...response.flujo, etapa_actual: reviewStage, etapas: [reviewStage], orientacion_etapa_actual: futureProfileOrientation } })
    renderPage('resumen')

    expect(await screen.findByText('Orientación del expediente')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Revisión de Tribunal Previa', level: 2 })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Documentos' }))
    const reviewHeading = await screen.findByRole('heading', { name: 'Revisión de Tribunal Previa', level: 2 })
    expect(reviewHeading.closest('details')).toBeNull()
  })

  it('consulta y separa actores vigentes e históricos con etiquetas y advertencias contractuales', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerActores.mockImplementation((_id, activo) => Promise.resolve(activo ? activeActorsResponse : historicalActorsResponse))
    renderPage('actores')
    const card = (await screen.findByRole('heading', { name: 'Gestión de actores' })).parentElement
    expect(within(card).getByRole('heading', { name: 'Participación actual' })).toBeInTheDocument()
    expect(within(card).getByRole('heading', { name: 'Participaciones anteriores' })).toBeInTheDocument()
    for (const label of ['Tutor', 'Tribunal', 'Docente de modalidad', 'Presidente', 'Secretario']) expect(within(card).getAllByText(new RegExp(`^${label}(?: \\d+)?$`)).length).toBeGreaterThan(0)
    expect(within(card).getAllByText('Vigente')).toHaveLength(5)
    expect(within(card).getAllByText('Anterior').length).toBeGreaterThan(0)
    expect(within(card).getByText('Tutor Uno')).toBeInTheDocument()
    expect(within(card).getByText('Perfil de Proyecto')).toBeInTheDocument()
    expect(within(card).getByText('Acompañamiento técnico')).toBeInTheDocument()
    expect(within(card).getAllByText('Sin etapa asociada').length).toBeGreaterThan(0)
    expect(within(card).getAllByText('Sin observaciones').length).toBeGreaterThan(0)
    expect(within(card).getAllByText('No registrada').length).toBeGreaterThan(0)
    expect(within(card).queryByLabelText('Advertencias sobre las asignaciones')).not.toBeInTheDocument()
    expect(within(card).queryByText(/no sustituye un memorando/i)).not.toBeInTheDocument()
    expect(within(card).queryByText(/participación finalizada/i)).not.toBeInTheDocument()
    expect(postulacionesService.obtenerActores).toHaveBeenCalledWith('7', true, 1, expect.any(AbortSignal))
    expect(postulacionesService.obtenerActores).toHaveBeenCalledWith('7', false, 1, expect.any(AbortSignal))
    expect(postulacionesService.obtenerActores).toHaveBeenCalledTimes(2)
    expect(within(card).queryByRole('button', { name: /asignar|reemplazar|finalizar|designar/i })).not.toBeInTheDocument()
  })

  const thesisTribunalCandidates = [40, 41, 42].map((id) => ({ id, nombre_completo: `Docente ${id}`, elegible: true }))

  const openThesisTribunal = async ({ assigned = false, configure, candidates, modality = 'TESIS_GRADO', stageCode = 'TEMATICA_TESIS' } = {}) => {
    const { flow } = profileContracts({ proposalApproved: true })
    const stage = { ...flow.etapa_actual, codigo: stageCode, nombre: 'Temática de Tesis' }
    const positions = flow.gestion_actores.posiciones.map((position) => ({
      ...position,
      clave: position.tipo_participacion === 'TRIBUNAL' ? `TRIBUNAL_TEMATICA_TESIS_${position.orden_cargo}` : 'TUTOR_TESIS_1',
      restriccion_identidad: null,
    }))
    if (assigned) Object.assign(positions[0], {
      estado_ocupacion: 'ASIGNADA', asignacion_actual: 901,
      asignacion_actual_detalle: { id: 901, usuario: { id: 99, nombre: 'Docente guardado' } },
      acciones_permitidas: ['REEMPLAZAR', 'FINALIZAR'],
    })
    configure?.(positions)
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: { ...response.detalle, modalidad_detalle: { codigo: modality, nombre: modality } },
      flujo: { ...flow, modalidad: { codigo: modality }, etapa_actual: stage, etapas: [stage],
        orientacion_etapa_actual: null, gestion_decisiones_academicas: {},
        gestion_actores: { contexto: { codigo_etapa: stage.codigo }, posiciones: positions } },
    })
    postulacionesService.obtenerCandidatosElegibles.mockImplementation(candidates || (() => Promise.resolve({ count: 3, results: thesisTribunalCandidates })))
    renderAssignmentManagerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Temática de Tesis' })
    const selectors = [1, 2, 3].map((order) => within(dialog).getByLabelText(`${positions[order - 1].estado_ocupacion === 'ASIGNADA' ? 'Seleccionar reemplazo' : 'Seleccionar candidato'} para Tribunal ${order}`))
    await Promise.all(selectors.map((selector) => within(candidateList(selector)).findByRole('option', { name: /Docente 40/ })))
    return { dialog, selectors }
  }

  it('Tesis: bloquea los tres puestos cruzados, conserva etiquetas y libera cambios y limpieza', async () => {
    const { selectors } = await openThesisTribunal()
    for (const [index, selector] of selectors.entries()) {
      await chooseCandidate(selector, String(40 + index))
      expect(within(candidateList(selector)).getByRole('option', { name: `Docente ${40 + index}` })).toBeEnabled()
      for (const other of selectors.filter((item) => item !== selector)) {
        const option = within(candidateList(other)).getByRole('option', { name: new RegExp(`Docente ${40 + index}.*Seleccionado como Tribunal ${index + 1}`) })
        expect(option).toBeDisabled()
        const previous = other.getAttribute('data-value') ?? ''
        await chooseCandidate(other, String(40 + index))
        expectCandidateValue(other, previous)
      }
    }
    await chooseCandidate(selectors[0], '')
    expect(within(candidateList(selectors[1])).getByRole('option', { name: 'Docente 40' })).toBeEnabled()
    await chooseCandidate(selectors[1], '40')
    expect(within(candidateList(selectors[0])).getByRole('option', { name: 'Docente 41' })).toBeEnabled()
    expect(within(candidateList(selectors[2])).getByRole('option', { name: /Docente 40.*Tribunal 2/ })).toBeDisabled()
    expect(postulacionesService.asignarActor).not.toHaveBeenCalled()
  })

  it('Tesis: rechaza localmente drafts duplicados incluso ante un cambio sintético', async () => {
    const { dialog, selectors } = await openThesisTribunal()
    await chooseCandidate(selectors[0], '40')
    // La opción bloqueada no se puede elegir, ni siquiera forzando el clic: el duplicado no llega a crearse.
    selectCandidate(selectors[1], '40')
    expectCandidateValue(selectors[1], '')
    expect(within(dialog).queryByText(/La misma persona está seleccionada en Tribunal 1 y Tribunal 2/)).not.toBeInTheDocument()
    fireEvent.submit(selectors[0].closest('form'))
    // Solo se envían asignaciones válidas: ninguna persona aparece dos veces.
    const sentUsers = postulacionesService.asignarActor.mock.calls.map(([, payload]) => payload?.usuario)
    expect(new Set(sentUsers).size).toBe(sentUsers.length)
  })

  it('Tesis: mantiene independientes tutor y tribunales de otros contextos', async () => {
    const { dialog, selectors } = await openThesisTribunal({ configure: (positions) => {
      positions.push({ ...positions[2], clave: 'OTRO_TRIBUNAL', nombre: 'Otro tribunal', seguimiento_etapa: 999 })
      positions.push({ ...positions[2], clave: 'SIN_CONTEXTO', nombre: 'Tribunal sin contexto', seguimiento_etapa: null })
    } })
    await chooseCandidate(selectors[0], '40')
    for (const name of ['Tutor', 'Otro tribunal', 'Tribunal sin contexto']) {
      const selector = within(dialog).getByLabelText(`Seleccionar candidato para ${name}`)
      expect(await within(candidateList(selector)).findByRole('option', { name: /Docente 40/ })).toBeEnabled()
      await chooseCandidate(selector, '40')
    }
    expect(within(dialog).queryByText(/La misma persona está seleccionada/)).not.toBeInTheDocument()
    expect(within(candidateList(selectors[1])).getByRole('option', { name: /Docente 40/ })).toBeDisabled()
  })

  it('Tesis: conserva asignación guardada, bloqueo de elegibilidad y reemplazo con payload compatible', async () => {
    postulacionesService.reemplazarActor.mockRejectedValueOnce({ message: 'El usuario ya tiene una asignación activa como TRIBUNAL en el mismo contexto.' })
    const { dialog, selectors } = await openThesisTribunal({ assigned: true, candidates: () => Promise.resolve({ count: 3, results: [
      ...thesisTribunalCandidates.slice(0, 2), { id: 42, nombre_completo: 'Docente 42', elegible: false },
    ] }) })
    expect(within(dialog).getByText('Docente guardado')).toBeInTheDocument()
    expect(within(candidateList(selectors[1])).queryByRole('option', { name: 'Docente guardado' })).not.toBeInTheDocument()
    expect(within(candidateList(selectors[1])).getByRole('option', { name: 'Docente 42' })).toBeDisabled()
    await chooseCandidate(selectors[0], '40')
    expect(within(candidateList(selectors[1])).getByRole('option', { name: /Docente 40.*Tribunal 1/ })).toBeDisabled()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar asignaciones' }))
    expect(postulacionesService.reemplazarActor).toHaveBeenCalledWith(901, {
      nuevo_usuario: 40, observaciones: '',
    }, expect.any(AbortSignal))
    expect(await within(dialog).findByText(/El usuario ya tiene una asignación activa/)).toBeInTheDocument()
  })

  it('Tesis: conserva bloqueo y selección propia al buscar y paginar sin consultar al cambiar drafts', async () => {
    const { dialog, selectors } = await openThesisTribunal({ candidates: (_id, filters) => Promise.resolve({
      count: filters.posicion === 'TRIBUNAL_TEMATICA_TESIS_2' ? 21 : 3,
      next: filters.posicion === 'TRIBUNAL_TEMATICA_TESIS_2' && filters.page === 1 ? '?page=2' : null,
      previous: filters.page === 2 ? '?page=1' : null,
      results: filters.search ? thesisTribunalCandidates.slice(1) : thesisTribunalCandidates,
    }) })
    const calls = postulacionesService.obtenerCandidatosElegibles.mock.calls.length
    await chooseCandidate(selectors[0], '40')
    expect(postulacionesService.obtenerCandidatosElegibles).toHaveBeenCalledTimes(calls)
    const secondSection = selectors[1].closest('section')
    const firstSection = selectors[0].closest('section')
    await userEvent.click(within(secondSection).getByRole('button', { name: 'Siguiente' }))
    expect(await within(candidateList(within(secondSection).getByRole('combobox'))).findByRole('option', { name: /Docente 40.*Tribunal 1/ })).toBeDisabled()
    await userEvent.type(within(dialog).getByLabelText('Seleccionar candidato para Tribunal 1'), 'Docente 41')
    const own = await within(candidateList(within(firstSection).getByRole('combobox'))).findByRole('option', { name: 'Docente 40' })
    expect(own).toBeEnabled()
    expectCandidateValue(within(firstSection).getByLabelText('Seleccionar candidato para Tribunal 1'), '40')
  })

  it.each(['TESIS_GRADO', 'PROYECTO_GRADO', 'TRABAJO_DIRIGIDO'].flatMap((modality) => [1, 2, 3].map((order) => [modality, order])))('tribunal guardado %s: puesto %s bloquea los otros y rechaza un cambio sintético', async (modality, order) => {
    const { dialog, selectors } = await openThesisTribunal({ modality, stageCode: 'REVISION_TRIBUNAL', configure: (positions) => {
      Object.assign(positions[order - 1], {
        estado_ocupacion: 'ASIGNADA', asignacion_actual: 900 + order,
        asignacion_actual_detalle: { id: 900 + order, usuario: { id: 40, nombre: 'Docente 40' } },
        acciones_permitidas: ['REEMPLAZAR', 'FINALIZAR'],
      })
    } })
    const own = within(dialog).getByLabelText(`Seleccionar reemplazo para Tribunal ${order}`)
    expect(within(candidateList(own)).getByRole('option', { name: 'Docente 40' })).toBeEnabled()
    for (const other of selectors.filter((_, index) => index !== order - 1)) {
      expect(within(candidateList(other)).getByRole('option', { name: /Docente 40.*Seleccionado como Tribunal/ })).toBeDisabled()
      expect(within(candidateList(other)).getByRole('option', { name: 'Docente 41' })).toBeEnabled()
    }
    const other = selectors[order % 3]
    selectCandidate(other, '40')
    fireEvent.submit(other.closest('form'))
    expect(postulacionesService.asignarActor).not.toHaveBeenCalled()
    expect(postulacionesService.reemplazarActor).not.toHaveBeenCalled()
  })

  it('tribunal guardado: otros seguimientos y ocupaciones externas no bloquean candidatos', async () => {
    const { selectors } = await openThesisTribunal({ configure: (positions) => {
      Object.assign(positions[0], { seguimiento_etapa: 999, estado_ocupacion: 'ASIGNADA',
        asignacion_actual_detalle: { usuario: { id: 40 } }, acciones_permitidas: ['REEMPLAZAR'] })
    }, candidates: () => Promise.resolve({ count: 3, results: thesisTribunalCandidates.map((candidate) => ({
      ...candidate, asignaciones_vigentes: ['Tutor', 'Tribunal 1 de otro expediente'],
      asignaciones_vigentes_detalle: [{ usuario: candidate.id, postulacion: 999, seguimiento_etapa: 888, tipo_participacion: 'TRIBUNAL', activo: true }],
    })) }) })
    for (const selector of selectors) expect(within(candidateList(selector)).getByRole('option', { name: /Docente 40/ })).toBeEnabled()
  })

  const openDirectedTutor = async ({ assigned = true, own = false, candidates } = {}) => {
    const result = await openThesisTribunal({ modality: 'TRABAJO_DIRIGIDO', stageCode: 'PERFIL_TRABAJO_DIRIGIDO',
      candidates: candidates || (() => Promise.resolve({ count: 4, results: [...thesisTribunalCandidates, { id: 43, nombre_completo: 'Docente libre', elegible: true }] })),
      configure: (positions) => {
        positions[3].clave = 'TUTOR_TRABAJO_DIRIGIDO_1'
        if (assigned) positions.slice(0, 3).forEach((position, index) => Object.assign(position, {
          estado_ocupacion: 'ASIGNADA', asignacion_actual: 910 + index,
          asignacion_actual_detalle: { usuario: { id: 40 + index, nombre: `Docente ${40 + index}` } },
          acciones_permitidas: ['REEMPLAZAR', 'FINALIZAR'],
        }))
        if (own) Object.assign(positions[3], { estado_ocupacion: 'ASIGNADA', asignacion_actual: 920,
          asignacion_actual_detalle: { usuario: { id: 40, nombre: 'Tutor actual' } }, acciones_permitidas: ['REEMPLAZAR', 'FINALIZAR'] })
      },
    })
    const tutor = within(result.dialog).getByLabelText(`${own ? 'Seleccionar reemplazo' : 'Seleccionar candidato'} para Tutor`)
    await within(candidateList(tutor)).findByRole('option', { name: /Docente 40/ })
    return { ...result, tutor }
  }

  it('Tutor TD: bloquea los tres tribunales guardados y evita enviar una selección forzada', async () => {
    const { tutor } = await openDirectedTutor()
    for (const id of [40, 41, 42]) expect(within(candidateList(tutor)).getByRole('option', { name: new RegExp(`Docente ${id}.*Tribunal ${id - 39}`) })).toBeDisabled()
    expect(within(candidateList(tutor)).getByRole('option', { name: 'Docente libre' })).toBeEnabled()
    selectCandidate(tutor, '40')
    fireEvent.submit(tutor.closest('form'))
    expect(postulacionesService.asignarActor).not.toHaveBeenCalled()
    expect(postulacionesService.reemplazarActor).not.toHaveBeenCalled()
  })

  it('Tutor TD: actualiza el bloqueo con cambios temporales y limpieza sin nuevas consultas', async () => {
    const { tutor, selectors } = await openDirectedTutor({ assigned: false })
    const calls = postulacionesService.obtenerCandidatosElegibles.mock.calls.length
    await chooseCandidate(selectors[0], '40')
    expect(within(candidateList(tutor)).getByRole('option', { name: /Docente 40.*Tribunal 1/ })).toBeDisabled()
    await chooseCandidate(selectors[0], '41')
    expect(within(candidateList(tutor)).getByRole('option', { name: 'Docente 40' })).toBeEnabled()
    expect(within(candidateList(tutor)).getByRole('option', { name: /Docente 41.*Tribunal 1/ })).toBeDisabled()
    await chooseCandidate(selectors[0], '')
    expect(within(candidateList(tutor)).getByRole('option', { name: 'Docente 41' })).toBeEnabled()
    expect(postulacionesService.obtenerCandidatosElegibles).toHaveBeenCalledTimes(calls)
  })

  it('Tutor TD: preserva al titular propio y no bloquea ocupaciones externas ni otros roles', async () => {
    const { tutor } = await openDirectedTutor({ own: true, candidates: () => Promise.resolve({ count: 4, results: [
      ...thesisTribunalCandidates, { id: 43, nombre_completo: 'Otro expediente y Docente de modalidad', elegible: true,
        asignaciones_vigentes: ['Tribunal 1', 'Docente de modalidad'],
        asignaciones_vigentes_detalle: [{ id: 999, usuario: 43, postulacion: 999, tipo_participacion: 'TRIBUNAL', activo: true }] },
    ] }) })
    expect(within(candidateList(tutor)).getByRole('option', { name: 'Docente 40' })).toBeEnabled()
    expect(within(candidateList(tutor)).getByRole('option', { name: /Otro expediente/ })).toBeEnabled()
    await chooseCandidate(tutor, '40')
    expectCandidateValue(tutor, '40')
  })

  it('Tutor TD: conserva el bloqueo al buscar y paginar', async () => {
    const { tutor } = await openDirectedTutor({ candidates: () => Promise.resolve({ count: 21, next: '?page=2', results: thesisTribunalCandidates }) })
    const section = tutor.closest('section')
    await userEvent.type(within(section).getByRole('combobox'), 'Docente')
    await waitFor(() => expect(postulacionesService.obtenerCandidatosElegibles).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ search: 'Docente', page: 1 }), expect.any(AbortSignal)))
    expect(await within(candidateList(within(section).getByRole('combobox'))).findByRole('option', { name: /Docente 40.*Tribunal 1/ })).toBeDisabled()
    await userEvent.click(within(section).getByRole('button', { name: 'Siguiente' }))
    await waitFor(() => expect(postulacionesService.obtenerCandidatosElegibles).toHaveBeenCalledWith(7,
      expect.objectContaining({ posicion: 'TUTOR_TRABAJO_DIRIGIDO_1', page: 2, search: 'Docente' }), expect.any(AbortSignal)))
    expect(await within(candidateList(within(section).getByRole('combobox'))).findByRole('option', { name: /Docente 40.*Tribunal 1/ })).toBeDisabled()
  })

  it('Tutor TD: rechaza duplicados temporales incluso si el Tutor se selecciona primero', async () => {
    const { tutor, selectors, dialog } = await openDirectedTutor({ assigned: false })
    await chooseCandidate(tutor, '40')
    await chooseCandidate(selectors[0], '40')
    expect(within(candidateList(tutor)).getByRole('option', { name: /Docente 40.*Tribunal 1/ })).toBeDisabled()
    expect(within(dialog).getByRole('alert')).toHaveTextContent(/La misma persona/)
    fireEvent.submit(tutor.closest('form'))
    expect(postulacionesService.asignarActor).not.toHaveBeenCalled()
  })

  it.each([
    ['PROYECTO_GRADO', 'PERFIL_PROYECTO'], ['TESIS_GRADO', 'TEMATICA_TESIS'],
    ['TRABAJO_DIRIGIDO', 'DEFENSA_PRIVADA'],
  ])('Tutor TD: no extiende la prevención a %s en %s', async (modality, stageCode) => {
    const { dialog } = await openThesisTribunal({ modality, stageCode, configure: (positions) => {
      positions[3].clave = 'TUTOR_TRABAJO_DIRIGIDO_1'
      Object.assign(positions[0], { estado_ocupacion: 'ASIGNADA', asignacion_actual: 930,
        asignacion_actual_detalle: { usuario: { id: 40 } }, acciones_permitidas: ['REEMPLAZAR'] })
    } })
    const tutor = within(dialog).getByLabelText('Seleccionar candidato para Tutor')
    expect(await within(candidateList(tutor)).findByRole('option', { name: 'Docente 40' })).toBeEnabled()
  })

  const excellenceActorNames = ['Tribunal docente 1', 'Tribunal docente 2', 'Presidente', 'Secretario', 'Director del Instituto de Investigación']

  const excellenceActorResponse = ({ assigned = {}, modality = 'EXCELENCIA_ACADEMICA', stageCode = 'EVALUACION_TRIBUNAL', id = 7 } = {}) => {
    const stage = { id: 290, codigo: stageCode, nombre: 'Evaluación del tribunal', estado: 'EN_PROCESO', activo: true }
    const positions = excellenceActorNames.map((nombre, index) => ({
      clave: `EXCELENCIA_ACTOR_${index}`, nombre,
      tipo_participacion: ['TRIBUNAL', 'TRIBUNAL', 'PRESIDENTE', 'SECRETARIO', 'DIRECTOR_INSTITUTO_INVESTIGACION'][index],
      orden_cargo: index < 2 ? index + 1 : null, ambito: 'POSTULACION', seguimiento_etapa: null,
      obligatoriedad: true, habilitada: true,
      restriccion_identidad: index < 2 ? { grupo: 'TRIBUNAL_EXCELENCIA', unica_persona: true } : null,
      ocupacion_actor: index < 2 ? { aplica: true, relevantes: ['TRIBUNAL'] } : null,
      estado_ocupacion: assigned[index] ? 'ASIGNADA' : 'VACANTE',
      asignacion_actual: assigned[index] ? index + 700 : null,
      asignacion_actual_detalle: assigned[index] ? { id: index + 700, usuario: { id: assigned[index], nombre: 'Raúl' } } : null,
      acciones_permitidas: assigned[index] ? ['REEMPLAZAR', 'FINALIZAR'] : ['ASIGNAR'],
    }))
    return {
      ...response, detalle: { ...response.detalle, id, modalidad_detalle: { codigo: modality, nombre: 'Excelencia Académica' } },
      flujo: { ...response.flujo, modalidad: { codigo: modality }, etapa_actual: stage, etapas: [stage],
        gestion_actores: { contexto: { codigo_etapa: stageCode }, posiciones: positions }, gestion_decisiones_academicas: {}, orientacion_etapa_actual: null },
    }
  }

  const openExcellenceActors = async (options = {}) => {
    postulacionesService.obtenerExpediente.mockResolvedValue(excellenceActorResponse(options))
    postulacionesService.obtenerCandidatosElegibles.mockResolvedValue({ count: 2, results: [
      { id: 41, nombre_completo: 'Raúl', elegible: true }, { id: 42, nombre_completo: 'Persona libre', elegible: true },
    ] })
    const rendered = renderAssignmentManagerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Evaluación del tribunal' })
    await (await findCandidateOptionList(dialog, { name: 'Persona libre' })).findAllByRole('option', { name: 'Persona libre' })
    return { dialog, ...rendered }
  }

  describe('Selección operativa de Excelencia', () => {
    const directions = [[0, 2], [1, 3], [2, 0], [3, 4], [4, 2], [2, 3]]
    it.each(directions)('bloquea selección pendiente de posición %s en %s y libera al cancelar la selección', async (from, to) => {
      const { dialog } = await openExcellenceActors()
      const source = within(dialog).getByLabelText(`Seleccionar candidato para ${excellenceActorNames[from]}`)
      const target = within(dialog).getByLabelText(`Seleccionar candidato para ${excellenceActorNames[to]}`)
      await chooseCandidate(source, '41')
      const occupied = within(candidateList(target)).getByRole('option', { name: new RegExp(`Raúl.*Seleccionado como ${excellenceActorNames[from]}`) })
      expect(occupied).toBeDisabled()
      expect(within(candidateList(target)).getByRole('option', { name: 'Persona libre' })).toBeEnabled()
      await chooseCandidate(source, '')
      expect(within(candidateList(target)).getByRole('option', { name: 'Raúl' })).toBeEnabled()
      expect(postulacionesService.asignarActor).not.toHaveBeenCalled()
    })

    it.each(directions)('bloquea asignación guardada de posición %s en %s aunque backend permita acumular', async (from, to) => {
      const { dialog } = await openExcellenceActors({ assigned: { [from]: 41 } })
      const target = within(dialog).getByLabelText(`Seleccionar candidato para ${excellenceActorNames[to]}`)
      expect(within(candidateList(target)).getByRole('option', { name: new RegExp(`Raúl.*Asignación vigente: ${excellenceActorNames[from]}`) })).toBeDisabled()
      expect(within(candidateList(target)).getByRole('option', { name: 'Persona libre' })).toBeEnabled()
      expect(within(dialog).getByLabelText(`Seleccionar reemplazo para ${excellenceActorNames[from]}`)).toBeEnabled()
    })

    it('conserva cargos acumulados, permite reemplazar y no exige corregir otros cargos', async () => {
      const { dialog } = await openExcellenceActors({ assigned: { 0: 41, 2: 41 } })
      expect(within(dialog).getAllByText('Raúl', { selector: 'strong' })).toHaveLength(2)
      const replacement = within(dialog).getByLabelText('Seleccionar reemplazo para Presidente')
      expect(within(candidateList(replacement)).getByRole('option', { name: /Raúl.*Tribunal docente 1/ })).toBeDisabled()
      expect(within(candidateList(replacement)).getByRole('option', { name: 'Persona libre' })).toBeEnabled()
      await chooseCandidate(replacement, '42')
      postulacionesService.reemplazarActor.mockResolvedValue({ id: 702 })
      await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar asignaciones' }))
      await waitFor(() => expect(postulacionesService.reemplazarActor).toHaveBeenCalledWith(702, { nuevo_usuario: 42, observaciones: '' }, expect.any(AbortSignal)))
      expect(postulacionesService.finalizarAsignacion).not.toHaveBeenCalled()
      expect(postulacionesService.asignarActor).not.toHaveBeenCalled()
    })

    it('cierra y reabre sin persistir ni conservar selecciones pendientes', async () => {
      const { dialog } = await openExcellenceActors()
      await chooseCandidate(within(dialog).getByLabelText('Seleccionar candidato para Presidente'), '41')
      await userEvent.click(within(dialog).getByLabelText('Cerrar'))
      await userEvent.click(screen.getByRole('button', { name: 'Gestionar actores' }))
      const reopened = screen.getByRole('dialog', { name: 'Gestionar actores — Evaluación del tribunal' })
      const secretary = within(reopened).getByLabelText('Seleccionar candidato para Secretario')
      expect(await within(candidateList(secretary)).findByRole('option', { name: 'Raúl' })).toBeEnabled()
      expectCandidateValue(within(reopened).getByLabelText('Seleccionar candidato para Presidente'), '')
      expect(postulacionesService.asignarActor).not.toHaveBeenCalled()
    })

    it('permite finalizar un cargo acumulado sin finalizar los demás', async () => {
      const { dialog } = await openExcellenceActors({ assigned: { 0: 41, 2: 41 } })
      const president = within(dialog).getByRole('heading', { name: 'Presidente *' }).closest('section')
      await userEvent.click(within(president).getByRole('button', { name: 'Finalizar asignación' }))
      postulacionesService.finalizarAsignacion.mockResolvedValue({})
      await userEvent.click(within(president).getByRole('button', { name: 'Confirmar finalización' }))
      await waitFor(() => expect(postulacionesService.finalizarAsignacion).toHaveBeenCalledWith(702, { observaciones: '' }, expect.any(AbortSignal)))
      expect(postulacionesService.finalizarAsignacion).toHaveBeenCalledTimes(1)
      expect(postulacionesService.reemplazarActor).not.toHaveBeenCalled()
    })

    it('descarta el diálogo y los bloqueos del expediente anterior al cambiar la ruta', async () => {
      postulacionesService.obtenerExpediente.mockImplementation(async (id) => excellenceActorResponse({ id: Number(id), assigned: id === '7' ? { 0: 41 } : {} }))
      postulacionesService.obtenerCandidatosElegibles.mockResolvedValue({ count: 1, results: [{ id: 41, nombre_completo: 'Raúl', elegible: true }] })
      const auth = { user: { id: 9 }, hasPermission: (name) => name === 'puede_gestionar_asignaciones' }
      selectInitialTab('actores')
      render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<><ExpedientePage /><Link to="/postulaciones/8">Cambiar expediente de actores</Link></>} /></Routes></MemoryRouter></AuthContext.Provider>)
      await userEvent.click(await screen.findByRole('button', { name: 'Gestionar actores' }))
      const first = screen.getByRole('dialog', { name: 'Gestionar actores — Evaluación del tribunal' })
      expect(await within(candidateList(within(first).getByLabelText('Seleccionar candidato para Presidente'))).findByRole('option', { name: /Raúl.*Tribunal docente 1/ })).toBeDisabled()
      await userEvent.click(screen.getByRole('link', { name: 'Cambiar expediente de actores' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      await userEvent.click(await screen.findByRole('button', { name: 'Gestionar actores' }))
      const next = screen.getByRole('dialog', { name: 'Gestionar actores — Evaluación del tribunal' })
      expect(await within(candidateList(within(next).getByLabelText('Seleccionar candidato para Presidente'))).findByRole('option', { name: 'Raúl' })).toBeEnabled()
      expect(postulacionesService.obtenerCandidatosElegibles).toHaveBeenCalledWith(8, expect.any(Object), expect.any(AbortSignal))
      expect(postulacionesService.asignarActor).not.toHaveBeenCalled()
    })

    it('conserva bloqueo, búsqueda y paginación sin depender de la lista paginada de actores', async () => {
      const { dialog } = await openExcellenceActors({ assigned: { 0: 41 } })
      postulacionesService.obtenerCandidatosElegibles.mockResolvedValue({ count: 21, next: '?page=2', previous: null, results: [{ id: 41, nombre_completo: 'Raúl', elegible: true }] })
      const field = within(dialog).getByLabelText('Seleccionar candidato para Presidente')
      await userEvent.type(field, 'Raúl')
      await waitFor(() => expect(postulacionesService.obtenerCandidatosElegibles).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ search: 'Raúl', page: 1 }), expect.any(AbortSignal)))
      const section = field.closest('section')
      const selector = within(section).getByLabelText('Seleccionar candidato para Presidente')
      expect(await within(candidateList(selector)).findByRole('option', { name: /Raúl.*Tribunal docente 1/ })).toBeDisabled()
      await userEvent.click(within(section).getByRole('button', { name: 'Siguiente' }))
      await waitFor(() => expect(postulacionesService.obtenerCandidatosElegibles).toHaveBeenCalledWith(7, expect.objectContaining({ posicion: 'EXCELENCIA_ACTOR_2', search: 'Raúl', page: 2 }), expect.any(AbortSignal)))
      expect(await within(candidateList(selector)).findByRole('option', { name: /Raúl.*Tribunal docente 1/ })).toBeDisabled()
    })

    it.each(['TESIS_GRADO', 'EXAMEN_GRADO', 'TRABAJO_DIRIGIDO', 'GRADUACION_VIA_DIPLOMADO'])('no añade bloqueo a %s', async (modality) => {
      const { dialog } = await openExcellenceActors({ modality, assigned: { 0: 41 } })
      const president = within(dialog).getByLabelText('Seleccionar candidato para Presidente')
      expect(within(candidateList(president)).getByRole('option', { name: 'Raúl' })).toBeEnabled()
      await chooseCandidate(president, '41')
      expect(within(candidateList(within(dialog).getByLabelText('Seleccionar candidato para Secretario'))).getByRole('option', { name: /Raúl.*Seleccionado como Presidente/ })).toBeEnabled()
    })

    it('no aplica fuera de Evaluación del tribunal y aísla postulaciones al navegar', async () => {
      const first = await openExcellenceActors({ assigned: { 0: 41 } })
      expect(within(candidateList(within(first.dialog).getByLabelText('Seleccionar candidato para Presidente'))).getByRole('option', { name: /Raúl/ })).toBeDisabled()
      first.unmount()
      const second = await openExcellenceActors({ id: 8 })
      expect(within(candidateList(within(second.dialog).getByLabelText('Seleccionar candidato para Presidente'))).getByRole('option', { name: 'Raúl' })).toBeEnabled()
      expect(postulacionesService.obtenerCandidatosElegibles).toHaveBeenCalledWith(8, expect.any(Object), expect.any(AbortSignal))
      second.unmount()
      const otherStage = await openExcellenceActors({ stageCode: 'REVISION_REQUISITOS', assigned: { 0: 41 } })
      expect(within(candidateList(within(otherStage.dialog).getByLabelText('Seleccionar candidato para Presidente'))).getByRole('option', { name: 'Raúl' })).toBeEnabled()
    })
  })

  it('Gestionar actores consulta candidatos elegibles por posición y busca independientemente', async () => {
    const contracts = profileContracts({ proposalApproved: true })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.obtenerCandidatosElegibles.mockImplementation((_postulacion, filters) => Promise.resolve({
      count: 21,
      next: filters.page === 1 ? '?page=2' : null,
      previous: filters.page > 1 ? '?page=1' : null,
      results: [
        { id: 40, username: 'Admin', nombre_completo: 'Yesenia Sandoval', rol_nombre: 'Administrador' },
        { id: 41, username: 'Johnny', nombre_completo: 'Johnny Rosas', rol_nombre: 'Docente' },
        { id: 42, username: 'willian', codigo: 'RU-0042', nombre_completo: 'Willian Vargas', rol_nombre: 'Docente', elegible: false, motivo_bloqueo: 'YA_TIENE_ASIGNACION_VIGENTE_EN_POSTULACION', asignaciones_vigentes: ['Tutor', 'Tribunal 1'] },
      ],
    }))
    renderAssignmentManagerPage()
    const actors = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('section')
    await userEvent.click(within(actors).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    const selector = within(dialog).getByLabelText('Seleccionar candidato para Tribunal 1')
    expect(await within(candidateList(selector)).findByRole('option', { name: /Johnny Rosas.*Docente/ })).toBeInTheDocument()
    expect(within(candidateList(selector)).getByRole('option', { name: /Willian Vargas.*Docente.*RU-0042.*Asignación vigente: Tutor, Tribunal 1/ })).toBeDisabled()
    expect(postulacionesService.obtenerCandidatosElegibles).toHaveBeenCalledWith(
      7,
      { posicion: 'TRIBUNAL_PERFIL_1', accion: 'ASIGNAR', search: '', ordering: 'apellido_paterno', page: 1, page_size: 20 },
      expect.any(AbortSignal),
    )
    expect(within(dialog).getByRole('heading', { name: 'Tutor *' })).toBeInTheDocument()
    const tutorSelector = within(dialog).getByLabelText('Seleccionar candidato para Tutor')
    expect(tutorSelector).toBeInTheDocument()
    expect(postulacionesService.obtenerCandidatosElegibles).toHaveBeenCalledWith(
      7,
      { posicion: 'TUTOR_PROYECTO_1', accion: 'ASIGNAR', search: '', ordering: 'apellido_paterno', page: 1, page_size: 20 },
      expect.any(AbortSignal),
    )
    await userEvent.type(within(dialog).getByLabelText('Seleccionar candidato para Tribunal 1'), 'Rosas')
    await waitFor(() => expect(postulacionesService.obtenerCandidatosElegibles).toHaveBeenLastCalledWith(
      7,
      { posicion: 'TRIBUNAL_PERFIL_1', accion: 'ASIGNAR', search: 'Rosas', ordering: 'apellido_paterno', page: 1, page_size: 20 },
      expect.any(AbortSignal),
    ))
    expect(within(candidateList(selector)).getByRole('option', { name: /Willian Vargas.*RU-0042.*Asignación vigente: Tutor, Tribunal 1/ })).toBeDisabled()
    expect(postulacionesService.obtenerCandidatosElegibles.mock.calls.some(([, filters]) => (
      filters.posicion === 'TUTOR_PROYECTO_1' && filters.search === 'Rosas'
    ))).toBe(false)

    await userEvent.click(within(dialog).getAllByRole('button', { name: 'Siguiente' })[0])
    await waitFor(() => expect(postulacionesService.obtenerCandidatosElegibles).toHaveBeenCalledWith(
      7,
      { posicion: 'TRIBUNAL_PERFIL_1', accion: 'ASIGNAR', search: 'Rosas', ordering: 'apellido_paterno', page: 2, page_size: 20 },
      expect.any(AbortSignal),
    ))
    expect(within(candidateList(selector)).getByRole('option', { name: /Willian Vargas.*RU-0042.*Asignación vigente: Tutor, Tribunal 1/ })).toBeDisabled()
    expect(postulacionesService.obtenerCandidatosElegibles.mock.calls.some(([, filters]) => (
      filters.posicion === 'TUTOR_PROYECTO_1' && filters.page === 2
    ))).toBe(false)
  })

  it('bloquea drafts del mismo grupo inmediatamente antes de guardar', async () => {
    const contracts = profileContracts({ proposalApproved: true })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.obtenerCandidatosElegibles.mockResolvedValue({ count: 3, next: null, previous: null, results: [
      { id: 40, username: 'willian', nombre_completo: 'Willian Vargas', rol_nombre: 'Docente' },
      { id: 41, username: 'carlos', nombre_completo: 'Carlos Rojas', rol_nombre: 'Docente' },
      { id: 42, username: 'otro', nombre_completo: 'Otro Candidato', rol_nombre: 'Docente' },
    ] })
    renderAssignmentManagerPage()

    const actors = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('section')
    await userEvent.click(within(actors).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    const first = within(dialog).getByLabelText('Seleccionar candidato para Tribunal 1')
    const second = within(dialog).getByLabelText('Seleccionar candidato para Tribunal 2')
    const third = within(dialog).getByLabelText('Seleccionar candidato para Tribunal 3')
    await Promise.all([first, second, third].map((selector) => within(candidateList(selector)).findByRole('option', { name: /Willian Vargas/ })))

    await chooseCandidate(first, '40')
    expect(within(candidateList(second)).getByRole('option', { name: /Willian Vargas.*Seleccionado como Tribunal 1/ })).toBeDisabled()
    await chooseCandidate(second, '41')
    expect(within(candidateList(third)).getByRole('option', { name: /Willian Vargas.*Seleccionado como Tribunal 1/ })).toBeDisabled()
    expect(within(candidateList(third)).getByRole('option', { name: /Carlos Rojas.*Seleccionado como Tribunal 2/ })).toBeDisabled()
    expect(within(candidateList(third)).getByRole('option', { name: /Otro Candidato/ })).toBeEnabled()
    expect(postulacionesService.asignarActor).not.toHaveBeenCalled()
  })

  it('libera y reasigna candidatos al cambiar o limpiar un draft', async () => {
    const contracts = profileContracts({ proposalApproved: true })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.obtenerCandidatosElegibles.mockResolvedValue({ count: 2, next: null, previous: null, results: [
      { id: 40, username: 'willian', nombre_completo: 'Willian Vargas', rol_nombre: 'Docente' },
      { id: 41, username: 'carlos', nombre_completo: 'Carlos Rojas', rol_nombre: 'Docente' },
    ] })
    renderAssignmentManagerPage()

    const actors = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('section')
    await userEvent.click(within(actors).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    const first = within(dialog).getByLabelText('Seleccionar candidato para Tribunal 1')
    const second = within(dialog).getByLabelText('Seleccionar candidato para Tribunal 2')
    await within(candidateList(second)).findByRole('option', { name: /Willian Vargas/ })

    await chooseCandidate(first, '40')
    expect(within(candidateList(second)).getByRole('option', { name: /Willian Vargas.*Seleccionado como Tribunal 1/ })).toBeDisabled()
    await chooseCandidate(first, '41')
    const releasedWillian = within(candidateList(second)).getByRole('option', { name: /Willian Vargas/ })
    expect(releasedWillian).toBeEnabled()
    expect(releasedWillian).not.toHaveAccessibleName(/Seleccionado como/)
    expect(within(candidateList(second)).getByRole('option', { name: /Carlos Rojas.*Seleccionado como Tribunal 1/ })).toBeDisabled()
    await chooseCandidate(first, '')
    const clearedWillian = within(candidateList(second)).getByRole('option', { name: /Willian Vargas/ })
    const clearedCarlos = within(candidateList(second)).getByRole('option', { name: /Carlos Rojas/ })
    expect(clearedWillian).toBeEnabled()
    expect(clearedCarlos).toBeEnabled()
    expect(clearedWillian).not.toHaveAccessibleName(/Seleccionado como/)
    expect(clearedCarlos).not.toHaveAccessibleName(/Seleccionado como/)
  })

  it('bloquea el mismo tribunal aunque falte el grupo de identidad o sea diferente', async () => {
    const contracts = profileContracts({ proposalApproved: true })
    contracts.flow.gestion_actores.posiciones[1].restriccion_identidad = null
    contracts.flow.gestion_actores.posiciones[2].restriccion_identidad = { grupo: 'OTRO_GRUPO', unica_persona: true }
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.obtenerCandidatosElegibles.mockResolvedValue({ count: 1, next: null, previous: null, results: [
      { id: 40, username: 'willian', nombre_completo: 'Willian Vargas', rol_nombre: 'Docente' },
    ] })
    renderAssignmentManagerPage()

    const actors = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('section')
    await userEvent.click(within(actors).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    const first = within(dialog).getByLabelText('Seleccionar candidato para Tribunal 1')
    const second = within(dialog).getByLabelText('Seleccionar candidato para Tribunal 2')
    const third = within(dialog).getByLabelText('Seleccionar candidato para Tribunal 3')
    await Promise.all([first, second, third].map((selector) => within(candidateList(selector)).findByRole('option', { name: /Willian Vargas/ })))
    expect(within(candidateList(second)).getByRole('option', { name: /Willian Vargas/ })).not.toHaveAccessibleName(/Seleccionado como/)

    await chooseCandidate(first, '40')
    expect(within(candidateList(second)).getByRole('option', { name: /Willian Vargas.*Seleccionado como Tribunal 1/ })).toBeDisabled()
    expect(within(candidateList(third)).getByRole('option', { name: /Willian Vargas.*Seleccionado como Tribunal 1/ })).toBeDisabled()
  })

  it('mantiene bloqueos en búsquedas y páginas posteriores', async () => {
    const contracts = profileContracts({ proposalApproved: true })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.obtenerCandidatosElegibles.mockImplementation((_postulacion, filters) => {
      const willian = { id: 40, username: 'willian', nombre_completo: 'Willian Vargas', rol_nombre: 'Docente' }
      const other = { id: 42, username: 'otro', nombre_completo: 'Otro Candidato', rol_nombre: 'Docente' }
      if (filters.posicion === 'TRIBUNAL_PERFIL_1') {
        return Promise.resolve({ count: 1, next: null, previous: null, results: [willian] })
      }
      if (filters.posicion === 'TRIBUNAL_PERFIL_2' && filters.search === 'Willian') {
        return Promise.resolve({ count: 1, next: null, previous: null, results: [willian] })
      }
      if (filters.posicion === 'TRIBUNAL_PERFIL_2' && filters.page === 2) {
        return Promise.resolve({ count: 21, next: null, previous: '?page=1', results: [willian] })
      }
      if (filters.posicion === 'TRIBUNAL_PERFIL_2') {
        return Promise.resolve({ count: 21, next: '?page=2', previous: null, results: [other] })
      }
      return Promise.resolve({ count: 1, next: null, previous: null, results: [other] })
    })
    renderAssignmentManagerPage()

    const actors = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('section')
    await userEvent.click(within(actors).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    const first = within(dialog).getByLabelText('Seleccionar candidato para Tribunal 1')
    const second = within(dialog).getByLabelText('Seleccionar candidato para Tribunal 2')
    await within(candidateList(first)).findByRole('option', { name: /Willian Vargas/ })
    await within(candidateList(second)).findByRole('option', { name: /Otro Candidato/ })
    await chooseCandidate(first, '40')
    expectCandidateValue(within(dialog).getByLabelText('Seleccionar candidato para Tribunal 1'), '40')

    let currentSecond = within(dialog).getByLabelText('Seleccionar candidato para Tribunal 2')
    let secondSection = currentSecond.closest('section')
    await userEvent.click(within(secondSection).getByRole('button', { name: 'Siguiente' }))
    await waitFor(() => expect(postulacionesService.obtenerCandidatosElegibles).toHaveBeenCalledWith(
      7,
      { posicion: 'TRIBUNAL_PERFIL_2', accion: 'ASIGNAR', search: '', ordering: 'apellido_paterno', page: 2, page_size: 20 },
      expect.any(AbortSignal),
    ))
    await waitFor(() => {
      currentSecond = within(dialog).getByLabelText('Seleccionar candidato para Tribunal 2')
      expect(within(candidateList(currentSecond)).getByRole('option', { name: /Willian Vargas.*Seleccionado como Tribunal 1/ })).toBeDisabled()
    })
    expect(postulacionesService.asignarActor).not.toHaveBeenCalled()

    secondSection = within(dialog).getByLabelText('Seleccionar candidato para Tribunal 2').closest('section')
    await userEvent.type(within(secondSection).getByLabelText('Seleccionar candidato para Tribunal 2'), 'Willian')
    await waitFor(() => expect(postulacionesService.obtenerCandidatosElegibles).toHaveBeenCalledWith(
      7,
      { posicion: 'TRIBUNAL_PERFIL_2', accion: 'ASIGNAR', search: 'Willian', ordering: 'apellido_paterno', page: 1, page_size: 20 },
      expect.any(AbortSignal),
    ))
    await waitFor(() => {
      const currentSecond = within(dialog).getByLabelText('Seleccionar candidato para Tribunal 2')
      expect(within(candidateList(currentSecond)).getByRole('option', { name: /Willian Vargas.*Seleccionado como Tribunal 1/ })).toBeDisabled()
    })
  })

  it('aplica el bloqueo temporal también a candidatos elegidos como reemplazo', async () => {
    const contracts = profileContracts({
      assignedTribunals: [{ id: 51, name: 'Tribunal Vigente', order: 1 }],
      proposalApproved: true,
    })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.obtenerCandidatosElegibles.mockResolvedValue({ count: 1, next: null, previous: null, results: [
      { id: 99, username: 'replacement', nombre_completo: 'Candidata Reemplazo', rol_nombre: 'Docente' },
    ] })
    renderAssignmentManagerPage()

    const actors = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('section')
    await userEvent.click(within(actors).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    const replacement = within(dialog).getByLabelText('Seleccionar reemplazo para Tribunal 1')
    const second = within(dialog).getByLabelText('Seleccionar candidato para Tribunal 2')
    await Promise.all([replacement, second].map((selector) => within(candidateList(selector)).findByRole('option', { name: /Candidata Reemplazo/ })))

    await chooseCandidate(replacement, '99')
    expect(within(candidateList(second)).getByRole('option', { name: /Candidata Reemplazo.*Seleccionado como Tribunal 1/ })).toBeDisabled()
    expect(postulacionesService.reemplazarActor).not.toHaveBeenCalled()
  })

  it.each([
    ['Tribunal 1', 'Tutor'],
    ['Tutor', 'Tribunal 1'],
  ])('ocupacion_actor bloquea %s → %s y valida antes de guardar', async (source, target) => {
    const contracts = profileContracts({ proposalApproved: true })
    contracts.flow.gestion_actores.posiciones.forEach((position) => {
      position.ocupacion_actor = { aplica: true, ambito: 'POSTULACION', relevantes: ['TUTOR', 'TRIBUNAL'] }
    })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.obtenerCandidatosElegibles.mockResolvedValue({ count: 2, next: null, previous: null, results: [
      { id: 40, nombre_completo: 'Docente Ocupado', elegible: true },
      { id: 41, nombre_completo: 'Docente Libre', elegible: true },
    ] })
    renderAssignmentManagerPage()
    const actors = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('section')
    await userEvent.click(within(actors).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    const sourceSelector = within(dialog).getByLabelText(`Seleccionar candidato para ${source}`)
    const targetSelector = within(dialog).getByLabelText(`Seleccionar candidato para ${target}`)
    await Promise.all([sourceSelector, targetSelector].map((selector) => within(candidateList(selector)).findByRole('option', { name: 'Docente Ocupado' })))
    await chooseCandidate(sourceSelector, '40')
    expect(within(candidateList(targetSelector)).getByRole('option', { name: `Docente Ocupado — Seleccionado como ${source}` })).toBeDisabled()
    expect(within(candidateList(targetSelector)).getByRole('option', { name: 'Docente Libre' })).toBeEnabled()
    if (source === 'Tutor') {
      for (const order of [2, 3]) {
        const selector = within(dialog).getByLabelText(`Seleccionar candidato para Tribunal ${order}`)
        expect(within(candidateList(selector)).getByRole('option', { name: 'Docente Ocupado — Seleccionado como Tutor' })).toBeDisabled()
      }
    }
    // La opción bloqueada no se puede elegir, ni siquiera forzando el clic: el duplicado no llega a crearse.
    selectCandidate(targetSelector, '40')
    expectCandidateValue(targetSelector, '')
    expect(within(dialog).queryByText(/seleccionada en Tribunal 1 y Tutor/i)).not.toBeInTheDocument()
    expect(postulacionesService.asignarActor).not.toHaveBeenCalled()
    await chooseCandidate(targetSelector, '41')
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Guardar asignaciones' })).toBeEnabled()
    await chooseCandidate(sourceSelector, '')
    expect(within(candidateList(targetSelector)).getByRole('option', { name: 'Docente Ocupado' })).toBeEnabled()
  })

  it.each([
    ['TESIS_GRADO', undefined],
    ['TRABAJO_DIRIGIDO', undefined],
    ['PROYECTO_GRADO', { aplica: false, relevantes: ['TUTOR', 'TRIBUNAL'] }],
    ['PROYECTO_GRADO', { aplica: true, relevantes: ['PRESIDENTE'] }],
  ])('conserva selecciones entre grupos sin ocupación aplicable en %s (%j)', async (code, rule) => {
    const contracts = profileContracts({ proposalApproved: true })
    contracts.flow.modalidad = { codigo: code }
    contracts.flow.gestion_actores.posiciones.forEach((position) => { position.ocupacion_actor = rule })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, modalidad_detalle: { codigo: code }, flujo: contracts.flow })
    postulacionesService.obtenerCandidatosElegibles.mockResolvedValue({ count: 1, results: [{ id: 40, nombre_completo: 'Docente Disponible' }] })
    renderAssignmentManagerPage()
    const actors = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('section')
    await userEvent.click(within(actors).getByRole('button', { name: 'Gestionar actores' }))
    const tribunal = screen.getByLabelText('Seleccionar candidato para Tribunal 1')
    const tutor = screen.getByLabelText('Seleccionar candidato para Tutor')
    await Promise.all([tribunal, tutor].map((selector) => within(candidateList(selector)).findByRole('option', { name: 'Docente Disponible' })))
    await chooseCandidate(tribunal, '40')
    expect(within(candidateList(tutor)).getByRole('option', { name: /Docente Disponible.*Seleccionado como Tribunal 1/ })).toBeEnabled()
    await chooseCandidate(tutor, '40')
    expect(within(candidateList(tribunal)).getByRole('option', { name: /Docente Disponible.*Seleccionado como Tutor/ })).toBeEnabled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar asignaciones' })).toBeEnabled()
  })

  it('rechaza drafts conflictivos localmente antes de crear solicitudes', async () => {
    const contracts = profileContracts({ proposalApproved: true })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.obtenerCandidatosElegibles.mockResolvedValue({ count: 1, next: null, previous: null, results: [
      { id: 40, username: 'willian', nombre_completo: 'Willian Vargas', rol_nombre: 'Docente' },
    ] })
    renderAssignmentManagerPage()

    const actors = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('section')
    await userEvent.click(within(actors).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    const first = within(dialog).getByLabelText('Seleccionar candidato para Tribunal 1')
    const second = within(dialog).getByLabelText('Seleccionar candidato para Tribunal 2')
    await Promise.all([first, second].map((selector) => within(candidateList(selector)).findByRole('option', { name: /Willian Vargas/ })))
    await chooseCandidate(first, '40')
    // La opción bloqueada no se puede elegir, ni siquiera forzando el clic: el duplicado no llega a crearse.
    selectCandidate(second, '40')
    expectCandidateValue(second, '')
    expect(within(dialog).queryByText(/seleccionada en Tribunal 1 y Tribunal 2/i)).not.toBeInTheDocument()
    fireEvent.submit(dialog.querySelector('form'))
    // Solo se envían asignaciones válidas: ninguna persona aparece dos veces.
    const sentUsers = postulacionesService.asignarActor.mock.calls.map(([, payload]) => payload?.usuario)
    expect(new Set(sentUsers).size).toBe(sentUsers.length)
  })

  it('permite asignar otro tipo al candidato que participa en una etapa distinta', async () => {
    const contracts = profileContracts({ proposalApproved: true })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.obtenerActores.mockResolvedValue({ count: 4, next: null, previous: null, results: [
      { id: 101, usuario: 40, tipo_participacion: 'TRIBUNAL', orden_cargo: 1, activo: true },
      { id: 102, usuario: 42, tipo_participacion: 'TRIBUNAL', orden_cargo: 2, activo: true },
      { id: 103, usuario: 43, tipo_participacion: 'TRIBUNAL', orden_cargo: 3, activo: true },
      { id: 104, usuario: 44, tipo_participacion: 'DOCENTE_MODALIDAD', orden_cargo: null, activo: true },
    ]})
    postulacionesService.obtenerCandidatosElegibles.mockResolvedValue({ count: 4, next: null, previous: null, results: [
      { id: 40, username: 'raul', nombre_completo: 'Raúl Marcelo Calderon Fuertes', codigo: '562879', rol_codigo: 'DOCENTE', rol_nombre: 'Docente', activo: true },
      { id: 42, username: 'mirna', nombre_completo: 'Mirna Fernández Rojas', codigo: '494080', rol_codigo: 'DOCENTE', rol_nombre: 'Docente', activo: true },
      { id: 43, username: 'carlos', nombre_completo: 'Carlos Méndez Suárez', codigo: '494062', rol_codigo: 'DOCENTE', rol_nombre: 'Docente', activo: true },
      { id: 45, username: 'nuevo', nombre_completo: 'Docente Nuevo', codigo: 'DOC-045', rol_codigo: 'DOCENTE', rol_nombre: 'Docente', activo: true },
    ]})
    renderAssignmentManagerPage()

    const actors = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('section')
    await userEvent.click(within(actors).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    const tutorSelector = within(dialog).getByLabelText('Seleccionar candidato para Tutor')
    expect(within(candidateList(tutorSelector)).getByRole('option', { name: /Raúl Marcelo Calderon Fuertes.*Docente/ })).toBeEnabled()
    expect(within(candidateList(tutorSelector)).getByRole('option', { name: /Docente Nuevo/ })).toBeEnabled()
  })

  it('bloquea posiciones del contrato sin acción ASIGNAR aunque haya candidatos', async () => {
    const contracts = profileContracts()
    contracts.flow.gestion_actores.posiciones = contracts.flow.gestion_actores.posiciones.map((position) => (
      position.tipo_participacion === 'TUTOR'
        ? { ...position, habilitada: false, acciones_permitidas: [], bloqueo: { codigo: 'PRECONDICION', mensaje: 'Posición bloqueada por la policy.' } }
        : position
    ))
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.obtenerCandidatosElegibles.mockResolvedValue({ count: 1, next: null, previous: null, results: [
      { id: 44, username: 'docente', nombre_completo: 'Docente Vigente', codigo: 'DOC-044', rol_codigo: 'DOCENTE', rol_nombre: 'Docente', activo: true },
    ]})
    renderAssignmentManagerPage()

    const actors = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('section')
    await userEvent.click(within(actors).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    const tutorPosition = within(dialog).getByRole('heading', { name: 'Tutor *' }).closest('section')
    expect(within(tutorPosition).getByText('Posición bloqueada por la policy.')).toBeInTheDocument()
    expect(within(tutorPosition).queryByRole('combobox')).not.toBeInTheDocument()
    expect(postulacionesService.obtenerCandidatosElegibles.mock.calls.some(([, filters]) => (
      filters.posicion === 'TUTOR_PROYECTO_1'
    ))).toBe(false)
  })

  it('regresa a Resumen al guardar el docente de modalidad de Defensa Privada', async () => {
    const privateStage = { id: 23, codigo: 'DEFENSA_PRIVADA', nombre: 'Defensa Privada', estado: 'EN_PROCESO', activo: true }
    const tutor = {
      clave: 'TUTOR_PROYECTO_1', tipo_participacion: 'TUTOR', nombre: 'Tutor', orden_cargo: null,
      obligatoriedad: true, habilitada: true, estado_ocupacion: 'ASIGNADA', ambito: 'POSTULACION',
      seguimiento_etapa: null, asignacion_actual: 90,
      asignacion_actual_detalle: { id: 90, usuario: { id: 190, nombre: 'María Tutora' }, tipo_participacion: 'TUTOR', ambito: 'POSTULACION', seguimiento_etapa: null },
      acciones_permitidas: [], bloqueo: null, precondicion: null,
    }
    const position = {
      clave: 'DOCENTE_MODALIDAD_DEFENSA_PRIVADA_1', tipo_participacion: 'DOCENTE_MODALIDAD',
      nombre: 'Docente de modalidad', orden_cargo: null, obligatoriedad: true, habilitada: true,
      estado_ocupacion: 'VACANTE', ambito: 'ETAPA', seguimiento_etapa: privateStage.id,
      asignacion_actual: null, asignacion_actual_detalle: null, acciones_permitidas: ['ASIGNAR'],
      bloqueo: null, precondicion: null,
    }
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      flujo: {
        ...response.flujo,
        etapa_actual: privateStage,
        etapas: [privateStage],
        gestion_actores: {
          contexto: { tipo: 'ETAPA', seguimiento_etapa: privateStage.id, codigo_etapa: privateStage.codigo },
          posiciones: [tutor, position],
        },
        gestion_decisiones_academicas: { contexto: null, decisiones: [] },
      },
    })
    renderAssignmentManagerPage()

    const actors = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('section')
    await userEvent.click(within(actors).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Defensa Privada' })
    const tutorSection = within(dialog).getByRole('heading', { name: 'Tutor *' }).closest('section')
    expect(tutorSection).toHaveTextContent(/Asignada a\s+María Tutora/)
    const selector = within(dialog).getByLabelText('Seleccionar candidato para Docente de modalidad')
    await within(candidateList(selector)).findByRole('option', { name: /Johnny Rosas/ })
    expect(postulacionesService.obtenerCandidatosElegibles).toHaveBeenCalledWith(
      7,
      { posicion: position.clave, accion: 'ASIGNAR', search: '', ordering: 'apellido_paterno', page: 1, page_size: 20 },
      expect.any(AbortSignal),
    )
    await chooseCandidate(selector, '41')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar asignaciones' }))

    await waitFor(() => expect(postulacionesService.asignarActor).toHaveBeenCalledWith(7, {
      usuario: 41,
      tipo_participacion: 'DOCENTE_MODALIDAD',
      observaciones: '',
      seguimiento_etapa: privateStage.id,
    }, expect.any(AbortSignal)))
    await userEvent.click(within(dialog).getAllByRole('button', { name: 'Cerrar' })[1])
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Gestionar actores — Defensa Privada' })).not.toBeInTheDocument())
    expect(window.location.hash).toBe('#resumen')
    expect(screen.getByRole('tab', { name: 'Resumen' })).toHaveAttribute('aria-selected', 'true')
    expect(document.getElementById('panel-resumen')).toBeVisible()
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Resumen' })))
  })

  it('separa el checklist documental no bloqueante en la orientación de Trabajo Dirigido', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(trabajoDirigidoPublicDefenseResponse())
    renderAssignmentManagerPage('resumen')

    const summary = (await screen.findByRole('heading', { name: 'Qué debes hacer ahora' })).parentElement
    expect(within(summary).getByRole('heading', { name: 'Siguiente acción' })).toBeInTheDocument()
    expect(within(summary).getByRole('button', { name: 'Completar autoridades' })).toBeInTheDocument()
    expect(within(summary).getByRole('heading', { name: 'Checklist documental' })).toBeInTheDocument()
    expect(within(summary).getByText(/no bloquean la siguiente acción académica/)).toBeInTheDocument()
    expect(within(summary).getByText('0 de 9 documentos aprobados')).toBeInTheDocument()
    expect(within(summary).getAllByText(/Presidente/).length).toBeGreaterThan(1)
    expect(within(summary).getAllByText(/Secretario/).length).toBeGreaterThan(1)
    expect(within(summary).queryByRole('link', { name: 'Ir a documentos' })).not.toBeInTheDocument()
    await userEvent.click(within(summary).getByRole('button', { name: 'Completar autoridades' }))
    const dialog = await screen.findByRole('dialog', { name: 'Completar autoridades' })
    await userEvent.selectOptions(within(dialog).getByLabelText('Seleccionar persona para Presidente'), '40')
    await userEvent.selectOptions(within(dialog).getByLabelText('Seleccionar persona para Secretario'), '41')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar autoridades' }))

    await waitFor(() => expect(postulacionesService.asignarActor).toHaveBeenCalledTimes(2))
    expect(postulacionesService.asignarActor).toHaveBeenNthCalledWith(1, 7, {
      usuario: 40,
      tipo_participacion: 'PRESIDENTE',
      seguimiento_etapa: 13,
    }, expect.any(AbortSignal))
    expect(postulacionesService.asignarActor).toHaveBeenNthCalledWith(2, 7, {
      usuario: 41,
      tipo_participacion: 'SECRETARIO',
      seguimiento_etapa: 13,
    }, expect.any(AbortSignal))
  })

  it('solicita únicamente la autoridad pendiente y muestra el cargo ya asignado', async () => {
    const publicStage = { id: 13, codigo: 'DEFENSA_PUBLICA', nombre: 'Defensa Pública', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      flujo: {
        ...response.flujo,
        etapa_actual: publicStage,
        etapas: [publicStage],
        orientacion_etapa_actual: {
          mensaje: 'Completa las autoridades requeridas.',
          requisitos: [
            { tipo: 'ACTOR', codigo: 'PRESIDENTE', nombre: 'Presidente', cumplido: true, estado_display: 'Cumplido' },
            { tipo: 'ACTOR', codigo: 'SECRETARIO', nombre: 'Secretario', cumplido: false, estado_display: 'Pendiente' },
          ],
          siguiente_accion: { codigo: 'GESTIONAR_ACTORES', titulo: 'Completar autoridades', estado: 'PENDIENTE', destino: '#actores' },
        },
      },
    })
    postulacionesService.obtenerActores.mockResolvedValue({ count: 1, next: null, previous: null, results: [
      { id: 71, usuario: 40, usuario_nombre: 'Presidente actual', tipo_participacion: 'PRESIDENTE', seguimiento_etapa: 13, activo: true },
    ] })
    postulacionesService.obtenerCandidatosAsignacion.mockResolvedValue({ count: 2, next: null, previous: null, results: [
      { id: 40, nombre_completo: 'Presidente actual', rol_codigo: 'DOCENTE' },
      { id: 41, nombre_completo: 'Secretario nuevo', rol_codigo: 'DOCENTE' },
    ] })
    renderAssignmentManagerPage('resumen')

    await userEvent.click(await screen.findByRole('button', { name: 'Completar autoridades' }))
    const dialog = screen.getByRole('dialog', { name: 'Completar autoridades' })
    expect(within(dialog).getByText('✓ Asignado')).toBeInTheDocument()
    expect(within(dialog).queryByLabelText('Seleccionar persona para Presidente')).not.toBeInTheDocument()
    await userEvent.selectOptions(within(dialog).getByLabelText('Seleccionar persona para Secretario'), '41')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar autoridades' }))

    await waitFor(() => expect(postulacionesService.asignarActor).toHaveBeenCalledTimes(1))
    expect(postulacionesService.asignarActor).toHaveBeenCalledWith(7, {
      usuario: 41, tipo_participacion: 'SECRETARIO', seguimiento_etapa: 13,
    }, expect.any(AbortSignal))
  })

  it.each(['PROYECTO_GRADO', 'TRABAJO_DIRIGIDO'])('Completar autoridades conserva etiquetas y delimita el bloqueo operativo en %s', async (code) => {
    const publicStage = { id: 13, codigo: 'DEFENSA_PUBLICA', nombre: 'Defensa Pública', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
    const candidates = [
      { id: 40, nombre_completo: 'Raúl Marcelo Calderon Fuertes', rol_nombre: 'Docente' },
      { id: 41, nombre_completo: 'Mirna Fernández Rojas', rol_nombre: 'Docente' },
      { id: 42, nombre_completo: 'Carlos Méndez Suárez', rol_nombre: 'Docente' },
      { id: 43, nombre_completo: 'Willian Chau Rivero', rol_nombre: 'Docente' },
      { id: 44, nombre_completo: 'Docente Modalidad', rol_nombre: 'Docente' },
      { id: 45, nombre_completo: 'Daniel Molina Cordova', rol_nombre: 'Docente' },
      { id: 46, nombre_completo: 'Presidenta vigente', rol_nombre: 'Docente' },
      { id: 47, nombre_completo: 'Secretario vigente', rol_nombre: 'Docente' },
      { id: 48, nombre_completo: 'Persona de otra postulación', rol_nombre: 'Docente', asignaciones_vigentes: ['Tutor'] },
    ]
    const activeAssignments = [
      { id: 70, usuario: 40, usuario_nombre: candidates[0].nombre_completo, tipo_participacion: 'TRIBUNAL', orden_cargo: 1, seguimiento_etapa: 11, activo: true },
      { id: 71, usuario: 41, usuario_nombre: candidates[1].nombre_completo, tipo_participacion: 'TRIBUNAL', orden_cargo: 2, seguimiento_etapa: 11, activo: true },
      { id: 72, usuario: 42, usuario_nombre: candidates[2].nombre_completo, tipo_participacion: 'TRIBUNAL', orden_cargo: 3, seguimiento_etapa: 11, activo: true },
      { id: 73, usuario: 43, usuario_nombre: candidates[3].nombre_completo, tipo_participacion: 'TUTOR', activo: true },
      { id: 74, usuario: 44, usuario_nombre: candidates[4].nombre_completo, tipo_participacion: 'DOCENTE_MODALIDAD', activo: true },
      { id: 75, usuario: 46, usuario_nombre: candidates[6].nombre_completo, tipo_participacion: 'PRESIDENTE', seguimiento_etapa: 12, activo: true },
      { id: 76, usuario: 47, usuario_nombre: candidates[7].nombre_completo, tipo_participacion: 'SECRETARIO', seguimiento_etapa: 12, activo: true },
      { id: 77, usuario: 45, tipo_participacion: 'TUTOR', activo: false },
    ]
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: { ...response.detalle, modalidad_detalle: { codigo: code, nombre: code } },
      flujo: {
        ...response.flujo,
        modalidad: { codigo: code, nombre: code },
        etapa_actual: publicStage,
        etapas: [publicStage],
        orientacion_etapa_actual: {
          mensaje: 'Completa las autoridades requeridas.',
          requisitos: [
            { tipo: 'ACTOR', codigo: 'PRESIDENTE', nombre: 'Presidente', cumplido: false, estado_display: 'Pendiente' },
            { tipo: 'ACTOR', codigo: 'SECRETARIO', nombre: 'Secretario', cumplido: false, estado_display: 'Pendiente' },
          ],
          siguiente_accion: { codigo: 'GESTIONAR_ACTORES', titulo: 'Completar autoridades', estado: 'PENDIENTE', destino: '#actores', capacidades: { modal: 'PUBLIC_AUTHORITIES' } },
        },
      },
    })
    postulacionesService.obtenerActores.mockResolvedValue({ count: activeAssignments.length, next: null, previous: null, results: activeAssignments })
    postulacionesService.obtenerCandidatosAsignacion.mockImplementation(({ search }) => Promise.resolve({
      count: candidates.filter((candidate) => candidate.nombre_completo.includes(search || '')).length,
      next: null,
      previous: null,
      results: candidates.filter((candidate) => candidate.nombre_completo.includes(search || '')),
    }))
    renderAssignmentManagerPage('resumen')

    await userEvent.click(await screen.findByRole('button', { name: 'Completar autoridades' }))
    const dialog = screen.getByRole('dialog', { name: 'Completar autoridades' })
    const selectors = await within(dialog).findAllByRole('combobox')
    for (const [name, assignment] of [
      ['Raúl Marcelo Calderon Fuertes', 'Tribunal 1'],
      ['Mirna Fernández Rojas', 'Tribunal 2'],
      ['Carlos Méndez Suárez', 'Tribunal 3'],
      ['Willian Chau Rivero', 'Tutor'],
      ['Docente Modalidad', 'Docente de modalidad'],
      ['Presidenta vigente', 'Presidente'],
      ['Secretario vigente', 'Secretario'],
    ]) {
      for (const selector of selectors) expect(within(selector).getByRole('option', { name: new RegExp(`${name}.*Asignación vigente: ${assignment}`) })).toBeInTheDocument()
    }
    for (const selector of selectors) {
      expect(within(selector).getByRole('option', { name: /Raúl Marcelo Calderon Fuertes.*Asignación vigente: Tribunal 1/ })).toBeDisabled()
      expect(within(selector).getByRole('option', { name: /Mirna Fernández Rojas.*Asignación vigente: Tribunal 2/ })).toBeDisabled()
      expect(within(selector).getByRole('option', { name: /Carlos Méndez Suárez.*Asignación vigente: Tribunal 3/ })).toBeDisabled()
      for (const name of [/Willian Chau Rivero.*Asignación vigente: Tutor/, /Docente Modalidad.*Asignación vigente: Docente de modalidad/]) {
        const option = within(selector).getByRole('option', { name })
        if (code === 'PROYECTO_GRADO') expect(option).toBeDisabled()
        else expect(option).toBeEnabled()
      }
      expect(within(selector).getByRole('option', { name: 'Daniel Molina Cordova — Docente' })).toBeEnabled()
      expect(within(selector).getByRole('option', { name: 'Persona de otra postulación — Docente' })).toBeEnabled()
      expect(within(selector).getByRole('option', { name: /Presidenta vigente.*Asignación vigente: Presidente/ })).toBeDisabled()
      expect(within(selector).getByRole('option', { name: /Secretario vigente.*Asignación vigente: Secretario/ })).toBeDisabled()
    }

    await userEvent.type(within(dialog).getByLabelText('Buscar persona'), 'Mirna')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Buscar' }))
    const filteredSecretary = within(dialog).getAllByRole('combobox')[1]
    expect(await within(filteredSecretary).findByRole('option', { name: /Mirna Fernández Rojas.*Asignación vigente: Tribunal 2/ })).toBeDisabled()

    await userEvent.clear(within(dialog).getByLabelText('Buscar persona'))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Buscar' }))
    const presidentSelector = within(dialog).getByLabelText('Seleccionar persona para Presidente')
    const secretarySelector = within(dialog).getByLabelText('Seleccionar persona para Secretario')
    await within(presidentSelector).findByRole('option', { name: 'Daniel Molina Cordova — Docente' })
    await userEvent.selectOptions(presidentSelector, '45')
    expect(within(secretarySelector).getByRole('option', { name: 'Daniel Molina Cordova — Docente' })).toBeDisabled()
    await userEvent.selectOptions(presidentSelector, '')
    await userEvent.selectOptions(secretarySelector, '45')
    expect(within(presidentSelector).getByRole('option', { name: 'Daniel Molina Cordova — Docente' })).toBeDisabled()
    expect(postulacionesService.obtenerActores).toHaveBeenCalledWith(7, true, 1, expect.any(AbortSignal))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('dialog', { name: 'Completar autoridades' })).not.toBeInTheDocument()
    expect(postulacionesService.asignarActor).not.toHaveBeenCalled()
  })

  it.each(['PROYECTO_GRADO', 'TESIS_GRADO'])('refresca autoridades tras respuesta incierta y evita reenviar un cargo ya asignado en %s', async (code) => {
    const publicStage = { id: 13, codigo: 'DEFENSA_PUBLICA', nombre: 'Defensa Pública', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
    let serverActors = []
    let secretaryApplied = false
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: { ...response.detalle, modalidad_detalle: { codigo: code, nombre: code } },
      flujo: {
        ...response.flujo,
        modalidad: { codigo: code },
        etapa_actual: publicStage,
        etapas: [publicStage],
        orientacion_etapa_actual: {
          mensaje: 'Completa las autoridades requeridas.',
          requisitos: [
            { tipo: 'ACTOR', codigo: 'PRESIDENTE', nombre: 'Presidente', cumplido: false, estado_display: 'Pendiente' },
            { tipo: 'ACTOR', codigo: 'SECRETARIO', nombre: 'Secretario', cumplido: false, estado_display: 'Pendiente' },
          ],
          siguiente_accion: { codigo: 'GESTIONAR_ACTORES', titulo: 'Completar autoridades', estado: 'PENDIENTE', destino: '#actores', capacidades: { modal: 'PUBLIC_AUTHORITIES' } },
        },
      },
    })
    postulacionesService.obtenerActores.mockImplementation(() => Promise.resolve({ count: serverActors.length, next: null, previous: null, results: serverActors }))
    postulacionesService.obtenerCandidatosAsignacion.mockResolvedValue({ count: 2, next: null, previous: null, results: [
      { id: 40, nombre_completo: 'Presidenta', rol_codigo: 'DOCENTE' },
      { id: 41, nombre_completo: 'Secretario', rol_codigo: 'DOCENTE' },
    ] })
    postulacionesService.asignarActor.mockImplementation(async (_id, payload) => {
      serverActors = [...serverActors, {
        id: payload.tipo_participacion === 'PRESIDENTE' ? 71 : 72,
        usuario: payload.usuario,
        usuario_nombre: payload.tipo_participacion === 'PRESIDENTE' ? 'Presidenta' : 'Secretario',
        tipo_participacion: payload.tipo_participacion,
        seguimiento_etapa: 13,
        activo: true,
      }]
      if (payload.tipo_participacion === 'SECRETARIO' && !secretaryApplied) {
        secretaryApplied = true
        throw { message: 'Se perdió la respuesta de la asignación.' }
      }
      return { id: payload.tipo_participacion === 'PRESIDENTE' ? 71 : 72 }
    })
    renderAssignmentManagerPage('resumen')

    await userEvent.click(await screen.findByRole('button', { name: 'Completar autoridades' }))
    const dialog = screen.getByRole('dialog', { name: 'Completar autoridades' })
    await userEvent.selectOptions(within(dialog).getByLabelText('Seleccionar persona para Presidente'), '40')
    await userEvent.selectOptions(within(dialog).getByLabelText('Seleccionar persona para Secretario'), '41')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar autoridades' }))

    expect(await within(dialog).findByText(/Se perdió la respuesta de la asignación/)).toBeInTheDocument()
    await waitFor(() => expect(within(dialog).getAllByText('✓ Asignado')).toHaveLength(2))
    expect(postulacionesService.obtenerActores.mock.calls.length).toBeGreaterThanOrEqual(4)
    expect(postulacionesService.asignarActor).toHaveBeenCalledTimes(2)
    expect(within(dialog).getByRole('button', { name: 'Reintentar pendientes' })).toBeDisabled()
  })

  it.each(['PRESIDENTE', 'SECRETARIO'])('autoridades Tesis: conserva %s de otro seguimiento y guarda solo el cargo pendiente', async (existingRole) => {
    postulacionesService.obtenerExpediente.mockResolvedValue(thesisPublicAuthoritiesResponse())
    const existing = { id: 90, usuario: 40, usuario_nombre: 'Autoridad vigente', tipo_participacion: existingRole, seguimiento_etapa: 19, activo: true }
    postulacionesService.obtenerActores.mockImplementation((_id, active, page = 1) => Promise.resolve({ count: active ? 1 : 0, next: active && page === 1 ? 'next' : null, results: active && page === 2 ? [existing] : [] }))
    renderAssignmentManagerPage('resumen')
    await userEvent.click(await screen.findByRole('button', { name: 'Completar autoridades' }))
    const dialog = screen.getByRole('dialog', { name: 'Completar autoridades' })
    expect(await within(dialog).findByText('Autoridad vigente')).toBeInTheDocument()
    const pendingRole = existingRole === 'PRESIDENTE' ? 'Secretario' : 'Presidente'
    expect(within(dialog).queryByLabelText(`Seleccionar persona para ${existingRole === 'PRESIDENTE' ? 'Presidente' : 'Secretario'}`)).not.toBeInTheDocument()
    await userEvent.selectOptions(within(dialog).getByLabelText(`Seleccionar persona para ${pendingRole}`), '41')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar autoridades' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(postulacionesService.asignarActor).toHaveBeenCalledTimes(1)
    expect(postulacionesService.asignarActor).toHaveBeenCalledWith(7, { usuario: 41, tipo_participacion: pendingRole.toUpperCase(), seguimiento_etapa: 82 }, expect.any(AbortSignal))
    expect(postulacionesService.reemplazarActor).not.toHaveBeenCalled()
    expect(postulacionesService.finalizarAsignacion).not.toHaveBeenCalled()
  })

  it('autoridades Tesis: espera verificación tras respuesta incierta antes de permitir un reintento', async () => {
    const verification = deferred()
    let uncertain = false
    postulacionesService.obtenerExpediente.mockResolvedValue(thesisPublicAuthoritiesResponse({ president: 1 }))
    postulacionesService.obtenerActores.mockImplementation(() => uncertain ? verification.promise : Promise.resolve({ count: 0, results: [] }))
    postulacionesService.asignarActor.mockImplementation(async () => { uncertain = true; throw { message: 'Respuesta incierta' } })
    renderAssignmentManagerPage('resumen')
    await userEvent.click(await screen.findByRole('button', { name: 'Completar autoridades' }))
    const dialog = screen.getByRole('dialog')
    await userEvent.selectOptions(await within(dialog).findByLabelText('Seleccionar persona para Secretario'), '41')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar autoridades' }))
    expect(await within(dialog).findByText('Verificando autoridades asignadas…')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Guardar autoridades' })).toBeDisabled()
    fireEvent.submit(dialog.querySelector('form'))
    expect(postulacionesService.asignarActor).toHaveBeenCalledTimes(1)
    await act(async () => verification.resolve({ count: 1, results: [{ id: 92, usuario: 41, usuario_nombre: 'Secretario confirmado', tipo_participacion: 'SECRETARIO', seguimiento_etapa: 82, activo: true }] }))
    expect(await within(dialog).findByText('Secretario confirmado')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Guardar autoridades' })).toBeDisabled()
    expect(within(dialog).queryByLabelText('Seleccionar persona para Secretario')).not.toBeInTheDocument()
    expect(postulacionesService.asignarActor).toHaveBeenCalledTimes(1)
  })

  it('autoridades Tesis: mantiene compatibilidades de asignación y etiquetas sin copiar exclusiones de Proyecto', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(thesisPublicAuthoritiesResponse())
    const actors = ['TRIBUNAL', 'TUTOR', 'DOCENTE_MODALIDAD'].map((role, index) => ({ id: index + 10, usuario: 41, tipo_participacion: role, orden_cargo: role === 'TRIBUNAL' ? 1 : null, seguimiento_etapa: 19, activo: true }))
    postulacionesService.obtenerActores.mockResolvedValue({ count: actors.length, results: actors })
    renderAssignmentManagerPage('resumen')
    await userEvent.click(await screen.findByRole('button', { name: 'Completar autoridades' }))
    const dialog = screen.getByRole('dialog')
    const president = await within(dialog).findByLabelText('Seleccionar persona para Presidente')
    const secretary = within(dialog).getByLabelText('Seleccionar persona para Secretario')
    expect(within(president).getByRole('option', { name: /Johnny Rosas.*Asignación vigente: Tribunal 1, Tutor, Docente de modalidad/ })).toBeEnabled()
    await userEvent.selectOptions(president, '41')
    expect(within(secretary).getByRole('option', { name: /Johnny Rosas/ })).toBeEnabled()
    await userEvent.selectOptions(secretary, '41')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar autoridades' }))
    await waitFor(() => expect(postulacionesService.asignarActor).toHaveBeenCalledTimes(2))
    expect(postulacionesService.asignarActor.mock.calls.map((call) => call[1])).toEqual([
      { usuario: 41, tipo_participacion: 'PRESIDENTE', seguimiento_etapa: 82 },
      { usuario: 41, tipo_participacion: 'SECRETARIO', seguimiento_etapa: 82 },
    ])
  })

  it.each(['TESIS_GRADO', 'PROYECTO_GRADO'])('autoridades conserva selecciones en páginas distintas y bloquea todos los cierres durante envío en %s', async (code) => {
    const initial = thesisPublicAuthoritiesResponse()
    initial.detalle.modalidad_detalle.codigo = code
    initial.flujo.modalidad.codigo = code
    postulacionesService.obtenerExpediente.mockResolvedValue(initial)
    postulacionesService.obtenerActores.mockResolvedValue({ count: 0, results: [] })
    postulacionesService.obtenerCandidatosAsignacion.mockImplementation(({ page }) => Promise.resolve({ count: 21, next: page === 1 ? 'next' : null, previous: page === 2 ? 'prev' : null, results: page === 1 ? [{ id: 41, nombre_completo: 'Persona Primera', rol_nombre: 'Docente' }] : [{ id: 42, nombre_completo: 'Persona Segunda', rol_nombre: 'Docente' }] }))
    const pending = deferred()
    postulacionesService.asignarActor.mockReturnValueOnce(pending.promise).mockResolvedValueOnce({ id: 102 })
    renderAssignmentManagerPage('resumen')
    const trigger = await screen.findByRole('button', { name: 'Completar autoridades' })
    await userEvent.click(trigger)
    const dialog = screen.getByRole('dialog')
    const president = await within(dialog).findByLabelText('Seleccionar persona para Presidente')
    await userEvent.selectOptions(president, '41')
    await userEvent.type(within(dialog).getByLabelText('Buscar persona'), 'Persona')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Buscar' }))
    await waitFor(() => expect(postulacionesService.obtenerCandidatosAsignacion).toHaveBeenCalledWith(expect.objectContaining({ search: 'Persona', page: 1 }), expect.any(AbortSignal)))
    await userEvent.click(within(dialog).getByRole('button', { name: /Siguiente/ }))
    const secretary = await within(dialog).findByLabelText('Seleccionar persona para Secretario')
    await userEvent.selectOptions(secretary, '42')
    expect(within(dialog).getByLabelText('Seleccionar persona para Presidente')).toHaveValue('41')
    const save = within(dialog).getByRole('button', { name: 'Guardar autoridades' })
    await userEvent.dblClick(save)
    expect(postulacionesService.asignarActor).toHaveBeenCalledTimes(1)
    await userEvent.keyboard('{Escape}')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cerrar' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    expect(dialog).toBeInTheDocument()
    expect(postulacionesService.asignarActor.mock.calls[0][2].aborted).toBe(false)
    await act(async () => pending.resolve({ id: 101 }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(postulacionesService.asignarActor.mock.calls.map((call) => call[1])).toEqual([
      { usuario: 41, tipo_participacion: 'PRESIDENTE', seguimiento_etapa: 82 },
      { usuario: 42, tipo_participacion: 'SECRETARIO', seguimiento_etapa: 82 },
    ])
  })

  it('abre autoridades de Tesis con requisitos individuales y cancelar no envía asignaciones', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(thesisPublicAuthoritiesResponse())
    renderAssignmentManagerPage('resumen')
    const trigger = await screen.findByRole('button', { name: 'Completar autoridades' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const requirements = screen.getByRole('heading', { name: 'Requisitos de esta etapa' }).closest('section')
    expect(within(requirements).getByText(/Tribunales/)).toBeInTheDocument()
    expect(within(requirements).getByText('3 vigentes')).toBeInTheDocument()
    expect(within(requirements).getByText('Mínimo requerido: 3')).toBeInTheDocument()
    expect(within(requirements).getAllByText('0 vigentes')).toHaveLength(2)
    expect(within(requirements).getByText(/1 de 3/)).toBeInTheDocument()
    await userEvent.click(trigger)
    const dialog = screen.getByRole('dialog', { name: 'Completar autoridades' })
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    for (const role of ['Presidente', 'Secretario']) expect(await within(dialog).findByLabelText(`Seleccionar persona para ${role}`)).toBeInTheDocument()
    expect(within(dialog).queryByRole('option', { name: 'Tribunal' })).not.toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(postulacionesService.asignarActor).not.toHaveBeenCalled()
    expect(trigger).toHaveFocus()
  })

  it('recalcula autoridades estructuradas de Tesis al guardar y conserva el bloqueo de doble envío', async () => {
    const pending = deferred()
    postulacionesService.obtenerExpediente.mockResolvedValueOnce(thesisPublicAuthoritiesResponse())
      .mockResolvedValue(thesisPublicAuthoritiesResponse({ president: 1 }))
    postulacionesService.asignarActor.mockReturnValueOnce(pending.promise).mockRejectedValueOnce({ message: 'Secretario pendiente' })
    renderAssignmentManagerPage('resumen')
    await userEvent.click(await screen.findByRole('button', { name: 'Completar autoridades' }))
    const dialog = screen.getByRole('dialog', { name: 'Completar autoridades' })
    await within(dialog).findByLabelText('Seleccionar persona para Presidente')
    await userEvent.selectOptions(within(dialog).getByLabelText('Seleccionar persona para Presidente'), '41')
    await userEvent.selectOptions(within(dialog).getByLabelText('Seleccionar persona para Secretario'), '41')
    const submit = within(dialog).getByRole('button', { name: 'Guardar autoridades' })
    await userEvent.dblClick(submit)
    expect(postulacionesService.asignarActor).toHaveBeenCalledTimes(1)
    expect(postulacionesService.asignarActor).toHaveBeenCalledWith(7, expect.objectContaining({ usuario: 41, tipo_participacion: 'PRESIDENTE', seguimiento_etapa: 82 }), expect.any(AbortSignal))
    await act(async () => pending.resolve({ id: 100 }))
    await waitFor(() => expect(within(screen.getByRole('dialog')).getByText(/Secretario pendiente/)).toBeInTheDocument())
    const refreshedDialog = screen.getByRole('dialog')
    expect(await within(refreshedDialog).findByText('✓ Asignado')).toBeInTheDocument()
    expect(within(refreshedDialog).queryByLabelText('Seleccionar persona para Presidente')).not.toBeInTheDocument()
    expect(within(refreshedDialog).getByLabelText('Seleccionar persona para Secretario')).toHaveValue('41')
    await userEvent.click(within(refreshedDialog).getByRole('button', { name: 'Reintentar pendientes' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(postulacionesService.asignarActor.mock.calls.map((call) => call[1].tipo_participacion)).toEqual(['PRESIDENTE', 'SECRETARIO', 'SECRETARIO'])
  })

  it('muestra autoridades de Tesis como información sin permiso de asignaciones', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(thesisPublicAuthoritiesResponse())
    renderPage('resumen')
    expect(await screen.findByText('Actores de la postulación')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Completar autoridades' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Completar autoridades' })).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(postulacionesService.asignarActor).not.toHaveBeenCalled()
  })

  it.each(['actores', 'resumen'])('no abre autoridades de Tesis automáticamente por hash %s', async (hash) => {
    postulacionesService.obtenerExpediente.mockResolvedValue(thesisPublicAuthoritiesResponse())
    renderAssignmentManagerPage(hash)
    await screen.findByRole('heading', { name: /Ana P/ })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(postulacionesService.asignarActor).not.toHaveBeenCalled()
  })

  it('conserva el error backend de asignación contextual de Tesis y permite reintentar', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(thesisPublicAuthoritiesResponse({ president: 1 }))
    postulacionesService.asignarActor.mockRejectedValueOnce({ message: 'La asignación ya cambió; actualiza el expediente.' })
    renderAssignmentManagerPage('resumen')
    await userEvent.click(await screen.findByRole('button', { name: 'Completar autoridades' }))
    const dialog = screen.getByRole('dialog', { name: 'Completar autoridades' })
    await within(dialog).findByLabelText('Seleccionar persona para Secretario')
    expect(within(dialog).queryByLabelText('Seleccionar persona para Presidente')).not.toBeInTheDocument()
    await within(dialog).findByRole('option', { name: /Johnny Rosas/ })
    await userEvent.selectOptions(within(dialog).getByLabelText('Seleccionar persona para Secretario'), '41')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar autoridades' }))
    expect(await within(dialog).findByText(/La asignación ya cambió; actualiza el expediente/)).toBeInTheDocument()
    await within(dialog).findByLabelText('Seleccionar persona para Secretario')
    expect(within(dialog).getByRole('button', { name: 'Guardar autoridades' })).toBeEnabled()
    await waitFor(() => expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2))
  })

  it.each(['#documentos', '#defensas'])('no convierte bloqueos de Tesis en asignación de autoridades: %s', async (destino) => {
    postulacionesService.obtenerExpediente.mockResolvedValue(thesisPublicAuthoritiesResponse({ action: {
      titulo: 'Completar precondiciones de defensa', descripcion: 'Completa la habilitación pendiente.', destino, accion_label: 'Consultar bloqueo', requiere_permiso: undefined,
    } }))
    renderAssignmentManagerPage('resumen')
    expect(await screen.findByRole('link', { name: 'Consultar bloqueo' })).toHaveAttribute('href', destino)
    expect(screen.queryByRole('button', { name: 'Completar autoridades' })).not.toBeInTheDocument()
    expect(screen.queryByText('Para programar la Defensa Pública faltan:')).not.toBeInTheDocument()
  })

  it('no abre autoridades de Tesis ante defensa pública existente', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(thesisPublicAuthoritiesResponse())
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, results: [{ id: 98, tipo_evento: 'DEFENSA_PUBLICA', seguimiento_etapa: 82, numero_intento: 1, estado: 'PROGRAMADA', activo: true }] })
    renderAssignmentManagerPage('resumen')
    expect(await screen.findByRole('link', { name: 'Completar autoridades' })).toHaveAttribute('href', '#actores')
    expect(screen.queryByRole('button', { name: 'Completar autoridades' })).not.toBeInTheDocument()
  })

  it('guía la asignación de autoridades faltantes de Defensa Pública de Tesis y recalcula el siguiente rol', async () => {
    const publicStage = { id: 82, codigo: 'DEFENSA_PUBLICA', nombre: 'Defensa Pública', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
    const thesisResponse = (description) => ({
      ...response,
      detalle: { ...response.detalle, modalidad_detalle: { id: 2, codigo: 'TESIS_GRADO', nombre: 'Tesis de Grado' } },
      flujo: {
        ...response.flujo,
        modalidad: { id: 2, codigo: 'TESIS_GRADO', nombre: 'Tesis de Grado' },
        etapa_actual: publicStage,
        etapas: [...response.flujo.etapas.filter((stage) => stage.codigo !== 'DEFENSA_PUBLICA'), publicStage],
        orientacion_etapa_actual: {
          mensaje: 'Completa las precondiciones y gestiona la Defensa Pública.',
          requisitos: [{ tipo: 'OPERATIVO', codigo: 'PRECONDICIONES_DEFENSA', nombre: 'Precondiciones de defensa', cumplido: false, estado_display: 'Pendiente', destino: '#actores' }],
          siguiente_accion: { codigo: 'GESTIONAR_PRECONDICIONES', titulo: 'Completar precondiciones de defensa', descripcion: description, estado: 'PENDIENTE', destino: '#actores', accion_label: 'Ir a precondiciones' },
        },
      },
    })
    postulacionesService.obtenerExpediente
      .mockResolvedValueOnce(thesisResponse("La Defensa Pública de Tesis requiere: {'PRESIDENTE': 1, 'SECRETARIO': 1}."))
      .mockResolvedValue(thesisResponse("La Defensa Pública de Tesis requiere: {'SECRETARIO': 1}."))
    renderAssignmentManagerPage('resumen')

    expect(await screen.findByText('Para programar la Defensa Pública faltan:')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: 'Ir a precondiciones' }))
    const dialog = screen.getByRole('dialog', { name: 'Asignar actor' })
    expect(within(dialog).getByRole('option', { name: 'Presidente' })).toBeInTheDocument()
    expect(within(dialog).getByRole('option', { name: 'Secretario' })).toBeInTheDocument()
    for (const excluded of ['Tribunal', 'Tutor', 'Docente de modalidad']) expect(within(dialog).queryByRole('option', { name: excluded })).not.toBeInTheDocument()

    await within(dialog).findByRole('option', { name: /Johnny Rosas/ })
    await userEvent.selectOptions(within(dialog).getByLabelText('Candidato'), '41')
    await userEvent.selectOptions(within(dialog).getByLabelText('Tipo de participación'), 'PRESIDENTE')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirmar asignación' }))

    expect(postulacionesService.asignarActor).toHaveBeenCalledWith(7, expect.objectContaining({
      usuario: 41, tipo_participacion: 'PRESIDENTE', seguimiento_etapa: 82,
    }), expect.any(AbortSignal))
    await waitFor(() => expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2))
    expect(within(dialog).queryByRole('option', { name: 'Presidente' })).not.toBeInTheDocument()
    expect(within(dialog).getByRole('option', { name: 'Secretario' })).toBeInTheDocument()
  })

  it('orienta a programar Defensa Pública cuando el contrato ya no informa autoridades faltantes', async () => {
    const publicStage = { id: 82, codigo: 'DEFENSA_PUBLICA', nombre: 'Defensa Pública', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: { ...response.detalle, modalidad_detalle: { id: 2, codigo: 'TESIS_GRADO', nombre: 'Tesis de Grado' } },
      flujo: { ...response.flujo, modalidad: { id: 2, codigo: 'TESIS_GRADO' }, etapa_actual: publicStage, etapas: [publicStage], orientacion_etapa_actual: {
        mensaje: 'Gestiona la Defensa Pública.', requisitos: [],
        siguiente_accion: { codigo: 'PROGRAMAR_EVENTO', titulo: 'Programar defensa', descripcion: 'Programa la defensa correspondiente a esta etapa.', estado: 'DISPONIBLE', destino: '#defensas', accion_label: 'Ir a programar defensa' },
      } },
    })
    renderAssignmentManagerPage('resumen')
    expect(await screen.findByText('Programar Defensa Pública')).toBeInTheDocument()
    expect(screen.queryByText('Para programar la Defensa Pública faltan:')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir a programar defensa' })).toHaveAttribute('href', '#defensas')
  })

  it('representa las tres posiciones de Tribunal declaradas e impide una cuarta', async () => {
    const contracts = profileContracts({ assignedTribunals: [
      { id: 21, name: 'Tribunal Uno', order: 1 },
      { id: 22, name: 'Tribunal Dos', order: 2 },
      { id: 23, name: 'Tribunal Tres', order: 3 },
    ] })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.obtenerActores.mockImplementation((_id, activo) => Promise.resolve(activo ? {
      count: 3, next: null, previous: null, results: [1, 2, 3].map((order) => ({ id: order, usuario_nombre: `Tribunal ${order}`, tipo_participacion: 'TRIBUNAL', tipo_participacion_display: 'Tribunal', orden_cargo: order, seguimiento_etapa: 12, activo: true })),
    } : historicalActorsResponse))
    renderAssignmentManagerPage()
    const actors = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('section')
    await userEvent.click(within(actors).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    for (const order of [1, 2, 3]) {
      expect(within(dialog).getByRole('heading', { name: `Tribunal ${order} *` })).toBeInTheDocument()
      expect(within(dialog).getByLabelText(`Seleccionar reemplazo para Tribunal ${order}`)).toBeInTheDocument()
    }
    expect(within(dialog).queryByRole('heading', { name: 'Tribunal 4 *' })).not.toBeInTheDocument()
    expect(within(actors).getByText('3 de 4 posiciones ocupadas')).toBeInTheDocument()
  })

  it('mantiene visibles los actores de Perfil sin proyectarlos como posiciones de otra etapa', async () => {
    const reviewStage = tribunalResponse.flujo.etapa_actual
    const contracts = profileContracts({ proposalApproved: true })
    const tutorPosition = contracts.flow.gestion_actores.posiciones.find((position) => position.tipo_participacion === 'TUTOR')
    const flow = {
      ...tribunalResponse.flujo,
      etapa_actual: reviewStage,
      etapas: [reviewStage],
      gestion_actores: {
        contexto: { tipo: 'ETAPA', seguimiento_etapa: reviewStage.id, codigo_etapa: reviewStage.codigo, regimen_workflow: 'PG_HITOS_V1' },
        posiciones: [{ ...tutorPosition, seguimiento_etapa: null, ambito: 'POSTULACION' }],
      },
    }
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: flow })
    postulacionesService.obtenerActores.mockImplementation((_id, activo) => Promise.resolve(activo ? {
      count: 2, next: null, previous: null, results: [
        { id: 21, usuario_nombre: 'Raúl Marcelo Calderon Fuertes', tipo_participacion: 'TRIBUNAL', orden_cargo: 1, seguimiento_etapa: 11, activo: true },
        { id: 22, usuario_nombre: 'Mirna Fernández Rojas', tipo_participacion: 'TRIBUNAL', orden_cargo: 2, seguimiento_etapa: 11, activo: true },
      ],
    } : historicalActorsResponse))
    postulacionesService.obtenerTribunalesActivos.mockResolvedValue([
      { id: 21, usuario_nombre: 'Raúl Marcelo Calderon Fuertes', tipo_participacion: 'TRIBUNAL', orden_cargo: 1, seguimiento_etapa: 11, activo: true },
      { id: 22, usuario_nombre: 'Mirna Fernández Rojas', tipo_participacion: 'TRIBUNAL', orden_cargo: 2, seguimiento_etapa: 11, activo: true },
    ])
    renderAssignmentManagerPage()

    const actors = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('section')
    const activeGroup = within(actors).getByRole('heading', { name: 'Participación actual' }).closest('section')
    expect(within(activeGroup).getByText('Raúl Marcelo Calderon Fuertes')).toBeInTheDocument()
    expect(within(activeGroup).getByText('Mirna Fernández Rojas')).toBeInTheDocument()
    await userEvent.click(within(actors).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Revisión de Tribunal Previa' })
    // La etapa ya está en el título de la ventana: no se repite su código interno.
    expect(within(dialog).queryByText(/REVISION_TRIBUNAL_PREVIA/)).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('heading', { name: /Tribunal [123] \*/ })).not.toBeInTheDocument()
    expect(within(dialog).getByLabelText('Seleccionar candidato para Tutor')).toBeInTheDocument()
  })

  it('usa las posiciones canónicas del contrato aunque la página visible no contenga Tribunal 3', async () => {
    const contracts = profileContracts({ assignedTribunals: [
      { id: 21, name: 'Tribunal Uno', order: 1 },
      { id: 22, name: 'Tribunal Dos', order: 2 },
      { id: 23, name: 'Tribunal Tres', order: 3 },
    ] })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.obtenerActores.mockImplementation((_id, activo) => Promise.resolve(activo ? {
      count: 22, next: '/api/v1/asignaciones/?page=2', previous: null, results: [
        { id: 21, usuario_nombre: 'Tribunal Uno', tipo_participacion: 'TRIBUNAL', orden_cargo: 1, activo: true },
        { id: 22, usuario_nombre: 'Tribunal Dos', tipo_participacion: 'TRIBUNAL', orden_cargo: 2, activo: true },
      ],
    } : historicalActorsResponse))
    postulacionesService.obtenerTribunalesActivos.mockResolvedValue([
      { id: 21, usuario_nombre: 'Tribunal Uno', tipo_participacion: 'TRIBUNAL', orden_cargo: 1, activo: true },
      { id: 22, usuario_nombre: 'Tribunal Dos', tipo_participacion: 'TRIBUNAL', orden_cargo: 2, activo: true },
      { id: 23, usuario_nombre: 'Tribunal Tres', tipo_participacion: 'TRIBUNAL', orden_cargo: 3, activo: true },
    ])

    renderAssignmentManagerPage()
    const actors = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('section')
    await userEvent.click(within(actors).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    expect(within(dialog).getByRole('heading', { name: 'Tribunal 3 *' })).toBeInTheDocument()
    expect(within(dialog).getAllByText(/^Asignada$/)).toHaveLength(3)
    expect(within(dialog).getAllByLabelText(/Seleccionar reemplazo para Tribunal/)).toHaveLength(3)
    expect(within(actors).getByText('3 de 4 posiciones ocupadas')).toBeInTheDocument()
  })

  it('envía orden y seguimiento declarados por la posición y refresca actores vigentes', async () => {
    const contracts = profileContracts()
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    renderAssignmentManagerPage()
    const actors = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('section')
    await userEvent.click(within(actors).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    const selector = within(dialog).getByLabelText('Seleccionar candidato para Tribunal 2')
    await within(candidateList(selector)).findByRole('option', { name: /Johnny Rosas/ })
    await chooseCandidate(selector, '41')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar asignaciones' }))
    await waitFor(() => expect(postulacionesService.asignarActor).toHaveBeenCalledWith(7, {
      usuario: 41, tipo_participacion: 'TRIBUNAL', orden_cargo: 2, seguimiento_etapa: 22, observaciones: '',
    }, expect.any(AbortSignal)))
    expect(postulacionesService.asignarActor).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(postulacionesService.obtenerActores.mock.calls.filter(([, activo]) => activo === true)).toHaveLength(2))
    expect(postulacionesService.obtenerActores.mock.calls.filter(([, activo]) => activo === false)).toHaveLength(2)
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2)
  })

  it('permite asignar sin etapa y muestra errores de validación del backend', async () => {
    const contracts = profileContracts({ proposalApproved: true })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.asignarActor.mockRejectedValue({ status: 400, message: 'Revisa los datos de la asignación.', fields: { usuario: ['El candidato ya está asignado.'] } })
    const { container } = renderAssignmentManagerPage()
    await waitFor(() => expect(container.querySelector('h1')?.textContent).toContain('Ana'))
    const actors = container.querySelector('[aria-labelledby="actores-title"]')
    expect(actors).not.toBeNull()
    await act(async () => {
      fireEvent.click(within(actors).getByRole('button', { name: 'Gestionar actores' }))
      await Promise.resolve()
    })
    const dialog = screen.queryByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    expect(dialog).not.toBeNull()
    const selector = within(dialog).getByLabelText('Seleccionar candidato para Tutor')
    await within(candidateList(selector)).findByRole('option', { name: /Johnny Rosas/ })
    selectCandidate(selector, '41')
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar asignaciones' }))
      await Promise.resolve()
    })
    expect(postulacionesService.asignarActor).toHaveBeenCalledWith(7, { usuario: 41, tipo_participacion: 'TUTOR', observaciones: '' }, expect.any(AbortSignal))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Revisa los datos de la asignación. El candidato ya está asignado.')
  })

  it('oculta el bloque institucional y ofrece una sola entrada para gestionar actores', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    renderAssignmentManagerPage()

    const card = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('[aria-labelledby="actores-title"]')
    expect(within(card).queryByText('Información institucional')).not.toBeInTheDocument()
    expect(within(card).queryByText(/no sustituye un memorando o acto formal/i)).not.toBeInTheDocument()
    expect(within(card).queryByText(/participación anterior representa una participación finalizada/i)).not.toBeInTheDocument()
    expect(within(card).getByRole('heading', { name: 'Participación actual' })).toBeInTheDocument()
    expect(within(card).getAllByRole('button', { name: 'Gestionar actores' })).toHaveLength(1)
  })

  it('mantiene vacíos separados y reintenta un error parcial de actores', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerActores.mockImplementation((_id, activo) => activo
      ? Promise.reject({ status: 401, message: 'Debes iniciar sesión para consultar los actores.' })
      : Promise.resolve({ count: 0, next: null, previous: null, results: [] }))
    renderPage('actores')
    expect(await screen.findByRole('alert')).toHaveTextContent('Debes iniciar sesión para consultar los actores.')
    expect(screen.getByText('No hay participaciones anteriores registradas.')).toBeInTheDocument()
    expect(screen.getByText(/Ana P/)).toBeInTheDocument()
    postulacionesService.obtenerActores.mockResolvedValue({ count: 0, next: null, previous: null, results: [] })
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar participación actual' }))
    expect(await screen.findByText('No hay participaciones vigentes registradas.')).toBeInTheDocument()
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(1)
  })

  it('permite seleccionar y guardar Tutor junto con los Tribunales antes de aprobar la propuesta', async () => {
    const contracts = profileContracts()
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.obtenerCandidatosElegibles.mockResolvedValue({ count: 1, next: null, previous: null, results: [
      { id: 44, username: 'tutora', nombre_completo: 'Tutora Anticipada', rol_nombre: 'Docente' },
    ] })
    renderAssignmentManagerPage()

    const actors = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('section')
    expect(within(actors).getByText('0 de 4 posiciones ocupadas')).toBeInTheDocument()
    await userEvent.click(within(actors).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    for (const order of [1, 2, 3]) expect(within(dialog).getByRole('heading', { name: `Tribunal ${order} *` })).toBeInTheDocument()
    const tutorPosition = within(dialog).getByRole('heading', { name: 'Tutor *' }).closest('section')
    const tutorSelector = within(tutorPosition).getByLabelText('Seleccionar candidato para Tutor')
    await within(candidateList(tutorSelector)).findByRole('option', { name: /Tutora Anticipada/ })
    await chooseCandidate(tutorSelector, '44')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar asignaciones' }))

    await waitFor(() => expect(postulacionesService.asignarActor).toHaveBeenCalledWith(7, {
      usuario: 44, tipo_participacion: 'TUTOR', observaciones: '',
    }, expect.any(AbortSignal)))
    expect(screen.queryByRole('button', { name: 'Conformar equipo' })).not.toBeInTheDocument()
    expect(within(actors).getAllByRole('button', { name: 'Gestionar actores' })).toHaveLength(1)
    expect(screen.getByText('Completar composición formal')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Registrar decisión' })).not.toBeInTheDocument()
  })

  it('asigna una posición individual dentro del modal genérico con orden y contexto del backend', async () => {
    const contracts = profileContracts()
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.obtenerCandidatosElegibles.mockResolvedValue({ count: 1, next: null, previous: null, results: [
      { id: 41, username: 'tribunal-one', nombre_completo: 'Tribunal Disponible', rol_nombre: 'Docente' },
    ] })
    renderAssignmentManagerPage()

    const actors = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('section')
    await userEvent.click(within(actors).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    const selector = within(dialog).getByLabelText('Seleccionar candidato para Tribunal 1')
    await within(candidateList(selector)).findByRole('option', { name: /Tribunal Disponible/ })
    await chooseCandidate(selector, '41')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar asignaciones' }))

    await waitFor(() => expect(postulacionesService.asignarActor).toHaveBeenCalledWith(7, {
      usuario: 41, tipo_participacion: 'TRIBUNAL', observaciones: '', orden_cargo: 1, seguimiento_etapa: 22,
    }, expect.any(AbortSignal)))
    expect(postulacionesService.asignarActor.mock.calls.some(([, payload]) => payload.tipo_participacion === 'TUTOR')).toBe(false)
  })

  it('mantiene el expediente renderizado al refrescar posiciones asignadas desde Gestionar actores', async () => {
    const initial = profileContracts()
    const names = ['Tribunal Uno', 'Tribunal Dos', 'Tribunal Tres']
    const assignedTribunals = names.map((name, index) => ({ id: 50 + index, name, order: index + 1 }))
    const refreshed = profileContracts({ assignedTribunals })
    refreshed.flow.gestion_actores.posiciones = refreshed.flow.gestion_actores.posiciones.map((position) => {
      const assignment = assignedTribunals.find(({ order }) => order === position.orden_cargo)
      if (!assignment) return position
      return {
        ...position,
        asignacion_actual_detalle: {
          id: position.asignacion_actual,
          usuario: { id: assignment.id + 100, nombre: assignment.name },
          tipo_participacion: 'TRIBUNAL',
          orden_cargo: assignment.order,
          ambito: 'ETAPA',
          seguimiento_etapa: initial.stage.id,
        },
      }
    })
    let serverActors = []
    postulacionesService.obtenerExpediente
      .mockResolvedValueOnce({ ...response, flujo: initial.flow })
      .mockResolvedValue({ ...response, flujo: refreshed.flow })
    postulacionesService.obtenerActores.mockImplementation((_id, active) => Promise.resolve(active
      ? { count: serverActors.length, next: null, previous: null, results: serverActors }
      : { count: 0, next: null, previous: null, results: [] }))
    postulacionesService.obtenerCandidatosElegibles.mockResolvedValue({ count: 3, next: null, previous: null, results: names.map((name, index) => ({
      id: 150 + index, username: `tribunal-${index + 1}`, nombre_completo: name, rol_nombre: 'Docente',
    })) })
    postulacionesService.asignarActor.mockImplementation(async (_id, payload) => {
      const id = 50 + payload.orden_cargo - 1
      serverActors = [...serverActors, {
        id,
        usuario: payload.usuario,
        usuario_nombre: names[payload.orden_cargo - 1],
        tipo_participacion: payload.tipo_participacion,
        orden_cargo: payload.orden_cargo,
        etapa_nombre: 'Perfil de Proyecto',
        seguimiento_etapa: initial.stage.id,
        activo: true,
      }]
      return { id }
    })
    renderAssignmentManagerPage()

    const actors = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('section')
    await userEvent.click(within(actors).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    for (const order of [1, 2, 3]) {
      await chooseCandidate(within(dialog).getByLabelText(`Seleccionar candidato para Tribunal ${order}`), String(149 + order))
    }
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar asignaciones' }))

    await waitFor(() => expect(postulacionesService.asignarActor).toHaveBeenCalledTimes(3))
    expect(await screen.findByText('3 de 4 posiciones ocupadas')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })).toBeInTheDocument()
    const activeGroup = within(actors).getByRole('heading', { name: 'Participación actual' }).closest('section')
    for (const name of names) {
      expect(within(dialog).getByText(name, { exact: true })).toBeInTheDocument()
      expect(within(activeGroup).getByText(name, { exact: true })).toBeInTheDocument()
    }
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2)
  })

  it('conserva éxitos y reintenta solo posiciones fallidas tras refrescar el expediente', async () => {
    const initial = profileContracts()
    const names = ['Tribunal Uno', 'Tribunal Dos', 'Tribunal Tres']
    const candidates = names.map((name, index) => ({
      id: 151 + index, username: `tribunal-${index + 1}`, nombre_completo: name, rol_nombre: 'Docente',
    }))
    let serverActors = []
    let failedOnce = false
    const buildRefreshedFlow = () => {
      const assignedTribunals = serverActors.map((actor) => ({
        id: actor.id, name: actor.usuario_nombre, order: actor.orden_cargo,
      }))
      const refreshed = profileContracts({ assignedTribunals })
      refreshed.flow.gestion_actores.posiciones = refreshed.flow.gestion_actores.posiciones.map((position) => {
        const assignment = assignedTribunals.find(({ order }) => order === position.orden_cargo)
        return assignment ? {
          ...position,
          asignacion_actual_detalle: {
            id: position.asignacion_actual,
            usuario: { id: assignment.id + 100, nombre: assignment.name },
            tipo_participacion: 'TRIBUNAL',
            orden_cargo: assignment.order,
            ambito: 'ETAPA',
            seguimiento_etapa: initial.stage.id,
          },
        } : position
      })
      return refreshed.flow
    }
    postulacionesService.obtenerExpediente.mockImplementation(async () => ({
      ...response,
      flujo: serverActors.length ? buildRefreshedFlow() : initial.flow,
    }))
    postulacionesService.obtenerActores.mockImplementation((_id, active) => Promise.resolve(active
      ? { count: serverActors.length, next: null, previous: null, results: serverActors }
      : { count: 0, next: null, previous: null, results: [] }))
    postulacionesService.obtenerCandidatosElegibles.mockResolvedValue({ count: candidates.length, next: null, previous: null, results: candidates })
    postulacionesService.asignarActor.mockImplementation(async (_id, payload) => {
      if (payload.orden_cargo === 2 && !failedOnce) {
        failedOnce = true
        throw { message: 'Conflicto de asignación.' }
      }
      const actor = {
        id: 70 + payload.orden_cargo,
        usuario: payload.usuario,
        usuario_nombre: names[payload.orden_cargo - 1],
        tipo_participacion: payload.tipo_participacion,
        orden_cargo: payload.orden_cargo,
        etapa_nombre: 'Perfil de Proyecto',
        seguimiento_etapa: initial.stage.id,
        activo: true,
      }
      serverActors = [...serverActors.filter((item) => item.orden_cargo !== payload.orden_cargo), actor]
      return { id: actor.id }
    })
    renderAssignmentManagerPage()

    const actors = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('section')
    await userEvent.click(within(actors).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    for (const order of [1, 2, 3]) {
      await chooseCandidate(within(dialog).getByLabelText(`Seleccionar candidato para Tribunal ${order}`), String(150 + order))
    }
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar asignaciones' }))

    expect(await within(dialog).findByText('Conflicto de asignación.')).toBeInTheDocument()
    expect(await screen.findByText('2 de 4 posiciones ocupadas')).toBeInTheDocument()
    expect(within(dialog).getAllByText('Guardado')).toHaveLength(2)
    const activeGroup = within(actors).getByRole('heading', { name: 'Participación actual' }).closest('section')
    expect(within(activeGroup).getByText('Tribunal Uno')).toBeInTheDocument()
    expect(within(activeGroup).getByText('Tribunal Tres')).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Reintentar pendientes' }))

    await waitFor(() => expect(postulacionesService.asignarActor).toHaveBeenCalledTimes(4))
    expect(postulacionesService.asignarActor.mock.calls.map(([, payload]) => payload.orden_cargo)).toEqual([1, 2, 3, 2])
    expect(await screen.findByText('3 de 4 posiciones ocupadas')).toBeInTheDocument()
    expect(within(dialog).queryByText('Conflicto de asignación.')).not.toBeInTheDocument()
    expect(within(dialog).getAllByText('Guardado')).toHaveLength(3)
    expect(screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })).toBeInTheDocument()
  })

  it('confirma la autorización del perfil con participantes, observaciones y orientación actualizada', async () => {
    const incomplete = profileContracts({ assignedTribunals: [
      { id: 51, name: 'Tribunal Uno', order: 1 },
      { id: 52, name: 'Tribunal Dos', order: 2 },
      { id: 53, name: 'Tribunal Tres', order: 3 },
    ] })
    const approved = profileContracts({
      assignedTribunals: [
        { id: 51, name: 'Tribunal Uno', order: 1 },
        { id: 52, name: 'Tribunal Dos', order: 2 },
        { id: 53, name: 'Tribunal Tres', order: 3 },
      ],
      proposalApproved: true,
    })
    const refreshed = {
        ...approved.flow,
        orientacion_etapa_actual: {
          mensaje: 'El perfil cumple las condiciones para programar su defensa.',
          requisitos: [],
          siguiente_accion: {
            codigo: 'PROGRAMAR_EVENTO',
            titulo: 'Programar Defensa de Perfil',
            descripcion: 'Programa la Defensa de Perfil.',
            estado: 'DISPONIBLE',
            estado_display: 'Disponible',
            destino: '#defensas',
            accion_label: 'Programar defensa',
          },
        },
    }
    postulacionesService.obtenerExpediente
        .mockResolvedValueOnce({ ...response, flujo: incomplete.flow })
        .mockResolvedValue({ ...response, flujo: refreshed })
    renderAssignmentManagerPage('etapas')

    await userEvent.click(await screen.findByRole('button', { name: 'Registrar decisión' }))
    const dialog = screen.getByRole('dialog', { name: 'Confirmar autorización del perfil' })
    expect(within(dialog).queryByLabelText('Archivo')).not.toBeInTheDocument()
    expect(within(dialog).queryByLabelText('Resultado')).not.toBeInTheDocument()
    for (const name of ['Tribunal Uno', 'Tribunal Dos', 'Tribunal Tres']) {
        expect(within(dialog).getByText((text) => text.includes(name))).toBeInTheDocument()
    }
    const participants = within(dialog).getAllByRole('listitem')
    expect(participants.map((row) => row.firstElementChild.textContent)).toEqual(['Tribunal Uno', 'Tribunal Dos', 'Tribunal Tres'])
    participants.forEach((row, index) => expect(within(row).getByText(`TRIBUNAL ${index + 1}`)).toBeInTheDocument())
    const cancel = within(dialog).getByRole('button', { name: 'Cancelar' })
    const confirm = within(dialog).getByRole('button', { name: 'Confirmar autorización' })
    expect(cancel.compareDocumentPosition(confirm) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    await userEvent.type(within(dialog).getByLabelText('Observaciones (opcional)'), 'Autorización respaldada por memorándum.')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirmar autorización' }))

    await waitFor(() => expect(postulacionesService.registrarDecisionAcademica).toHaveBeenCalledWith(22, {
        codigo: 'PROPUESTA_APROBADA',
        resultado: 'APROBADA',
        observaciones: 'Autorización respaldada por memorándum.',
        participantes: [
          { asignacion: 51, rol: 'TRIBUNAL', orden: 1 },
          { asignacion: 52, rol: 'TRIBUNAL', orden: 2 },
          { asignacion: 53, rol: 'TRIBUNAL', orden: 3 },
        ],
    }, expect.any(AbortSignal)))
    await userEvent.click(screen.getByRole('tab', { name: 'Resumen' }))
    expect(await screen.findByText('Programar Defensa de Perfil')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Actores' }))
    const actors = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('section')
    await userEvent.click(within(actors).getByRole('button', { name: 'Gestionar actores' }))
    const actorDialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    expect(within(actorDialog).getByLabelText('Seleccionar candidato para Tutor')).toBeInTheDocument()
    expect(within(actorDialog).getByRole('heading', { name: 'Tutor *' })).toBeInTheDocument()
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2)
  })

  it('conserva el selector y el registro de RECHAZADA para decisiones académicas generales', async () => {
    const contracts = profileContracts({
      assignedTribunals: [
        { id: 51, name: 'Tribunal Uno', order: 1 },
        { id: 52, name: 'Tribunal Dos', order: 2 },
        { id: 53, name: 'Tribunal Tres', order: 3 },
      ],
    })
    contracts.flow.gestion_decisiones_academicas.decisiones[0] = {
      ...contracts.flow.gestion_decisiones_academicas.decisiones[0],
      codigo: 'DECISION_GENERAL',
      nombre: 'Decisión académica general',
      resultados_permitidos: ['APROBADA', 'RECHAZADA'],
    }
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    renderAssignmentManagerPage('etapas')

    await userEvent.click(await screen.findByRole('button', { name: 'Registrar decisión' }))
    const dialog = screen.getByRole('dialog', { name: 'Decisión académica general' })
    const result = within(dialog).getByLabelText('Resultado')
    await userEvent.selectOptions(result, 'RECHAZADA')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Registrar decisión' }))

    await waitFor(() => expect(postulacionesService.registrarDecisionAcademica).toHaveBeenCalledWith(22, expect.objectContaining({
      codigo: 'DECISION_GENERAL',
      resultado: 'RECHAZADA',
    }), expect.any(AbortSignal)))
  })

  it('no permite registrar decisión cuando el backend no concede acción de escritura', async () => {
    const contracts = profileContracts({
      assignedTribunals: [
        { id: 51, name: 'Tribunal Uno', order: 1 },
        { id: 52, name: 'Tribunal Dos', order: 2 },
        { id: 53, name: 'Tribunal Tres', order: 3 },
      ],
      canRegister: false,
    })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    selectInitialTab('etapas')
    render(<AuthContext.Provider value={{ user: { id: 12 }, hasPermission: () => false }}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)

    expect(await screen.findByRole('heading', { name: 'Decisiones académicas' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Registrar decisión' })).not.toBeInTheDocument()
    expect(postulacionesService.registrarDecisionAcademica).not.toHaveBeenCalled()
  })

  it('reemplaza una decisión solo cuando el backend declara REEMPLAZAR', async () => {
    const contracts = profileContracts({
      assignedTribunals: [
        { id: 51, name: 'Tribunal Uno', order: 1 },
        { id: 52, name: 'Tribunal Dos', order: 2 },
        { id: 53, name: 'Tribunal Tres', order: 3 },
      ],
      proposalApproved: true,
    })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    renderAssignmentManagerPage('etapas')

    await userEvent.click(await screen.findByRole('button', { name: 'Reemplazar decisión' }))
    const dialog = screen.getByRole('dialog', { name: 'Confirmar autorización del perfil' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirmar autorización' }))

    await waitFor(() => expect(postulacionesService.registrarDecisionAcademica).toHaveBeenCalledWith(22, expect.objectContaining({
      codigo: 'PROPUESTA_APROBADA',
      resultado: 'APROBADA',
      reemplaza_decision: 71,
    }), expect.any(AbortSignal)))
  })

  it('reemplaza actor desde el modal genérico conservando posición y contexto del contrato', async () => {
    const contracts = profileContracts({
      assignedTribunals: [
        { id: 51, name: 'Tribunal Uno', order: 1 },
        { id: 52, name: 'Tribunal Dos', order: 2 },
        { id: 53, name: 'Tribunal Tres', order: 3 },
      ],
      proposalApproved: true,
    })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.obtenerActores.mockImplementation((_id, active) => Promise.resolve(active
      ? { count: 3, next: null, previous: null, results: [1, 2, 3].map((order) => ({
        id: 50 + order, usuario: 150 + order, usuario_nombre: `Tribunal ${order}`,
        tipo_participacion: 'TRIBUNAL', orden_cargo: order, seguimiento_etapa: 22, activo: true,
      })) }
      : { count: 0, next: null, previous: null, results: [] }))
    postulacionesService.obtenerCandidatosElegibles.mockResolvedValue({ count: 2, next: null, previous: null, results: [
      { id: 98, username: 'busy', codigo: 'RU-0098', nombre_completo: 'Willian Vargas', rol_nombre: 'Docente', elegible: false, motivo_bloqueo: 'YA_TIENE_ASIGNACION_VIGENTE_EN_POSTULACION', asignaciones_vigentes: ['Tutor'] },
      { id: 99, username: 'replacement', codigo: 'RU-0099', nombre_completo: 'Nuevo Tribunal', rol_nombre: 'Docente', elegible: true, motivo_bloqueo: null, asignaciones_vigentes: [] },
    ] })
    renderAssignmentManagerPage()

    const actors = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('section')
    await userEvent.click(within(actors).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    const selector = within(dialog).getByLabelText('Seleccionar reemplazo para Tribunal 1')
    await within(candidateList(selector)).findByRole('option', { name: /Nuevo Tribunal/ })
    expect(within(candidateList(selector)).queryByRole('option', { name: /Tribunal Uno/ })).not.toBeInTheDocument()
    expect(within(candidateList(selector)).getByRole('option', { name: /Willian Vargas.*RU-0098.*Asignación vigente: Tutor/ })).toBeDisabled()
    expect(within(candidateList(selector)).getByRole('option', { name: /Nuevo Tribunal.*RU-0099/ })).toBeEnabled()
    expect(postulacionesService.obtenerCandidatosElegibles).toHaveBeenCalledWith(
      7,
      { posicion: 'TRIBUNAL_PERFIL_1', accion: 'REEMPLAZAR', search: '', ordering: 'apellido_paterno', page: 1, page_size: 20 },
      expect.any(AbortSignal),
    )
    await chooseCandidate(selector, '99')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar asignaciones' }))

    await waitFor(() => expect(postulacionesService.reemplazarActor).toHaveBeenCalledWith(51, {
      nuevo_usuario: 99,
      observaciones: '',
    }, expect.any(AbortSignal)))
    expect(postulacionesService.asignarActor).not.toHaveBeenCalled()
  })

  it('muestra una sola alerta general y orientación amigable para tribunal incompleto con enlace a actores', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(tribunalResponse)
    postulacionesService.obtenerDocumentos.mockResolvedValue(tribunalDocuments)
    postulacionesService.obtenerActores.mockImplementation((_id, activo) => Promise.resolve(activo ? activeActorsResponse : historicalActorsResponse))
    postulacionesService.obtenerTribunalesActivos.mockResolvedValue([
      { id: 2, tipo_participacion: 'TRIBUNAL', orden_cargo: 1, activo: true },
      { id: 3, tipo_participacion: 'TRIBUNAL', orden_cargo: 2, activo: true },
    ])
    postulacionesService.registrarInformeRevisionTribunal.mockRejectedValue({
      status: 400,
      message: 'REVISION_TRIBUNAL_PREVIA requiere tres tribunales activos distintos con órdenes 1, 2 y 3.',
      fields: {
        detail: ['REVISION_TRIBUNAL_PREVIA requiere tres tribunales activos distintos con órdenes 1, 2 y 3.'],
        non_field_errors: ['REVISION_TRIBUNAL_PREVIA requiere tres tribunales activos distintos con órdenes 1, 2 y 3.'],
      },
    })

    renderWorkflowManagerPage()
    await userEvent.click(await screen.findByRole('tab', { name: 'Resumen' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Registrar informe del tribunal' }))
    const dialog = screen.getByRole('dialog', { name: 'Registrar informe del tribunal' })
    await userEvent.selectOptions(within(dialog).getByLabelText('Resultado'), 'SUFICIENTE')
    await userEvent.selectOptions(within(dialog).getByLabelText('Evidencia'), '602')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Registrar informe' }))

    expect(await within(dialog).findByText('Falta completar el tribunal. Para registrar el informe deben estar vigentes Tribunal 1, Tribunal 2 y Tribunal 3.')).toBeInTheDocument()
    expect(within(dialog).getAllByRole('alert')).toHaveLength(1)
    expect(within(dialog).getByText('Tribunal incompleto: falta Tribunal 3.')).toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: 'Ir a actores' })).toHaveAttribute('href', '#actores')
    expect(within(dialog).getByRole('button', { name: 'Registrar informe' })).toBeEnabled()
  })

  it('asigna el tribunal faltante dentro del mismo modal y conserva el borrador del informe', async () => {
    const initialTribunals = [
      { id: 21, usuario: 51, tipo_participacion: 'TRIBUNAL', orden_cargo: 1, activo: true },
      { id: 22, usuario: 52, tipo_participacion: 'TRIBUNAL', orden_cargo: 2, activo: true },
    ]
    postulacionesService.obtenerExpediente.mockResolvedValue(tribunalResponse)
    postulacionesService.obtenerDocumentos.mockResolvedValue(tribunalDocuments)
    postulacionesService.obtenerTribunalesActivos
      .mockResolvedValueOnce(initialTribunals)
      .mockResolvedValueOnce([...initialTribunals, { id: 23, usuario: 41, tipo_participacion: 'TRIBUNAL', orden_cargo: 3, activo: true }])

    const { container } = renderWorkflowAssignmentManagerPage('informes-etapa')
    await waitFor(() => expect(container.querySelector('h1')?.textContent).toContain('Ana'))
    await userEvent.click(await screen.findByRole('tab', { name: 'Resumen' }))
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: 'Registrar informe del tribunal' }))
      await Promise.resolve()
    })
    let dialog = screen.queryByRole('dialog', { name: 'Registrar informe del tribunal' })
    expect(dialog).not.toBeNull()
    await act(async () => {
      fireEvent.change(within(dialog).getByLabelText('Resultado'), { target: { value: 'SUFICIENTE' } })
      fireEvent.change(within(dialog).getByLabelText('Evidencia'), { target: { value: '602' } })
      fireEvent.change(within(dialog).getByLabelText(/Observaciones/), { target: { value: 'Ninguna' } })
      fireEvent.click(within(dialog).getByRole('button', { name: 'Asignar Tribunal 3' }))
      await Promise.resolve()
    })

    expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1)
    dialog = screen.queryByRole('dialog', { name: 'Registrar informe del tribunal' })
    expect(within(dialog).getByRole('heading', { name: 'Asignar Tribunal 3' })).toBeInTheDocument()
    expect(within(dialog).getByText('Tribunal')).toBeInTheDocument()
    expect(within(dialog).getByText('Revisión de Tribunal Previa')).toBeInTheDocument()
    expect(within(dialog).getByText('Tribunal 3')).toBeInTheDocument()
    expect(within(dialog).queryByLabelText('Tipo de participación')).not.toBeInTheDocument()
    expect(within(dialog).queryByLabelText('Etapa asociada (opcional)')).not.toBeInTheDocument()
    expect(within(dialog).queryByLabelText('Orden del tribunal')).not.toBeInTheDocument()

    const candidateSelector = within(dialog).getByLabelText('Candidato')
    await within(candidateSelector).findByRole('option', { name: /Johnny Rosas/ })
    await act(async () => {
      fireEvent.change(candidateSelector, { target: { value: '41' } })
      fireEvent.click(within(dialog).getByRole('button', { name: 'Volver al informe' }))
      await Promise.resolve()
    })
    expect(within(dialog).getByLabelText('Resultado')).toHaveValue('SUFICIENTE')
    expect(within(dialog).getByLabelText('Evidencia')).toHaveValue('602')
    expect(within(dialog).getByLabelText(/Observaciones/)).toHaveValue('Ninguna')

    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Asignar Tribunal 3' }))
      await Promise.resolve()
    })
    const reopenedCandidateSelector = within(dialog).getByLabelText('Candidato')
    await within(reopenedCandidateSelector).findByRole('option', { name: /Johnny Rosas/ })
    await act(async () => {
      fireEvent.change(reopenedCandidateSelector, { target: { value: '41' } })
      await Promise.resolve()
    })
    const confirmAssignment = within(dialog).getByRole('button', { name: 'Confirmar asignación' })
    await act(async () => {
      fireEvent.click(confirmAssignment)
      fireEvent.click(confirmAssignment)
      await Promise.resolve()
    })

    await waitFor(() => expect(postulacionesService.asignarActor).toHaveBeenCalledWith(7, {
      usuario: 41, tipo_participacion: 'TRIBUNAL', seguimiento_etapa: 4, orden_cargo: 3, observaciones: '',
    }, expect.any(AbortSignal)))
    expect(postulacionesService.asignarActor).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(postulacionesService.obtenerTribunalesActivos).toHaveBeenCalledTimes(2))
    expect(within(dialog).getByLabelText('Resultado')).toHaveValue('SUFICIENTE')
    expect(within(dialog).getByLabelText('Evidencia')).toHaveValue('602')
    expect(within(dialog).getByLabelText(/Observaciones/)).toHaveValue('Ninguna')
    expect(within(dialog).queryByText(/Tribunal incompleto/)).not.toBeInTheDocument()

    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Registrar informe' }))
      await Promise.resolve()
    })
    await waitFor(() => expect(postulacionesService.registrarInformeRevisionTribunal).toHaveBeenCalledWith(4, {
      version_documento_revisada: 601, resultado: 'SUFICIENTE', observaciones: 'Ninguna', evidencia_version: 602,
    }, expect.any(AbortSignal)))
  })

  it('mantiene la vista contextual y el candidato cuando falla la asignación', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(tribunalResponse)
    postulacionesService.obtenerDocumentos.mockResolvedValue(tribunalDocuments)
    postulacionesService.obtenerTribunalesActivos.mockResolvedValue([
      { id: 21, usuario: 51, tipo_participacion: 'TRIBUNAL', orden_cargo: 1, activo: true },
      { id: 22, usuario: 52, tipo_participacion: 'TRIBUNAL', orden_cargo: 2, activo: true },
    ])
    postulacionesService.asignarActor.mockRejectedValue({ status: 400, message: 'El candidato ya está asignado.', fields: { usuario: ['El candidato ya está asignado.'] } })
    renderWorkflowAssignmentManagerPage('informes-etapa')
    await userEvent.click(await screen.findByRole('tab', { name: 'Resumen' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Registrar informe del tribunal' }))
    const dialog = screen.getByRole('dialog', { name: 'Registrar informe del tribunal' })
    await userEvent.click(await within(dialog).findByRole('button', { name: 'Asignar Tribunal 3' }))
    await within(dialog).findByRole('option', { name: /Johnny Rosas/ })
    await userEvent.selectOptions(within(dialog).getByLabelText('Candidato'), '41')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirmar asignación' }))

    expect((await within(dialog).findAllByText('El candidato ya está asignado.')).length).toBeGreaterThan(0)
    expect(within(dialog).getByRole('heading', { name: 'Asignar Tribunal 3' })).toBeInTheDocument()
    expect(within(dialog).getByRole('combobox')).toHaveValue('41')
  })

  it('muestra el siguiente orden faltante después del refresco canónico', async () => {
    const tribunalOne = { id: 21, usuario: 51, tipo_participacion: 'TRIBUNAL', orden_cargo: 1, activo: true }
    postulacionesService.obtenerExpediente.mockResolvedValue(tribunalResponse)
    postulacionesService.obtenerDocumentos.mockResolvedValue(tribunalDocuments)
    postulacionesService.obtenerTribunalesActivos
      .mockResolvedValueOnce([tribunalOne])
      .mockResolvedValueOnce([tribunalOne, { id: 22, usuario: 41, tipo_participacion: 'TRIBUNAL', orden_cargo: 2, activo: true }])
    renderWorkflowAssignmentManagerPage('informes-etapa')
    await userEvent.click(await screen.findByRole('tab', { name: 'Resumen' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Registrar informe del tribunal' }))
    const dialog = screen.getByRole('dialog', { name: 'Registrar informe del tribunal' })
    await userEvent.click(await within(dialog).findByRole('button', { name: 'Asignar Tribunal 2' }))
    await within(dialog).findByRole('option', { name: /Johnny Rosas/ })
    await userEvent.selectOptions(within(dialog).getByLabelText('Candidato'), '41')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirmar asignación' }))

    expect(await within(dialog).findByRole('button', { name: 'Asignar Tribunal 3' })).toBeInTheDocument()
    expect(postulacionesService.asignarActor).toHaveBeenCalledWith(7, expect.objectContaining({ orden_cargo: 2 }), expect.any(AbortSignal))
  })

  it('preserva el mensaje original del backend cuando el error no es el patrón de tribunal incompleto', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(tribunalResponse)
    postulacionesService.obtenerDocumentos.mockResolvedValue(tribunalDocuments)
    postulacionesService.registrarInformeRevisionTribunal.mockRejectedValue({
      status: 400,
      message: 'Error extraño del backend no reconocido.',
      fields: {
        detail: ['Error extraño del backend no reconocido.'],
        non_field_errors: ['Error extraño del backend no reconocido.'],
      },
    })

    renderWorkflowManagerPage()
    await userEvent.click(await screen.findByRole('tab', { name: 'Resumen' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Registrar informe del tribunal' }))
    const dialog = screen.getByRole('dialog', { name: 'Registrar informe del tribunal' })
    fireEvent.change(within(dialog).getByLabelText('Resultado'), { target: { value: 'SUFICIENTE' } })
    fireEvent.change(within(dialog).getByLabelText('Evidencia'), { target: { value: '602' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Registrar informe' }))

    expect(await within(dialog).findByText('Error extraño del backend no reconocido.')).toBeInTheDocument()
    expect(within(dialog).getAllByRole('alert')).toHaveLength(1)
  })
})
