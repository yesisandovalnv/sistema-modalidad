import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { AuthContext } from '../../context/AuthContext'
import { MemoryRouter } from 'react-router-dom'
import PostulantesPage from './PostulantesPage'
import { formatPeriodoLabel, formatStudentLabel } from './postulacionFormatters'
import { crudService, endpoints, listAll } from '../../services/crudService'
import { postulacionesService } from '../../services/postulacionesService'

vi.mock('../../services/crudService', () => ({
  endpoints: { postulaciones:'/postulaciones/', modalidades:'/modalidades/', periodos:'/periodos/', estudiantes:'/estudiantes/' },
  crudService: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
  listAll: vi.fn(),
}))
vi.mock('../../services/postulacionesService', () => ({
  postulacionesService: {
    obtenerCapacidadesModalidad: vi.fn(),
    obtenerDetalle: vi.fn(),
    inicializarFlujo: vi.fn(),
    obtenerTiposDocumentosHistoricos: vi.fn(),
    subirDocumentoHistorico: vi.fn(),
  },
}))

const student = { id: 17, codigo: '394090', ru: '394090', nombre_completo: 'Luis Fernando Menacho Melgar' }
const ana = { id: 39, codigo: '20260001', ru: '20260001', ci: '9900001', nombre_completo: 'Ana Maria Quispe Mamani' }
const period = { id: 8, nombre: '2026-II', gestion: 2026, semestre: 'II', activo: true }
const modality = { id: 3, codigo: 'PROYECTO_GRADO', nombre: 'Proyecto de Grado', activo: true }
const examenModality = { id: 6, codigo: 'EXAMEN_GRADO', nombre: 'Examen de Grado', activo: true }
const trabajoDirigidoModality = { id: 2, codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido', activo: true }
const auth = { hasPermission: (name) => name === 'puede_gestionar_postulaciones' }

function setup({ periods = [period], rows = [], students = [student], modalities = [modality], listImplementation } = {}) {
  crudService.list.mockImplementation(listImplementation || (() => Promise.resolve({ count: rows.length, next: null, previous: null, results: rows })))
  listAll.mockImplementation((path) => Promise.resolve(path === endpoints.modalidades ? modalities : path === endpoints.periodos ? periods : students))
  postulacionesService.obtenerCapacidadesModalidad.mockImplementation((id) => Promise.resolve(
    id === modality.id || id === examenModality.id || id === trabajoDirigidoModality.id
      ? { soportada: true, configuracion_valida: true }
      : { soportada: false, configuracion_valida: false },
  ))
  return render(<MemoryRouter><AuthContext.Provider value={auth}><PostulantesPage /></AuthContext.Provider></MemoryRouter>)
}

describe('Nueva postulación', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('formatea estudiante y periodo sin mostrar el ID interno', () => {
    expect(formatStudentLabel(student)).toBe('394090 - Luis Fernando Menacho Melgar')
    expect(formatPeriodoLabel(period)).toBe('Gestión 2026 - Semestre II')
  })

  it('consume catálogos paginados y muestra etiquetas legibles', async () => {
    setup(); await userEvent.click(await screen.findByRole('button', { name: /Nueva postulaci/ }))
    expect(screen.getByRole('option', { name: '394090 - Luis Fernando Menacho Melgar' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Gestión 2026 - Semestre II' })).toBeInTheDocument()
  })

  it('mantiene Proyecto de Grado y Examen seleccionables según capabilities', async () => {
    setup({ modalities: [modality, examenModality] })
    await userEvent.click(await screen.findByRole('button', { name: /Nueva postulaci/ }))

    expect(screen.getByRole('option', { name: 'Proyecto de Grado' })).toBeEnabled()
    expect(screen.getByRole('option', { name: 'Examen de Grado' })).toBeEnabled()
    expect(postulacionesService.obtenerCapacidadesModalidad).toHaveBeenCalledWith(3, expect.any(AbortSignal))
    expect(postulacionesService.obtenerCapacidadesModalidad).toHaveBeenCalledWith(6, expect.any(AbortSignal))
  })

  it('mantiene Trabajo Dirigido seleccionable cuando su configuración es válida', async () => {
    setup({ modalities: [trabajoDirigidoModality] })
    await userEvent.click(await screen.findByRole('button', { name: /Nueva postulaci/ }))

    expect(screen.getByRole('option', { name: 'Trabajo Dirigido' })).toBeEnabled()
    expect(screen.queryByRole('option', { name: /Trabajo Dirigido — Próximamente/ })).not.toBeInTheDocument()
  })

  it('consulta estudiantes elegibles por modalidad y periodo', async () => {
    setup({ modalities: [modality], students: [student, ana] })
    await userEvent.click(await screen.findByRole('button', { name: /Nueva postulaci/ }))
    await userEvent.selectOptions(screen.getByLabelText('Modalidad'), '3')
    await userEvent.selectOptions(screen.getByLabelText('Gestión / Semestre'), '8')
    await waitFor(() => expect(listAll).toHaveBeenCalledWith(
      endpoints.estudiantes,
      { modalidad: '3', periodo: '8', ordering: 'apellido_paterno' },
      expect.any(AbortSignal),
    ))
  })

  it('busca estudiantes localmente por nombre, apellido, codigo, RU y CI', async () => {
    const user = userEvent.setup()
    setup({ students: [ana] })
    await user.click(await screen.findByRole('button', { name: /Nueva postulaci/ }))
    const search = screen.getByLabelText('Buscar estudiante')
    const optionName = '20260001 - Ana Maria Quispe Mamani'

    for (const query of ['Ana', 'Quispe', '20260001', '9900001']) {
      await user.clear(search)
      await user.type(search, query)
      expect(screen.getByRole('option', { name: optionName })).toBeInTheDocument()
    }

    await user.clear(search)
    await user.type(search, 'inexistente')
    expect(screen.queryByRole('option', { name: optionName })).not.toBeInTheDocument()

    await user.clear(search)
    expect(screen.getByRole('option', { name: optionName })).toBeInTheDocument()
  })

  it('deshabilita Guardar cuando no hay periodos activos', async () => {
    setup({ periods: [] }); await userEvent.click(await screen.findByRole('button', { name: /Nueva postulaci/ }))
    expect(screen.getByText(/No existen periodos acad/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled()
  })

  it('envía IDs reales y evita doble envío', async () => {
    let resolveRequest; crudService.create.mockReturnValue(new Promise((resolve) => { resolveRequest = resolve }))
    setup(); await userEvent.click(await screen.findByRole('button', { name: /Nueva postulaci/ }))
    await userEvent.type(screen.getByRole('dialog').querySelector('input[required]'), 'POST-2026')
    await userEvent.selectOptions(screen.getByLabelText('Estudiante'), '17')
    await userEvent.selectOptions(screen.getByLabelText('Modalidad'), '3')
    await userEvent.selectOptions(screen.getByLabelText(/Semestre/), '8')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(screen.getByRole('button', { name: /Guardando/ })).toBeDisabled()
    expect(crudService.create).toHaveBeenCalledTimes(1)
    expect(crudService.create).toHaveBeenCalledWith('/postulaciones/', expect.objectContaining({ estudiante:17, modalidad:3, periodo:8 }))
    resolveRequest({ id: 1 }); await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('muestra el tipo de registro y mantiene Proceso con seguimiento como valor por defecto', async () => {
    setup()
    await userEvent.click(await screen.findByRole('button', { name: /Nueva postulaci/ }))
    const selector = screen.getByLabelText('Tipo de registro')
    expect(selector).toHaveValue('SEGUIMIENTO')
    expect(screen.getByRole('option', { name: 'Proceso con seguimiento' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Registro histórico' })).toBeInTheDocument()
  })

  it('usa el endpoint normal en el flujo de seguimiento y evita workflow histórico', async () => {
    setup()
    await userEvent.click(await screen.findByRole('button', { name: /Nueva postulaci/ }))
    await userEvent.type(screen.getByRole('dialog').querySelector('input[required]'), 'POST-2026')
    await userEvent.selectOptions(screen.getByLabelText('Estudiante'), '17')
    await userEvent.selectOptions(screen.getByLabelText('Modalidad'), '3')
    await userEvent.selectOptions(screen.getByLabelText(/Semestre/), '8')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(crudService.create).toHaveBeenCalledWith('/postulaciones/', expect.objectContaining({
      codigo: 'POST-2026',
      estudiante: 17,
      modalidad: 3,
      periodo: 8,
    }))
    expect(postulacionesService.inicializarFlujo).not.toHaveBeenCalled()
  })

  it('crea la postulación histórica en la ruta adecuada y ofrece continuar a su documentación', async () => {
    const user = userEvent.setup()
    crudService.create.mockResolvedValue({ id: 55, codigo: 'HIST-2022', estudiante: 17, modalidad: 3, periodo: 8, tipo_registro: 'HISTORICO', estudiante_detalle: { nombre_completo: 'Luis Fernando Menacho Melgar' }, modalidad_detalle: { nombre: 'Proyecto de Grado' }, periodo_detalle: { gestion: 2022, semestre: 'I' } })
    setup()
    await user.click(await screen.findByRole('button', { name: /Nueva postulaci/ }))
    await user.selectOptions(screen.getByLabelText('Tipo de registro'), 'HISTORICO')
    await user.type(screen.getByRole('dialog').querySelector('input[required]'), 'HIST-2022')
    await user.selectOptions(screen.getByLabelText('Estudiante'), '17')
    await user.selectOptions(screen.getByLabelText('Modalidad'), '3')
    await user.selectOptions(screen.getByLabelText(/Semestre/), '8')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(crudService.create).toHaveBeenCalledWith('/api/v1/postulaciones/historicas/', expect.objectContaining({ codigo: 'HIST-2022', estudiante: 17, modalidad: 3, periodo: 8 })))
    expect(postulacionesService.inicializarFlujo).not.toHaveBeenCalled()
    expect(await screen.findByText('Registro histórico creado')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cargar documentación' })).toBeInTheDocument()
  })

  it('consulta los tipos históricos de la postulación y muestra nombres del backend', async () => {
    const user = userEvent.setup()
    const historical = { id: 55, codigo: 'HIST-2022', estudiante: 17, modalidad: 3, periodo: 8, tipo_registro: 'HISTORICO', estudiante_detalle: { nombre_completo: 'Luis Fernando Menacho Melgar' }, modalidad_detalle: { nombre: 'Proyecto de Grado' }, periodo_detalle: { gestion: 2022, semestre: 'I' } }
    crudService.create.mockResolvedValue(historical)
    postulacionesService.obtenerTiposDocumentosHistoricos.mockResolvedValue([
      { id: 11, codigo: 'ACTA_DEFENSA', nombre: 'Acta de defensa' },
      { id: 12, codigo: 'CERTIFICADO', nombre: 'Certificado' },
    ])
    setup()
    await user.click(await screen.findByRole('button', { name: /Nueva postulaci/ }))
    await user.selectOptions(screen.getByLabelText('Tipo de registro'), 'HISTORICO')
    await user.type(screen.getByRole('dialog').querySelector('input[required]'), 'HIST-2022')
    await user.selectOptions(screen.getByLabelText('Estudiante'), '17')
    await user.selectOptions(screen.getByLabelText('Modalidad'), '3')
    await user.selectOptions(screen.getByLabelText(/Semestre/), '8')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    await user.click(await screen.findByRole('button', { name: 'Cargar documentación' }))

    await waitFor(() => expect(postulacionesService.obtenerTiposDocumentosHistoricos).toHaveBeenCalledWith(55, expect.any(AbortSignal)))
    expect(screen.getByRole('option', { name: 'Acta de defensa' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Certificado' })).toBeInTheDocument()
  })

  it('muestra un mensaje humano cuando no hay tipos históricos y bloquea la subida', async () => {
    const user = userEvent.setup()
    crudService.create.mockResolvedValue({ id: 55, codigo: 'HIST-2022', estudiante: 17, modalidad: 3, periodo: 8, tipo_registro: 'HISTORICO' })
    postulacionesService.obtenerTiposDocumentosHistoricos.mockResolvedValue([])
    setup()
    await user.click(await screen.findByRole('button', { name: /Nueva postulaci/ }))
    await user.selectOptions(screen.getByLabelText('Tipo de registro'), 'HISTORICO')
    await user.type(screen.getByRole('dialog').querySelector('input[required]'), 'HIST-2022')
    await user.selectOptions(screen.getByLabelText('Estudiante'), '17')
    await user.selectOptions(screen.getByLabelText('Modalidad'), '3')
    await user.selectOptions(screen.getByLabelText(/Semestre/), '8')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    await user.click(await screen.findByRole('button', { name: 'Cargar documentación' }))

    expect(await screen.findByText('No existen tipos de documentos configurados para esta modalidad.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Subir documento' })).toBeDisabled()
  })

  it('sube el documento histórico con la ruta correcta y conserva el contrato de FormData', async () => {
    const user = userEvent.setup()
    const historical = { id: 55, codigo: 'HIST-2022', estudiante: 17, modalidad: 3, periodo: 8, tipo_registro: 'HISTORICO' }
    crudService.create.mockResolvedValue(historical)
    postulacionesService.obtenerTiposDocumentosHistoricos.mockResolvedValue([{ id: 11, nombre: 'Acta de defensa' }])
    postulacionesService.subirDocumentoHistorico.mockResolvedValue({ id: 99 })
    setup()
    await user.click(await screen.findByRole('button', { name: /Nueva postulaci/ }))
    await user.selectOptions(screen.getByLabelText('Tipo de registro'), 'HISTORICO')
    await user.type(screen.getByRole('dialog').querySelector('input[required]'), 'HIST-2022')
    await user.selectOptions(screen.getByLabelText('Estudiante'), '17')
    await user.selectOptions(screen.getByLabelText('Modalidad'), '3')
    await user.selectOptions(screen.getByLabelText(/Semestre/), '8')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    await user.click(await screen.findByRole('button', { name: 'Cargar documentación' }))
    await user.selectOptions(screen.getByLabelText('Tipo de documento *'), '11')
    const file = new File(['archivo'], 'acta.pdf', { type: 'application/pdf' })
    await user.upload(screen.getByLabelText('Archivo *'), file)
    await user.click(screen.getByRole('button', { name: 'Subir documento' }))

    expect(postulacionesService.subirDocumentoHistorico).toHaveBeenCalledWith(55, expect.any(FormData), expect.any(AbortSignal))
    const formData = postulacionesService.subirDocumentoHistorico.mock.calls[0][1]
    expect(formData.get('tipo_documento_id')).toBe('11')
    expect(formData.get('archivo')).toBe(file)
  })

  it('muestra errores humanos del backend para carga histórica con 400 o 403', async () => {
    const user = userEvent.setup()
    crudService.create.mockResolvedValue({ id: 55, codigo: 'HIST-2022', estudiante: 17, modalidad: 3, periodo: 8, tipo_registro: 'HISTORICO' })
    postulacionesService.obtenerTiposDocumentosHistoricos.mockResolvedValue([{ id: 11, nombre: 'Acta de defensa' }])
    postulacionesService.subirDocumentoHistorico.mockRejectedValue({ status: 403, message: 'No tienes autorización para cargar documentos en esta postulación.' })
    setup()
    await user.click(await screen.findByRole('button', { name: /Nueva postulaci/ }))
    await user.selectOptions(screen.getByLabelText('Tipo de registro'), 'HISTORICO')
    await user.type(screen.getByRole('dialog').querySelector('input[required]'), 'HIST-2022')
    await user.selectOptions(screen.getByLabelText('Estudiante'), '17')
    await user.selectOptions(screen.getByLabelText('Modalidad'), '3')
    await user.selectOptions(screen.getByLabelText(/Semestre/), '8')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    await user.click(await screen.findByRole('button', { name: 'Cargar documentación' }))
    await user.selectOptions(screen.getByLabelText('Tipo de documento *'), '11')
    await user.upload(screen.getByLabelText('Archivo *'), new File(['archivo'], 'acta.pdf', { type: 'application/pdf' }))
    await user.click(screen.getByRole('button', { name: 'Subir documento' }))

    expect(await screen.findByText('No tienes autorización para cargar documentos en esta postulación.')).toBeInTheDocument()
  })

  it('oculta los controles de registro histórico para estudiantes sin permisos administrativos', async () => {
    crudService.list.mockResolvedValue({ count: 0, results: [] })
    render(<MemoryRouter><AuthContext.Provider value={{ hasPermission: () => false }}><PostulantesPage /></AuthContext.Provider></MemoryRouter>)
    await waitFor(() => expect(crudService.list).toHaveBeenCalled())
    expect(screen.queryByLabelText('Tipo de registro')).not.toBeInTheDocument()
  })

  it('mantiene el listado operativo y etiqueta humanamente el tipo de registro', async () => {
    setup({
      rows: [
        { id: 1, codigo: 'POST-001', estudiante: 17, modalidad: 3, periodo: 8, tipo_registro: 'SEGUIMIENTO' },
        { id: 2, codigo: 'POST-002', estudiante: 17, modalidad: 3, periodo: 8, tipo_registro: 'HISTORICO' },
      ],
    })
    expect(await screen.findByText('Proceso con seguimiento')).toBeInTheDocument()
    expect(screen.getByText('Registro histórico')).toBeInTheDocument()
  })

  it('limpia la búsqueda, vuelve a la primera página y muestra la nueva postulación tras crear', async () => {
    const user = userEvent.setup()
    const created = { id: 41, codigo: 'POST-2026-001', estudiante: 17, modalidad: 3, periodo: 8 }
    const existing = { id: 40, codigo: 'POST-EXISTENTE', estudiante: 17, modalidad: 3, periodo: 8 }
    let creationCompleted = false
    crudService.create.mockImplementation(async () => {
      creationCompleted = true
      return created
    })
    setup({
      listImplementation: (_path, params) => Promise.resolve({
        count: 1,
        next: params.page === 1 ? '/postulaciones/?page=2' : null,
        previous: params.page === 2 ? '/postulaciones/?page=1' : null,
        results: creationCompleted && !params.search && params.page === 1 ? [created] : [existing],
      }),
    })

    const search = await screen.findByRole('textbox', { name: 'Buscar' })
    await user.type(search, '20260001')
    await user.click(screen.getByRole('button', { name: 'Buscar' }))
    await user.click(await screen.findByRole('button', { name: 'Siguiente' }))
    await waitFor(() => expect(crudService.list).toHaveBeenLastCalledWith(
      '/postulaciones/',
      { search: '20260001', page: 2, ordering: '-created_at' },
      expect.any(AbortSignal),
    ))

    await user.click(screen.getByRole('button', { name: /Nueva postulaci/ }))
    await user.type(screen.getByRole('dialog').querySelector('input[required]'), created.codigo)
    await user.selectOptions(screen.getByLabelText('Estudiante'), '17')
    await user.selectOptions(screen.getByLabelText('Modalidad'), '3')
    await user.selectOptions(screen.getByLabelText(/Semestre/), '8')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(search).toHaveValue(''))
    await waitFor(() => expect(crudService.list).toHaveBeenLastCalledWith(
      '/postulaciones/',
      { search: '', page: 1, ordering: '-created_at' },
      expect.any(AbortSignal),
    ))
    expect(await screen.findByText(created.codigo)).toBeInTheDocument()
    expect(screen.getByText('1 resultados · Página 1')).toBeInTheDocument()
  })

  it('oculta el alta sin permiso explícito', async () => {
    crudService.list.mockResolvedValue({ count:0, results:[] })
    render(<MemoryRouter><AuthContext.Provider value={{ hasPermission: () => false }}><PostulantesPage /></AuthContext.Provider></MemoryRouter>)
    await waitFor(() => expect(crudService.list).toHaveBeenCalled())
    expect(screen.queryByRole('button', { name: /Nueva postulaci/ })).not.toBeInTheDocument()
  })

  it('mantiene el formulario abierto y muestra errores de campo del backend', async () => {
    crudService.create.mockRejectedValue({
      status: 400,
      message: 'codigo: Ya existe una postulación con este código.',
      fields: { codigo: ['Ya existe una postulación con este código.'] },
    })
    setup()
    await userEvent.click(await screen.findByRole('button', { name: 'Nueva postulación' }))
    await userEvent.type(screen.getByRole('dialog').querySelector('input[required]'), 'POST-2026')
    await userEvent.selectOptions(screen.getByLabelText('Estudiante'), '17')
    await userEvent.selectOptions(screen.getByLabelText('Modalidad'), '3')
    await userEvent.selectOptions(screen.getByLabelText('Gestión / Semestre'), '8')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('Ya existe una postulación con este código.')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('ofrece acceso al expediente sin retirar las acciones existentes', async () => {
    setup({ rows: [{ id: 41, codigo: 'POST-041', estudiante: 17, modalidad: 3, periodo: 8 }] })
    const link = await screen.findByRole('link', { name: 'Abrir expediente' })
    expect(link).toHaveAttribute('href', '/postulaciones/41')
    expect(screen.getByRole('button', { name: 'Detalle' })).toBeInTheDocument()
  })
})
