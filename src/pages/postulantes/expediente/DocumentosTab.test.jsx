import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import ExpedientePage from '../ExpedientePage'
import { postulacionesService } from '../../../services/postulacionesService'
import { AuthContext } from '../../../context/AuthContext'
import { prepararExpediente, activeActorsResponse, closureResponse, defenseRows, defensesResponse, deferred, definePropertyForTest, documentsResponse, examInscriptionResponse, excellenceInscriptionResponse, futureProfileOrientation, historicalActorsResponse, inscriptionStageResponse, prepareContextualThesisActa, profileContracts, profileThesisApplicable, projectFlowAfterStart, projectStageResponse, renderApplicationManagerPage, renderApplicationUploadManagerPage, renderClosureManagerPage, renderDefenseDocumentsAdminPage, renderOwnerPage, renderPage, renderProfileThesisAction, renderReviewerPage, renderStudentPage, renderTutorDictamenContext, renderWorkflowManagerPage, response, selectInitialTab, thesisPostPublicResponse, trabajoDirigidoPublicDefenseResponse, tribunalDocuments, tribunalHistory, tribunalResponse, tribunalStage, versionsResponse } from './pruebas/utilidades'

vi.mock('../../../services/postulacionesService', () => import('./pruebas/servicioSimulado'))

describe('ExpedientePage · Documentos', () => {
  prepararExpediente()

  it.each([
    ['documento pendiente', 'No presentado', 'Ir a documentos'],
    ['documento observado', 'Requiere corrección', 'Corregir documentos'],
  ])('permite al estudiante navegar a Documentos cuando tiene un %s', async (_case, estadoDocumento, accionLabel) => {
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      flujo: {
        ...response.flujo,
        etapa_actual: { id: 31, codigo: 'INSCRIPCION', nombre: 'Inscripción', estado: 'EN_PROCESO' },
        orientacion_etapa_actual: {
          mensaje: '0/4 requisitos de Inscripción cumplidos.',
          requisitos: [{ tipo: 'DOCUMENTO', codigo: 'CARTA_SOLICITUD_PROYECTO', nombre: 'Carta de solicitud', cumplido: false, estado_display: estadoDocumento, destino: '#documentos' }],
          siguiente_accion: { codigo: 'COMPLETAR_DOCUMENTOS', titulo: 'Completar documentos de Inscripción', descripcion: 'Presenta o corrige los documentos obligatorios.', estado: 'PENDIENTE', destino: '#documentos', accion_label: accionLabel },
        },
      },
    })

    renderStudentPage()

    const link = await screen.findByRole('link', { name: accionLabel })
    expect(link).toHaveAttribute('href', '/documentos')
    await userEvent.click(link)
    expect(await screen.findByRole('heading', { name: 'Mis documentos' })).toBeInTheDocument()
  })

  it.each([
    ['sin permiso de carga', ['puede_ver_postulaciones', 'puede_ver_documentos']],
    ['sin permiso de lectura', ['puede_ver_postulaciones', 'puede_cargar_documentos']],
  ])('no ofrece navegación documental de carga %s', async (_case, permissions) => {
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: { ...response.flujo, orientacion_etapa_actual: {
      mensaje: 'Completa los documentos pendientes.', requisitos: [],
      siguiente_accion: { codigo: 'COMPLETAR_DOCUMENTOS', titulo: 'Completar documentos', estado: 'PENDIENTE', destino: '#documentos', accion_label: 'Ir a documentos' },
    } } })

    renderStudentPage({ permissions })

    await screen.findByText('Completa los documentos pendientes.')
    expect(screen.queryByRole('link', { name: 'Ir a documentos' })).not.toBeInTheDocument()
  })

  it('permite consultar documentos sin exigir capacidad de carga cuando la acción es informativa', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: { ...response.flujo, orientacion_etapa_actual: {
      mensaje: 'Los documentos están pendientes de revisión.', requisitos: [],
      siguiente_accion: { codigo: 'ESPERAR_REVISION_DOCUMENTOS', titulo: 'Documentos pendientes de revisión', estado: 'PENDIENTE', destino: '#documentos', accion_label: 'Ver documentos' },
    } } })

    renderStudentPage({ permissions: ['puede_ver_postulaciones', 'puede_ver_documentos'] })

    expect(await screen.findByRole('link', { name: 'Ver documentos' })).toHaveAttribute('href', '/documentos')
  })

  it('muestra un título neutral mientras carga la modalidad', () => {
    postulacionesService.obtenerExpediente.mockReturnValue(new Promise(() => {}))

    renderPage()

    expect(screen.getByRole('heading', { name: 'Expediente' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Expediente de Proyecto de Grado' })).not.toBeInTheDocument()
  })

  it('conserva el título neutral cuando falla la carga del expediente', async () => {
    postulacionesService.obtenerExpediente.mockRejectedValue({
      message: 'No se pudo cargar el expediente. Intenta nuevamente.',
    })

    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar el expediente.')
    expect(screen.getByRole('heading', { name: 'Expediente' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Expediente de Proyecto de Grado' })).not.toBeInTheDocument()
  })

  it('muestra la modalidad real al cargar correctamente el expediente', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: {
        ...response.detalle,
        modalidad_detalle: { id: 4, codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido' },
      },
      flujo: {
        ...response.flujo,
        modalidad: { id: 4, codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido' },
        etapa_actual: { id: 31, codigo: 'INSCRIPCION', nombre: 'Inscripción', estado: 'PENDIENTE' },
        etapas: [{ id: 31, codigo: 'INSCRIPCION', nombre: 'Inscripción', estado: 'PENDIENTE' }],
      },
    })

    renderPage()

    const heading = await screen.findByRole('heading', { name: /Ana P/ })
    expect(heading).toBeInTheDocument()
    // La modalidad real se ve en la ficha del estudiante (la sección de Trabajo Dirigido también
    // la nombra en su propio título cuando termina de cargar).
    expect(within(heading.closest('.expediente-hero')).getByText('Trabajo Dirigido')).toBeInTheDocument()
    expect(screen.queryByText('Expediente de Proyecto de Grado')).not.toBeInTheDocument()
  })

  it('usa los endpoints históricos para cargar documentos en una postulación histórica', async () => {
    const historicalDetail = {
      ...response,
      detalle: { ...response.detalle, tipo_registro: 'HISTORICO', vigencia: 'CERRADA', estado_actual_detalle: { id: 9, codigo: 'CONCLUIDA', nombre: 'Concluida' } },
      flujo: { ...response.flujo, etapa_actual: null, porcentaje_avance: 0, etapas: [], orientacion_etapa_actual: null },
    }
    postulacionesService.obtenerExpediente.mockResolvedValue(historicalDetail)
    postulacionesService.obtenerTiposDocumentosHistoricos.mockResolvedValue([{ id: 21, codigo: 'ACTA_DEFENSA', nombre: 'Acta de defensa histórica' }])
    const auth = { user: { id: 9 }, hasPermission: (name) => ['puede_cargar_documentos', 'puede_gestionar_documentos'].includes(name) }
    render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)

    await screen.findByText('Registro histórico')
    await userEvent.click(screen.getByRole('button', { name: /Cargar documento/i }))

    expect(postulacionesService.obtenerTiposDocumentosHistoricos).toHaveBeenCalledWith('7', expect.any(AbortSignal))
    expect(postulacionesService.cargarDocumento).not.toHaveBeenCalled()
  })

  it('muestra la carga múltiple histórica con filas por tipo y CTA por cantidad', async () => {
    const historicalDetail = {
      ...response,
      detalle: { ...response.detalle, tipo_registro: 'HISTORICO', vigencia: 'CERRADA', estado_actual_detalle: { id: 9, codigo: 'CONCLUIDA', nombre: 'Concluida' } },
      flujo: { ...response.flujo, etapa_actual: null, porcentaje_avance: 0, etapas: [], orientacion_etapa_actual: null },
    }
    postulacionesService.obtenerExpediente.mockResolvedValue(historicalDetail)
    postulacionesService.obtenerTiposDocumentosHistoricos.mockResolvedValue([
      { id: 101, nombre: 'Carta de Solicitud para Tesis' },
      { id: 102, nombre: 'Comprobante de Matrícula Vigente' },
      { id: 103, nombre: 'Historial Académico de Prerrequisitos' },
      { id: 104, nombre: 'Perfil de Tesis' },
      { id: 105, nombre: 'Informe del Tutor de Tesis' },
      { id: 106, nombre: 'Informe del Tribunal de Tesis' },
    ])
    const auth = { user: { id: 9 }, hasPermission: (name) => ['puede_cargar_documentos', 'puede_gestionar_documentos'].includes(name) }
    render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)

    await screen.findByText('Registro histórico')
    await userEvent.click(screen.getByRole('button', { name: /Cargar documento/i }))

    const dialog = await screen.findByRole('dialog', { name: /Cargar documentación histórica/i })
    expect(within(dialog).getByText('Carta de Solicitud para Tesis')).toBeInTheDocument()
    expect(within(dialog).getByText('Comprobante de Matrícula Vigente')).toBeInTheDocument()
    expect(within(dialog).getByText('Historial Académico de Prerrequisitos')).toBeInTheDocument()
    expect(within(dialog).getByText('Perfil de Tesis')).toBeInTheDocument()
    expect(within(dialog).getByText('Informe del Tutor de Tesis')).toBeInTheDocument()
    expect(within(dialog).getByText('Informe del Tribunal de Tesis')).toBeInTheDocument()

    const file1 = new File(['a'], 'carta.pdf', { type: 'application/pdf' })
    const file2 = new File(['b'], 'matricula.pdf', { type: 'application/pdf' })
    await userEvent.upload(within(dialog).getByLabelText('Carta de Solicitud para Tesis'), file1)
    await userEvent.upload(within(dialog).getByLabelText('Comprobante de Matrícula Vigente'), file2)

    expect(within(dialog).getByText('2 documentos seleccionados')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /Cargar 2 documentos/i })).toBeEnabled()
    expect(within(dialog).getAllByRole('button', { name: /Quitar/i }).length).toBeGreaterThanOrEqual(2)
  })

  it('deshabilita la carga cuando no hay archivos seleccionados y usa el último archivo correcto en el reintento', async () => {
    const historicalDetail = {
      ...response,
      detalle: { ...response.detalle, tipo_registro: 'HISTORICO', vigencia: 'CERRADA', estado_actual_detalle: { id: 9, codigo: 'CONCLUIDA', nombre: 'Concluida' } },
      flujo: { ...response.flujo, etapa_actual: null, porcentaje_avance: 0, etapas: [], orientacion_etapa_actual: null },
    }
    postulacionesService.obtenerExpediente.mockResolvedValue(historicalDetail)
    postulacionesService.obtenerTiposDocumentosHistoricos.mockResolvedValue([
      { id: 201, nombre: 'Documento 1' },
      { id: 202, nombre: 'Documento 2' },
    ])
    const auth = { user: { id: 9 }, hasPermission: (name) => ['puede_cargar_documentos', 'puede_gestionar_documentos'].includes(name) }
    render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)

    await screen.findByText('Registro histórico')
    await userEvent.click(screen.getByRole('button', { name: /Cargar documento/i }))

    const dialog = await screen.findByRole('dialog', { name: /Cargar documentación histórica/i })
    expect(within(dialog).getByRole('button', { name: /Cargar 0 documentos/i })).toBeDisabled()

    const file = new File(['x'], 'documento-1.pdf', { type: 'application/pdf' })
    await userEvent.upload(within(dialog).getByLabelText('Documento 1'), file)
    expect(within(dialog).getByRole('button', { name: /Cargar 1 documento/i })).toBeEnabled()

    await userEvent.click(within(dialog).getAllByRole('button', { name: /Quitar/i })[0])
    expect(within(dialog).getByRole('button', { name: /Cargar 0 documentos/i })).toBeDisabled()
  })

  it('ejecuta uploads históricos secuencialmente con los tipos y archivos correctos', async () => {
    const historicalDetail = {
      ...response,
      detalle: { ...response.detalle, tipo_registro: 'HISTORICO', vigencia: 'CERRADA', estado_actual_detalle: { id: 9, codigo: 'CONCLUIDA', nombre: 'Concluida' } },
      flujo: { ...response.flujo, etapa_actual: null, porcentaje_avance: 0, etapas: [], orientacion_etapa_actual: null },
    }
    postulacionesService.obtenerExpediente.mockResolvedValue(historicalDetail)
    postulacionesService.obtenerTiposDocumentosHistoricos.mockResolvedValue([
      { id: 301, nombre: 'Carta de Solicitud para Tesis' },
      { id: 302, nombre: 'Comprobante de Matrícula Vigente' },
      { id: 303, nombre: 'Perfil de Tesis' },
    ])
    const auth = { user: { id: 9 }, hasPermission: (name) => ['puede_cargar_documentos', 'puede_gestionar_documentos'].includes(name) }
    render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)

    await screen.findByText('Registro histórico')
    await userEvent.click(screen.getByRole('button', { name: /Cargar documento/i }))

    const dialog = await screen.findByRole('dialog', { name: /Cargar documentación histórica/i })
    const first = new File(['uno'], 'carta.pdf', { type: 'application/pdf' })
    const second = new File(['dos'], 'matricula.pdf', { type: 'application/pdf' })
    const third = new File(['tres'], 'perfil.pdf', { type: 'application/pdf' })
    await userEvent.upload(within(dialog).getByLabelText('Carta de Solicitud para Tesis'), first)
    await userEvent.upload(within(dialog).getByLabelText('Comprobante de Matrícula Vigente'), second)
    await userEvent.upload(within(dialog).getByLabelText('Perfil de Tesis'), third)
    await userEvent.click(within(dialog).getByRole('button', { name: /Cargar 3 documentos/i }))

    await waitFor(() => expect(postulacionesService.subirDocumentoHistorico).toHaveBeenCalledTimes(3))
    const calls = postulacionesService.subirDocumentoHistorico.mock.calls
    expect(calls[0][0]).toBe(7)
    expect(calls[0][1].get('tipo_documento_id')).toBe('301')
    expect(calls[0][1].get('archivo').name).toBe('carta.pdf')
    expect(calls[1][1].get('tipo_documento_id')).toBe('302')
    expect(calls[1][1].get('archivo').name).toBe('matricula.pdf')
    expect(calls[2][1].get('tipo_documento_id')).toBe('303')
    expect(calls[2][1].get('archivo').name).toBe('perfil.pdf')
    expect(postulacionesService.cargarDocumento).not.toHaveBeenCalled()
  })

  it('muestra fallo parcial sin anunciar éxito global ni cancelar los fallidos', async () => {
    const historicalDetail = {
      ...response,
      detalle: { ...response.detalle, tipo_registro: 'HISTORICO', vigencia: 'CERRADA', estado_actual_detalle: { id: 9, codigo: 'CONCLUIDA', nombre: 'Concluida' } },
      flujo: { ...response.flujo, etapa_actual: null, porcentaje_avance: 0, etapas: [], orientacion_etapa_actual: null },
    }
    postulacionesService.obtenerExpediente.mockResolvedValue(historicalDetail)
    postulacionesService.obtenerTiposDocumentosHistoricos.mockResolvedValue([
      { id: 401, nombre: 'Carta de Solicitud para Tesis' },
      { id: 402, nombre: 'Comprobante de Matrícula Vigente' },
      { id: 403, nombre: 'Perfil de Tesis' },
    ])
    postulacionesService.subirDocumentoHistorico.mockImplementation(async (_id, formData) => {
      const typeId = formData.get('tipo_documento_id')
      if (typeId === '402') throw new Error('Falla simulada del archivo')
      return { id: 900 + Number(typeId) }
    })
    const auth = { user: { id: 9 }, hasPermission: (name) => ['puede_cargar_documentos', 'puede_gestionar_documentos'].includes(name) }
    render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)

    await screen.findByText('Registro histórico')
    await userEvent.click(screen.getByRole('button', { name: /Cargar documento/i }))

    const dialog = await screen.findByRole('dialog', { name: /Cargar documentación histórica/i })
    await userEvent.upload(within(dialog).getByLabelText('Carta de Solicitud para Tesis'), new File(['a'], 'a.pdf', { type: 'application/pdf' }))
    await userEvent.upload(within(dialog).getByLabelText('Comprobante de Matrícula Vigente'), new File(['b'], 'b.pdf', { type: 'application/pdf' }))
    await userEvent.upload(within(dialog).getByLabelText('Perfil de Tesis'), new File(['c'], 'c.pdf', { type: 'application/pdf' }))
    await userEvent.click(within(dialog).getByRole('button', { name: /Cargar 3 documentos/i }))

    await waitFor(() => expect(within(dialog).getByText(/2 documentos cargados. 1 documento no pudo cargarse./i)).toBeInTheDocument())
    expect(within(dialog).queryByText(/3 documentos cargados/i)).not.toBeInTheDocument()
    expect(within(dialog).getByText('Comprobante de Matrícula Vigente')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /Reintentar/i })).toBeInTheDocument()
  })

  it('muestra el mensaje de éxito y limpia la selección cuando todos los históricos cargan bien', async () => {
    const historicalDetail = {
      ...response,
      detalle: { ...response.detalle, tipo_registro: 'HISTORICO', vigencia: 'CERRADA', estado_actual_detalle: { id: 9, codigo: 'CONCLUIDA', nombre: 'Concluida' } },
      flujo: { ...response.flujo, etapa_actual: null, porcentaje_avance: 0, etapas: [], orientacion_etapa_actual: null },
    }
    postulacionesService.obtenerExpediente.mockResolvedValue(historicalDetail)
    postulacionesService.obtenerTiposDocumentosHistoricos.mockResolvedValue([
      { id: 501, nombre: 'Documento A' },
      { id: 502, nombre: 'Documento B' },
    ])
    const auth = { user: { id: 9 }, hasPermission: (name) => ['puede_cargar_documentos', 'puede_gestionar_documentos'].includes(name) }
    render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)

    await screen.findByText('Registro histórico')
    await userEvent.click(screen.getByRole('button', { name: /Cargar documento/i }))
    const dialog = await screen.findByRole('dialog', { name: /Cargar documentación histórica/i })
    await userEvent.upload(within(dialog).getByLabelText('Documento A'), new File(['a'], 'a.pdf', { type: 'application/pdf' }))
    await userEvent.upload(within(dialog).getByLabelText('Documento B'), new File(['b'], 'b.pdf', { type: 'application/pdf' }))
    await userEvent.click(within(dialog).getByRole('button', { name: /Cargar 2 documentos/i }))

    await waitFor(() => expect(within(dialog).getByText(/2 documentos cargados correctamente/i)).toBeInTheDocument())
    expect(within(dialog).getByRole('button', { name: /Cargar 0 documentos/i })).toBeDisabled()
    expect(postulacionesService.obtenerDocumentos).toHaveBeenCalled()
  })

  it('no muestra fallback cuando el backend histórico devuelve []', async () => {
    const historicalDetail = {
      ...response,
      detalle: { ...response.detalle, tipo_registro: 'HISTORICO', vigencia: 'CERRADA', estado_actual_detalle: { id: 9, codigo: 'CONCLUIDA', nombre: 'Concluida' } },
      flujo: { ...response.flujo, etapa_actual: null, porcentaje_avance: 0, etapas: [], orientacion_etapa_actual: null },
    }
    postulacionesService.obtenerExpediente.mockResolvedValue(historicalDetail)
    postulacionesService.obtenerTiposDocumentosHistoricos.mockResolvedValue([])
    const auth = { user: { id: 9 }, hasPermission: (name) => ['puede_cargar_documentos', 'puede_gestionar_documentos'].includes(name) }
    render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)

    await screen.findByText('Registro histórico')
    await userEvent.click(screen.getByRole('button', { name: /Cargar documento/i }))

    const dialog = await screen.findByRole('dialog', { name: /Cargar documentación histórica/i })
    expect(within(dialog).getByText('No hay tipos documentales activos disponibles.')).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: /Cargar 0 documentos/i })).not.toBeInTheDocument()
    expect(postulacionesService.cargarDocumento).not.toHaveBeenCalled()
  })

  it('muestra orientación y CTA de carga de evidencia cuando no hay Informe de Evaluación del Tribunal activo y el usuario puede cargar documentos', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(tribunalResponse)
    postulacionesService.obtenerDocumentos.mockResolvedValue({
      count: 1, next: null, previous: null, results: [
        { id: 41, tipo_documento_codigo: 'DOCUMENTO_FINAL', tipo_documento_nombre: 'Documento Final', activo: true, versiones: [{ id: 601, numero_version: 1, nombre_original: 'documento-final.pdf', es_version_actual: true, activo: true }] },
      ],
    })
    postulacionesService.obtenerDocumentosAplicables.mockResolvedValue({ documentos_aplicables: [
      { id: 42, codigo: 'INFORME_REVISION_TRIBUNAL_PREVIA', nombre: 'Informe de Evaluación del Tribunal', capacidad_carga: { permitida: true } },
    ] })
    postulacionesService.obtenerInformesRevisionTribunal.mockResolvedValue([])

    const auth = { user: { id: 9 }, hasPermission: (name) => ['puede_cargar_documentos', 'puede_gestionar_seguimiento'].includes(name) }
    selectInitialTab('resumen')
    render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)

    const notice = await screen.findByText('Carga el Informe de Evaluación del Tribunal.')
    const summary = document.getElementById('panel-resumen')
    const documents = document.getElementById('panel-documentos')
    expect(within(summary).getAllByText('Carga el Informe de Evaluación del Tribunal.')).toHaveLength(1)
    expect(within(documents).queryByText('Carga el Informe de Evaluación del Tribunal.')).not.toBeInTheDocument()
    expect(notice.closest('[data-expediente-panel]')).toBe(summary)
    const registerButton = await within(summary).findByRole('button', { name: 'Registrar informe del tribunal' })
    expect(notice.compareDocumentPosition(registerButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    await userEvent.click(within(summary).getByRole('button', { name: 'Cargar Informe de Evaluación' }))
    const uploadDialog = await screen.findByRole('dialog', { name: 'Cargar nueva versión' })
    expect(within(uploadDialog).getByText('Informe de Evaluación del Tribunal')).toBeInTheDocument()
    expect(within(uploadDialog).getByLabelText('Archivo')).toBeInTheDocument()
    const uploadOpener = within(summary).getByRole('button', { name: 'Cargar Informe de Evaluación' })
    await userEvent.click(within(uploadDialog).getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Cargar nueva versión' })).not.toBeInTheDocument())
    expect(document.activeElement).toBe(uploadOpener)
  }, 15000)

  it('permite registrar informe cuando la evidencia viene identificada por su código de tipo documental', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(tribunalResponse)
    postulacionesService.obtenerDocumentos.mockResolvedValue({
      count: 2, next: null, previous: null, results: [
        { id: 41, tipo_documento_codigo: 'DOCUMENTO_FINAL', tipo_documento_nombre: 'Documento Final', activo: true, versiones: [{ id: 601, numero_version: 1, nombre_original: 'documento-final.pdf', es_version_actual: true, activo: true }] },
        { id: 42, tipo_documento_codigo: 'INFORME_REVISION_TRIBUNAL_PREVIA', tipo_documento_nombre: 'Informe de revisión', activo: true, versiones: [{ id: 602, numero_version: 1, nombre_original: 'informe-tribunal.pdf', es_version_actual: true, activo: true }] },
      ],
    })
    postulacionesService.obtenerInformesRevisionTribunal.mockResolvedValue([])

    renderWorkflowManagerPage()

    await userEvent.click(await screen.findByRole('tab', { name: 'Resumen' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Registrar informe del tribunal' }))
    const dialog = screen.getByRole('dialog', { name: 'Registrar informe del tribunal' })

    expect(dialog).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Evidencia' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Registrar informe' })).toBeEnabled()
  })

  const directedReviewResponse = (ready = false) => ({ ...tribunalResponse,
    detalle: { ...tribunalResponse.detalle, modalidad_detalle: { codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido' } },
    flujo: { ...tribunalResponse.flujo, etapa_actual: { ...tribunalStage, acciones_permitidas: ready ? ['aprobar'] : [] },
      orientacion_etapa_actual: { operacion: 'ORIENTAR_ETAPA', mensaje: ready ? 'Resultado suficiente válido.' : 'Falta registrar el resultado emitido por el Tribunal.',
        permite_aprobar_etapa: ready, requisitos: [], siguiente_accion: { codigo: ready ? 'APROBAR_ETAPA' : 'REGISTRAR_INFORME_TRIBUNAL',
          titulo: ready ? 'Aprobar Revisión de Tribunal Previa' : 'Registrar resultado de revisión del Tribunal',
          estado: 'DISPONIBLE', destino: ready ? '#resumen' : '#informes-etapa', accion_label: ready ? 'Aprobar etapa' : 'Registrar informe del Tribunal' } } },
  })

  const directedReviewDocuments = { count: 2, results: [
    { id: 57, tipo_documento_codigo: 'DOCUMENTO_FINAL_TD', versiones: [{ id: 537, numero_version: 1, es_version_actual: true, activo: true }] },
    { id: 59, tipo_documento_codigo: 'INFORME_REVISION_TRIBUNAL_TD', versiones: [{ id: 541, numero_version: 1, es_version_actual: true, activo: true, nombre_original: 'informe-tribunal-td.pdf' }] },
  ] }

  it('Revisión TD: abre desde Resumen y Documentos sin POST ni aprobación automática', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(directedReviewResponse())
    postulacionesService.obtenerDocumentos.mockResolvedValue(directedReviewDocuments)
    postulacionesService.obtenerInformesRevisionTribunal.mockResolvedValue([])
    renderWorkflowManagerPage()
    await userEvent.click(await screen.findByRole('tab', { name: 'Resumen' }))
    const trigger = await screen.findByRole('button', { name: 'Registrar informe del Tribunal' })
    await userEvent.dblClick(trigger)
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(screen.getByRole('dialog', { name: 'Registrar informe del tribunal' })).toBeVisible()
    expect(window.location.hash).toBe('#resumen')
    expect(postulacionesService.registrarInformeRevisionTribunal).not.toHaveBeenCalled()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    await userEvent.click(screen.getByRole('tab', { name: 'Documentos' }))
    await userEvent.click(screen.getByRole('button', { name: 'Registrar informe del tribunal' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))
    expect(postulacionesService.registrarInformeRevisionTribunal).not.toHaveBeenCalled()
    expect(postulacionesService.aprobarEtapa).not.toHaveBeenCalled()
  })

  it('Revisión TD: refresca la orientación tras registrar y conserva aprobación explícita', async () => {
    let recorded = false
    postulacionesService.obtenerExpediente.mockImplementation(() => Promise.resolve(directedReviewResponse(recorded)))
    postulacionesService.obtenerDocumentos.mockResolvedValue(directedReviewDocuments)
    postulacionesService.obtenerInformesRevisionTribunal.mockImplementation(() => Promise.resolve(recorded ? [{ id: 81, activo: true, version_documento_revisada: 537, evidencia_version: 541, resultado: 'SUFICIENTE' }] : []))
    postulacionesService.registrarInformeRevisionTribunal.mockImplementation(async () => { recorded = true; return { id: 81 } })
    selectInitialTab('resumen')
    const auth = { user: { id: 9 }, hasPermission: (name) => ['puede_gestionar_seguimiento', 'puede_gestionar_postulaciones'].includes(name) }
    render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)
    await userEvent.click(await screen.findByRole('button', { name: 'Registrar informe del Tribunal' }))
    const dialog = screen.getByRole('dialog')
    await userEvent.selectOptions(within(dialog).getByLabelText('Resultado'), 'SUFICIENTE')
    await userEvent.selectOptions(within(dialog).getByLabelText('Evidencia'), '541')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Registrar informe' }))
    const summary = (await screen.findByRole('heading', { name: 'Qué debes hacer ahora' })).parentElement
    expect(await within(summary).findByRole('button', { name: 'Aprobar etapa' })).toBeEnabled()
    expect(postulacionesService.registrarInformeRevisionTribunal).toHaveBeenCalledWith(4, {
      version_documento_revisada: 537, evidencia_version: 541, resultado: 'SUFICIENTE', observaciones: '',
    }, expect.any(AbortSignal))
    expect(postulacionesService.aprobarEtapa).not.toHaveBeenCalled()
  })

  it.each(['permiso', 'error', 'evidencia', 'informe', 'ambiguo'])('Revisión TD: conserva consulta segura con %s', async (reason) => {
    const data = directedReviewResponse()
    if (reason === 'ambiguo') data.flujo.etapas = [...data.flujo.etapas, { ...tribunalStage, id: 999 }]
    postulacionesService.obtenerExpediente.mockResolvedValue(data)
    postulacionesService.obtenerDocumentos.mockResolvedValue(reason === 'evidencia' ? { count: 1, results: [directedReviewDocuments.results[0]] } : directedReviewDocuments)
    if (reason === 'error') postulacionesService.obtenerInformesRevisionTribunal.mockRejectedValue({ message: 'Consulta fallida' })
    else postulacionesService.obtenerInformesRevisionTribunal.mockResolvedValue(reason === 'informe' ? [{ id: 81, activo: true, version_documento_revisada: 537, resultado: 'SUFICIENTE' }] : [])
    if (reason === 'permiso') renderPage('resumen')
    else { renderWorkflowManagerPage(); await userEvent.click(await screen.findByRole('tab', { name: 'Resumen' })) }
    expect(await screen.findByRole('link', { name: 'Consultar revisión del Tribunal' })).toHaveAttribute('href', '#informes-etapa')
    expect(screen.queryByRole('button', { name: 'Registrar informe del Tribunal' })).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(postulacionesService.registrarInformeRevisionTribunal).not.toHaveBeenCalled()
  })

  it('selecciona INFORME_REVISION_TRIBUNAL_TD al cargar la evidencia de Trabajo Dirigido', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...tribunalResponse,
      detalle: { ...tribunalResponse.detalle, modalidad_detalle: { id: 8, codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido' } },
      flujo: { ...tribunalResponse.flujo, modalidad: { id: 8, codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido' } },
    })
    postulacionesService.obtenerDocumentos.mockResolvedValue({
      count: 1, next: null, previous: null, results: [
        { id: 57, tipo_documento_codigo: 'DOCUMENTO_FINAL_TD', tipo_documento_nombre: 'Documento Final de Trabajo Dirigido', activo: true, versiones: [{ id: 537, numero_version: 1, nombre_original: 'documento-final-td.pdf', es_version_actual: true, activo: true }] },
      ],
    })
    postulacionesService.obtenerDocumentosAplicables.mockResolvedValue({ documentos_aplicables: [
      { id: 59, codigo: 'INFORME_REVISION_TRIBUNAL_TD', nombre: 'Informe de revisión del Tribunal', capacidad_carga: { permitida: true } },
    ] })
    const auth = { user: { id: 9 }, hasPermission: (name) => ['puede_cargar_documentos', 'puede_gestionar_seguimiento'].includes(name) }
    selectInitialTab('documentos')
    render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)

    await userEvent.click(await screen.findByRole('button', { name: 'Cargar Informe de Evaluación' }))
    const uploadDialog = await screen.findByRole('dialog', { name: 'Cargar nueva versión' })
    expect(within(uploadDialog).getByText('Informe de revisión del Tribunal')).toBeInTheDocument()
    expect(postulacionesService.obtenerDocumentosAplicables).toHaveBeenCalledWith('7', expect.any(AbortSignal))
  })

  it.each(['CIERRE_DOCUMENTAL', 'CONCLUSION_ACADEMICA'])('presenta documentos y etapas reales de Diplomado en %s sin ejecutar operaciones', async (codigo) => {
    const conclusion = codigo === 'CONCLUSION_ACADEMICA'
    const stage = { id: 90, codigo, nombre: conclusion ? 'Conclusión académica' : 'Cierre documental', estado: conclusion ? 'PENDIENTE' : 'EN_PROCESO', activo: true, numero_intento: 1 }
    const requisitos = [
      { tipo: 'DOCUMENTO', codigo: 'ACTA_DEFENSA_DIPL', nombre: 'Acta de Defensa de Diplomado', cumplido: false, estado: 'NO_PRESENTADO', estado_display: 'No presentado', destino: '#documentos' },
      { tipo: 'DOCUMENTO', codigo: 'MONOGRAFIA_EMPAST_D', nombre: 'Monografía empastada de Diplomado', cumplido: true, estado: 'APROBADO', estado_display: 'Aprobado', destino: null },
      ...(conclusion ? [{ tipo: 'ETAPA_ACADEMICA', codigo: 'CIERRE_DOCUMENTAL', nombre: 'Etapa aprobada: Cierre documental', cumplido: false, estado: 'PENDIENTE', estado_display: 'Pendiente de aprobación', destino: '#resumen' }] : []),
    ]
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response, detalle: { ...response.detalle, modalidad_detalle: { codigo: 'GRADUACION_VIA_DIPLOMADO', nombre: 'Graduación Vía Diplomado' } },
      cierre: { data: null, error: '' }, flujo: { ...response.flujo, etapa_actual: stage, etapas: [stage], etapas_completadas: 8, etapas_totales: 10, porcentaje_avance: 80,
        orientacion_etapa_actual: { operacion: conclusion ? 'ORIENTAR_CONCLUSION_ACADEMICA' : 'ORIENTAR_ETAPA', mensaje: 'Completa los documentos requeridos de esta etapa antes de continuar con el siguiente paso académico.', requisitos, requisitos_cumplidos: 1, requisitos_totales: requisitos.length,
          siguiente_accion: { codigo: 'COMPLETAR_DOCUMENTOS', titulo: 'Cargar documentos', descripcion: 'Carga los documentos no presentados para que puedan ser revisados.', estado: 'PENDIENTE', destino: '#documentos', accion_label: 'Cargar documentos' } },
      },
    })
    postulacionesService.obtenerDiplomado.mockResolvedValue({ modulos: [] })
    renderApplicationManagerPage()
    const list = await screen.findByRole('heading', { name: 'Requisitos de esta etapa' })
    const section = list.closest('section')
    expect(within(section).getByText(/Acta de Defensa de Diplomado/)).toBeVisible()
    expect(within(section).getByText('No presentado')).toBeVisible()
    expect(within(section).getByText(/Monografía empastada de Diplomado/)).toBeVisible()
    expect(within(section).getByText(`1 de ${requisitos.length} cumplidos`)).toBeVisible()
    if (conclusion) expect(within(section).getByText(/Etapa aprobada: Cierre documental/)).toBeVisible()
    expect(postulacionesService.aprobarEtapa).not.toHaveBeenCalled()
    expect(postulacionesService.concluirAcademicamente).not.toHaveBeenCalled()
    expect(postulacionesService.cargarDocumento).not.toHaveBeenCalled()
  })

  it('guía desde Resumen la revisión de tribunal previa y mantiene la información posterior colapsada', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...tribunalResponse,
      flujo: {
        ...tribunalResponse.flujo,
        etapa_actual: { ...tribunalStage, estado: 'PENDIENTE' },
        etapas: [...response.flujo.etapas, { ...tribunalStage, estado: 'PENDIENTE' }],
        orientacion_etapa_actual: { requisitos: [], siguiente_accion: null },
      },
    })
    postulacionesService.obtenerActores.mockImplementation((_id, activo) => Promise.resolve(activo ? activeActorsResponse : historicalActorsResponse))
    postulacionesService.obtenerInformesRevisionTribunal.mockResolvedValue([])

    selectInitialTab('resumen')
    renderApplicationManagerPage()

    expect(await screen.findByText('Orientación del expediente')).toBeInTheDocument()
    const summary = document.getElementById('panel-resumen')
    const documents = document.getElementById('panel-documentos')
    expect(within(summary).getByText('Orientación del expediente')).toBeInTheDocument()
    expect(within(summary).queryByRole('heading', { name: 'Revisión de Tribunal Previa', level: 2 })).not.toBeInTheDocument()
    const evidenceNotice = within(summary).getByText('Carga el Informe de Evaluación del Tribunal.')
    const reviewBlock = document.getElementById('informes-etapa')
    expect(reviewBlock).not.toBeNull()
    expect(reviewBlock.closest('[data-expediente-panel]')).toHaveAttribute('data-expediente-panel', 'documentos')
    expect(evidenceNotice.closest('[data-expediente-panel]')).toBe(summary)

    await userEvent.click(screen.getByRole('tab', { name: 'Documentos' }))
    const reviews = await within(documents).findAllByRole('heading', { name: 'Revisión de Tribunal Previa', level: 2 })
    expect(reviews).toHaveLength(1)
    expect(screen.getByRole('heading', { name: 'Revisión de Tribunal Previa' })).toBeVisible()
    const documentsHeading = within(documents).getByRole('heading', { name: 'Documentos' })
    expect(reviewBlock.compareDocumentPosition(documentsHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(within(document.getElementById('panel-documentos')).queryByText('Carga el Informe de Evaluación del Tribunal.')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: 'Resultado y cierre' }))
    const future = screen.getByText('Información de etapas posteriores').closest('details')
    expect(future).not.toHaveAttribute('open')
    const academicResult = within(future).getByRole('heading', { name: 'Resultado académico técnico' })
    const closurePreparation = within(future).getByText('Preparación para cierre')
    const technicalClosure = within(future).getByRole('heading', { name: 'Cierre técnico' })
    const conditions = await within(future).findByText(/^Condiciones técnicas/)
    const deliveries = await within(future).findByText(/^Entregas técnicas/)

    ;[academicResult, closurePreparation, technicalClosure, conditions, deliveries].forEach((block) => {
      expect(block).not.toBeVisible()
    })
    expect(screen.getAllByRole('heading', { name: 'Resultado académico técnico', hidden: true })).toHaveLength(1)
    expect(screen.getAllByRole('heading', { name: 'Cierre técnico', hidden: true })).toHaveLength(1)

    await userEvent.click(within(future).getByText('Información de etapas posteriores'))

    expect(future).toHaveAttribute('open')
    ;[academicResult, closurePreparation, technicalClosure, conditions, deliveries].forEach((block) => {
      expect(block).toBeVisible()
    })
    await userEvent.click(screen.getByRole('tab', { name: 'Documentos' }))
    expect(await within(documents).findByRole('heading', { name: 'Revisión de Tribunal Previa', level: 2 })).toBeInTheDocument()
  }, 15000)

  it('presenta el documento de supervisión como siguiente acción sin confundirlo con el informe estructurado', async () => {
    const stage = {
      id: 295,
      codigo: 'DESARROLLO_TRABAJO_DIRIGIDO',
      nombre: 'Desarrollo y seguimiento institucional',
      estado: 'EN_PROCESO',
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
          mensaje: 'Completa los documentos requeridos para continuar.',
          requisitos: [{ tipo: 'DOCUMENTO', codigo: 'INFORME_SUPERVISION_TD', nombre: 'Informe periódico de supervisión', cumplido: false, estado: 'PENDIENTE', estado_display: 'No presentado', destino: '#documentos' }],
          siguiente_accion: { codigo: 'COMPLETAR_DOCUMENTOS', titulo: 'Completar documento: Informe periódico de supervisión', descripcion: 'Presenta el documento requerido para su revisión y aprobación', estado: 'PENDIENTE', estado_display: 'Pendiente', destino: '#documentos', accion_label: 'Gestionar documentos' },
        },
      },
    })
    postulacionesService.obtenerTrabajoDirigido.mockResolvedValue({
      institucion: { institucion_nombre: 'Institución', supervisor_nombre: 'Supervisor' },
      informes: [],
    })

    renderApplicationUploadManagerPage()

    const summary = (await screen.findByRole('heading', { name: 'Qué debes hacer ahora' })).parentElement
    expect(within(summary).getByText('Completar documento: Informe periódico de supervisión')).toBeInTheDocument()
    expect(within(summary).getByText('Presenta el documento requerido para su revisión y aprobación')).toBeInTheDocument()
    expect(within(summary).getByRole('button', { name: 'Gestionar documentos' })).toBeInTheDocument()
    expect(within(summary).queryByText('Registrar informe periódico de seguimiento')).not.toBeInTheDocument()
  })

  it('presenta el inicio pendiente como gestión administrativa sin ocultar la carga documental permitida', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...projectFlowAfterStart(),
      flujo: { ...projectFlowAfterStart().flujo, orientacion_etapa_actual: futureProfileOrientation },
    })
    renderOwnerPage('resumen')

    const summary = (await screen.findByRole('heading', { name: 'Qué debes hacer ahora' })).parentElement
    expect(within(summary).queryByText('La etapa está lista para iniciarse.')).not.toBeInTheDocument()
    expect(within(summary).getByText('Esta etapa está pendiente de inicio por el personal responsable.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Documentos' }))
    expect(screen.getByRole('button', { name: 'Cargar documento' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Iniciar Perfil de Proyecto' })).not.toBeInTheDocument()
    expect(postulacionesService.iniciarEtapa).not.toHaveBeenCalled()
    expect(postulacionesService.aprobarEtapa).not.toHaveBeenCalled()
  })

  it('Inscripción de Excelencia carga únicamente sus tres documentos digitales', async () => {
    const source = excellenceInscriptionResponse(0)
    postulacionesService.obtenerExpediente.mockResolvedValue(source)
    postulacionesService.obtenerDocumentosAplicables.mockResolvedValue({ documentos_aplicables: source.flujo.orientacion_etapa_actual.requisitos.filter((item) => item.tipo === 'DOCUMENTO').map((item, index) => ({ id: index + 101, codigo: item.codigo, nombre: item.nombre, capacidad_carga: { permitida: true } })) })
    renderApplicationUploadManagerPage('resumen')
    await userEvent.click(await screen.findByRole('button', { name: 'Gestionar documentos' }))
    const dialog = await screen.findByRole('dialog', { name: 'Cargar documentos' })
    expect(dialog.querySelectorAll('input[type="file"]')).toHaveLength(3)
    for (const item of source.flujo.orientacion_etapa_actual.requisitos.slice(0, 3)) expect(within(dialog).getByLabelText(item.nombre)).toBeVisible()
    expect(within(dialog).queryByText(/Fólder|FOLDER_EXCELENCIA/i)).not.toBeInTheDocument()
  })

  it('Inscripción de Examen carga solo tres documentos digitales y excluye el fólder', async () => {
    const source = examInscriptionResponse(0)
    postulacionesService.obtenerExpediente.mockResolvedValue(source)
    postulacionesService.obtenerDocumentosAplicables.mockResolvedValue({ documentos_aplicables: source.flujo.orientacion_etapa_actual.requisitos.filter((item) => item.tipo === 'DOCUMENTO').map((item, index) => ({ id: index + 101, codigo: item.codigo, nombre: item.nombre, capacidad_carga: { permitida: true } })) })
    renderApplicationUploadManagerPage('resumen')
    await userEvent.click(await screen.findByRole('button', { name: 'Gestionar documentos' }))
    const dialog = await screen.findByRole('dialog', { name: 'Cargar documentos' })
    expect(dialog.querySelectorAll('input[type="file"]')).toHaveLength(3)
    expect(within(dialog).getByLabelText('Carta de Solicitud de Examen de Grado')).toBeVisible()
    expect(within(dialog).getByLabelText('Comprobante de Matrícula Vigente')).toBeVisible()
    expect(within(dialog).getByLabelText('Historial Académico')).toBeVisible()
    expect(within(dialog).queryByText(/Fólder/i)).not.toBeInTheDocument()
  })

  it('abre desde la siguiente acción el diálogo de carga múltiple de Inscripción', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(inscriptionStageResponse(false))
    postulacionesService.obtenerDocumentosAplicables.mockResolvedValue({ documentos_aplicables: [
      { id: 41, codigo: 'CARTA_SOLICITUD_PROYECTO', nombre: 'Carta de Solicitud de Proyecto de Grado', capacidad_carga: { permitida: true } },
      { id: 42, codigo: 'MATRICULA_VIGENTE', nombre: 'Comprobante de Matrícula Vigente', capacidad_carga: { permitida: true } },
    ] })
    renderApplicationUploadManagerPage('resumen')

    await userEvent.click(await screen.findByRole('button', { name: 'Gestionar documentos' }))

    const dialog = await screen.findByRole('dialog', { name: 'Cargar documentos' })
    expect(within(dialog).getByLabelText(/Carta de Solicitud/)).toBeVisible()
    expect(within(dialog).getByLabelText(/Matrícula Vigente/)).toBeVisible()
    expect(screen.getByRole('tab', { name: 'Resumen' })).toHaveAttribute('aria-selected', 'true')
    expect(window.location.hash).toBe('#resumen')
  })

  it('reutiliza la carga múltiple para los tres documentos de Inscripción', async () => {
    let uploadedDocuments = 0
    postulacionesService.obtenerExpediente.mockImplementation(async () => inscriptionStageResponse(uploadedDocuments))
    postulacionesService.cargarDocumento.mockImplementation(async () => { uploadedDocuments += 1 })
    postulacionesService.obtenerDocumentosAplicables.mockResolvedValue({ documentos_aplicables: [
      { id: 41, codigo: 'CARTA_SOLICITUD_PROYECTO', nombre: 'Carta de Solicitud de Proyecto de Grado', capacidad_carga: { permitida: true } },
      { id: 42, codigo: 'MATRICULA_VIGENTE', nombre: 'Comprobante de Matrícula Vigente', capacidad_carga: { permitida: true } },
      { id: 43, codigo: 'HISTORIAL_PRERREQ', nombre: 'Historial Académico de Prerrequisitos', capacidad_carga: { permitida: true } },
    ] })
    renderOwnerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Cargar documento' }))
    const dialog = await screen.findByRole('dialog', { name: 'Cargar documentos' })
    expect(screen.queryByRole('button', { name: 'Cargar documentos de Inscripción' })).not.toBeInTheDocument()
    expect(dialog.querySelectorAll('input[type="file"]')).toHaveLength(3)
    expect(within(dialog).getByLabelText(/Carta de Solicitud/)).toBeVisible()
    expect(within(dialog).getByLabelText(/Matrícula Vigente/)).toBeVisible()
    expect(within(dialog).getByLabelText(/Historial Académico de Prerrequisitos/)).toBeVisible()
    expect(within(dialog).queryByLabelText(/Fólder amarillo/i)).not.toBeInTheDocument()
    const documents = [
      [/Carta de Solicitud/, 'carta.pdf'],
      [/Matrícula Vigente/, 'matricula.pdf'],
      [/Historial Académico de Prerrequisitos/, 'historial.pdf'],
    ]
    for (const [index, [name, fileName]] of documents.entries()) {
      const file = new File([fileName], fileName, { type: 'application/pdf' })
      await userEvent.upload(within(dialog).getByLabelText(name), file)
      const selectedCount = index + 1
      const selectedLabel = `${selectedCount} documento${selectedCount === 1 ? '' : 's'} seleccionado${selectedCount === 1 ? '' : 's'}`
      expect(within(dialog).getByText(selectedLabel)).toBeInTheDocument()
      expect(within(dialog).getByRole('button', { name: `Cargar ${selectedCount} documento${selectedCount === 1 ? '' : 's'}` })).toBeEnabled()
    }
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cargar 3 documentos' }))

    await waitFor(() => expect(postulacionesService.cargarDocumento).toHaveBeenCalledTimes(3))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Cargar documentos' })).not.toBeInTheDocument())
    expect(screen.getByRole('tab', { name: 'Resumen' })).toHaveAttribute('aria-selected', 'true')
    expect(window.location.hash).toBe('#resumen')
    for (const [index, [, fileName]] of documents.entries()) {
      const file = new File([fileName], fileName, { type: 'application/pdf' })
      expect(postulacionesService.cargarDocumento).toHaveBeenNthCalledWith(index + 1, expect.objectContaining({ postulacionId: 7, tipoDocumentoId: 41 + index, archivo: file }), expect.any(AbortSignal))
    }
    expect(within(dialog).queryByText(/Fólder amarillo/i)).not.toBeInTheDocument()
  })

  it('navega de Documentos a Resumen después de cargar la nueva orientación', async () => {
    const approvedResponse = inscriptionStageResponse(true)
    approvedResponse.flujo.etapa_actual = { id: 32, codigo: 'PERFIL_PROYECTO', nombre: 'Perfil de Proyecto', estado: 'EN_PROCESO', acciones_permitidas: [] }
    approvedResponse.flujo.etapas = [approvedResponse.flujo.etapa_actual]
    approvedResponse.flujo.orientacion_etapa_actual = { mensaje: 'Gestiona el perfil de la nueva etapa.', requisitos: [], siguiente_accion: null }
    postulacionesService.obtenerExpediente
      .mockResolvedValueOnce(inscriptionStageResponse(true))
      .mockResolvedValueOnce(approvedResponse)
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderApplicationManagerPage('documentos')

    expect(await screen.findByRole('tab', { name: 'Documentos' })).toHaveAttribute('aria-selected', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'Aprobar etapa' }))

    await waitFor(() => expect(screen.getByRole('tab', { name: 'Resumen' })).toHaveAttribute('aria-selected', 'true'))
    expect(screen.getByText('Gestiona el perfil de la nueva etapa.')).toBeInTheDocument()
    expect(screen.getAllByText('Perfil de Proyecto').length).toBeGreaterThan(0)
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2)
    expect(postulacionesService.aprobarEtapa).toHaveBeenCalledTimes(1)
    confirm.mockRestore()
  })

  it('no muestra aprobar Documento Final si la orientación indica cargarlo', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      flujo: {
        ...response.flujo,
        etapa_actual: { id: 23, codigo: 'DOCUMENTO_FINAL', nombre: 'Documento Final', estado: 'EN_PROCESO' },
        orientacion_etapa_actual: {
          mensaje: 'Carga el Documento Final requerido para esta etapa.',
          requisitos: [],
          siguiente_accion: { codigo: 'COMPLETAR_DOCUMENTOS', titulo: 'Cargar Documento Final', estado: 'PENDIENTE', destino: '#documentos', accion_label: 'Ir a documentos' },
        },
      },
    })
    renderApplicationManagerPage()
    const nextAction = await screen.findByText('Completar documentos de Documento Final')
    // La píldora "Pendiente" ya no se repite debajo de la siguiente acción.
    expect(within(nextAction.closest('section')).queryByText(/^pendiente$/i)).not.toBeInTheDocument()
    expect(screen.getAllByText('Presente o corrija los documentos obligatorios de Documento Final.').length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: 'Requisitos de Documento Final' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Documentos de la etapa' })).toBeInTheDocument()
    // El Informe Final del Tutor es opcional en esta etapa: el conteo es solo de lo obligatorio.
    expect(screen.getByText('0 de 1 cumplidos')).toBeInTheDocument()
    expect(screen.getAllByText('No presentado')).toHaveLength(1)
    expect(screen.getAllByText('Opcional en esta etapa').length).toBeGreaterThan(0)
    // También aparecen en la pestaña Documentos ("Lo que pide Documento Final").
    expect(screen.getAllByText('Documento Final del Proyecto de Grado').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Informe Final del Tutor').length).toBeGreaterThan(0)
    const stageDocs = screen.getByRole('heading', { name: 'Lo que pide Documento Final', hidden: true }).closest('section')
    expect([...stageDocs.querySelectorAll('li')].map((row) => row.textContent)).toEqual(['Documento Final del Proyecto de GradoFalta', 'Informe Final del TutorOpcional'])
    expect(screen.queryByRole('button', { name: 'Aprobar Documento Final' })).not.toBeInTheDocument()
  })

  it('muestra el estado real de los dos documentos y conserva Gestionar documentos en Documento Final', async () => {
    const documentStage = {
      ...projectStageResponse('DOCUMENTO_FINAL'),
      flujo: {
        ...projectStageResponse('DOCUMENTO_FINAL').flujo,
        orientacion_etapa_actual: {
          mensaje: 'Carga el Documento Final requerido para esta etapa.',
          requisitos: [],
          siguiente_accion: {
            codigo: 'COMPLETAR_DOCUMENTOS', titulo: 'Cargar Documento Final',
            descripcion: 'Carga el Documento Final para que pueda ser revisado por la administración.',
            estado: 'PENDIENTE', estado_display: 'Pendiente', destino: '#documentos', accion_label: 'Ir a documentos',
          },
        },
      },
    }
    postulacionesService.obtenerExpediente.mockResolvedValue(documentStage)
    postulacionesService.obtenerDocumentos.mockResolvedValue({ count: 2, next: null, previous: null, results: [
      { id: 31, tipo_documento_codigo: 'DOCUMENTO_FINAL', estado_codigo: 'ENV', estado_nombre: 'Enviado', activo: true, requiere_correccion: false, versiones: [{ id: 301, es_version_actual: true, activo: true }] },
      { id: 32, tipo_documento_codigo: 'INFORME_FINAL_TUTOR', estado_codigo: 'APR', estado_nombre: 'Aprobado', activo: true, requiere_correccion: false, versiones: [{ id: 302, es_version_actual: true, activo: true }] },
    ] })
    postulacionesService.obtenerDocumentosAplicables.mockResolvedValue({ documentos_aplicables: [
      { id: 31, codigo: 'DOCUMENTO_FINAL', nombre: 'Documento Final del Proyecto de Grado', capacidad_carga: { permitida: true } },
      { id: 32, codigo: 'INFORME_FINAL_TUTOR', nombre: 'Informe Final del Tutor', capacidad_carga: { permitida: true } },
    ] })
    renderApplicationUploadManagerPage('resumen')

    expect(await screen.findByText('Completar documentos de Documento Final')).toBeInTheDocument()
    // Solo el Documento Final es obligatorio: el Informe del Tutor aprobado no suma al conteo.
    expect(screen.getByText('0 de 1 cumplidos')).toBeInTheDocument()
    const documentRequirements = screen.getByRole('heading', { name: 'Documentos de la etapa' }).closest('section')
    expect(within(documentRequirements).getByText('Documento Final del Proyecto de Grado').closest('li')).toHaveTextContent('Pendiente de revisión administrativa')
    expect(within(documentRequirements).getByText('Informe Final del Tutor').closest('li')).toHaveTextContent('Aprobado')
    const manageDocuments = screen.getByRole('button', { name: 'Gestionar documentos' })
    await userEvent.click(manageDocuments)
    expect(await screen.findByRole('dialog', { name: 'Cargar documentos' })).toBeInTheDocument()
  })

  it('muestra aprobar Documento Final solo con orientación APROBAR_ETAPA', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      flujo: {
        ...response.flujo,
        etapa_actual: { id: 23, codigo: 'DOCUMENTO_FINAL', nombre: 'Documento Final', estado: 'EN_PROCESO' },
        orientacion_etapa_actual: {
          mensaje: 'El Documento Final está aprobado y la etapa está lista para aprobarse.',
          requisitos: [],
          siguiente_accion: { codigo: 'APROBAR_ETAPA', titulo: 'Aprobar Documento Final', estado: 'DISPONIBLE', destino: '#resumen' },
        },
      },
    })
    renderApplicationManagerPage()
    expect(await screen.findByRole('button', { name: 'Aprobar Documento Final' })).toBeInTheDocument()
  })

  it('refresca la orientación canónica tras cargar Documento Final y no aprueba la etapa automáticamente', async () => {
    const documentStage = { id: 23, codigo: 'DOCUMENTO_FINAL', nombre: 'Documento Final', estado: 'EN_PROCESO' }
    const loadOrientation = {
      mensaje: 'Carga el Documento Final requerido para esta etapa.',
      requisitos: [],
      siguiente_accion: { codigo: 'COMPLETAR_DOCUMENTOS', titulo: 'Cargar Documento Final', estado: 'PENDIENTE', destino: '#documentos', accion_label: 'Ir a documentos' },
    }
    const approveOrientation = {
      mensaje: 'El Documento Final está aprobado y la etapa está lista para aprobarse.',
      requisitos: [],
      siguiente_accion: { codigo: 'APROBAR_ETAPA', titulo: 'Aprobar Documento Final', estado: 'DISPONIBLE', destino: '#resumen' },
    }
    const beforeUpload = {
      ...response,
      flujo: { ...response.flujo, etapa_actual: documentStage, orientacion_etapa_actual: loadOrientation },
    }
    const afterUpload = {
      ...response,
      flujo: { ...response.flujo, etapa_actual: documentStage, orientacion_etapa_actual: approveOrientation },
    }
    postulacionesService.obtenerExpediente.mockReset().mockResolvedValueOnce(beforeUpload).mockResolvedValueOnce(afterUpload)
    postulacionesService.obtenerDocumentosAplicables.mockResolvedValue({ documentos_aplicables: [
      { id: 23, codigo: 'DOCUMENTO_FINAL', nombre: 'Documento Final', capacidad_carga: { permitida: true } },
    ] })
    let resolveUpload
    postulacionesService.cargarDocumento.mockReturnValue(new Promise((resolve) => { resolveUpload = resolve }))
    const auth = {
      user: { id: 9 },
      hasPermission: (name) => ['puede_gestionar_postulaciones', 'puede_cargar_documentos'].includes(name),
    }
    selectInitialTab('documentos')
    render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)

    expect(await screen.findByText('Completar documentos de Documento Final')).toBeInTheDocument()
    await userEvent.click(await screen.findByRole('button', { name: 'Cargar documento' }))
    const uploadDialog = screen.getByRole('dialog', { name: 'Cargar documentos' })
    const file = new File(['%PDF-1.4'], 'documento-final.pdf', { type: 'application/pdf' })
    await userEvent.upload(await within(uploadDialog).findByLabelText('Documento Final'), file)
    const submit = within(uploadDialog).getByRole('button', { name: 'Cargar 1 documento' })
    await userEvent.click(submit)

    expect(await screen.findByRole('button', { name: 'Cargando 1 de 1...' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Cargando 1 de 1...' }))
    expect(postulacionesService.cargarDocumento).toHaveBeenCalledTimes(1)
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(1)
    resolveUpload({ id: 303, numero_version: 1, es_version_actual: true })

    await userEvent.click(screen.getByRole('tab', { name: 'Resumen' }))
    expect(await screen.findByRole('button', { name: 'Aprobar Documento Final' })).toBeInTheDocument()
    await waitFor(() => expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2))
    expect(screen.queryByText('Completar documentos de Documento Final')).not.toBeInTheDocument()
    expect(postulacionesService.obtenerDocumentos).toHaveBeenCalledTimes(2)
    expect(postulacionesService.inicializarFlujo).not.toHaveBeenCalled()
    expect(postulacionesService.aprobarEtapa).not.toHaveBeenCalled()
  })

  it('no refresca el expediente ni los documentos cuando falla la carga', async () => {
    const documentStage = { id: 23, codigo: 'DOCUMENTO_FINAL', nombre: 'Documento Final', estado: 'EN_PROCESO' }
    postulacionesService.obtenerExpediente.mockReset().mockResolvedValue({
      ...response,
      flujo: {
        ...response.flujo,
        etapa_actual: documentStage,
        orientacion_etapa_actual: {
          mensaje: 'Carga el Documento Final requerido para esta etapa.',
          requisitos: [],
          siguiente_accion: { codigo: 'COMPLETAR_DOCUMENTOS', titulo: 'Cargar Documento Final', estado: 'PENDIENTE', destino: '#documentos', accion_label: 'Ir a documentos' },
        },
      },
    })
    postulacionesService.obtenerDocumentosAplicables.mockResolvedValue({ documentos_aplicables: [
      { id: 23, codigo: 'DOCUMENTO_FINAL', nombre: 'Documento Final', capacidad_carga: { permitida: true } },
    ] })
    postulacionesService.cargarDocumento.mockRejectedValue({ status: 400, message: 'Carga rechazada.' })
    const auth = {
      user: { id: 9 },
      hasPermission: (name) => ['puede_gestionar_postulaciones', 'puede_cargar_documentos'].includes(name),
    }
    selectInitialTab('documentos')
    render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)

    await screen.findByText('Completar documentos de Documento Final')
    await userEvent.click(await screen.findByRole('button', { name: 'Cargar documento' }))
    const uploadDialog = screen.getByRole('dialog', { name: 'Cargar documentos' })
    await userEvent.upload(await within(uploadDialog).findByLabelText('Documento Final'), new File(['%PDF-1.4'], 'documento-final.pdf', { type: 'application/pdf' }))
    await userEvent.click(within(uploadDialog).getByRole('button', { name: 'Cargar 1 documento' }))

    expect(await within(uploadDialog).findByText('0 documentos cargados. 1 documento no pudo cargarse.')).toBeVisible()
    expect(within(uploadDialog).getByText('Carga rechazada.')).toBeVisible()
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(1)
    expect(postulacionesService.obtenerDocumentos).toHaveBeenCalledTimes(1)
    expect(postulacionesService.inicializarFlujo).not.toHaveBeenCalled()
    expect(postulacionesService.aprobarEtapa).not.toHaveBeenCalled()
  })

  it('permite gestionar la Hoja de Aprobación desde Revisión Final Post Pública', async () => {
    const reviewStage = { id: 120, codigo: 'REVISION_FINAL_POST_PUBLICA', nombre: 'Revisión Final Post Pública', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      flujo: {
        ...response.flujo,
        etapa_actual: reviewStage,
        etapas: [reviewStage],
        orientacion_etapa_actual: {
          mensaje: 'Carga la Hoja de Aprobación correspondiente a la Defensa Pública para continuar.',
          requisitos: [{ tipo: 'DOCUMENTO', codigo: 'HOJA_APROBACION', nombre: 'Hoja de Aprobación', cumplido: false, estado: 'PENDIENTE', estado_display: 'Pendiente de carga', destino: '#documentos' }],
          siguiente_accion: { codigo: 'CARGAR_HOJA_APROBACION', titulo: 'Cargar Hoja de Aprobación', descripcion: 'La Hoja de Aprobación debe ser cargada por el personal administrativo.', estado: 'PENDIENTE', estado_display: 'Pendiente', destino: '#documentos', accion_label: 'Ir a documentos' },
        },
      },
    })
    postulacionesService.obtenerDocumentosAplicables.mockResolvedValue({
      documentos_aplicables: [
        { id: 71, codigo: 'HOJA_APROBACION', nombre: 'Hoja de Aprobación', capacidad_carga: { permitida: true } },
      ],
    })
    const scrollIntoView = vi.fn()
    definePropertyForTest(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoView })
    renderApplicationUploadManagerPage()

    const orientation = (await screen.findByRole('heading', { name: 'Qué debes hacer ahora' })).parentElement
    expect(within(orientation).getByText('Carga la Hoja de Aprobación correspondiente a la Defensa Pública para continuar.')).toBeInTheDocument()
    expect(within(orientation).getByText('Pendiente de carga')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Aprobar Revisión Final Post Pública' })).not.toBeInTheDocument()

    const manageDocuments = within(orientation).getByRole('button', { name: 'Gestionar documentos' })
    expect(manageDocuments).toBeVisible()
    await userEvent.click(manageDocuments)

    expect(screen.getByRole('tab', { name: 'Documentos' })).toHaveAttribute('aria-selected', 'true')
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
    expect(window.location.hash).toBe('#documentos')
    const uploadDialog = await screen.findByRole('dialog', { name: 'Cargar documentos' })
    expect(within(uploadDialog).getByLabelText('Hoja de Aprobación')).toBeVisible()
    expect(within(uploadDialog).getByRole('button', { name: 'Cargar 0 documentos' })).toBeDisabled()
    expect(postulacionesService.cargarDocumento).not.toHaveBeenCalled()

    await userEvent.click(within(uploadDialog).getAllByRole('button', { name: 'Cerrar' }).at(-1))
    expect(screen.queryByRole('dialog', { name: 'Cargar documentos' })).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Documentos' })).toHaveAttribute('aria-selected', 'true')
    expect(window.location.hash).toBe('#documentos')
  })

  it('no ofrece aprobar Documento Final al estudiante aunque la orientación esté lista', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      flujo: {
        ...response.flujo,
        etapa_actual: { id: 23, codigo: 'DOCUMENTO_FINAL', nombre: 'Documento Final', estado: 'EN_PROCESO' },
        orientacion_etapa_actual: {
          mensaje: 'El Documento Final está aprobado y la etapa está lista para aprobarse.',
          requisitos: [],
          siguiente_accion: { codigo: 'APROBAR_ETAPA', titulo: 'Aprobar Documento Final', estado: 'DISPONIBLE', destino: '#resumen' },
        },
      },
    })
    renderOwnerPage()
    expect(await screen.findByText('El Documento Final del Proyecto de Grado está aprobado. Espera la aprobación de la etapa por el personal responsable.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Aprobar Documento Final' })).not.toBeInTheDocument()
  })

  it.each([
    ['el estudiante', renderOwnerPage],
    ['un gestor de postulaciones con permiso de carga', renderApplicationUploadManagerPage],
  ])('abre directamente desde la orientación documental de Perfil para %s', async (_case, renderAuthorizedPage) => {
    const profileStage = { id: 11, codigo: 'PERFIL_PROYECTO', nombre: 'Perfil de Proyecto', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
    const documentOrientation = {
      mensaje: 'Completa los documentos requeridos.',
      requisitos: [
        { tipo: 'DOCUMENTO', codigo: 'CARTA_SOLICITUD_TRIBUNAL_PROYECTO', nombre: 'Carta de solicitud de Tribunal', cumplido: false, estado_display: 'No presentado', destino: '#documentos' },
        { tipo: 'DOCUMENTO', codigo: 'PERFIL_ACADEMICO_PROYECTO', nombre: 'Perfil académico', cumplido: false, estado_display: 'No presentado', destino: '#documentos' },
      ],
      siguiente_accion: { codigo: 'COMPLETAR_DOCUMENTOS', titulo: 'Cargar documentos', descripcion: 'Carga los documentos no presentados.', estado: 'PENDIENTE', destino: '#documentos', accion_label: 'Cargar documentos' },
    }
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: { ...response.flujo, etapa_actual: profileStage, etapas: [profileStage], orientacion_etapa_actual: documentOrientation } })
    postulacionesService.obtenerDocumentosAplicables.mockResolvedValue({ documentos_aplicables: [
      { id: 61, codigo: 'CARTA_SOLICITUD_TRIBUNAL_PROYECTO', nombre: 'Carta de solicitud de Tribunal', capacidad_carga: { permitida: true } },
      { id: 62, codigo: 'PERFIL_ACADEMICO_PROYECTO', nombre: 'Perfil académico', capacidad_carga: { permitida: true } },
    ] })
    renderAuthorizedPage('resumen')

    const requirements = await screen.findByRole('region', { name: 'Requisitos de esta etapa' })
    expect(within(requirements).getByText(/Carta de solicitud de Tribunal/)).toBeInTheDocument()
    expect(within(requirements).getByText(/Perfil acad.mico/)).toBeInTheDocument()
    expect(within(requirements).getByText('0 de 2 cumplidos')).toBeInTheDocument()

    await userEvent.click(await screen.findByRole('button', { name: 'Gestionar documentos' }))
    const dialog = await screen.findByRole('dialog', { name: 'Cargar documentos' })
    expect(within(dialog).getByLabelText(/Carta de solicitud de Tribunal/)).toBeVisible()
    expect(within(dialog).getByLabelText(/Perfil académico/)).toBeVisible()
    expect(screen.getByRole('tab', { name: 'Resumen' })).toHaveAttribute('aria-selected', 'true')
  })

  it('no muestra acción de carga documental a un usuario sin permiso', async () => {
    const profileStage = { id: 11, codigo: 'PERFIL_PROYECTO', nombre: 'Perfil de Proyecto', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
    const documentOrientation = {
      mensaje: 'Completa los documentos requeridos.',
      requisitos: [{ tipo: 'DOCUMENTO', codigo: 'PERFIL_ACADEMICO_PROYECTO', nombre: 'Perfil académico', cumplido: false, estado_display: 'No presentado', destino: '#documentos' }],
      siguiente_accion: { codigo: 'COMPLETAR_DOCUMENTOS', titulo: 'Cargar documentos', descripcion: 'Carga el documento no presentado.', estado: 'PENDIENTE', destino: '#documentos', accion_label: 'Cargar documentos' },
    }
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: { ...response.flujo, etapa_actual: profileStage, etapas: [profileStage], orientacion_etapa_actual: documentOrientation } })
    renderReviewerPage()

    await screen.findByText('Completa los documentos requeridos.')
    expect(screen.queryByRole('button', { name: 'Gestionar documentos' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Gestionar documentos' })).not.toBeInTheDocument()
  })

  it('abre el cargador compartido de Tesis desde Resumen sin navegar', async () => {
    const thesisStage = { id: 31, codigo: 'DICTAMEN_TUTOR', nombre: 'Dictamen de Tutor', estado: 'EN_PROCESO' }
    const orientation = {
      mensaje: 'Carga el documento requerido.',
      requisitos: [],
      siguiente_accion: { codigo: 'COMPLETAR_DOCUMENTOS', titulo: 'Completar documentos', estado: 'PENDIENTE', destino: '#documentos', accion_label: 'Ir a documentos' },
    }
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: { ...response.detalle, modalidad_detalle: { id: 2, codigo: 'TESIS_GRADO', nombre: 'Tesis de Grado' } },
      flujo: {
        ...response.flujo,
        modalidad: { id: 2, codigo: 'TESIS_GRADO', nombre: 'Tesis de Grado' },
        etapa_actual: thesisStage,
        etapas: [thesisStage],
        orientacion_etapa_actual: orientation,
      },
    })
    renderApplicationUploadManagerPage('resumen')

    await userEvent.click(await screen.findByRole('button', { name: 'Gestionar documentos' }))
    expect(await screen.findByRole('dialog', { name: 'Cargar documentos' })).toBeInTheDocument()
    expect(window.location.hash).toBe('#resumen')
  })

  it.each(['ESPERANDO_REVISION', 'PENDIENTE_REVISION', 'DOCUMENTO_APROBADO', 'ESTADO_NO_CARGABLE'])('Perfil contextual de Tesis: permite consultar %s aunque administración tenga carga permitida', async (code) => {
    postulacionesService.obtenerDocumentosAplicables.mockResolvedValue(profileThesisApplicable(code, true))
    renderProfileThesisAction()
    await userEvent.click(await screen.findByRole('button', { name: 'Ir a documentos' }))
    await waitFor(() => expect(window.location.hash).toBe('#documentos'))
    expect(screen.queryByRole('dialog', { name: 'Cargar documentos' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cargar documento' })).toBeVisible()
  })

  it.each([
    { canUpload: false }, { complete: true, canAssign: false },
    { complete: true, tutor: true }, { requirements: [] },
    { modality: 'TRABAJO_DIRIGIDO' }, { stageCode: 'INSCRIPCION' },
  ])('Perfil contextual de Tesis: conserva fallback ante contexto o permiso insuficiente %j', async (options) => {
    renderProfileThesisAction(options)
    expect(await screen.findByRole('link', { name: 'Ir a documentos' })).toHaveAttribute('href', '#documentos')
    expect(postulacionesService.obtenerDocumentosAplicables).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog', { name: 'Cargar documentos' })).not.toBeInTheDocument()
  })

  it.each(['vacio', 'error', 'otro contexto', 'sin capacidad', 'codigo desconocido', 'sin permiso documental'])('Perfil contextual de Tesis: fallback seguro para respuesta %s', async (scenario) => {
    const applicable = profileThesisApplicable()
    if (scenario === 'vacio') applicable.documentos_aplicables = []
    if (scenario === 'otro contexto') applicable.etapa_actual = 'DOCUMENTO_FINAL'
    if (scenario === 'sin capacidad') applicable.documentos_aplicables.forEach((type) => { delete type.capacidad_carga })
    if (scenario === 'codigo desconocido') applicable.documentos_aplicables.forEach((type) => { type.capacidad_carga.codigo = 'DESCONOCIDO' })
    if (scenario === 'sin permiso documental') applicable.documentos_aplicables.forEach((type) => { type.capacidad_carga.permitida = false })
    if (scenario === 'error') postulacionesService.obtenerDocumentosAplicables.mockRejectedValue({ message: 'Servicio no disponible' })
    else postulacionesService.obtenerDocumentosAplicables.mockResolvedValue(applicable)
    renderProfileThesisAction()
    await userEvent.click(await screen.findByRole('button', { name: 'Ir a documentos' }))
    await waitFor(() => expect(window.location.hash).toBe('#documentos'))
    expect(screen.queryByRole('dialog', { name: 'Cargar documentos' })).not.toBeInTheDocument()
    expect(postulacionesService.obtenerDocumentosAplicables).toHaveBeenCalledTimes(1)
  })

  it('Perfil contextual de Tesis: impide doble apertura y permite cerrar y volver a cargar manualmente', async () => {
    let resolve
    postulacionesService.obtenerDocumentosAplicables.mockReturnValueOnce(new Promise((done) => { resolve = done }))
    renderProfileThesisAction()
    const trigger = await screen.findByRole('button', { name: 'Ir a documentos' })
    fireEvent.click(trigger)
    fireEvent.click(trigger)
    expect(postulacionesService.obtenerDocumentosAplicables).toHaveBeenCalledTimes(1)
    await act(async () => resolve(profileThesisApplicable()))
    const dialog = await screen.findByRole('dialog', { name: 'Cargar documentos' })
    expect(screen.getAllByRole('dialog', { name: 'Cargar documentos' })).toHaveLength(1)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByRole('dialog', { name: 'Cargar documentos' })).not.toBeInTheDocument()
    postulacionesService.obtenerDocumentosAplicables.mockResolvedValue(profileThesisApplicable())
    await userEvent.click(screen.getByRole('tab', { name: 'Documentos' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cargar documento' }))
    expect(await screen.findByRole('dialog', { name: 'Cargar documentos' })).toBeInTheDocument()
    expect(postulacionesService.obtenerDocumentosAplicables).toHaveBeenCalledTimes(2)
  })

  it('Perfil contextual de Tesis: un hash documental no consulta tipos ni abre el cargador automáticamente', async () => {
    renderProfileThesisAction({ hash: 'documentos' })
    expect(await screen.findByRole('button', { name: 'Cargar documento' })).toBeVisible()
    expect(postulacionesService.obtenerDocumentosAplicables).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog', { name: 'Cargar documentos' })).not.toBeInTheDocument()
  })

  const tribunalReportOrientation = {
    requisitos: [{ tipo: 'OPERATIVO', codigo: 'INFORME_TRIB_TESIS', nombre: 'Informe del Tribunal de Tesis', cumplido: false, estado: 'PENDIENTE', destino: '#documentos' }],
    siguiente_accion: { codigo: 'COMPLETAR_DOCUMENTOS', titulo: 'Cargar Informe del Tribunal de Tesis', descripcion: 'Adjunta el Informe del Tribunal de Tesis requerido para registrar el dictamen correspondiente.', estado: 'PENDIENTE', estado_display: 'Pendiente', destino: '#documentos', accion_label: 'Gestionar documentos' },
  }

  it('Prioridad documental del Tribunal: carga el informe y actualiza la orientación para abrir el dictamen sin recargar', async () => {
    renderTutorDictamenContext({ type: 'TRIBUNAL', canUpload: true, missingEvidence: true, orientation: tribunalReportOrientation })
    let pendingResponse
    await act(async () => { pendingResponse = await postulacionesService.obtenerExpediente.mock.results[0].value })
    postulacionesService.obtenerDocumentosAplicables.mockResolvedValue({ documentos_aplicables: [
      { id: 154, codigo: 'INFORME_TRIB_TESIS', nombre: 'Informe del Tribunal de Tesis', capacidad_carga: { codigo: 'SIN_DOCUMENTO', permitida: true } },
    ] })
    postulacionesService.cargarDocumento.mockImplementation(async () => {
      postulacionesService.obtenerExpediente.mockResolvedValue({ ...pendingResponse, flujo: { ...pendingResponse.flujo,
        orientacion_etapa_actual: { requisitos: [], siguiente_accion: { codigo: 'REGISTRAR_DICTAMEN', titulo: 'Registrar nuevo dictamen del Tribunal', estado: 'DISPONIBLE', destino: '#dictamen-tribunal', accion_label: 'Ir a registrar dictamen' } },
      } })
      postulacionesService.obtenerDocumentos.mockResolvedValue({ count: 2, results: [
        { id: 55, postulacion: 53, activo: true, tipo_documento_codigo: 'DOCUMENTO_FINAL', versiones: [{ id: 57, numero_version: 1, activo: true, es_version_actual: true }] },
        { id: 53, postulacion: 53, activo: true, tipo_documento_codigo: 'INFORME_TRIB_TESIS', versiones: [{ id: 55, numero_version: 1, activo: true, es_version_actual: true }] },
      ] })
      return { id: 55, numero_version: 1, es_version_actual: true }
    })
    const trigger = await screen.findByRole('button', { name: 'Gestionar documentos' })
    await userEvent.click(trigger)
    const upload = await screen.findByRole('dialog', { name: 'Cargar documentos' })
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(window.location.hash).toBe('#resumen')
    expect(postulacionesService.obtenerDocumentosAplicables).toHaveBeenCalledExactlyOnceWith('53', expect.any(AbortSignal))
    expect(postulacionesService.registrarDictamenRevision).not.toHaveBeenCalled()
    const file = new File(['informe'], 'informe-tribunal.pdf', { type: 'application/pdf' })
    await userEvent.upload(within(upload).getByLabelText('Informe del Tribunal de Tesis'), file)
    await userEvent.click(within(upload).getByRole('button', { name: 'Cargar 1 documento' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Cargar documentos' })).not.toBeInTheDocument())
    expect(postulacionesService.cargarDocumento).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ postulacionId: 53, tipoDocumentoId: 154, archivo: file }), expect.any(AbortSignal))
    await userEvent.click(await screen.findByRole('link', { name: 'Ir a registrar dictamen' }))
    const dictamen = await screen.findByRole('dialog', { name: 'Dictamen del Tribunal' })
    expect(within(dictamen).getByLabelText('Evidencia').options).toHaveLength(2)
    expect(postulacionesService.registrarDictamenRevision).not.toHaveBeenCalled()
    expect(window.location.hash).toBe('#resumen')
  })

  it('Prioridad documental del Tribunal: respeta el permiso de carga sin abrir ni consultar el cargador', async () => {
    renderTutorDictamenContext({ type: 'TRIBUNAL', missingEvidence: true, orientation: tribunalReportOrientation })
    expect(await screen.findByText('Cargar Informe del Tribunal de Tesis')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Gestionar documentos' })).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(postulacionesService.obtenerDocumentosAplicables).not.toHaveBeenCalled()
    expect(postulacionesService.cargarDocumento).not.toHaveBeenCalled()
  })

  it('Dictamen contextual de Tesis: abre el formulario existente desde Resumen sin navegar ni registrar', async () => {
    renderTutorDictamenContext()
    const trigger = await screen.findByRole('link', { name: 'Ir a registrar dictamen' })
    await waitFor(() => expect(screen.queryByText('Cargando dictámenes…')).not.toBeInTheDocument())
    await userEvent.dblClick(trigger)
    const dialog = await screen.findByRole('dialog', { name: 'Dictamen del Tutor' })
    expect(dialog).toBeVisible()
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(document.getElementById('panel-documentos')).not.toBeVisible()
    expect(window.location.hash).toBe('#resumen')
    expect(postulacionesService.registrarDictamenRevision).not.toHaveBeenCalled()
    expect(postulacionesService.obtenerDictamenesRevision).toHaveBeenCalledExactlyOnceWith(158, expect.any(AbortSignal))
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(trigger).toHaveFocus())
    await userEvent.click(trigger)
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it('Dictamen contextual de Tesis: conserva payload y la apertura manual, sin automatismo por hash', async () => {
    renderTutorDictamenContext({ hash: 'dictamen-tutor' })
    const trigger = await screen.findByRole('button', { name: 'Registrar dictamen' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await userEvent.click(trigger)
    const dialog = screen.getByRole('dialog', { name: 'Dictamen del Tutor' })
    await userEvent.selectOptions(within(dialog).getByLabelText('Tutor'), '59')
    await userEvent.selectOptions(within(dialog).getByLabelText('Evidencia'), '55')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Registrar' }))
    expect(postulacionesService.registrarDictamenRevision).toHaveBeenCalledExactlyOnceWith(158, {
      tipo_revision: 'TUTOR', version_documento_revisada: 57, evidencia_version: 55, asignacion_emisora: 59, resultado: 'SUFICIENTE', observaciones: '',
    }, expect.any(AbortSignal))
  })

  it.each([{ canManage: false }, { status: 'PENDIENTE' }, { action: 'CORREGIR_DOCUMENTO_FINAL' }, { modality: 'PROYECTO_GRADO' }, { modality: 'TRABAJO_DIRIGIDO' }, { ambiguous: true }, { blocked: true }, { documentError: true }])('Dictamen contextual de Tesis: mantiene navegación segura para %j', async (options) => {
    renderTutorDictamenContext(options)
    const trigger = await screen.findByRole('link', { name: 'Ir a registrar dictamen' })
    await waitFor(() => expect(screen.queryByText('Cargando dictámenes…')).not.toBeInTheDocument())
    await userEvent.click(trigger)
    expect(window.location.hash).toBe('#dictamen-tutor')
    expect(screen.queryByRole('dialog', { hidden: true })).not.toBeInTheDocument()
    expect(postulacionesService.registrarDictamenRevision).not.toHaveBeenCalled()
  })

  it('Tribunal contextual de Tesis: abre desde Resumen sin navegación ni POST y conserva el payload sin emisor', async () => {
    renderTutorDictamenContext({ type: 'TRIBUNAL' })
    const trigger = await screen.findByRole('link', { name: 'Ir a registrar dictamen' })
    await waitFor(() => expect(screen.queryByText('Cargando dictámenes…')).not.toBeInTheDocument())
    await userEvent.dblClick(trigger)
    const dialog = await screen.findByRole('dialog', { name: 'Dictamen del Tribunal' })
    expect(dialog).toBeVisible()
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(window.location.hash).toBe('#resumen')
    expect(postulacionesService.registrarDictamenRevision).not.toHaveBeenCalled()
    expect(postulacionesService.obtenerDictamenesRevision).toHaveBeenCalledExactlyOnceWith(159, expect.any(AbortSignal))
    expect(within(dialog).queryByLabelText('Tutor')).not.toBeInTheDocument()
    await userEvent.selectOptions(within(dialog).getByLabelText('Evidencia'), '55')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Registrar' }))
    expect(postulacionesService.registrarDictamenRevision).toHaveBeenCalledExactlyOnceWith(159, {
      tipo_revision: 'TRIBUNAL', version_documento_revisada: 57, evidencia_version: 55, resultado: 'SUFICIENTE', observaciones: '',
    }, expect.any(AbortSignal))
  })

  it('Tribunal contextual de Tesis: abre sin INFORME_TRIB_TESIS y conserva el registro deshabilitado', async () => {
    renderTutorDictamenContext({ type: 'TRIBUNAL', missingEvidence: true })
    const trigger = await screen.findByRole('link', { name: 'Ir a registrar dictamen' })
    await waitFor(() => expect(screen.queryByText('Cargando dictámenes…')).not.toBeInTheDocument())
    await userEvent.dblClick(trigger)
    const dialog = await screen.findByRole('dialog', { name: 'Dictamen del Tribunal' })
    expect(dialog).toBeVisible()
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(window.location.hash).toBe('#resumen')
    const evidence = within(dialog).getByLabelText('Evidencia')
    expect(evidence).toHaveValue('')
    expect(evidence.options).toHaveLength(1)
    expect(within(dialog).getByRole('button', { name: 'Registrar' })).toBeDisabled()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Registrar' }))
    expect(postulacionesService.registrarDictamenRevision).not.toHaveBeenCalled()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(trigger).toHaveFocus())
    await userEvent.click(trigger)
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(trigger).toHaveFocus())
    expect(postulacionesService.registrarDictamenRevision).not.toHaveBeenCalled()
  })

  it('mantiene los documentos como recurso disponible en Documento Final', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(projectStageResponse('DOCUMENTO_FINAL'))
    renderPage('documentos')

    expect(await screen.findByRole('heading', { name: 'Documentos' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Resultado y cierre' }))
    expect(screen.getByText('Información de etapas posteriores')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Resultado académico técnico' }).closest('details')).toBe(screen.getByText('Información de etapas posteriores').closest('details'))
  })

  it('orienta a cargar documentos de seguimiento pendientes desde el Resumen', async () => {
    const closureStage = {
      ...projectStageResponse('CIERRE_DOCUMENTAL'),
      cierre: {
        data: {
          ...closureResponse,
          etapa_actual: 'CIERRE_DOCUMENTAL',
          documentos_requeridos: ['DOCUMENTO_FINAL', 'ACTA_DEFENSA', 'HOJA_APROBACION', 'INFORME_FINAL_TUTOR'],
          documentos_aprobados: ['DOCUMENTO_FINAL', 'HOJA_APROBACION'],
          documentos_faltantes: ['ACTA_DEFENSA', 'INFORME_FINAL_TUTOR'],
          puede_aprobar_cierre: true,
        },
        error: '',
      },
      flujo: {
        ...projectStageResponse('CIERRE_DOCUMENTAL').flujo,
        etapa_actual: { ...projectStageResponse('CIERRE_DOCUMENTAL').flujo.etapa_actual, acciones_permitidas: ['aprobar'] },
        orientacion_etapa_actual: {
          mensaje: 'El cierre documental está listo para aprobación.',
          requisitos: [],
          siguiente_accion: { codigo: 'APROBAR_ETAPA', titulo: 'Aprobar Cierre Documental', descripcion: 'Aprueba el cierre.', estado: 'DISPONIBLE', destino: '#resumen' },
        },
      },
    }
    postulacionesService.obtenerExpediente.mockResolvedValue(closureStage)
    postulacionesService.obtenerDocumentosAplicables.mockResolvedValue({
      documentos_aplicables: [
        { id: 4, codigo: 'ACTA_DEFENSA', nombre: 'Acta de Defensa', capacidad_carga: { permitida: true } },
        { id: 5, codigo: 'INFORME_FINAL_TUTOR', nombre: 'Informe Final del Tutor', capacidad_carga: { permitida: true } },
      ],
    })
    const auth = { user: { id: 9 }, hasPermission: (name) => ['puede_gestionar_cierre', 'puede_cargar_documentos'].includes(name) }
    selectInitialTab('resumen')
    render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)

    expect(await screen.findByText('Cargar documentos', { selector: 'p' })).toBeInTheDocument()
    const summary = document.getElementById('panel-resumen')
    const actaRequirement = within(summary).getByText(/Acta de Defensa/i).closest('li')
    expect(actaRequirement).toHaveTextContent('Pendiente')
    expect(within(summary).queryByText(/Informe Final del Tutor/i)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Gestionar documentos' }))

    expect(window.location.hash).toBe('#documentos')
    const uploadDialog = await screen.findByRole('dialog')
    expect(uploadDialog).toHaveAccessibleName('Cargar documentos')
    expect(postulacionesService.cargarDocumento).not.toHaveBeenCalled()
    expect(screen.getByRole('tab', { name: 'Documentos' })).toHaveAttribute('aria-selected', 'true')
    await userEvent.click(within(uploadDialog).getAllByRole('button', { name: 'Cerrar' })[0])
    expect(window.location.hash).toBe('#documentos')
    expect(screen.getByRole('tab', { name: 'Documentos' })).toHaveAttribute('aria-selected', 'true')
  })

  it('mantiene la aprobación administrativa como siguiente acción cuando no hay documentos de seguimiento pendientes', async () => {
    const closureStage = {
      ...projectStageResponse('CIERRE_DOCUMENTAL'),
      cierre: {
        data: {
          ...closureResponse,
          etapa_actual: 'CIERRE_DOCUMENTAL',
          documentos_requeridos: ['DOCUMENTO_FINAL', 'ACTA_DEFENSA', 'HOJA_APROBACION', 'INFORME_FINAL_TUTOR'],
          documentos_aprobados: ['DOCUMENTO_FINAL', 'ACTA_DEFENSA', 'HOJA_APROBACION', 'INFORME_FINAL_TUTOR'],
          documentos_faltantes: [],
          puede_aprobar_cierre: true,
        },
        error: '',
      },
      flujo: {
        ...projectStageResponse('CIERRE_DOCUMENTAL').flujo,
        etapa_actual: { ...projectStageResponse('CIERRE_DOCUMENTAL').flujo.etapa_actual, acciones_permitidas: ['aprobar'] },
        orientacion_etapa_actual: {
          mensaje: 'El cierre documental está listo para aprobación.',
          requisitos: [],
          siguiente_accion: { codigo: 'APROBAR_ETAPA', titulo: 'Aprobar Cierre Documental', descripcion: 'Aprueba el cierre.', estado: 'DISPONIBLE', destino: '#resumen' },
        },
      },
    }
    postulacionesService.obtenerExpediente.mockResolvedValue(closureStage)
    const auth = { user: { id: 9 }, hasPermission: (name) => ['puede_gestionar_cierre', 'puede_gestionar_postulaciones'].includes(name) }
    selectInitialTab('resumen')
    render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)

    expect(await screen.findByRole('button', { name: 'Aprobar Cierre Documental' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Gestionar documentos' })).not.toBeInTheDocument()
    expect(screen.getByText(/Acta de Defensa/i).closest('li')).toHaveTextContent('Aprobado')
    // El seguimiento del cierre documental lista solo el Acta de Defensa.
    expect(screen.queryByText(/Informe Final del Tutor/i)).not.toBeInTheDocument()
  })

  it.each(['administración', 'estudiante'])('Acta contextual Tesis: abre sin navegar, preselecciona y guarda con %s', async (actor) => {
    const { event } = prepareContextualThesisActa()
    if (actor === 'estudiante') renderStudentPage()
    else renderDefenseDocumentsAdminPage('resumen')
    const trigger = await screen.findByRole('button', { name: 'Cargar Acta de Defensa' })
    await userEvent.dblClick(trigger)
    const dialog = await screen.findByRole('dialog', { name: 'Cargar Acta de Defensa' })
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    await waitFor(() => expect(within(dialog).getByLabelText('Defensa Pública finalizada')).toHaveValue(String(event.id)))
    expect(within(dialog).getByLabelText('Tipo documental')).toHaveValue('5')
    expect(within(dialog).getByLabelText('Tipo documental')).toBeDisabled()
    expect(within(dialog).getByLabelText('Defensa Pública finalizada')).toBeDisabled()
    expect(postulacionesService.cargarDocumento).not.toHaveBeenCalled()
    const pending = deferred()
    postulacionesService.cargarDocumento.mockReturnValueOnce(pending.promise)
    await userEvent.upload(within(dialog).getByLabelText('Archivo'), new File(['acta'], 'acta.pdf', { type: 'application/pdf' }))
    await userEvent.dblClick(within(dialog).getByRole('button', { name: 'Cargar documento' }))
    expect(postulacionesService.cargarDocumento).toHaveBeenCalledTimes(1)
    expect(postulacionesService.cargarDocumento).toHaveBeenCalledWith(expect.objectContaining({ postulacionId: 7, tipoDocumentoId: 5, eventoDefensaId: 81 }), expect.any(AbortSignal))
    await userEvent.keyboard('{Escape}')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cerrar' }))
    expect(dialog).toBeInTheDocument()
    await act(async () => pending.resolve({ id: 991 }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(postulacionesService.obtenerExpediente.mock.calls.length).toBeGreaterThanOrEqual(3)
    expect(postulacionesService.obtenerDocumentos.mock.calls.length).toBeGreaterThanOrEqual(3)
  })

  it('Acta contextual Tesis: cancelar y Escape no cargan y restauran el foco', async () => {
    prepareContextualThesisActa()
    renderOwnerPage('resumen')
    const trigger = await screen.findByRole('button', { name: 'Cargar Acta de Defensa' })
    await userEvent.click(trigger)
    const dialog = await screen.findByRole('dialog', { name: 'Cargar Acta de Defensa' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(trigger).toHaveFocus())
    await userEvent.click(trigger)
    await screen.findByRole('dialog', { name: 'Cargar Acta de Defensa' })
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(postulacionesService.cargarDocumento).not.toHaveBeenCalled()
  })

  it.each(['anterior', 'otra postulación', 'otro seguimiento', 'no finalizada', 'inactiva', 'ambiguo', 'sin intento', 'sin capacidad', 'consulta fallida', 'tipos fallidos'])('Acta contextual Tesis: rechaza contexto %s sin POST', async (scenario) => {
    const { fresh, event, applicable } = prepareContextualThesisActa()
    renderOwnerPage('resumen')
    const trigger = await screen.findByRole('button', { name: 'Cargar Acta de Defensa' })
    const changed = { ...event }
    if (scenario === 'anterior') changed.numero_intento = 0
    if (scenario === 'otra postulación') changed.postulacion = 9
    if (scenario === 'otro seguimiento') changed.seguimiento_etapa = 77
    if (scenario === 'no finalizada') changed.estado = 'PROGRAMADA'
    if (scenario === 'inactiva') changed.activo = false
    postulacionesService.obtenerDefensas.mockResolvedValue({ results: scenario === 'ambiguo' ? [event, { ...event, id: 99 }] : [changed] })
    if (scenario === 'sin intento') postulacionesService.obtenerExpediente.mockResolvedValue({ ...fresh, flujo: { ...fresh.flujo, etapas: [{ ...fresh.flujo.etapa_actual, numero_intento: null }] } })
    if (scenario === 'sin capacidad') postulacionesService.obtenerDocumentosAplicables.mockResolvedValue({ ...applicable, documentos_aplicables: [{ ...applicable.documentos_aplicables[0], capacidad_carga: { permitida: false } }] })
    if (scenario === 'consulta fallida') postulacionesService.obtenerDefensas.mockRejectedValueOnce({ message: 'No se pudo consultar la defensa.' })
    if (scenario === 'tipos fallidos') postulacionesService.obtenerDocumentosAplicables.mockRejectedValueOnce({ message: 'No se pudieron consultar los tipos documentales.' })
    await userEvent.click(trigger)
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ir a documentos' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cargar Acta de Defensa' })).toBeEnabled()
    expect(postulacionesService.cargarDocumento).not.toHaveBeenCalled()
  })

  it('Acta contextual Tesis: excluye eventos históricos y ajenos de todas las páginas', async () => {
    const { event } = prepareContextualThesisActa()
    postulacionesService.obtenerDefensas.mockImplementation((_id, page) => Promise.resolve(page === 1 ? { next: 'page2', results: [{ ...event, id: 99, postulacion: 9 }, { ...event, id: 98, numero_intento: 0 }] } : { next: null, results: [event] }))
    renderOwnerPage('resumen')
    await userEvent.click(await screen.findByRole('button', { name: 'Cargar Acta de Defensa' }))
    const dialog = await screen.findByRole('dialog')
    await waitFor(() => expect(within(dialog).getByLabelText('Defensa Pública finalizada')).toHaveValue('81'))
    expect(within(within(dialog).getByLabelText('Defensa Pública finalizada')).getAllByRole('option')).toHaveLength(2)
    expect(postulacionesService.cargarDocumento).not.toHaveBeenCalled()
  })

  it.each(['ENV', 'APR', 'REC'])('Acta contextual Tesis: un Acta aparecida entretanto (%s) abre el detalle sin crear otra versión', async (state) => {
    prepareContextualThesisActa()
    renderOwnerPage('resumen')
    const trigger = await screen.findByRole('button', { name: 'Cargar Acta de Defensa' })
    const acta = { id: 91, tipo_documento: 5, tipo_documento_codigo: 'ACTA_DEFENSA', tipo_documento_nombre: 'Acta de Defensa', estado_codigo: state, evento_defensa: 81, activo: true, versiones: [{ id: 911, activo: true, es_version_actual: true }] }
    postulacionesService.obtenerDocumentos.mockResolvedValue({ count: 1, results: [acta] })
    await userEvent.click(trigger)
    expect(await screen.findByText(/El Acta ya está registrada/)).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    expect(screen.queryByRole('dialog', { name: 'Cargar Acta de Defensa' })).not.toBeInTheDocument()
    expect(postulacionesService.cargarDocumento).not.toHaveBeenCalled()
  })

  it('Acta contextual Tesis: mantiene el error de carga y permite reintentar explícitamente', async () => {
    prepareContextualThesisActa()
    postulacionesService.cargarDocumento.mockRejectedValueOnce({ message: 'El archivo no pudo guardarse.' })
    renderOwnerPage('resumen')
    await userEvent.click(await screen.findByRole('button', { name: 'Cargar Acta de Defensa' }))
    const dialog = await screen.findByRole('dialog')
    await waitFor(() => expect(within(dialog).getByLabelText('Defensa Pública finalizada')).toHaveValue('81'))
    await userEvent.upload(within(dialog).getByLabelText('Archivo'), new File(['acta'], 'acta.pdf', { type: 'application/pdf' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cargar documento' }))
    expect(await within(dialog).findByText('El archivo no pudo guardarse.')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Cargar documento' })).toBeEnabled()
    expect(postulacionesService.cargarDocumento).toHaveBeenCalledTimes(1)
  })

  it.each(['resumen', 'documentos'])('Acta contextual Tesis: no abre por hash %s', async (hash) => {
    prepareContextualThesisActa()
    renderOwnerPage(hash)
    await screen.findByRole('heading', { name: /Ana P/ })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(postulacionesService.cargarDocumento).not.toHaveBeenCalled()
  })

  it('Acta contextual Tesis: vuelve a comprobar seguimiento e intento al montar el cargador', async () => {
    const { fresh } = prepareContextualThesisActa()
    renderOwnerPage('resumen')
    const trigger = await screen.findByRole('button', { name: 'Cargar Acta de Defensa' })
    postulacionesService.obtenerExpediente.mockResolvedValueOnce(fresh).mockResolvedValue({ ...fresh, flujo: { ...fresh.flujo, etapas: [{ ...fresh.flujo.etapa_actual, id: 83, numero_intento: 2 }] } })
    await userEvent.click(trigger)
    const dialog = await screen.findByRole('dialog')
    expect(await within(dialog).findByText(/El contexto de Defensa Pública cambió/)).toBeInTheDocument()
    await userEvent.upload(within(dialog).getByLabelText('Archivo'), new File(['acta'], 'acta.pdf', { type: 'application/pdf' }))
    fireEvent.submit(dialog.querySelector('form'))
    expect(postulacionesService.cargarDocumento).not.toHaveBeenCalled()
    expect(within(dialog).getByRole('button', { name: 'Cargar documento' })).toBeDisabled()
  })

  it.each(['REC', 'corrección', 'vínculo incorrecto'])('Acta contextual Tesis: conserva detalle y versionado explícito ante %s', async (state) => {
    prepareContextualThesisActa()
    renderOwnerPage('resumen')
    const trigger = await screen.findByRole('button', { name: 'Cargar Acta de Defensa' })
    const acta = { id: 91, tipo_documento: 5, tipo_documento_codigo: 'ACTA_DEFENSA', tipo_documento_nombre: 'Acta de Defensa', estado_codigo: state === 'REC' ? 'REC' : 'APR', requiere_correccion: state === 'corrección', evento_defensa: state === 'vínculo incorrecto' ? 99 : 81, activo: true, versiones: [{ id: 911, activo: true, es_version_actual: true }] }
    postulacionesService.obtenerDocumentos.mockResolvedValue({ results: [acta] })
    await userEvent.click(trigger)
    await screen.findByRole('dialog', { name: 'Detalle del documento' })
    expect(postulacionesService.cargarDocumento).not.toHaveBeenCalled()
    if (state === 'vínculo incorrecto') {
      expect(screen.getByText(/Revisa su estado, vínculo y versiones/)).toBeInTheDocument()
      return
    }
    await userEvent.click(await screen.findByRole('button', { name: 'Cargar nueva versión' }))
    const upload = await screen.findByRole('dialog', { name: 'Cargar nueva versión' })
    await waitFor(() => expect(within(upload).getByLabelText('Defensa Pública finalizada')).toHaveValue('81'))
    await userEvent.upload(within(upload).getByLabelText('Archivo'), new File(['corrección'], 'acta-v2.pdf', { type: 'application/pdf' }))
    await userEvent.click(within(upload).getByRole('button', { name: 'Cargar nueva versión' }))
    await waitFor(() => expect(postulacionesService.cargarDocumento).toHaveBeenCalledTimes(1))
    expect(postulacionesService.cargarDocumento).toHaveBeenCalledWith(expect.objectContaining({ tipoDocumentoId: 5, eventoDefensaId: '81' }), expect.any(AbortSignal))
  })

  it('Acta contextual Tesis: un estudiante sin permiso de carga recibe orientación informativa', async () => {
    prepareContextualThesisActa()
    renderStudentPage({ permissions: ['puede_ver_postulaciones', 'puede_ver_documentos'] })
    await screen.findByText('Acta de Defensa vigente vinculada')
    expect(screen.queryByRole('button', { name: 'Cargar Acta de Defensa' })).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(postulacionesService.cargarDocumento).not.toHaveBeenCalled()
  })

  it('orienta a completar un Acta existente que todavía no está aprobada', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(thesisPostPublicResponse)
    postulacionesService.obtenerDocumentos.mockResolvedValue({ count: 1, next: null, previous: null, results: [{
      id: 91, tipo_documento_codigo: 'ACTA_DEFENSA', tipo_documento_nombre: 'Acta de Defensa', estado_codigo: 'ENV', requiere_correccion: false, evento_defensa: 81, activo: true,
      versiones: [{ id: 911, activo: true, es_version_actual: true }],
    }] })
    renderPage()

    expect(await screen.findByText('Completar Acta de Defensa')).toBeInTheDocument()
    expect(screen.getByText(/todavía debe quedar vigente, aprobada y correctamente vinculada/i)).toBeInTheDocument()
    expect(screen.getByText('2 de 3 cumplidos')).toBeInTheDocument()
    expect(screen.queryByText('Aprobar etapa')).not.toBeInTheDocument()
  })

  it('orienta a concluir académicamente cuando el Acta vigente está aprobada y vinculada', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(thesisPostPublicResponse)
    postulacionesService.obtenerDocumentos.mockResolvedValue({ count: 1, next: null, previous: null, results: [{
      id: 91, tipo_documento_codigo: 'ACTA_DEFENSA', tipo_documento_nombre: 'Acta de Defensa', estado_codigo: 'APR', requiere_correccion: false, evento_defensa: 81, activo: true,
      versiones: [{ id: 911, activo: true, es_version_actual: true }],
    }] })
    postulacionesService.obtenerDefensas.mockResolvedValue({
      count: 1, next: null, previous: null,
      results: [{ ...defenseRows[0], seguimiento_etapa: 82 }],
    })
    renderPage()

    const summary = (await screen.findByRole('heading', { name: 'Qué debes hacer ahora' })).closest('section')
    expect(within(summary).getByText('Concluir académicamente')).toBeInTheDocument()
    expect(within(summary).getByText('3 de 3 cumplidos')).toBeInTheDocument()
    expect(within(summary).getByText('Disponible')).toBeInTheDocument()
    expect(within(summary).getByRole('link', { name: 'Ir a concluir académicamente' })).toHaveAttribute('href', '#resumen')
    expect(within(summary).queryByText('Aprobar etapa')).not.toBeInTheDocument()
  })

  it('consume documentos aplicables de Tesis y deja accesibles revisiones y correcciones', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: { ...response.detalle, modalidad_detalle: { id: 2, codigo: 'TESIS_GRADO', nombre: 'Tesis de Grado' } },
      flujo: { ...response.flujo, modalidad: { id: 2, codigo: 'TESIS_GRADO', nombre: 'Tesis de Grado' }, etapa_actual: { codigo: 'REVISION_TRIBUNAL', nombre: 'Revisión de Tribunal' }, etapas: [
        { id: 21, codigo: 'REVISION_TUTOR', nombre: 'Revisión de Tutor', estado: 'EN_PROCESO', numero_intento: 1, activo: true },
        { id: 22, codigo: 'REVISION_TRIBUNAL', nombre: 'Revisión de Tribunal', estado: 'EN_PROCESO', numero_intento: 1, activo: true },
      ] },
    })
    postulacionesService.obtenerDocumentosAplicables.mockResolvedValue({ documentos_aplicables: [
      { id: 10, codigo: 'PERFIL_TESIS', nombre: 'Perfil de Tesis', capacidad_carga: { permitida: true } },
      { id: 11, codigo: 'DOCUMENTO_FINAL', nombre: 'Documento Final', capacidad_carga: { permitida: true } },
      { id: 12, codigo: 'INFORME_TUTOR_TESIS', nombre: 'Informe del Tutor de Tesis', capacidad_carga: { permitida: true } },
      { id: 13, codigo: 'INFORME_TRIB_TESIS', nombre: 'Informe del Tribunal de Tesis', capacidad_carga: { permitida: true } },
    ] })
    const auth = { user: { id: 3, rol: { codigo: 'EST' } }, roleCode: 'EST', hasPermission: (name) => name === 'puede_cargar_documentos' }
    selectInitialTab('documentos')
    render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)
    await userEvent.click(await screen.findByRole('button', { name: 'Cargar documento' }))
    expect(await screen.findByLabelText('Perfil de Tesis')).toBeInTheDocument()
    expect(screen.getByLabelText('Documento Final')).toBeInTheDocument()
    expect(screen.getByLabelText('Informe del Tutor de Tesis')).toBeInTheDocument()
    expect(screen.getByLabelText('Informe del Tribunal de Tesis')).toBeInTheDocument()
    expect(postulacionesService.obtenerDocumentosAplicables).toHaveBeenCalledWith('7', expect.any(AbortSignal))
    expect(screen.getAllByRole('heading', { name: 'Dictamen del Tutor' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('heading', { name: 'Dictamen del Tribunal' }).length).toBeGreaterThan(0)
    await userEvent.click(screen.getByRole('tab', { name: 'Defensas' }))
    expect(screen.getByRole('heading', { name: 'Correcciones posteriores a Defensa Privada' })).toBeInTheDocument()
  })

  it('reserva la Hoja de observaciones para la carga contextual de Defensa de Perfil', async () => {
    postulacionesService.obtenerDocumentosAplicables.mockResolvedValue({ documentos_aplicables: [
      { id: 10, codigo: 'DOCUMENTO_FINAL', nombre: 'Documento Final', capacidad_carga: { permitida: true } },
      { id: 11, codigo: 'OBSERVACIONES_DEFENSA_PERFIL', nombre: 'Hoja de observaciones de Defensa de Perfil', capacidad_carga: { permitida: true } },
      { id: 12, codigo: 'INFORME_FINAL_TUTOR', nombre: 'Informe Final del Tutor', capacidad_carga: { permitida: true } },
    ] })
    renderDefenseDocumentsAdminPage('documentos')

    await userEvent.click(await screen.findByRole('button', { name: 'Cargar documento' }))

    expect(await screen.findByLabelText('Documento Final')).toBeInTheDocument()
    expect(screen.getByLabelText('Informe Final del Tutor')).toBeInTheDocument()
    expect(screen.queryByLabelText('Hoja de observaciones de Defensa de Perfil')).not.toBeInTheDocument()
    expect(postulacionesService.obtenerDocumentosAplicables).toHaveBeenCalledWith('7', expect.any(AbortSignal))
  })

  it.each([false, true])('Inscripción de Trabajo Dirigido muestra cuatro obligaciones con documentos aprobados %s', async (approved) => {
    const documents = [
      ['CARTA_SOLICITUD_TD', 'Carta de solicitud de Trabajo Dirigido'],
      ['MATRICULA_VIGENTE_TD', 'Matrícula vigente de Trabajo Dirigido'],
      ['HISTORIAL_PRERREQ_TD', 'Historial de prerrequisitos'],
    ]
    const folderName = 'Fólder amarillo rotulado con el nombre del postulante y la modalidad elegida'
    const requirements = [
      ...documents.map(([codigo, nombre]) => ({ tipo: 'DOCUMENTO', codigo, nombre, cumplido: approved, estado: approved ? 'CUMPLIDO' : 'PENDIENTE', estado_display: approved ? 'Aprobado' : 'No presentado', destino: '#documentos' })),
      { tipo: 'ENTREGA_FISICA', codigo: 'FOLDER_AMARILLO', nombre: folderName, cumplido: true, estado: 'CUMPLIDO', estado_display: 'Recepción registrada', destino: '#inscripcion-entregas' },
    ]
    const stage = { id: 162, codigo: 'INSCRIPCION', nombre: 'Inscripción', estado: 'EN_PROCESO', activo: true, numero_intento: 1, acciones_permitidas: approved ? ['aprobar'] : [] }
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response,
      detalle: { ...response.detalle, modalidad_detalle: { codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido' } },
      flujo: { ...response.flujo, modalidad: { codigo: 'TRABAJO_DIRIGIDO' }, etapa_actual: stage, etapas: [stage], porcentaje_avance: 0, etapas_completadas: 0,
        orientacion_etapa_actual: { requisitos: requirements, requisitos_cumplidos: approved ? 4 : 1, requisitos_totales: 4, permite_aprobar_etapa: approved,
          siguiente_accion: { codigo: approved ? 'APROBAR_ETAPA' : 'COMPLETAR_DOCUMENTOS', titulo: approved ? 'Aprobar Inscripción' : 'Completar documentos de Inscripción', estado: approved ? 'DISPONIBLE' : 'PENDIENTE', destino: approved ? '#resumen' : '#documentos' } },
      },
    })
    postulacionesService.obtenerDocumentosAplicables.mockResolvedValue({ documentos_aplicables: documents.map(([codigo, nombre], index) => ({ id: 49 + index, codigo, nombre, capacidad_carga: { permitida: true, codigo: 'SIN_DOCUMENTO' } })) })
    renderApplicationUploadManagerPage('resumen')
    const section = (await screen.findByRole('heading', { name: 'Requisitos de esta etapa' })).parentElement
    expect(within(section).getAllByRole('listitem')).toHaveLength(4)
    expect(within(section).getByText(`${approved ? 4 : 1} de 4 cumplidos`)).toBeVisible()
    expect(within(section).getAllByText(folderName, { exact: false })).toHaveLength(1)
    expect(within(section).getByText('Recepción registrada')).toBeVisible()
    expect(within(section).queryByText('Fólder amarillo', { exact: true })).not.toBeInTheDocument()
    if (approved) expect(screen.getByRole('button', { name: 'Aprobar Inscripción' })).toBeEnabled()
    else {
      expect(screen.queryByRole('button', { name: /Aprobar Inscripción/ })).not.toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Gestionar documentos' }))
      const dialog = await screen.findByRole('dialog', { name: 'Cargar documentos' })
      for (const [, name] of documents) expect(within(dialog).getByLabelText(name)).toBeVisible()
      expect(within(dialog).queryByText(/Fólder/)).not.toBeInTheDocument()
    }
  })

  it('mantiene el acceso documental separado cuando el estudiante tiene permiso de carga', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(trabajoDirigidoPublicDefenseResponse())
    renderStudentPage()

    const documentLink = await screen.findByRole('link', { name: 'Gestionar documentos' })
    expect(documentLink).toHaveAttribute('href', '/documentos')
    expect(screen.queryByRole('button', { name: 'Completar autoridades' })).not.toBeInTheDocument()
  })

  it('pagina solo el bloque vigente sin recargar el expediente', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerActores.mockImplementation((_id, activo, page) => Promise.resolve(activo
      ? { ...activeActorsResponse, count: 21, next: page === 1 ? 'page=2' : null, previous: page === 2 ? 'page=1' : null }
      : historicalActorsResponse))
    renderPage('actores')
    const group = (await screen.findByRole('heading', { name: 'Participación actual' })).parentElement
    await userEvent.click(within(group).getByRole('button', { name: 'Siguiente' }))
    await waitFor(() => expect(postulacionesService.obtenerActores).toHaveBeenCalledWith('7', true, 2, expect.any(AbortSignal)))
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(1)
    expect(postulacionesService.obtenerActores.mock.calls.filter(([, activo]) => activo === false)).toHaveLength(1)
  })

  it('consulta documentos por postulación y muestra etiquetas sin acciones de escritura', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    renderPage('documentos')
    const card = (await screen.findByRole('heading', { name: 'Documentos' })).closest('[aria-labelledby="documentos-title"]')
    expect(within(card).getByText('Consulta y gestiona los documentos vinculados a tu proceso académico.')).toBeInTheDocument()
    expect(within(card).getByText(/Informe final/)).toBeInTheDocument()
    expect(within(card).getByText('Enviado', { selector: '.expediente-status' })).toBeInTheDocument()
    expect(within(card).getByText('Fecha de carga')).toBeInTheDocument()
    expect(within(card).getByText('Fecha de revisión')).toBeInTheDocument()
    expect(within(card).getByText('Pendiente')).toBeInTheDocument()
    expect(within(card).queryByText('Subido')).not.toBeInTheDocument()
    expect(within(card).queryByText('Revisado')).not.toBeInTheDocument()
    expect(within(card).getByText('Requerida')).toBeInTheDocument()
    expect(within(card).getByText('1')).toBeInTheDocument()
    expect(postulacionesService.obtenerDocumentos).toHaveBeenCalledWith('7', 1, expect.any(AbortSignal))
    expect(postulacionesService.obtenerDocumentos).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: /subir|aprobar|rechazar|observar/i })).not.toBeInTheDocument()
  })

  it('mantiene nueva versión para un documento ordinario autorizado y unifica las fechas del detalle', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    renderOwnerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }))
    const dialog = screen.getByRole('dialog', { name: 'Detalle del documento' })
    expect(within(dialog).getByRole('button', { name: 'Cargar nueva versión' })).toBeInTheDocument()
    expect(within(dialog).getByText('Fecha de carga')).toBeInTheDocument()
    expect(within(dialog).getByText('Fecha de revisión')).toBeInTheDocument()
    expect(within(dialog).getByText('Pendiente')).toBeInTheDocument()
    expect(within(dialog).queryByText('Fecha de subida')).not.toBeInTheDocument()
  })

  it('restringe al estudiante el versionado de la hoja de observaciones sin quitar consulta ni descarga', async () => {
    const observationDocument = {
      id: 91, postulacion: 7, evento_defensa: 83, tipo_documento: 99,
      tipo_documento_codigo: 'OBSERVACIONES_DEFENSA_PERFIL', tipo_documento_nombre: 'Hoja de observaciones de Defensa de Perfil',
      estado_codigo: 'ENV', estado_nombre: 'Enviado', fecha_subida: '2026-06-02T10:00:00Z', fecha_revision: null,
      requiere_correccion: false, versiones: [{ id: 902 }],
    }
    const observationVersion = { id: 902, numero_version: 1, nombre_original: 'observaciones-perfil.pdf', fecha_subida: '2026-06-02T10:00:00Z', es_version_actual: true, activo: true }
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDocumentos.mockResolvedValue({ count: 1, next: null, previous: null, results: [observationDocument] })
    postulacionesService.obtenerVersiones.mockResolvedValue({ count: 1, next: null, previous: null, results: [observationVersion] })
    postulacionesService.descargarVersion.mockResolvedValue({ blob: new Blob(['pdf']), filename: 'observaciones-perfil.pdf' })
    renderOwnerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }))
    const dialog = screen.getByRole('dialog', { name: 'Detalle del documento' })
    expect(await within(dialog).findByText('Versión 1')).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Cargar nueva versión' })).not.toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Ver observaciones' }))
    expect(await within(dialog).findByText('Corregir portada')).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Descargar' }))
    expect(postulacionesService.descargarVersion).toHaveBeenCalledWith(902, 'observaciones-perfil.pdf')
    expect(postulacionesService.cargarDocumento).not.toHaveBeenCalled()
  })

  it('conserva el versionado administrativo de la hoja con su evento de Defensa de Perfil', async () => {
    const observationDocument = {
      id: 91, postulacion: 7, evento_defensa: 83, tipo_documento: 99,
      tipo_documento_codigo: 'OBSERVACIONES_DEFENSA_PERFIL', tipo_documento_nombre: 'Hoja de observaciones de Defensa de Perfil',
      estado_codigo: 'ENV', estado_nombre: 'Enviado', fecha_subida: '2026-06-02T10:00:00Z', fecha_revision: null,
      requiere_correccion: false, versiones: [{ id: 902 }],
    }
    const file = new File(['%PDF-1.4'], 'observaciones-v2.pdf', { type: 'application/pdf' })
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDocumentos.mockResolvedValue({ count: 1, next: null, previous: null, results: [observationDocument] })
    postulacionesService.obtenerDocumentosAplicables.mockResolvedValue({ documentos_aplicables: [{ id: 99, codigo: 'OBSERVACIONES_DEFENSA_PERFIL', capacidad_carga: { permitida: true } }] })
    renderDefenseDocumentsAdminPage('documentos')

    await userEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }))
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Detalle del documento' })).getByRole('button', { name: 'Cargar nueva versión' }))
    const upload = screen.getByRole('dialog', { name: 'Cargar nueva versión' })
    await userEvent.upload(within(upload).getByLabelText('Archivo'), file)
    await userEvent.click(within(upload).getByRole('button', { name: 'Cargar nueva versión' }))

    await waitFor(() => expect(postulacionesService.cargarDocumento).toHaveBeenCalledWith({ postulacionId: 7, tipoDocumentoId: 99, archivo: file, eventoDefensaId: 83 }, expect.any(AbortSignal)))
  })

  it('abre detalle, pagina versiones y consulta observaciones por versión exacta', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerVersiones
      .mockResolvedValueOnce({ ...versionsResponse, count: 21, next: 'page=2' })
      .mockResolvedValueOnce({ count: 21, next: null, previous: 'page=1', results: [versionsResponse.results[1]] })
    renderPage('documentos')
    await userEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }))
    const dialog = screen.getByRole('dialog', { name: 'Detalle del documento' })
    expect(dialog).toBeInTheDocument()
    expect(await screen.findByText('Versión 1')).toBeInTheDocument()
    expect(screen.getByText('Versión 2')).toBeInTheDocument()
    expect(screen.getByText('Versión actual')).toBeInTheDocument()
    expect(screen.getByText('informe-largo.pdf')).toBeInTheDocument()
    expect(screen.getByText('2.0 KB')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Ver', exact: true })).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: 'Descargar' })).toHaveLength(2)
    expect(postulacionesService.obtenerVersiones).toHaveBeenCalledWith(31, 1, expect.any(AbortSignal))
    await userEvent.click(screen.getAllByRole('button', { name: 'Ver observaciones' })[0])
    expect(await screen.findByText('Corregir portada')).toBeInTheDocument()
    expect(screen.getAllByText('Pendiente').length).toBeGreaterThan(0)
    expect(screen.getByText('Corregida')).toBeInTheDocument()
    expect(postulacionesService.obtenerObservaciones).toHaveBeenCalledWith(301, 1, expect.any(AbortSignal))
    await userEvent.click(within(dialog).getAllByRole('button', { name: 'Siguiente' }).find((button) => !button.disabled))
    await waitFor(() => expect(postulacionesService.obtenerVersiones).toHaveBeenLastCalledWith(31, 2, expect.any(AbortSignal)))
    await userEvent.click(screen.getAllByRole('button', { name: 'Cerrar' }).at(-1))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('descarga una versión mediante el endpoint protegido', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    const createObjectURL = vi.fn(() => 'blob:documento')
    const revokeObjectURL = vi.fn()
    definePropertyForTest(URL, 'createObjectURL', { configurable: true, value: createObjectURL })
    definePropertyForTest(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    renderPage('documentos')
    await userEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }))

    await userEvent.click((await screen.findAllByRole('button', { name: 'Descargar' }))[1])

    await waitFor(() => expect(postulacionesService.descargarVersion).toHaveBeenCalledWith(302, 'informe-final.pdf'))
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
    expect(click).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:documento')
  })

  it('abre la versión seleccionada en una pestaña nueva usando el blob autenticado', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    const blob = new Blob(['%PDF-1.4'], { type: 'application/pdf' })
    const deferredDownload = deferred()
    postulacionesService.descargarVersion.mockReturnValue(deferredDownload.promise)
    let cleanupPreview
    const previewWindow = {
      closed: false,
      opener: window,
      location: { replace: vi.fn() },
      close: vi.fn(),
    }
    const open = vi.spyOn(window, 'open').mockReturnValue(previewWindow)
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview')
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const setInterval = vi.spyOn(window, 'setInterval').mockImplementation((callback) => {
      cleanupPreview = callback
      return 41
    })
    const clearInterval = vi.spyOn(window, 'clearInterval').mockImplementation(() => {})
    renderPage('documentos')
    await userEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }))

    await userEvent.click((await screen.findAllByRole('button', { name: 'Ver', exact: true }))[1])

    expect(open).toHaveBeenCalledWith('about:blank', '_blank')
    expect(previewWindow.opener).toBeNull()
    expect(postulacionesService.descargarVersion).toHaveBeenCalledWith(302, 'informe-final.pdf')
    expect(createObjectURL).not.toHaveBeenCalled()
    await act(async () => deferredDownload.resolve({ blob, filename: 'informe-final.pdf' }))

    expect(createObjectURL).toHaveBeenCalledWith(blob)
    expect(previewWindow.location.replace).toHaveBeenCalledWith('blob:preview')
    expect(revokeObjectURL).not.toHaveBeenCalled()
    previewWindow.closed = true
    act(() => cleanupPreview())
    expect(clearInterval).toHaveBeenCalledWith(41)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:preview')
    open.mockRestore()
    createObjectURL.mockRestore()
    revokeObjectURL.mockRestore()
    setInterval.mockRestore()
    clearInterval.mockRestore()
  })

  it('cierra la pestaña reservada y muestra el error si falla la vista previa', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.descargarVersion.mockRejectedValue({ status: 403, message: 'No tienes autorización para descargar este archivo.' })
    const previewWindow = {
      closed: false,
      opener: window,
      location: { replace: vi.fn() },
      close: vi.fn(function close() { this.closed = true }),
    }
    const open = vi.spyOn(window, 'open').mockReturnValue(previewWindow)
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview')
    renderPage('documentos')
    await userEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }))

    await userEvent.click((await screen.findAllByRole('button', { name: 'Ver', exact: true }))[0])

    expect(await screen.findByRole('alert')).toHaveTextContent('No tienes autorización para descargar este archivo.')
    expect(postulacionesService.descargarVersion).toHaveBeenCalledWith(301, 'informe-largo.pdf')
    expect(previewWindow.close).toHaveBeenCalledOnce()
    expect(previewWindow.location.replace).not.toHaveBeenCalled()
    expect(createObjectURL).not.toHaveBeenCalled()
    open.mockRestore()
    createObjectURL.mockRestore()
  })

  it('muestra un error limpio cuando falla la descarga', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.descargarVersion.mockRejectedValue({ status: 404, message: 'El archivo solicitado no está disponible.' })
    renderPage('documentos')
    fireEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }))

    fireEvent.click((await screen.findAllByRole('button', { name: 'Descargar' }))[0])

    expect(await screen.findByRole('alert')).toHaveTextContent('El archivo solicitado no está disponible.')
  })

  it('muestra documentos y observaciones vacíos con lenguaje neutral', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDocumentos.mockResolvedValue({ count: 0, next: null, previous: null, results: [] })
    renderPage('documentos')
    expect(await screen.findByText('No se registraron documentos.')).toBeInTheDocument()
    expect(screen.getByText(/Ana P/)).toBeInTheDocument()
  })

  it('muestra versiones vacías, incluidos campos opcionales ausentes', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerVersiones.mockResolvedValue({ count: 0, next: null, previous: null, results: [] })
    renderPage('documentos')
    await userEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }))
    expect(await screen.findByText('No se registraron versiones.')).toBeInTheDocument()
    expect(screen.getAllByText('No registrada').length).toBeGreaterThan(0)
  })

  it('muestra el estado vacío de observaciones para la versión exacta', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerObservaciones.mockResolvedValue({ count: 0, next: null, previous: null, results: [] })
    renderPage('documentos')
    await userEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }))
    await userEvent.click((await screen.findAllByRole('button', { name: 'Ver observaciones' }))[0])
    expect(await screen.findByText('Sin observaciones registradas.')).toBeInTheDocument()
    expect(postulacionesService.obtenerObservaciones).toHaveBeenCalledWith(301, 1, expect.any(AbortSignal))
  })

  it('cancela versiones al cerrar el detalle y observaciones al cambiar de versión', async () => {
    const versionSignals = []
    const observationSignals = []
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerVersiones.mockImplementation((_id, _page, signal) => {
      versionSignals.push(signal)
      return versionSignals.length === 1 ? new Promise(() => {}) : Promise.resolve(versionsResponse)
    })
    postulacionesService.obtenerObservaciones.mockImplementation((_id, _page, signal) => {
      observationSignals.push(signal)
      return new Promise(() => {})
    })
    renderPage('documentos')
    fireEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }))
    await waitFor(() => expect(versionSignals).toHaveLength(1))
    const detailDialog = screen.getByRole('dialog', { name: 'Detalle del documento' })
    fireEvent.click(within(detailDialog).getByRole('button', { name: 'Cerrar' }))
    expect(versionSignals[0].aborted).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Ver detalle' }))
    fireEvent.click((await screen.findAllByRole('button', { name: 'Ver observaciones' }))[0])
    await waitFor(() => expect(observationSignals).toHaveLength(1))
    fireEvent.click(screen.getAllByRole('button', { name: 'Ver observaciones' })[1])
    await waitFor(() => expect(observationSignals).toHaveLength(2))
    expect(observationSignals[0].aborted).toBe(true)
  })

  it.each([
    ['Debes iniciar sesión para consultar los documentos.', 401],
    ['Los documentos no disponibles.', 404],
    ['No se pudieron cargar los documentos. Intenta nuevamente.', undefined],
  ])('mantiene expediente ante error documental parcial %s y reintenta', async (message, status) => {
    const user = userEvent.setup()
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDocumentos.mockRejectedValueOnce({ status, message }).mockResolvedValueOnce(documentsResponse)
    renderPage('documentos')
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(screen.getByText(/Ana P/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reintentar documentos' }))
    expect(await screen.findByText(/Informe final/)).toBeInTheDocument()
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['staff con rol no reconocido localmente', { id: 9, is_staff: true, rol: { codigo: 'ADMIN-API' } }],
    ['superusuario sin código de rol', { id: 10, is_superuser: true, rol: null }],
  ])('muestra Cargar documento a un %s autorizado por capacidades', async (_label, user) => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    const auth = { user, roleCode: user.rol?.codigo || '', hasPermission: (name) => name === 'puede_cargar_documentos' }
    selectInitialTab('documentos')
    render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)

    expect(await screen.findByRole('button', { name: 'Cargar documento' })).toBeVisible()
  })

  it('oculta Cargar documento a un usuario sin la capacidad backend', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    const auth = { user: { id: 3, rol: { codigo: 'EST' } }, roleCode: 'EST', hasPermission: () => false }
    render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)
    await screen.findByText(/Ana P/)

    expect(screen.queryByRole('button', { name: 'Cargar documento' })).not.toBeInTheDocument()
  })

  it('mantiene Cargar documento para el propietario autorizado', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    renderOwnerPage()

    expect(await screen.findByRole('button', { name: 'Cargar documento' })).toBeVisible()
  })

  it('mantiene el cargador genérico estable cuando no hay documentos aplicables', async () => {
    const user = userEvent.setup()
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDocumentosAplicables.mockResolvedValue({ documentos_aplicables: [] })
    renderOwnerPage()

    await user.click(await screen.findByRole('button', { name: 'Cargar documento' }))
    const dialog = await screen.findByRole('dialog', { name: 'Cargar documentos' })
    expect(within(dialog).getByText('No hay tipos documentales activos disponibles.')).toBeVisible()
    expect(within(dialog).queryByRole('button', { name: 'Cargar 0 documentos' })).not.toBeInTheDocument()
    expect(dialog.querySelectorAll('input[type="file"]')).toHaveLength(0)
  })

  it('ofrece carga corregible y presenta aprobados y pendientes de revisión sin selectores', async () => {
    postulacionesService.obtenerDocumentosAplicables.mockResolvedValue({ documentos_aplicables: [
      { id: 41, codigo: 'CARTA_SOLICITUD', nombre: 'Carta de Solicitud', capacidad_carga: { permitida: true, codigo: 'SIN_DOCUMENTO' } },
      { id: 42, codigo: 'MATRICULA_VIGENTE', nombre: 'Matrícula Vigente', capacidad_carga: { permitida: true, codigo: 'RECHAZADO' } },
      { id: 43, codigo: 'HISTORIAL', nombre: 'Historial académico', capacidad_carga: { permitida: true, codigo: 'CORRECCION_REQUERIDA' } },
      { id: 44, codigo: 'INFORME', nombre: 'Informe enviado', capacidad_carga: { permitida: true, codigo: 'ESPERANDO_REVISION' } },
      { id: 45, codigo: 'ACTA', nombre: 'Acta aprobada', capacidad_carga: { permitida: true, codigo: 'DOCUMENTO_APROBADO' } },
      { id: 46, codigo: 'RESERVADO', nombre: 'Documento reservado', capacidad_carga: { permitida: false, codigo: 'ACTOR_CARGA_NO_AUTORIZADO', mensaje: 'Carga reservada a administración.' } },
    ] })
    renderOwnerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Cargar documento' }))

    expect(await screen.findByLabelText('Carta de Solicitud')).toBeInTheDocument()
    expect(screen.getByLabelText('Matrícula Vigente')).toBeInTheDocument()
    expect(screen.getByLabelText('Historial académico')).toBeInTheDocument()
    expect(screen.getByText(/Pendientes de revisión/)).toBeInTheDocument()
    expect(screen.getByText(/Informe enviado.*No necesitas volver a cargarlo/)).toBeInTheDocument()
    expect(screen.getByText('Aprobados (1)')).toBeInTheDocument()
    expect(screen.getByText('Acta aprobada')).toBeInTheDocument()
    expect(screen.getByText(/Documento reservado.*Carga reservada a administración/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Informe enviado')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Acta aprobada')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Documento reservado')).not.toBeInTheDocument()
  })

  it('no ofrece selector ni botón de carga cuando solo hay documentos en revisión o aprobados', async () => {
    postulacionesService.obtenerDocumentosAplicables.mockResolvedValue({ documentos_aplicables: [
      { id: 48, codigo: 'INFORME', nombre: 'Informe en revisión', capacidad_carga: { permitida: true, codigo: 'ESPERANDO_REVISION' } },
      { id: 49, codigo: 'ACTA', nombre: 'Acta aprobada', capacidad_carga: { permitida: false, codigo: 'DOCUMENTO_APROBADO' } },
    ] })
    renderOwnerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Cargar documento' }))
    const dialog = await screen.findByRole('dialog', { name: 'Cargar documentos' })

    expect(within(dialog).getByText('No hay documentos pendientes de carga o corrección permitida.')).toBeInTheDocument()
    expect(within(dialog).getByText(/Informe en revisión.*No necesitas volver a cargarlo/)).toBeInTheDocument()
    expect(within(dialog).getByText('Aprobados (1)')).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Cargar 0 documentos' })).not.toBeInTheDocument()
    expect(dialog.querySelectorAll('input[type="file"]')).toHaveLength(0)
  })

  it('carga juntos la carta de Tribunal y el Perfil académico en PERFIL_PROYECTO', async () => {
    const contracts = profileContracts()
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.obtenerDocumentosAplicables.mockResolvedValue({ documentos_aplicables: [
      { id: 61, codigo: 'CARTA_SOLICITUD_TRIBUNAL_PROYECTO', nombre: 'Carta de solicitud de asignación de Tribunal', capacidad_carga: { permitida: true } },
      { id: 62, codigo: 'PERFIL_ACADEMICO_PROYECTO', nombre: 'Perfil académico del Proyecto de Grado', capacidad_carga: { permitida: true } },
      { id: 63, codigo: 'MEMORANDUM_DESIGNACION_PROYECTO', nombre: 'Memorándum oficial', capacidad_carga: { permitida: true } },
    ] })
    renderOwnerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Cargar documento' }))
    const dialog = await screen.findByRole('dialog', { name: 'Cargar documentos' })
    const carta = new File(['%PDF-1.4'], 'carta.pdf', { type: 'application/pdf' })
    const perfil = new File(['perfil'], 'perfil.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
    await userEvent.upload(within(dialog).getByLabelText('Carta de solicitud de asignación de Tribunal'), carta)
    await userEvent.upload(within(dialog).getByLabelText('Perfil académico del Proyecto de Grado'), perfil)
    expect(within(dialog).queryByLabelText('Memorándum oficial')).not.toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cargar 2 documentos' }))

    await waitFor(() => expect(postulacionesService.cargarDocumento).toHaveBeenCalledTimes(2))
    expect(postulacionesService.cargarDocumento).toHaveBeenNthCalledWith(1,
      { postulacionId: 7, tipoDocumentoId: 61, archivo: carta, eventoDefensaId: undefined }, expect.any(AbortSignal))
    expect(postulacionesService.cargarDocumento).toHaveBeenNthCalledWith(2,
      { postulacionId: 7, tipoDocumentoId: 62, archivo: perfil, eventoDefensaId: undefined }, expect.any(AbortSignal))
  })

  it('refresca documentos aplicables tras una carga individual en el modal múltiple', async () => {
    const contracts = profileContracts()
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    const carta = {
      id: 61,
      codigo: 'CARTA_SOLICITUD_TRIBUNAL_PROYECTO',
      nombre: 'Carta de solicitud de asignación de Tribunal',
      capacidad_carga: { permitida: true, codigo: 'SIN_DOCUMENTO' },
    }
    const perfil = {
      id: 62,
      codigo: 'PERFIL_ACADEMICO_PROYECTO',
      nombre: 'Perfil académico del Proyecto de Grado',
      capacidad_carga: { permitida: true, codigo: 'SIN_DOCUMENTO' },
    }
    postulacionesService.obtenerDocumentosAplicables
      .mockResolvedValueOnce({ documentos_aplicables: [carta, perfil] })
      .mockResolvedValueOnce({
        documentos_aplicables: [
          { ...carta, capacidad_carga: { permitida: false, codigo: 'DOCUMENTO_APROBADO' } },
          { ...perfil, capacidad_carga: { permitida: false, codigo: 'ESPERANDO_REVISION' } },
        ],
      })
    renderOwnerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Cargar documento' }))
    const dialog = await screen.findByRole('dialog', { name: 'Cargar documentos' })
    await userEvent.upload(
      within(dialog).getByLabelText(carta.nombre),
      new File(['carta'], 'carta.pdf', { type: 'application/pdf' }),
    )
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cargar 1 documento' }))

    expect(postulacionesService.obtenerDocumentosAplicables).toHaveBeenCalledTimes(2)
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Cargar documentos' })).not.toBeInTheDocument())
    expect(screen.getByRole('tab', { name: 'Resumen' })).toHaveAttribute('aria-selected', 'true')
    expect(window.location.hash).toBe('#resumen')
  })

  it('actualiza capacidades tras una carga parcial y conserva para reintento el documento rechazado', async () => {
    const contracts = profileContracts()
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    const carta = {
      id: 61,
      codigo: 'CARTA_SOLICITUD_TRIBUNAL_PROYECTO',
      nombre: 'Carta de solicitud de asignación de Tribunal',
      capacidad_carga: { permitida: true, codigo: 'SIN_DOCUMENTO' },
    }
    const perfil = {
      id: 62,
      codigo: 'PERFIL_ACADEMICO_PROYECTO',
      nombre: 'Perfil académico del Proyecto de Grado',
      capacidad_carga: { permitida: true, codigo: 'SIN_DOCUMENTO' },
    }
    postulacionesService.obtenerDocumentosAplicables
      .mockResolvedValueOnce({ documentos_aplicables: [carta, perfil] })
      .mockResolvedValueOnce({
        documentos_aplicables: [
          { ...carta, capacidad_carga: { permitida: false, codigo: 'DOCUMENTO_APROBADO' } },
          { ...perfil, capacidad_carga: { permitida: true, codigo: 'RECHAZADO' } },
        ],
      })
    postulacionesService.cargarDocumento
      .mockResolvedValueOnce({ id: 1 })
      .mockRejectedValueOnce({ message: 'No se pudo guardar el perfil.' })
    renderOwnerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Cargar documento' }))
    const dialog = await screen.findByRole('dialog', { name: 'Cargar documentos' })
    const cartaFile = new File(['carta'], 'carta.pdf', { type: 'application/pdf' })
    const perfilFile = new File(['perfil'], 'perfil.pdf', { type: 'application/pdf' })
    await userEvent.upload(within(dialog).getByLabelText(carta.nombre), cartaFile)
    await userEvent.upload(within(dialog).getByLabelText(perfil.nombre), perfilFile)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cargar 2 documentos' }))

    expect(await within(dialog).findByText('1 documento cargado. 1 documento no pudo cargarse.')).toBeInTheDocument()
    expect(postulacionesService.obtenerDocumentosAplicables).toHaveBeenCalledTimes(2)
    expect(within(dialog).queryByLabelText(carta.nombre)).not.toBeInTheDocument()
    expect(within(dialog).getByLabelText(perfil.nombre)).toBeInTheDocument()
    expect(within(dialog).getByText(perfilFile.name)).toBeInTheDocument()
    expect(within(dialog).getByText('No se pudo guardar el perfil.')).toBeInTheDocument()
  })

  it('carga un documento inicial con postulación contextual y tipo por nombre', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    renderOwnerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Cargar documento' }))
    expect(await screen.findByLabelText('Informe final')).toBeInTheDocument()
    const file = new File(['%PDF-1.4'], 'informe.pdf', { type: 'application/pdf' })
    await userEvent.upload(screen.getByLabelText('Informe final'), file)
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cargar 1 documento' }))
    await waitFor(() => expect(postulacionesService.cargarDocumento).toHaveBeenCalledWith(
      { postulacionId: 7, tipoDocumentoId: 4, archivo: file, eventoDefensaId: undefined }, expect.any(AbortSignal),
    ))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Cargar documentos' })).not.toBeInTheDocument())
    expect(screen.getByRole('tab', { name: 'Resumen' })).toHaveAttribute('aria-selected', 'true')
    expect(window.location.hash).toBe('#resumen')
    expect(postulacionesService.obtenerDocumentos).toHaveBeenCalledTimes(2)
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2)
  })

  it('carga un ACTA_DEFENSA vinculada a una Defensa Pública finalizada', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDefensas.mockResolvedValue({
      ...defensesResponse,
      results: [defenseRows[0], { ...defenseRows[1], id: 86, tipo_evento: 'DEFENSA_PUBLICA', estado: 'PROGRAMADA' }],
    })
    renderOwnerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Cargar documento' }))
    const defenseSelect = await screen.findByLabelText('Defensa Pública finalizada')
    expect(defenseSelect).toBeRequired()
    expect([...defenseSelect.options].map((option) => option.value)).toEqual(['', '81'])
    const file = new File(['%PDF-1.4'], 'acta.pdf', { type: 'application/pdf' })
    await userEvent.upload(screen.getByLabelText('Acta de Defensa'), file)
    await userEvent.selectOptions(defenseSelect, '81')
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cargar 1 documento' }))
    await waitFor(() => expect(postulacionesService.cargarDocumento).toHaveBeenCalledWith(
      { postulacionId: 7, tipoDocumentoId: 5, archivo: file, eventoDefensaId: '81' }, expect.any(AbortSignal),
    ))
  })

  it('carga ACTA_DEFENSA_TD solo con la Defensa Pública del intento aprobado vigente', async () => {
    const currentStage = { id: 502, codigo: 'DEFENSA_PUBLICA', estado: 'APROBADA', numero_intento: 2, activo: true }
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: {
        ...response.detalle,
        modalidad_detalle: { id: 8, codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido' },
      },
      flujo: {
        ...response.flujo,
        modalidad: { id: 8, codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido' },
        etapa_actual: { id: 503, codigo: 'CIERRE_DOCUMENTAL', estado: 'EN_PROCESO', numero_intento: 1, activo: true },
        etapas: [
          { id: 501, codigo: 'DEFENSA_PUBLICA', estado: 'RECHAZADA', numero_intento: 1, activo: true },
          currentStage,
        ],
      },
    })
    postulacionesService.obtenerDocumentosAplicables.mockResolvedValue({ documentos_aplicables: [
      { id: 95, codigo: 'ACTA_DEFENSA_TD', nombre: 'Acta de Defensa TD', capacidad_carga: { permitida: true } },
    ] })
    postulacionesService.obtenerDefensas.mockResolvedValue({
      count: 2, next: null, previous: null,
      results: [
        { ...defenseRows[0], id: 181, seguimiento_etapa: 501, numero_intento: 1 },
        { ...defenseRows[0], id: 182, seguimiento_etapa: currentStage.id, numero_intento: currentStage.numero_intento },
      ],
    })

    renderOwnerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Cargar documento' }))
    const defenseSelect = await screen.findByLabelText('Defensa Pública finalizada')
    expect([...defenseSelect.options].map((option) => option.value)).toEqual(['', '182'])

    const file = new File(['%PDF-1.4'], 'acta-td.pdf', { type: 'application/pdf' })
    await userEvent.upload(screen.getByLabelText('Acta de Defensa TD'), file)
    expect(defenseSelect).toHaveValue('182')
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cargar 1 documento' }))

    await waitFor(() => expect(postulacionesService.cargarDocumento).toHaveBeenCalledWith(
      { postulacionId: 7, tipoDocumentoId: 95, archivo: file, eventoDefensaId: '182' }, expect.any(AbortSignal),
    ))
  })

  it('bloquea ACTA_DEFENSA sin evento incluso ante un submit directo', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDefensas.mockResolvedValue({
      count: 2, next: null, previous: null,
      results: [defenseRows[0], { ...defenseRows[0], id: 87, numero_intento: 2 }],
    })
    renderOwnerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Cargar documento' }))
    const selector = await screen.findByLabelText('Defensa Pública finalizada')
    expect(selector).toHaveValue('')
    const file = new File(['%PDF-1.4'], 'acta.pdf', { type: 'application/pdf' })
    await userEvent.upload(screen.getByLabelText('Acta de Defensa'), file)
    fireEvent.submit(selector.closest('form'))

    expect(await screen.findByText('Selecciona la Defensa Pública finalizada.')).toBeVisible()
    expect(postulacionesService.cargarDocumento).not.toHaveBeenCalled()
  })

  it('muestra ausencia de candidatas y no permite enviar el Acta', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 0, next: null, previous: null, results: [] })
    renderOwnerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Cargar documento' }))
    expect(await screen.findByText('No existen Defensas Públicas finalizadas disponibles para vincular el Acta de Defensa.')).toBeVisible()
    await userEvent.upload(screen.getByLabelText('Acta de Defensa'), new File(['acta'], 'acta.pdf', { type: 'application/pdf' }))
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cargar 1 documento' })).toBeDisabled()
    expect(postulacionesService.cargarDocumento).not.toHaveBeenCalled()
  })

  it('muestra el error de consulta de candidatas y bloquea el Acta', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDefensas
      .mockResolvedValueOnce(defensesResponse)
      .mockRejectedValueOnce({ message: 'No se pudieron consultar las Defensas Públicas.' })
    renderOwnerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Cargar documento' }))
    const dialog = screen.getByRole('dialog')

    expect(await within(dialog).findByText('No se pudieron consultar las Defensas Públicas.')).toBeVisible()
    await userEvent.upload(within(dialog).getByLabelText('Acta de Defensa'), new File(['acta'], 'acta.pdf', { type: 'application/pdf' }))
    expect(within(dialog).getByRole('button', { name: 'Cargar 1 documento' })).toBeDisabled()
    expect(postulacionesService.cargarDocumento).not.toHaveBeenCalled()
  })

  it('limpia el evento al cambiar de postulación', async () => {
    postulacionesService.obtenerExpediente.mockImplementation((id) => Promise.resolve({ ...response, detalle: { ...response.detalle, id: Number(id), codigo: `EXP-${id}` } }))
    postulacionesService.obtenerDefensas.mockImplementation((id) => Promise.resolve({
      count: String(id) === '7' ? 2 : 1, next: null, previous: null,
      results: String(id) === '7' ? [defenseRows[0], { ...defenseRows[0], id: 87 }] : [{ ...defenseRows[0], id: 181 }],
    }))
    const auth = { user: { id: 3, rol: { codigo: 'EST' } }, roleCode: 'EST', hasPermission: (name) => name === 'puede_cargar_documentos' }
    selectInitialTab('documentos')
    render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<><ExpedientePage /><Link to="/postulaciones/8">Cambiar postulación</Link></>} /></Routes></MemoryRouter></AuthContext.Provider>)
    await userEvent.click(await screen.findByRole('button', { name: 'Cargar documento' }))
    const firstSelector = await screen.findByLabelText('Defensa Pública finalizada')
    await userEvent.selectOptions(firstSelector, '81')
    await userEvent.click(screen.getByRole('link', { name: 'Cambiar postulación' }))
    // El código de la postulación ya no se muestra: se espera la carga de las defensas de la nueva.
    await waitFor(() => expect(postulacionesService.obtenerDefensas.mock.calls.some(([postulacion]) => String(postulacion) === '8')).toBe(true))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Cargar documento' }))
    expect(await screen.findByLabelText('Defensa Pública finalizada')).toHaveValue('181')
  })

  it('conserva documentos ordinarios sin evento aunque ACTA_DEFENSA también sea aplicable', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, next: null, previous: null, results: [defenseRows[0]] })
    renderOwnerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Cargar documento' }))
    expect(await screen.findByLabelText('Defensa Pública finalizada')).toHaveValue('81')
    const file = new File(['%PDF-1.4'], 'informe.pdf', { type: 'application/pdf' })
    await userEvent.upload(screen.getByLabelText('Informe final'), file)
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cargar 1 documento' }))

    await waitFor(() => expect(postulacionesService.cargarDocumento).toHaveBeenCalledWith(
      { postulacionId: 7, tipoDocumentoId: 4, archivo: file, eventoDefensaId: undefined }, expect.any(AbortSignal),
    ))
  })

  it('carga una nueva versión derivando postulación y tipo del detalle', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDocumentos.mockResolvedValue({
      ...documentsResponse,
      results: [{ ...documentsResponse.results[0], tipo_documento_nombre: 'Documento Final' }],
    })
    renderOwnerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cargar nueva versión' }))
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(screen.getByRole('dialog', { name: 'Cargar nueva versión' })).toBeInTheDocument()
    expect(within(screen.getByRole('dialog', { name: 'Cargar nueva versión' })).getByText('Documento Final')).toBeInTheDocument()
    expect(screen.getByLabelText('Archivo')).toBeVisible()
    expect(screen.queryByRole('dialog', { name: 'Detalle del documento' })).not.toBeInTheDocument()
    const file = new File(['%PDF-1.4'], 'informe-v3.pdf', { type: 'application/pdf' })
    await userEvent.upload(screen.getByLabelText('Archivo'), file)
    fireEvent.submit(screen.getByLabelText('Archivo').closest('form'))
    await waitFor(() => expect(postulacionesService.cargarDocumento).toHaveBeenCalledWith(
      { postulacionId: 7, tipoDocumentoId: 4, archivo: file }, expect.any(AbortSignal),
    ))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Cargar nueva versión' })).not.toBeInTheDocument())
    expect(screen.queryByRole('dialog', { name: 'Detalle del documento' })).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Resumen' })).toHaveAttribute('aria-selected', 'true')
    expect(window.location.hash).toBe('#resumen')
  })

  it('muestra revisión solo con capacidad y aprueba el documento seleccionado', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    renderReviewerPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }))
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar documento' }))
    expect(screen.getByText(/Confirma la aprobación técnica/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/Comentario/), { target: { value: 'Revisado' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    await waitFor(() => expect(postulacionesService.aprobarDocumento).toHaveBeenCalledWith(31, 'Revisado', expect.any(AbortSignal)))
    await waitFor(() => expect(postulacionesService.obtenerDocumentos).toHaveBeenCalledTimes(2))
  })

  it('muestra loading de versiones solo durante la carga inicial', async () => {
    let resolveVersions
    postulacionesService.obtenerVersiones.mockImplementation(() => new Promise((resolve) => { resolveVersions = resolve }))
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    renderReviewerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }))
    expect(await screen.findByText('Cargando versiones…')).toBeInTheDocument()
    resolveVersions(versionsResponse)
    expect(await screen.findByText('Versión 2')).toBeInTheDocument()
  })

  it('conserva el detalle y versiones visibles durante el refetch posterior a aprobar', async () => {
    let resolveRefreshVersions
    postulacionesService.obtenerVersiones
      .mockResolvedValueOnce(versionsResponse)
      .mockImplementation(() => new Promise((resolve) => { resolveRefreshVersions = resolve }))
    postulacionesService.obtenerDocumentos
      .mockResolvedValueOnce(documentsResponse)
      .mockResolvedValueOnce({
        ...documentsResponse,
        results: [{ ...documentsResponse.results[0], estado_codigo: 'APR', estado_nombre: 'Aprobado', fecha_revision: '2026-02-05T10:00:00Z' }],
      })
    postulacionesService.aprobarDocumento.mockResolvedValue({ id: 31, estado_codigo: 'APR' })
    renderReviewerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }))
    expect(await screen.findByText('Versión 2')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Aprobar documento' }))
    await userEvent.type(screen.getByLabelText(/Comentario/), 'Revisado')
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }))

    await waitFor(() => expect(postulacionesService.aprobarDocumento).toHaveBeenCalledWith(31, 'Revisado', expect.any(AbortSignal)))
    expect(screen.queryByRole('dialog', { name: 'Aprobar documento' })).not.toBeInTheDocument()
    await waitFor(() => expect(postulacionesService.obtenerVersiones.mock.calls.length).toBeGreaterThanOrEqual(2))
    expect(screen.getByRole('dialog', { name: 'Detalle del documento' })).toBeInTheDocument()
    expect(screen.getByText('Versión 2')).toBeInTheDocument()

    resolveRefreshVersions({
      ...versionsResponse,
      results: [...versionsResponse.results, { id: 303, numero_version: 3, fecha_subida: '2026-02-05T10:00:00Z', nombre_original: 'informe-v3.pdf', tamano_bytes: 4096, subido_por_nombre: 'Ana Pérez', es_version_actual: true, archivo: '/media/documentos/versiones/informe-v3.pdf' }],
    })
    expect(await screen.findByText('Versión 3')).toBeInTheDocument()
    expect(within(screen.getByRole('dialog', { name: 'Detalle del documento' })).getByText('Aprobado')).toBeInTheDocument()
  })

  it('observa el documento y marca una observación pendiente concreta como corregida', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    renderReviewerPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }))
    fireEvent.click(screen.getByRole('button', { name: 'Registrar observación' }))
    fireEvent.change(screen.getByLabelText('Comentario'), { target: { value: 'Ajustar portada' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    await waitFor(() => expect(postulacionesService.observarDocumento).toHaveBeenCalledWith(31, 'Ajustar portada', expect.any(AbortSignal)))
    fireEvent.click((await screen.findAllByRole('button', { name: 'Ver observaciones' }))[1])
    fireEvent.click(await screen.findByRole('button', { name: 'Marcar observación corregida' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    await waitFor(() => expect(postulacionesService.marcarObservacionCorregida).toHaveBeenCalledWith(401, expect.any(AbortSignal)))
  })

  it('oculta acciones de revisión al estudiante propietario', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    renderOwnerPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }))
    expect(screen.queryByRole('button', { name: 'Aprobar documento' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Rechazar documento' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Registrar observación' })).not.toBeInTheDocument()
  })

  it('oculta transiciones para un documento que no está en ENV', async () => {
    const user = userEvent.setup()
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDocumentos.mockResolvedValue({
      ...documentsResponse,
      results: [{ ...documentsResponse.results[0], estado_codigo: 'APR', estado_nombre: 'Aprobado' }],
    })
    renderReviewerPage()
    await user.click(await screen.findByRole('button', { name: 'Ver detalle' }))
    expect(screen.queryByRole('button', { name: 'Aprobar documento' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Rechazar documento' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Registrar observación' })).not.toBeInTheDocument()
  })

  it('bloquea doble revisión, muestra Procesando y cancela al cerrar', async () => {
    let signal
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.aprobarDocumento.mockImplementation((_id, _comment, receivedSignal) => {
      signal = receivedSignal
      return new Promise(() => {})
    })
    renderReviewerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }))
    await userEvent.click(screen.getByRole('button', { name: 'Aprobar documento' }))
    const confirm = screen.getByRole('button', { name: 'Confirmar' })
    await userEvent.click(confirm)
    expect(await screen.findByRole('button', { name: 'Procesando…' })).toBeDisabled()
    expect(postulacionesService.aprobarDocumento).toHaveBeenCalledTimes(1)
    await userEvent.click(screen.getAllByRole('button', { name: 'Cerrar' }).at(-1))
    expect(signal.aborted).toBe(true)
  })

  it('carga la ausencia de informes y muestra el registro solo con capacidad administrativa', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(tribunalResponse)
    postulacionesService.obtenerDocumentos.mockResolvedValue(tribunalDocuments)
    const managed = renderWorkflowManagerPage()
    await screen.findByRole('heading', { name: /Ana P/ })
    await waitFor(() => expect(screen.getByText('No existen informes registrados para esta etapa.')).toBeInTheDocument(), { timeout: 10000 })
    await userEvent.click(screen.getByRole('tab', { name: 'Resumen' }))
    expect(screen.getByRole('button', { name: 'Registrar informe del tribunal' })).toBeInTheDocument()
    expect(postulacionesService.obtenerInformesRevisionTribunal).toHaveBeenCalledWith(4, expect.any(AbortSignal))
    managed.unmount()

    renderOwnerPage('resumen')
    expect(await screen.findByText('Orientación del expediente')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Revisión de Tribunal Previa', level: 2 })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Registrar informe del tribunal' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Documentos' }))
    expect(await screen.findByRole('heading', { name: 'Revisión de Tribunal Previa' })).toBeInTheDocument()
  }, 15000)

  it('mantiene pendiente la consulta de informes antes de mostrar el estado vacío', async () => {
    let resolveReports
    postulacionesService.obtenerExpediente.mockResolvedValue(tribunalResponse)
    postulacionesService.obtenerDocumentos.mockResolvedValue(tribunalDocuments)
    postulacionesService.obtenerInformesRevisionTribunal.mockReturnValue(new Promise((resolve) => { resolveReports = resolve }))

    renderWorkflowManagerPage()

    expect(await screen.findByText('Cargando informes del tribunal…')).toBeInTheDocument()
    expect(screen.queryByText('No existen informes registrados para esta etapa.')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Registrar informe del tribunal' })).not.toBeInTheDocument()
    await waitFor(() => expect(postulacionesService.obtenerInformesRevisionTribunal).toHaveBeenCalledWith(4, expect.any(AbortSignal)))

    await act(async () => resolveReports([]))

    expect(await screen.findByText('No existen informes registrados para esta etapa.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Resumen' }))
    expect(screen.getByRole('button', { name: 'Registrar informe del tribunal' })).toBeInTheDocument()
  })

  it('exige observaciones para INSUFICIENTE y evita el doble envío', async () => {
    const user = userEvent.setup()
    let resolveRequest
    postulacionesService.registrarInformeRevisionTribunal.mockReturnValue(new Promise((resolve) => { resolveRequest = resolve }))
    postulacionesService.obtenerExpediente.mockResolvedValue(tribunalResponse)
    postulacionesService.obtenerDocumentos.mockResolvedValue(tribunalDocuments)
    renderWorkflowManagerPage()
    await user.click(await screen.findByRole('tab', { name: 'Resumen' }))
    await user.click(await screen.findByRole('button', { name: 'Registrar informe del tribunal' }))
    const dialog = screen.getByRole('dialog', { name: 'Registrar informe del tribunal' })
    await user.selectOptions(within(dialog).getByLabelText('Resultado'), 'INSUFICIENTE')
    await user.selectOptions(within(dialog).getByLabelText('Evidencia'), '602')
    const form = within(dialog).getByRole('button', { name: 'Registrar informe' }).closest('form')
    fireEvent.submit(form)
    expect(await within(dialog).findByText(/observaciones son obligatorias/i)).toBeInTheDocument()
    expect(postulacionesService.registrarInformeRevisionTribunal).not.toHaveBeenCalled()
    fireEvent.change(within(dialog).getByLabelText(/Observaciones/), { target: { value: 'Corregir resultados' } })
    fireEvent.submit(form)
    fireEvent.submit(form)
    expect(postulacionesService.registrarInformeRevisionTribunal).toHaveBeenCalledTimes(1)
    await act(async () => resolveRequest({ id: 9 }))
  })

  it('muestra historial ordenado y descarga la evidencia protegida', async () => {
    definePropertyForTest(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:tribunal') })
    definePropertyForTest(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    postulacionesService.obtenerExpediente.mockResolvedValue(tribunalResponse)
    postulacionesService.obtenerDocumentos.mockResolvedValue(tribunalDocuments)
    postulacionesService.obtenerInformesRevisionTribunal.mockResolvedValue(tribunalHistory)
    renderWorkflowManagerPage()
    await waitFor(() => expect(postulacionesService.obtenerInformesRevisionTribunal).toHaveBeenCalledWith(4, expect.any(AbortSignal)))
    const sufficient = await screen.findByRole('heading', { name: 'Suficiente' })
    const insufficient = screen.getByRole('heading', { name: 'Insuficiente' })
    expect(sufficient.compareDocumentPosition(insufficient) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByText('Versión conforme')).toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('button', { name: 'Descargar evidencia' })[0])
    await waitFor(() => expect(postulacionesService.descargarVersion).toHaveBeenCalledWith(602, 'informe-tribunal.pdf'))
    vi.restoreAllMocks()
  })

  it.each([
    [400, 'Revisa el resultado.', { resultado: ['Resultado inválido.'] }, 'Resultado inválido.'],
    [403, 'No tienes autorización para gestionar los informes del tribunal.', {}, null],
    [404, 'El seguimiento o informe solicitado ya no está disponible.', {}, null],
  ])('presenta errores %s del backend completos y por campo', async (status, message, fields, fieldText) => {
    postulacionesService.obtenerExpediente.mockResolvedValue(tribunalResponse)
    postulacionesService.obtenerDocumentos.mockResolvedValue(tribunalDocuments)
    postulacionesService.registrarInformeRevisionTribunal.mockRejectedValue({ status, message, fields })
    renderWorkflowManagerPage()
    await userEvent.click(await screen.findByRole('tab', { name: 'Resumen' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Registrar informe del tribunal' }))
    const dialog = screen.getByRole('dialog', { name: 'Registrar informe del tribunal' })
    fireEvent.change(within(dialog).getByLabelText('Resultado'), { target: { value: 'SUFICIENTE' } })
    fireEvent.change(within(dialog).getByLabelText('Evidencia'), { target: { value: '602' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Registrar informe' }))
    expect(await within(dialog).findByText(message)).toBeInTheDocument()
    if (fieldText) expect(within(dialog).getByText(fieldText)).toBeInTheDocument()
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: 'Aprobar Revisión de Tribunal Previa' })).not.toBeInTheDocument()
  })

  it('aprueba revisión final con confirmación y refresh canónico sin navegación final', async () => {
    const user = userEvent.setup()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const refreshed = { ...response, cierre: { data: { ...closureResponse, revision_final_aprobada: true, puede_aprobar_revision_final: false, puede_aprobar_cierre: true }, error: '' } }
    postulacionesService.obtenerExpediente.mockResolvedValueOnce(response).mockResolvedValueOnce(refreshed)
    window.history.replaceState(window.history.state, '', '#condiciones-tecnicas')
    renderClosureManagerPage()
    await user.click(await screen.findByRole('button', { name: 'Aprobar revisión final' }))
    await user.type(screen.getByLabelText('Observaciones'), 'Revisión técnica completa')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    await waitFor(() => expect(postulacionesService.aprobarRevisionFinal).toHaveBeenCalledWith(7, 'Revisión técnica completa', expect.any(AbortSignal)))
    expect(confirm).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('Aprobada')).toBeInTheDocument()
    expect(window.location.hash).toBe('#condiciones-tecnicas')
    confirm.mockRestore()
  })

  it('lista lo que pide la etapa con su estado cuando el paso es completar documentos', async () => {
    const stage = { id: 21, codigo: 'INSCRIPCION', nombre: 'Inscripción', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      flujo: {
        ...response.flujo,
        etapa_actual: stage,
        etapas: [stage],
        orientacion_etapa_actual: {
          mensaje: 'Completa los documentos requeridos para la etapa.',
          siguiente_accion: { codigo: 'COMPLETAR_DOCUMENTOS', titulo: 'Completar documentos', estado: 'PENDIENTE', destino: '#documentos' },
          requisitos: [
            { tipo: 'OPERATIVO', codigo: 'CARTA_SOLICITUD', nombre: 'Carta Solicitud', cumplido: false, estado: 'PENDIENTE' },
            { tipo: 'OPERATIVO', codigo: 'MATRICULA_VIGENTE', nombre: 'Matricula Vigente', cumplido: false, estado: 'PENDIENTE' },
            { tipo: 'OPERATIVO', codigo: 'HISTORIAL_PRERREQ', nombre: 'Historial Prerreq', cumplido: true, estado: 'CUMPLIDO' },
            { tipo: 'ACTOR', codigo: 'TUTOR', nombre: 'Tutor', cumplido: false, estado: 'PENDIENTE' },
          ],
        },
      },
    })
    postulacionesService.obtenerDocumentos.mockResolvedValue({ count: 1, next: null, previous: null, results: [
      { id: 501, tipo_documento: 8, tipo_documento_codigo: 'MATRICULA_VIGENTE', tipo_documento_nombre: 'Matrícula vigente', estado_codigo: 'ENV', estado_nombre: 'Enviado', fecha_subida: '2026-02-01T10:00:00Z', fecha_revision: null, requiere_correccion: false, versiones: [{ id: 601 }] },
    ] })
    renderApplicationUploadManagerPage('documentos')

    const block = (await screen.findByRole('heading', { name: 'Lo que pide Inscripción' })).closest('section')
    const rows = within(block).getAllByRole('listitem')
    expect(rows.map((row) => row.textContent)).toEqual(['Carta SolicitudFalta', 'Matricula VigenteEn revisión', 'Historial PrerreqCumplido'])
    expect(within(block).queryByText('Tutor')).not.toBeInTheDocument()
  })

  it('no lista lo que pide la etapa cuando el paso no es completar documentos', async () => {
    renderApplicationUploadManagerPage('documentos')
    await screen.findByRole('heading', { name: 'Documentos' })
    expect(screen.queryByRole('heading', { name: /^Lo que pide/ })).not.toBeInTheDocument()
  })
})
