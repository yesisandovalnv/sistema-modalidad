import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { AuthContext } from '../../context/AuthContext'
import { MemoryRouter } from 'react-router-dom'
import PostulantesPage from './PostulantesPage'
import { formatPeriodoLabel, formatStudentLabel } from './postulacionFormatters'
import { crudService, endpoints, listAll } from '../../services/crudService'
import { postulacionesService } from '../../services/postulacionesService'
import { usuariosService } from '../../services/usuariosService'

// Editar se abre desde la ventana de Detalle (la fila solo tiene Detalle y Abrir expediente).
async function openEdit(scope = screen) {
  await userEvent.click(await scope.findByRole('button', { name: 'Detalle' }))
  await userEvent.click(await screen.findByRole('button', { name: 'Editar' }))
}

vi.mock('../../services/crudService', () => ({
  endpoints: { postulaciones:'/postulaciones/', modalidades:'/modalidades/', periodos:'/periodos/', estudiantes:'/estudiantes/' },
  crudService: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
  listAll: vi.fn(),
}))
vi.mock('../../services/usuariosService', () => ({
  usuariosService: { listRoles: vi.fn(), createUser: vi.fn() },
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

function setup({ periods = [period], rows = [], students = [student], modalities = [modality], listImplementation, authValue = auth } = {}) {
  crudService.list.mockImplementation(listImplementation || (() => Promise.resolve({ count: rows.length, next: null, previous: null, results: rows })))
  listAll.mockImplementation((path) => Promise.resolve(path === endpoints.modalidades ? modalities : path === endpoints.periodos ? periods : students))
  postulacionesService.obtenerCapacidadesModalidad.mockImplementation((id) => Promise.resolve(
    id === modality.id || id === examenModality.id || id === trabajoDirigidoModality.id
      ? { soportada: true, configuracion_valida: true }
      : { soportada: false, configuracion_valida: false },
  ))
  return render(<MemoryRouter><AuthContext.Provider value={authValue}><PostulantesPage /></AuthContext.Provider></MemoryRouter>)
}

// Los campos usan el desplegable del sistema (Select): se abre el campo y se toca la opción,
// igual que lo haría una persona.
async function openList(label, user = userEvent) {
  const combo = await screen.findByRole('combobox', { name: label })
  await waitFor(() => expect(combo).not.toBeDisabled())
  await user.click(combo)
  await screen.findByRole('listbox')
}

async function pick(label, optionName, user = userEvent) {
  await openList(label, user)
  await user.click(await screen.findByRole('option', { name: optionName }))
}

describe('Nueva postulación', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const managerOfUsers = { hasPermission: (name) => ['puede_gestionar_postulaciones', 'puede_gestionar_usuarios'].includes(name) }

  it('registra un estudiante nuevo desde la misma ventana y lo deja elegido', async () => {
    usuariosService.listRoles.mockResolvedValue({ results: [{ id: 4, codigo: 'ESTUDIANTE', activo: true }] })
    usuariosService.createUser.mockResolvedValue({ id: 88, ru: '500100', ci: '7700100', nombre_completo: 'Rosa Paz Ortiz' })
    setup({ authValue: managerOfUsers })
    fireEvent.click(await screen.findByRole('button', { name: 'Nueva postulación' }))
    fireEvent.click(await screen.findByRole('button', { name: /Registrar estudiante/ }))
    fireEvent.change(screen.getByLabelText('Nombres'), { target: { value: 'Rosa' } })
    fireEvent.change(screen.getByLabelText('Apellido paterno'), { target: { value: 'Paz' } })
    fireEvent.change(screen.getByLabelText('Apellido materno'), { target: { value: 'Ortiz' } })
    fireEvent.change(screen.getByLabelText('R.U.'), { target: { value: '500100' } })
    fireEvent.change(screen.getByLabelText('C.I.'), { target: { value: '7700100' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar y elegir' }))

    const combo = await screen.findByRole('combobox', { name: 'Estudiante' })
    expect(combo).toHaveValue('500100 - Rosa Paz Ortiz')
    expect(usuariosService.createUser).toHaveBeenCalledWith(expect.objectContaining({
      nombres: 'Rosa', apellido_paterno: 'Paz', apellido_materno: 'Ortiz', ru: '500100', ci: '7700100', username: '500100', role_id: 4, is_active: true,
    }))
    expect(usuariosService.createUser.mock.calls[0][0].password).toEqual(expect.any(String))
  })

  it('pide los datos mínimos antes de registrar al estudiante', async () => {
    setup({ authValue: managerOfUsers })
    fireEvent.click(await screen.findByRole('button', { name: 'Nueva postulación' }))
    fireEvent.click(await screen.findByRole('button', { name: /Registrar estudiante/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Registrar y elegir' }))
    expect(await screen.findByText('Completa nombres, apellido paterno, R.U. y C.I.')).toBeInTheDocument()
    expect(usuariosService.createUser).not.toHaveBeenCalled()
  })

  it('no ofrece registrar ni importar estudiantes sin permiso para gestionar usuarios', async () => {
    setup()
    fireEvent.click(await screen.findByRole('button', { name: 'Nueva postulación' }))
    await screen.findByRole('combobox', { name: 'Estudiante' })
    expect(screen.queryByRole('button', { name: /Registrar estudiante/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Importar estudiantes' })).not.toBeInTheDocument()
  })

  it('formatea estudiante y periodo sin mostrar el ID interno', () => {
    expect(formatStudentLabel(student)).toBe('394090 - Luis Fernando Menacho Melgar')
    expect(formatPeriodoLabel(period)).toBe('Gestión 2026 - Semestre II')
  })

  it('muestra un estado vacío específico al estudiante sin postulaciones', async () => {
    setup({ authValue: { hasPermission: () => false, roleCode: 'ESTUDIANTE' } })
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Todavía no tienes postulaciones académicas registradas.'))
  })

  it('consume catálogos paginados y muestra etiquetas legibles', async () => {
    setup(); await userEvent.click(await screen.findByRole('button', { name: /Nueva postulaci/ }))
    await openList('Estudiante')
    expect(screen.getByRole('option', { name: '394090 - Luis Fernando Menacho Melgar' })).toBeInTheDocument()
    await openList('Gestión / Semestre')
    expect(screen.getByRole('option', { name: 'Gestión 2026 - Semestre II' })).toBeInTheDocument()
  })

  it('mantiene Proyecto de Grado y Examen seleccionables según capabilities', async () => {
    setup({ modalities: [modality, examenModality] })
    await userEvent.click(await screen.findByRole('button', { name: /Nueva postulaci/ }))
    await openList('Modalidad')

    expect(screen.getByRole('option', { name: 'Proyecto de Grado' })).not.toHaveAttribute('aria-disabled')
    expect(screen.getByRole('option', { name: 'Examen de Grado' })).not.toHaveAttribute('aria-disabled')
    expect(postulacionesService.obtenerCapacidadesModalidad).toHaveBeenCalledWith(3, expect.any(AbortSignal))
    expect(postulacionesService.obtenerCapacidadesModalidad).toHaveBeenCalledWith(6, expect.any(AbortSignal))
  })

  it('mantiene Trabajo Dirigido seleccionable cuando su configuración es válida', async () => {
    setup({ modalities: [trabajoDirigidoModality] })
    await userEvent.click(await screen.findByRole('button', { name: /Nueva postulaci/ }))
    await openList('Modalidad')

    expect(screen.getByRole('option', { name: 'Trabajo Dirigido' })).not.toHaveAttribute('aria-disabled')
    expect(screen.queryByRole('option', { name: /Trabajo Dirigido — Próximamente/ })).not.toBeInTheDocument()
  })

  it('consulta estudiantes elegibles por modalidad y periodo', async () => {
    setup({ modalities: [modality], students: [student, ana] })
    await userEvent.click(await screen.findByRole('button', { name: /Nueva postulaci/ }))
    await pick('Modalidad', 'Proyecto de Grado')
    await pick('Gestión / Semestre', 'Gestión 2026 - Semestre II')
    await waitFor(() => expect(listAll).toHaveBeenCalledWith(
      endpoints.estudiantes,
      { modalidad: '3', periodo: '8', ordering: 'apellido_paterno' },
      expect.any(AbortSignal),
    ))
  })

  it('busca estudiantes escribiendo en el propio campo Estudiante (nombre, apellido, código, RU y CI)', async () => {
    const user = userEvent.setup()
    setup({ students: [ana] })
    await user.click(await screen.findByRole('button', { name: /Nueva postulaci/ }))
    expect(screen.queryByLabelText('Buscar estudiante')).not.toBeInTheDocument()
    const search = screen.getByRole('combobox', { name: 'Estudiante' })
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
    setup()
    fireEvent.click(await screen.findByRole('button', { name: /Nueva postulaci/ }))
    await pick('Estudiante', '394090 - Luis Fernando Menacho Melgar')
    await pick('Modalidad', 'Proyecto de Grado')
    await pick(/Semestre/, 'Gestión 2026 - Semestre II')
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(screen.getByRole('button', { name: /Guardando/ })).toBeDisabled()
    expect(crudService.create).toHaveBeenCalledTimes(1)
    expect(crudService.create).toHaveBeenCalledWith('/postulaciones/', { estudiante: 17, modalidad: 3, periodo: 8, observaciones_generales: '' })
    resolveRequest({ id: 1 }); await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Nueva postulación' })).not.toBeInTheDocument())
  })

  it('tras crear ofrece abrir el expediente de la nueva postulación y se puede cerrar', async () => {
    crudService.create.mockResolvedValue({ id: 41, estudiante: 17, modalidad: 3, periodo: 8 })
    setup()
    fireEvent.click(await screen.findByRole('button', { name: /Nueva postulaci/ }))
    await pick('Estudiante', '394090 - Luis Fernando Menacho Melgar')
    await pick('Modalidad', 'Proyecto de Grado')
    await pick(/Semestre/, 'Gestión 2026 - Semestre II')
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    const created = await screen.findByRole('dialog', { name: 'Postulación creada' })
    expect(within(created).getByText('394090 - Luis Fernando Menacho Melgar')).toBeInTheDocument()
    expect(within(created).getByRole('link', { name: 'Abrir expediente' })).toHaveAttribute('href', '/postulaciones/41')
    fireEvent.click(within(created).getAllByRole('button', { name: 'Cerrar' }).at(-1))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Postulación creada' })).not.toBeInTheDocument())
  })

  it('no ofrece abrir el expediente después de editar', async () => {
    const row = { id: 41, codigo: 'POST-041', estudiante: 17, modalidad: 3, periodo: 8 }
    crudService.update.mockResolvedValue({ ...row })
    postulacionesService.obtenerDetalle.mockResolvedValue(row)
    setup({ rows: [row] })
    await openEdit()
    fireEvent.click(await screen.findByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(crudService.update).toHaveBeenCalled())
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /Editar/ })).not.toBeInTheDocument())
    expect(screen.queryByRole('dialog', { name: 'Postulación creada' })).not.toBeInTheDocument()
  })

  it('muestra el tipo de registro y mantiene Proceso con seguimiento como valor por defecto', async () => {
    setup()
    await userEvent.click(await screen.findByRole('button', { name: /Nueva postulaci/ }))
    const selector = screen.getByRole('combobox', { name: 'Tipo de registro' })
    expect(selector).toHaveTextContent('Proceso con seguimiento')
    await openList('Tipo de registro')
    expect(screen.getByRole('option', { name: 'Proceso con seguimiento' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('option', { name: 'Registro histórico' })).toBeInTheDocument()
  })

  it('usa el endpoint normal en el flujo de seguimiento y evita workflow histórico', async () => {
    setup()
    await userEvent.click(await screen.findByRole('button', { name: /Nueva postulaci/ }))
    expect(screen.queryByLabelText('Código')).not.toBeInTheDocument()
    await pick('Estudiante', '394090 - Luis Fernando Menacho Melgar')
    await pick('Modalidad', 'Proyecto de Grado')
    await pick(/Semestre/, 'Gestión 2026 - Semestre II')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(crudService.create).toHaveBeenCalledWith('/postulaciones/', {
      estudiante: 17, modalidad: 3, periodo: 8, observaciones_generales: '',
    })
    expect(postulacionesService.inicializarFlujo).not.toHaveBeenCalled()
  })

  it('crea la postulación histórica en la ruta adecuada y ofrece continuar a su documentación', async () => {
    const user = userEvent.setup()
    crudService.create.mockResolvedValue({ id: 55, codigo: 'HIST-2022', estudiante: 17, modalidad: 3, periodo: 8, tipo_registro: 'HISTORICO', estudiante_detalle: { nombre_completo: 'Luis Fernando Menacho Melgar' }, modalidad_detalle: { nombre: 'Proyecto de Grado' }, periodo_detalle: { gestion: 2022, semestre: 'I' } })
    setup()
    await user.click(await screen.findByRole('button', { name: /Nueva postulaci/ }))
    await pick('Tipo de registro', 'Registro histórico', user)
    expect(screen.queryByLabelText(/C.digo/)).not.toBeInTheDocument()
    await pick('Estudiante', '394090 - Luis Fernando Menacho Melgar', user)
    await pick('Modalidad', 'Proyecto de Grado', user)
    await pick(/Semestre/, 'Gestión 2026 - Semestre II', user)
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(crudService.create).toHaveBeenCalledWith('/api/v1/postulaciones/historicas/', { estudiante: 17, modalidad: 3, periodo: 8, observaciones_generales: '' }))
    expect(postulacionesService.inicializarFlujo).not.toHaveBeenCalled()
    expect(await screen.findByText('Registro histórico creado')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cargar documentación' })).toBeInTheDocument()
  })

  it('consulta los tipos históricos de la postulación y muestra nombres del backend', async () => {
    const historical = { id: 55, codigo: 'HIST-2022', estudiante: 17, modalidad: 3, periodo: 8, tipo_registro: 'HISTORICO', estudiante_detalle: { nombre_completo: 'Luis Fernando Menacho Melgar' }, modalidad_detalle: { nombre: 'Proyecto de Grado' }, periodo_detalle: { gestion: 2022, semestre: 'I' } }
    crudService.create.mockResolvedValue(historical)
    postulacionesService.obtenerTiposDocumentosHistoricos.mockResolvedValue([
      { id: 11, codigo: 'ACTA_DEFENSA', nombre: 'Acta de defensa' },
      { id: 12, codigo: 'CERTIFICADO', nombre: 'Certificado' },
    ])
    setup()
    fireEvent.click(await screen.findByRole('button', { name: /Nueva postulaci/ }))
    await pick('Tipo de registro', 'Registro histórico')
    await pick('Estudiante', '394090 - Luis Fernando Menacho Melgar')
    await pick('Modalidad', 'Proyecto de Grado')
    await pick(/Semestre/, 'Gestión 2026 - Semestre II')
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Cargar documentación' }))

    await waitFor(() => expect(postulacionesService.obtenerTiposDocumentosHistoricos).toHaveBeenCalledWith(55, expect.any(AbortSignal)))
    await openList('Tipo de documento *')
    expect(screen.getByRole('option', { name: 'Acta de defensa' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Certificado' })).toBeInTheDocument()
  })

  it('muestra un mensaje humano cuando no hay tipos históricos y bloquea la subida', async () => {
    crudService.create.mockResolvedValue({ id: 55, codigo: 'HIST-2022', estudiante: 17, modalidad: 3, periodo: 8, tipo_registro: 'HISTORICO' })
    postulacionesService.obtenerTiposDocumentosHistoricos.mockResolvedValue([])
    setup()
    fireEvent.click(await screen.findByRole('button', { name: /Nueva postulaci/ }))
    await pick('Tipo de registro', 'Registro histórico')
    await pick('Estudiante', '394090 - Luis Fernando Menacho Melgar')
    await pick('Modalidad', 'Proyecto de Grado')
    await pick(/Semestre/, 'Gestión 2026 - Semestre II')
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Cargar documentación' }))

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
    await pick('Tipo de registro', 'Registro histórico', user)
    await pick('Estudiante', '394090 - Luis Fernando Menacho Melgar', user)
    await pick('Modalidad', 'Proyecto de Grado', user)
    await pick(/Semestre/, 'Gestión 2026 - Semestre II', user)
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    await user.click(await screen.findByRole('button', { name: 'Cargar documentación' }))
    await pick('Tipo de documento *', 'Acta de defensa', user)
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
    await pick('Tipo de registro', 'Registro histórico', user)
    await pick('Estudiante', '394090 - Luis Fernando Menacho Melgar', user)
    await pick('Modalidad', 'Proyecto de Grado', user)
    await pick(/Semestre/, 'Gestión 2026 - Semestre II', user)
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    await user.click(await screen.findByRole('button', { name: 'Cargar documentación' }))
    await pick('Tipo de documento *', 'Acta de defensa', user)
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
    // La lista muestra solo el nombre; el tipo de registro se lee en Detalle.
    await screen.findAllByRole('link', { name: 'Abrir expediente' })
    expect(screen.queryByText('Proceso con seguimiento')).not.toBeInTheDocument()
    postulacionesService.obtenerDetalle.mockResolvedValue({ id: 2, codigo: 'POST-002', estudiante: 17, modalidad: 3, periodo: 8, tipo_registro: 'HISTORICO' })
    await userEvent.click(screen.getAllByRole('button', { name: 'Detalle' })[1])
    const dialog = screen.getByRole('dialog', { name: 'Detalle de la postulación' })
    expect(await within(dialog).findByText('Registro histórico')).toBeInTheDocument()
  })

  it.each([
    ['PROYECTO_GRADO', 'Proyecto de Grado'],
    ['TESIS_GRADO', 'Tesis de Grado'],
    ['TRABAJO_DIRIGIDO', 'Trabajo Dirigido'],
    ['EXAMEN_GRADO', 'Examen de Grado'],
    ['EXCELENCIA_ACADEMICA', 'Excelencia Académica'],
    ['GRADUACION_VIA_DIPLOMADO', 'Graduación Vía Diplomado'],
  ].flatMap(([modalidadCodigo, modalidadNombre]) => ['SEGUIMIENTO', 'HISTORICO'].map((tipoRegistro) => ({
    modalidadCodigo, modalidadNombre, tipoRegistro,
  }))))('no muestra el código en la tarjeta para $modalidadCodigo / $tipoRegistro', async ({ modalidadCodigo, modalidadNombre, tipoRegistro }) => {
    const code = `8785-${modalidadCodigo}-${tipoRegistro}`
    setup({
      rows: [{
        id: 42,
        codigo: code,
        estudiante: student.id,
        modalidad: 3,
        periodo: period.id,
        tipo_registro: tipoRegistro,
        estudiante_detalle: student,
        modalidad_detalle: { id: 3, codigo: modalidadCodigo, nombre: modalidadNombre },
        periodo_detalle: period,
        estado_actual_detalle: { codigo: 'REGISTRADA', nombre: 'Registrada' },
      }],
    })

    const card = (await screen.findByRole('link', { name: 'Abrir expediente' })).closest('article')

    expect(within(card).queryByText(code)).not.toBeInTheDocument()
    expect(within(card).getByRole('heading', { name: formatStudentLabel(student) })).toBeInTheDocument()
    // Como en Fondo de Tiempo: la tarjeta muestra nombre, modalidad y estado; periodo y tipo
    // de registro se ven en Detalle.
    expect(within(card).getByText(modalidadNombre)).toBeInTheDocument()
    expect(within(card).getByText('Registrada')).toBeInTheDocument()
    expect(within(card).queryByText(formatPeriodoLabel(period))).not.toBeInTheDocument()
    expect(within(card).queryByText(tipoRegistro === 'HISTORICO' ? 'Registro histórico' : 'Proceso con seguimiento')).not.toBeInTheDocument()
    expect(within(card).getByRole('link', { name: 'Abrir expediente' })).toBeInTheDocument()
    expect(within(card).getByRole('button', { name: 'Detalle' })).toBeInTheDocument()
    // Editar está dentro de la ventana de Detalle, no en la tarjeta.
    expect(within(card).queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
  })

  it('limpia la búsqueda, vuelve a la primera página y muestra la nueva postulación tras crear', async () => {
    const created = { id: 41, codigo: 'POST-2026-001', estudiante: 17, modalidad: 3, periodo: 8 }
    // La lista ya no muestra el código: la nueva postulación se reconoce por su estudiante.
    const existing = { id: 40, codigo: 'POST-EXISTENTE', estudiante: 99, estudiante_detalle: { ru: '111', nombre_completo: 'Otra Estudiante' }, modalidad: 3, periodo: 8 }
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
    fireEvent.change(search, { target: { value: '20260001' } })
    await waitFor(() => expect(crudService.list).toHaveBeenLastCalledWith('/postulaciones/', { search: '20260001', page: 1, ordering: '-created_at', page_size: 15 }, expect.any(AbortSignal)))
    fireEvent.click(await screen.findByRole('button', { name: 'Siguiente' }))
    await waitFor(() => expect(crudService.list).toHaveBeenLastCalledWith(
      '/postulaciones/',
      { search: '20260001', page: 2, ordering: '-created_at', page_size: 15 },
      expect.any(AbortSignal),
    ))

    fireEvent.click(screen.getByRole('button', { name: /Nueva postulaci/ }))
    await pick('Estudiante', '394090 - Luis Fernando Menacho Melgar')
    await pick('Modalidad', 'Proyecto de Grado')
    await pick(/Semestre/, 'Gestión 2026 - Semestre II')
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(search).toHaveValue(''))
    await waitFor(() => expect(crudService.list).toHaveBeenLastCalledWith(
      '/postulaciones/',
      { search: '', page: 1, ordering: '-created_at', page_size: 15 },
      expect.any(AbortSignal),
    ))
    expect((await screen.findAllByText('394090 - Luis Fernando Menacho Melgar')).length).toBeGreaterThan(0)
    expect(screen.queryByText(/Otra Estudiante/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Página 1' })).toHaveAttribute('aria-current', 'page')
  })

  it('oculta el alta sin permiso explícito', async () => {
    crudService.list.mockResolvedValue({ count:0, results:[] })
    render(<MemoryRouter><AuthContext.Provider value={{ hasPermission: () => false }}><PostulantesPage /></AuthContext.Provider></MemoryRouter>)
    await waitFor(() => expect(crudService.list).toHaveBeenCalled())
    expect(screen.queryByRole('button', { name: /Nueva postulaci/ })).not.toBeInTheDocument()
  })

  it('no muestra captura de código al crear y sigue presentando errores del backend', async () => {
    crudService.create.mockRejectedValue({
      status: 400,
      message: 'El periodo seleccionado no está disponible.',
      fields: { periodo: ['Seleccione un periodo activo.'] },
    })
    setup()
    fireEvent.click(await screen.findByRole('button', { name: 'Nueva postulación' }))
    expect(screen.queryByLabelText('Código')).not.toBeInTheDocument()
    await pick('Estudiante', '394090 - Luis Fernando Menacho Melgar')
    await pick('Modalidad', 'Proyecto de Grado')
    await pick('Gestión / Semestre', 'Gestión 2026 - Semestre II')
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('El periodo seleccionado no está disponible.')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('ofrece acceso al expediente sin retirar las acciones existentes', async () => {
    setup({ rows: [{ id: 41, codigo: 'POST-041', estudiante: 17, modalidad: 3, periodo: 8 }] })
    const link = await screen.findByRole('link', { name: 'Abrir expediente' })
    expect(link).toHaveAttribute('href', '/postulaciones/41')
    expect(screen.getByRole('button', { name: 'Detalle' })).toBeInTheDocument()
  })

  it('conserva el campo Código al editar una postulación existente', async () => {
    const row = { id: 41, codigo: 'POST-041', estudiante: 17, modalidad: 3, periodo: 8 }
    postulacionesService.obtenerDetalle.mockResolvedValue(row)
    setup({ rows: [row] })
    const card = (await screen.findByRole('link', { name: 'Abrir expediente' })).closest('article')
    await openEdit(within(card))
    expect(screen.getByLabelText('Código')).toHaveValue('POST-041')
  })

  it.each([
    { statusCode: 'REGISTRADA', statusName: 'Registrada', tone: 'warning', modalityCode: 'PROYECTO_GRADO', modalityName: 'Proyecto de Grado' },
    { statusCode: 'PENDIENTE', statusName: 'Pendiente', tone: 'warning', modalityCode: 'PROYECTO_GRADO', modalityName: 'Proyecto de Grado' },
    { statusCode: 'EN_PROCESO', statusName: 'En proceso', tone: 'info', modalityCode: 'TRABAJO_DIRIGIDO', modalityName: 'Trabajo Dirigido' },
    { statusCode: 'EN_REVISION', statusName: 'En revisión', tone: 'info', modalityCode: 'TESIS_GRADO', modalityName: 'Tesis de Grado' },
    { statusCode: 'OBSERVADA', statusName: 'Observada', tone: 'warning', modalityCode: 'GRADUACION_VIA_DIPLOMADO', modalityName: 'Graduación Vía Diplomado' },
    { statusCode: 'SUBSANADA', statusName: 'Subsanada', tone: 'info', modalityCode: 'EXCELENCIA_ACADEMICA', modalityName: 'Excelencia Académica' },
    { statusCode: 'APROBADA', statusName: 'Aprobada', tone: 'success', modalityCode: 'EXAMEN_GRADO', modalityName: 'Examen de Grado' },
    { statusCode: 'RECHAZADA', statusName: 'Rechazada', tone: 'danger', modalityCode: 'PROYECTO_GRADO', modalityName: 'Proyecto de Grado' },
    { statusCode: 'CONCLUIDA', statusName: 'Concluida', tone: 'success', modalityCode: 'TRABAJO_DIRIGIDO', modalityName: 'Trabajo Dirigido' },
    { statusCode: 'CANCELADA', statusName: 'Cancelada', tone: 'neutral', modalityCode: 'TRABAJO_DIRIGIDO', modalityName: 'Trabajo Dirigido' },
    { statusCode: null, statusName: 'Sin estado', tone: 'neutral', modalityCode: 'TESIS_GRADO', modalityName: 'Tesis de Grado' },
  ])('presenta $statusCode una sola vez en $modalityCode', async ({ statusCode, statusName, tone, modalityCode, modalityName }) => {
    setup({
      rows: [{
        id: 42,
        codigo: 'POST-042',
        estudiante: 17,
        modalidad: 3,
        periodo: 8,
        estado_actual_detalle: statusCode ? { codigo: statusCode, nombre: statusName } : null,
        estudiante_detalle: student,
        modalidad_detalle: { id: 3, codigo: modalityCode, nombre: modalityName },
        periodo_detalle: period,
        tipo_registro: 'SEGUIMIENTO',
      }],
    })

    // Tarjeta (como Fondo de Tiempo): nombre, modalidad, estado con su color y acciones.
    const link = await screen.findByRole('link', { name: 'Abrir expediente' })
    const card = link.closest('article')
    const actions = link.parentElement
    const detailButton = within(card).getByRole('button', { name: 'Detalle' })

    expect(link).toHaveAttribute('href', '/postulaciones/42')
    expect(link).toHaveClass('action-button')
    expect(actions).toHaveClass('postulante-actions')
    expect(actions).toContainElement(detailButton)
    expect(within(card).queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
    expect(within(card).getAllByText(statusName)).toHaveLength(1)
    expect(within(card).getByText(statusName)).toHaveAttribute('data-tone', tone)
    expect(within(card).queryByText('POST-042')).not.toBeInTheDocument()
    expect(within(card).getByRole('heading', { name: formatStudentLabel(student) })).toBeInTheDocument()
    for (const action of [link, detailButton]) {
      expect(action.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    }

    postulacionesService.obtenerDetalle.mockResolvedValue({
      id: 42, codigo: 'POST-042', estudiante: 17, modalidad: 3, periodo: 8, tipo_registro: 'SEGUIMIENTO',
      estado_actual_detalle: statusCode ? { codigo: statusCode, nombre: statusName } : null,
      estudiante_detalle: student, modalidad_detalle: { id: 3, codigo: modalityCode, nombre: modalityName }, periodo_detalle: period,
    })
    await userEvent.click(detailButton)
    const dialog = screen.getByRole('dialog', { name: 'Detalle de la postulación' })
    const statusBadge = await within(dialog).findByText(statusName)
    expect(within(dialog).getAllByText(statusName)).toHaveLength(1)
    expect(statusBadge).toHaveClass('postulante-status')
    expect(statusBadge).toHaveAttribute('data-tone', tone)
    expect(within(dialog).getByText(modalityName)).toBeInTheDocument()
    expect(within(dialog).getByText('Proceso con seguimiento')).toBeInTheDocument()
  })

  it('busca sola al escribir: no hay botón Buscar y la lista se actualiza', async () => {
    setup({ rows: [{ id: 41, codigo: 'POST-041', estudiante: 17, modalidad: 3, periodo: 8 }] })
    const search = await screen.findByRole('textbox', { name: 'Buscar' })
    expect(screen.queryByRole('button', { name: 'Buscar' })).not.toBeInTheDocument()
    fireEvent.change(search, { target: { value: 'Menacho' } })
    await waitFor(() => expect(crudService.list).toHaveBeenLastCalledWith('/postulaciones/', { search: 'Menacho', page: 1, ordering: '-created_at', page_size: 15 }, expect.any(AbortSignal)))
  })

  it('permite ver a los estudiantes en tarjetas o en lista y recuerda la elección', async () => {
    localStorage.removeItem('sm_postulantes_vista')
    setup({ rows: [{ id: 41, codigo: 'POST-041', estudiante: 17, modalidad: 3, periodo: 8 }] })
    await screen.findByRole('link', { name: 'Abrir expediente' })
    expect(document.querySelector('.postulantes-cards')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Lista' }))
    expect(screen.getByRole('button', { name: 'Lista' })).toHaveAttribute('aria-pressed', 'true')
    // Lista tipo tabla: fila de títulos y una fila por estudiante, con sus acciones.
    const table = document.querySelector('.postulantes-table')
    expect(table).toBeInTheDocument()
    expect(table).toHaveTextContent('Estudiante')
    expect(within(table).getByRole('link', { name: 'Abrir expediente' })).toBeInTheDocument()
    expect(document.querySelector('.postulantes-cards')).not.toBeInTheDocument()
    expect(localStorage.getItem('sm_postulantes_vista')).toBe('lista')
    localStorage.removeItem('sm_postulantes_vista')
  })

  it('la paginación solo aparece cuando hay más de una página y pide 15 en tarjetas o 20 en lista', async () => {
    localStorage.removeItem('sm_postulantes_vista')
    const row = { id: 41, codigo: 'POST-041', estudiante: 17, modalidad: 3, periodo: 8 }
    setup({ listImplementation: () => Promise.resolve({ count: 1, next: null, previous: null, results: [row] }) })
    await screen.findByRole('link', { name: 'Abrir expediente' })
    expect(screen.queryByRole('navigation', { name: 'Paginación de postulantes' })).not.toBeInTheDocument()

    crudService.list.mockImplementation((_path, params) => Promise.resolve({ count: 40, next: params.page < 2 ? '?page=2' : null, previous: params.page > 1 ? '?page=1' : null, results: [row] }))
    await userEvent.click(screen.getByRole('button', { name: 'Lista' }))
    const nav = await screen.findByRole('navigation', { name: 'Paginación de postulantes' })
    expect(within(nav).getByRole('button', { name: 'Página 1' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('button', { name: 'Página 2' })).toBeInTheDocument()
    expect(crudService.list).toHaveBeenLastCalledWith('/postulaciones/', { search: '', page: 1, ordering: '-created_at', page_size: 20 }, expect.any(AbortSignal))
    await userEvent.click(within(nav).getByRole('button', { name: 'Página 2' }))
    await waitFor(() => expect(crudService.list).toHaveBeenLastCalledWith('/postulaciones/', { search: '', page: 2, ordering: '-created_at', page_size: 20 }, expect.any(AbortSignal)))
    localStorage.removeItem('sm_postulantes_vista')
  })

  it('filtra por modalidad desde Filtrar y pagina en el navegador', async () => {
    localStorage.removeItem('sm_postulantes_vista')
    const tesis = { id: 4, codigo: 'TESIS_GRADO', nombre: 'Tesis de Grado', activo: true }
    const rows = [
      { id: 1, codigo: 'P-1', estudiante: 17, modalidad: 3, periodo: 8, estudiante_detalle: student, modalidad_detalle: modality },
      { id: 2, codigo: 'T-1', estudiante: 39, modalidad: 4, periodo: 8, estudiante_detalle: ana, modalidad_detalle: tesis },
    ]
    setup({ rows, modalities: [modality, tesis], students: [student, ana] })
    listAll.mockImplementation((path) => Promise.resolve(path === endpoints.postulaciones ? rows : path === endpoints.modalidades ? [modality, tesis] : path === endpoints.periodos ? [period] : [student, ana]))
    await screen.findAllByRole('link', { name: 'Abrir expediente' })
    // Las opciones de Filtrar se llaman igual que los botones de modalidad sobre la lista.
    const menuOption = (name) => screen.getAllByRole('button', { name }).find((button) => !button.closest('.modality-chips'))
    await userEvent.click(screen.getByRole('button', { name: /Filtrar/ }))
    expect(screen.queryByRole('button', { name: 'Limpiar' })).not.toBeInTheDocument()
    await userEvent.click(menuOption('Tesis de Grado'))
    await waitFor(() => expect(screen.getAllByRole('link', { name: 'Abrir expediente' })).toHaveLength(1))
    expect(screen.getByRole('heading', { name: formatStudentLabel(ana) })).toBeInTheDocument()
    expect(listAll).toHaveBeenCalledWith(endpoints.postulaciones, { search: '', ordering: '-created_at' }, expect.any(AbortSignal))
    // Se puede marcar más de una modalidad; no hay botón Limpiar.
    await userEvent.click(menuOption('Proyecto de Grado'))
    await waitFor(() => expect(screen.getAllByRole('link', { name: 'Abrir expediente' })).toHaveLength(2))
    expect(menuOption('Tesis de Grado')).toHaveAttribute('aria-pressed', 'true')
    expect(menuOption('Proyecto de Grado')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('button', { name: 'Limpiar' })).not.toBeInTheDocument()
    await userEvent.click(menuOption('Tesis de Grado'))
    await waitFor(() => expect(screen.getAllByRole('link', { name: 'Abrir expediente' })).toHaveLength(1))
  })
  it('filtra con los botones de modalidad y comparte el valor con Filtrar', async () => {
    localStorage.removeItem('sm_postulantes_vista')
    const tesis = { id: 4, codigo: 'TESIS_GRADO', nombre: 'Tesis de Grado', activo: true }
    const rows = [
      { id: 1, codigo: 'P-1', estudiante: 17, modalidad: 3, periodo: 8, estudiante_detalle: student, modalidad_detalle: modality },
      { id: 2, codigo: 'T-1', estudiante: 39, modalidad: 4, periodo: 8, estudiante_detalle: ana, modalidad_detalle: tesis },
    ]
    setup({ rows, modalities: [modality, tesis], students: [student, ana] })
    listAll.mockImplementation((path) => Promise.resolve(path === endpoints.postulaciones ? rows : path === endpoints.modalidades ? [modality, tesis] : path === endpoints.periodos ? [period] : [student, ana]))
    await screen.findAllByRole('link', { name: 'Abrir expediente' })
    const chips = screen.getByRole('group', { name: 'Filtrar por modalidad' })
    // Proyecto de Grado va primero (orden de los colores del sistema), después Tesis.
    expect(within(chips).getAllByRole('button').map((button) => button.textContent)).toEqual(['Todas', 'Proyecto de Grado', 'Tesis de Grado'])
    expect(within(chips).getByRole('button', { name: 'Todas' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(within(chips).getByRole('button', { name: 'Tesis de Grado' }))
    await waitFor(() => expect(screen.getAllByRole('link', { name: 'Abrir expediente' })).toHaveLength(1))
    expect(screen.getByRole('heading', { name: formatStudentLabel(ana) })).toBeInTheDocument()
    expect(within(chips).getByRole('button', { name: 'Tesis de Grado' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(chips).getByRole('button', { name: 'Todas' })).toHaveAttribute('aria-pressed', 'false')
    // El menú Filtrar muestra la misma modalidad elegida.
    await userEvent.click(screen.getByRole('button', { name: /Filtrar/ }))
    expect(screen.getAllByRole('button', { name: 'Tesis de Grado' }).find((button) => !button.closest('.modality-chips'))).toHaveAttribute('aria-pressed', 'true')
    await userEvent.keyboard('{Escape}')
    // Tocar la elegida otra vez vuelve a "Todas".
    await userEvent.click(within(chips).getByRole('button', { name: 'Tesis de Grado' }))
    await waitFor(() => expect(screen.getAllByRole('link', { name: 'Abrir expediente' })).toHaveLength(2))
    expect(within(chips).getByRole('button', { name: 'Todas' })).toHaveAttribute('aria-pressed', 'true')
  })


  it('sin coincidencias muestra un aviso propio (con sugerencia) en lugar de cortar la lista', async () => {
    const row = { id: 41, codigo: 'POST-041', estudiante: 17, modalidad: 3, periodo: 8 }
    setup({ listImplementation: (_path, params) => Promise.resolve(params.search ? { count: 0, next: null, previous: null, results: [] } : { count: 1, next: null, previous: null, results: [row] }) })
    await screen.findByRole('link', { name: 'Abrir expediente' })
    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar' }), { target: { value: 'nadie' } })
    const empty = await screen.findByText('No hay estudiantes que coincidan')
    expect(empty.closest('[role="status"]')).toHaveClass('postulantes-empty', 'animate-row-in')
    expect(screen.getByText(/Prueba con otro nombre/)).toBeInTheDocument()
  })
})
