import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ExpedientePage from './ExpedientePage'
import { postulacionesService } from '../../services/postulacionesService'
import { AuthContext } from '../../context/AuthContext'

vi.mock('../../services/postulacionesService', () => ({
  postulacionesService: {
    obtenerExpediente: vi.fn(), obtenerHistorial: vi.fn(), obtenerDocumentos: vi.fn(),
    obtenerVersiones: vi.fn(), obtenerObservaciones: vi.fn(), obtenerTiposDocumento: vi.fn(), cargarDocumento: vi.fn(),
  },
}))

const historyResponse = {
  count: 21,
  next: '/api/v1/postulaciones/historial/?page=2',
  previous: null,
  results: [
    { id: 1, estado_anterior_nombre: null, estado_nuevo_nombre: 'Registrada', actor_nombre: null, fecha_cambio: '2026-01-01T10:00:00Z', comentario: '' },
    { id: 2, estado_anterior_nombre: 'Registrada', estado_nuevo_nombre: 'En proceso', actor_nombre: 'María Rojas', fecha_cambio: '2026-01-02T10:00:00Z', comentario: 'Inicio de revisión' },
  ],
}

const documentsResponse = {
  count: 1, next: null, previous: null,
  results: [{ id: 31, tipo_documento: 4, tipo_documento_nombre: 'Informe final', estado_nombre: 'Enviado', fecha_subida: '2026-02-01T10:00:00Z', fecha_revision: null, requiere_correccion: true, observacion_general: 'Revisión técnica pendiente', versiones: [{ id: 301 }] }],
}

const versionsResponse = {
  count: 2, next: null, previous: null,
  results: [
    { id: 301, numero_version: 1, fecha_subida: '2026-02-01T10:00:00Z', nombre_original: 'informe-largo.pdf', tamano_bytes: 2048, subido_por_nombre: 'Ana Pérez', es_version_actual: false, archivo: '/media/documentos/versiones/informe-v1.pdf' },
    { id: 302, numero_version: 2, fecha_subida: '2026-02-02T10:00:00Z', nombre_original: 'informe-final.pdf', tamano_bytes: 4096, subido_por_nombre: 'Ana Pérez', es_version_actual: true, archivo: '/media/documentos/versiones/informe-v2.pdf' },
  ],
}

const observationsResponse = {
  count: 2, next: null, previous: null,
  results: [
    { id: 401, comentario: 'Corregir portada', usuario_nombre: 'Revisor Uno', fecha_observacion: '2026-02-03T10:00:00Z', corregida: false, fecha_correccion: null },
    { id: 402, comentario: 'Numeración corregida', usuario_nombre: 'Revisor Dos', fecha_observacion: '2026-02-04T10:00:00Z', corregida: true, fecha_correccion: '2026-02-05T10:00:00Z' },
  ],
}

const response = {
  detalle: {
    id: 7,
    codigo: 'EXP-007',
    estudiante_detalle: { id: 3, ru: 'RU-300', nombre_completo: 'Ana Pérez' },
    modalidad_detalle: { id: 1, codigo: 'PROYECTO_GRADO', nombre: 'Proyecto de Grado' },
    periodo_detalle: { id: 2, gestion: 2026, semestre: 'II', nombre: '2026-II' },
    estado_actual_detalle: { id: 4, codigo: 'EN_PROCESO', nombre: 'En proceso' },
  },
  flujo: {
    modalidad: { id: 1, codigo: 'PROYECTO_GRADO', nombre: 'Proyecto de Grado' },
    etapa_actual: { codigo: 'PERFIL_PROYECTO', nombre: 'Perfil de Proyecto' },
    porcentaje_avance: 25,
    etapas: [],
  },
  resultado: {
    data: { nota_publica: '80.00', aporte_publica: '56.00', resultado: 'APROBADO', nota_final: null, limitacion_normativa: 'El aporte privado no puede calcularse.' },
    error: '',
  },
  cierre: {
    data: { advertencias_normativas: ['La cantidad registrada no certifica la cantidad oficial.'], condiciones_faltantes: ['ACTA'], entregas_faltantes: ['EJEMPLARES'], documentos_faltantes: ['INFORME'] },
    error: '',
  },
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/postulaciones/7']}>
      <Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes>
    </MemoryRouter>,
  )
}

function renderOwnerPage() {
  const auth = { user: { id: 3, rol: { codigo: 'EST' } }, roleCode: 'EST', hasPermission: (name) => name === 'puede_cargar_documentos' }
  return render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)
}

describe('ExpedientePage US-008', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    postulacionesService.obtenerHistorial.mockResolvedValue(historyResponse)
    postulacionesService.obtenerDocumentos.mockResolvedValue(documentsResponse)
    postulacionesService.obtenerVersiones.mockResolvedValue(versionsResponse)
    postulacionesService.obtenerObservaciones.mockResolvedValue(observationsResponse)
    postulacionesService.obtenerTiposDocumento.mockResolvedValue({ results: [{ id: 4, nombre: 'Informe final', activo: true }] })
    postulacionesService.cargarDocumento.mockResolvedValue({ id: 303, numero_version: 3, es_version_actual: true })
  })

  it('renderiza el resumen, macroetapa, avance y advertencia institucional', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    renderPage()
    expect(screen.getByRole('status')).toHaveTextContent(/Cargando/)
    expect(await screen.findByRole('heading', { name: 'Resumen técnico' })).toBeInTheDocument()
    expect(screen.getByText('EXP-007')).toBeInTheDocument()
    expect(screen.getByText('RU-300 - Ana Pérez')).toBeInTheDocument()
    expect(screen.getByText('Proyecto de Grado')).toBeInTheDocument()
    expect(screen.getByText('Gestión 2026 - Semestre II')).toBeInTheDocument()
    expect(screen.getByText('En proceso')).toBeInTheDocument()
    expect(screen.getByText('Perfil de Proyecto')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Avance del macroflujo' })).toHaveValue(25)
    expect(screen.getByRole('heading', { name: 'Resultado académico técnico' })).toBeInTheDocument()
    expect(screen.getByText('80.00')).toBeInTheDocument()
    expect(screen.getByText('56.00')).toBeInTheDocument()
    expect(screen.getByText('Pendiente de definición institucional')).toBeInTheDocument()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveAccessibleName('Límites normativos')
    expect(screen.getByRole('note')).toHaveTextContent(/defensa privada representa el 30 %/i)
    expect(screen.getByRole('note')).toHaveTextContent(/aprobación y originalidad del tema/i)
    expect(screen.getByRole('note')).toHaveTextContent(/clasificación final institucional/i)
    expect(screen.getByRole('note')).toHaveTextContent(/cantidad oficial de ejemplares/i)
    expect(screen.getByRole('note')).toHaveTextContent(/proyectos grupales/i)
    expect(screen.getByRole('note')).toHaveTextContent(/plazos reglamentarios/i)
    expect(screen.getByRole('note')).toHaveTextContent(/no equivale a legalización/i)
    expect(screen.getByRole('note')).toHaveTextContent(/cantidad registrada no certifica/i)
    expect(screen.getByRole('heading', { name: 'Estado técnico de cierre' })).toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveClass('overflow-hidden')
    expect(screen.getByRole('heading', { name: 'Resultado académico técnico' }).parentElement).toHaveClass('overflow-hidden')
    expect(screen.getByRole('heading', { name: 'Estado técnico de cierre' }).parentElement).toHaveClass('overflow-hidden')
    expect(screen.getByText('ACTA')).toBeInTheDocument()
    expect(screen.getByText('EJEMPLARES')).toBeInTheDocument()
    expect(screen.getByText('INFORME')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver a postulaciones' })).toHaveAttribute('href', '/postulantes')
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['Debes iniciar sesión para consultar este expediente.', 401],
    ['No tienes autorización para consultar este expediente.', 403],
    ['El expediente solicitado no está disponible.', 404],
    ['No se pudo cargar el expediente. Intenta nuevamente.', undefined],
  ])('muestra error recuperable para respuesta %s', async (message, status) => {
    postulacionesService.obtenerExpediente.mockRejectedValueOnce({ status, message }).mockResolvedValueOnce(response)
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('EXP-007')).toBeInTheDocument()
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2)
  })

  it('tolera datos opcionales ausentes sin inventar etiquetas', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue({
      detalle: { codigo: 'EXP-008', estudiante_detalle: null, modalidad_detalle: null, periodo_detalle: null, estado_actual_detalle: null },
      flujo: { modalidad: null, etapa_actual: null, porcentaje_avance: null, etapas: [] },
      resultado: { data: { nota_publica: null, aporte_publica: null, resultado: null, nota_final: null }, error: '' },
      cierre: { data: { advertencias_normativas: [], condiciones_faltantes: [], entregas_faltantes: [], documentos_faltantes: [] }, error: '' },
    })
    renderPage()
    await screen.findByText('EXP-008')
    expect(screen.getAllByText('No registrado').length).toBeGreaterThanOrEqual(5)
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('mantiene expediente y advertencias ante errores parciales y permite reintentar', async () => {
    const partial = {
      ...response,
      resultado: { data: null, error: 'Resultado final todavía no disponible' },
      cierre: { data: null, error: 'Estado de cierre técnico todavía no disponible' },
    }
    postulacionesService.obtenerExpediente.mockResolvedValueOnce(partial).mockResolvedValueOnce(response)
    renderPage()
    expect(await screen.findByText('EXP-007')).toBeInTheDocument()
    expect(screen.getByText('Resultado final todavía no disponible')).toBeInTheDocument()
    expect(screen.getByText('Estado de cierre técnico todavía no disponible')).toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveTextContent(/proyectos grupales/i)
    await userEvent.click(screen.getAllByRole('button', { name: 'Reintentar' })[0])
    expect(await screen.findByText('80.00')).toBeInTheDocument()
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2)
  })

  it('cancela la solicitud al desmontar', async () => {
    let receivedSignal
    postulacionesService.obtenerExpediente.mockImplementation((_id, signal) => {
      receivedSignal = signal
      return new Promise(() => {})
    })
    const view = renderPage()
    await waitFor(() => expect(receivedSignal).toBeDefined())
    view.unmount()
    expect(receivedSignal.aborted).toBe(true)
  })

  it('integra el historial legible, neutral, accesible y paginado', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerHistorial
      .mockResolvedValueOnce(historyResponse)
      .mockResolvedValueOnce({ count: 21, next: null, previous: 'page=1', results: [{ ...historyResponse.results[1], id: 21 }] })
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Historial' })).toBeInTheDocument()
    expect(screen.getByText('Estado inicial → Registrada')).toBeInTheDocument()
    expect(screen.getByText('Registrada → En proceso')).toBeInTheDocument()
    expect(screen.getByText('Sistema')).toBeInTheDocument()
    expect(screen.getByText('Sin comentario')).toBeInTheDocument()
    expect(screen.getByText('María Rojas')).toBeInTheDocument()
    expect(screen.getByText('Inicio de revisión')).toBeInTheDocument()
    expect(screen.queryByText(/kardex oficial/i)).not.toBeInTheDocument()
    expect(postulacionesService.obtenerHistorial).toHaveBeenCalledWith('7', 1, expect.any(AbortSignal))
    expect(postulacionesService.obtenerHistorial).toHaveBeenCalledTimes(1)
    await userEvent.click(screen.getAllByRole('button', { name: 'Siguiente' }).find((button) => !button.disabled))
    await waitFor(() => expect(postulacionesService.obtenerHistorial).toHaveBeenLastCalledWith('7', 2, expect.any(AbortSignal)))
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(1)
  })

  it('muestra estado vacío sin afectar el expediente', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerHistorial.mockResolvedValue({ count: 0, next: null, previous: null, results: [] })
    renderPage()
    expect(await screen.findByText('No se registraron cambios de estado.')).toBeInTheDocument()
    expect(screen.getByText('EXP-007')).toBeInTheDocument()
  })

  it.each([
    ['Debes iniciar sesión para consultar el historial.', 401],
    ['El historial solicitado no está disponible.', 404],
    ['No se pudo cargar el historial. Intenta nuevamente.', undefined],
  ])('mantiene el expediente ante error parcial de historial %s y permite reintentar', async (message, status) => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerHistorial.mockRejectedValueOnce({ status, message }).mockResolvedValueOnce(historyResponse)
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(screen.getByText('EXP-007')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar historial' }))
    expect(await screen.findByText('Estado inicial → Registrada')).toBeInTheDocument()
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

  it('consulta documentos por postulación y muestra etiquetas sin acciones de escritura', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Documentos' })).toBeInTheDocument()
    expect(screen.getByText('Informe final')).toBeInTheDocument()
    expect(screen.getByText(/Estado técnico: Enviado/)).toBeInTheDocument()
    expect(screen.getByText('Requerida')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(postulacionesService.obtenerDocumentos).toHaveBeenCalledWith('7', 1, expect.any(AbortSignal))
    expect(postulacionesService.obtenerDocumentos).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: /subir|aprobar|rechazar|observar/i })).not.toBeInTheDocument()
  })

  it('abre detalle, pagina versiones y consulta observaciones por versión exacta', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerVersiones
      .mockResolvedValueOnce({ ...versionsResponse, count: 21, next: 'page=2' })
      .mockResolvedValueOnce({ count: 21, next: null, previous: 'page=1', results: [versionsResponse.results[1]] })
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }))
    const dialog = screen.getByRole('dialog', { name: 'Detalle del documento' })
    expect(dialog).toBeInTheDocument()
    expect(await screen.findByText('Versión 1')).toBeInTheDocument()
    expect(screen.getByText('Versión 2')).toBeInTheDocument()
    expect(screen.getByText('Versión actual')).toBeInTheDocument()
    expect(screen.getByText('informe-largo.pdf')).toBeInTheDocument()
    expect(screen.getByText('2.0 KB')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Abrir archivo autorizado de la versión 1' })).toHaveAttribute('href', '/media/documentos/versiones/informe-v1.pdf')
    expect(postulacionesService.obtenerVersiones).toHaveBeenCalledWith(31, 1, expect.any(AbortSignal))
    await userEvent.click(screen.getAllByRole('button', { name: 'Ver observaciones' })[0])
    expect(await screen.findByText('Corregir portada')).toBeInTheDocument()
    expect(screen.getByText('Pendiente')).toBeInTheDocument()
    expect(screen.getByText('Corregida')).toBeInTheDocument()
    expect(postulacionesService.obtenerObservaciones).toHaveBeenCalledWith(301, 1, expect.any(AbortSignal))
    await userEvent.click(within(dialog).getAllByRole('button', { name: 'Siguiente' }).find((button) => !button.disabled))
    await waitFor(() => expect(postulacionesService.obtenerVersiones).toHaveBeenLastCalledWith(31, 2, expect.any(AbortSignal)))
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('muestra documentos y observaciones vacíos con lenguaje neutral', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDocumentos.mockResolvedValue({ count: 0, next: null, previous: null, results: [] })
    renderPage()
    expect(await screen.findByText('No se registraron documentos.')).toBeInTheDocument()
    expect(screen.getByText('EXP-007')).toBeInTheDocument()
  })

  it('muestra versiones vacías, incluidos campos opcionales ausentes', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerVersiones.mockResolvedValue({ count: 0, next: null, previous: null, results: [] })
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }))
    expect(await screen.findByText('No se registraron versiones.')).toBeInTheDocument()
    expect(screen.getAllByText('No registrada').length).toBeGreaterThan(0)
  })

  it('muestra el estado vacío de observaciones para la versión exacta', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerObservaciones.mockResolvedValue({ count: 0, next: null, previous: null, results: [] })
    renderPage()
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
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }))
    await waitFor(() => expect(versionSignals).toHaveLength(1))
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(versionSignals[0].aborted).toBe(true)
    await userEvent.click(screen.getByRole('button', { name: 'Ver detalle' }))
    await userEvent.click((await screen.findAllByRole('button', { name: 'Ver observaciones' }))[0])
    await waitFor(() => expect(observationSignals).toHaveLength(1))
    await userEvent.click(screen.getAllByRole('button', { name: 'Ver observaciones' })[1])
    await waitFor(() => expect(observationSignals).toHaveLength(2))
    expect(observationSignals[0].aborted).toBe(true)
  })

  it.each([
    ['Debes iniciar sesión para consultar los documentos.', 401],
    ['Los documentos no disponibles.', 404],
    ['No se pudieron cargar los documentos. Intenta nuevamente.', undefined],
  ])('mantiene expediente ante error documental parcial %s y reintenta', async (message, status) => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDocumentos.mockRejectedValueOnce({ status, message }).mockResolvedValueOnce(documentsResponse)
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(screen.getByText('EXP-007')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar documentos' }))
    expect(await screen.findByText('Informe final')).toBeInTheDocument()
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(1)
  })

  it('carga un documento inicial con postulación contextual y tipo por nombre', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    renderOwnerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Cargar documento' }))
    expect(await screen.findByRole('option', { name: 'Informe final' })).toBeInTheDocument()
    await userEvent.selectOptions(screen.getByLabelText('Tipo documental'), '4')
    const file = new File(['%PDF-1.4'], 'informe.pdf', { type: 'application/pdf' })
    await userEvent.upload(screen.getByLabelText('Archivo'), file)
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cargar documento' }))
    await waitFor(() => expect(postulacionesService.cargarDocumento).toHaveBeenCalledWith(
      { postulacionId: 7, tipoDocumentoId: '4', archivo: file }, expect.any(AbortSignal),
    ))
    expect(await screen.findByText('Documento cargado')).toBeInTheDocument()
    expect(postulacionesService.obtenerDocumentos).toHaveBeenCalledTimes(2)
  })

  it('carga una nueva versión derivando postulación y tipo del detalle', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    renderOwnerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cargar nueva versión' }))
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    const file = new File(['%PDF-1.4'], 'informe-v3.pdf', { type: 'application/pdf' })
    await userEvent.upload(screen.getByLabelText('Archivo'), file)
    await userEvent.click(within(screen.getAllByRole('dialog').at(-1)).getByRole('button', { name: 'Cargar nueva versión' }))
    await waitFor(() => expect(postulacionesService.cargarDocumento).toHaveBeenCalledWith(
      { postulacionId: 7, tipoDocumentoId: 4, archivo: file }, expect.any(AbortSignal),
    ))
    expect(await screen.findByText('Nueva versión cargada')).toBeInTheDocument()
    await waitFor(() => expect(postulacionesService.obtenerVersiones).toHaveBeenCalledTimes(2))
  })
})
