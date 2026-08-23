import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { AuthContext } from '../../context/AuthContext'
import DocumentosPage from './DocumentosPage'
import { crudService, endpoints, listAll } from '../../services/crudService'

vi.mock('../../services/crudService', () => ({
  endpoints: { documentos: '/documentos/', tiposDocumento: '/tipos-documento/', postulaciones: '/postulaciones/' },
  crudService: { list: vi.fn(), create: vi.fn() },
  listAll: vi.fn(),
}))

const application = {
  id: 2,
  codigo: 'PG-2026-001',
  estudiante_detalle: { ru: '20260001', nombre_completo: 'Ana Maria Quispe Mamani' },
}
const documentType = { id: 3, codigo: 'PERFIL', nombre: 'Perfil de modalidad de graduación' }
const auth = { hasPermission: (permission) => permission === 'puede_cargar_documentos' }

function setup() {
  crudService.list.mockImplementation((path) => Promise.resolve(
    path === endpoints.tiposDocumento
      ? { count: 1, next: null, previous: null, results: [documentType] }
      : { count: 0, next: null, previous: null, results: [] },
  ))
  listAll.mockResolvedValue([application])
  crudService.create.mockResolvedValue({ id: 10 })
  return render(<AuthContext.Provider value={auth}><DocumentosPage /></AuthContext.Provider>)
}

describe('Subir documento', () => {
  beforeEach(() => vi.clearAllMocks())

  it('carga las postulaciones accesibles y muestra una etiqueta entendible', async () => {
    setup()
    await userEvent.click(await screen.findByRole('button', { name: 'Subir documento' }))

    expect(listAll).toHaveBeenCalledWith(
      endpoints.postulaciones,
      { ordering: '-created_at' },
      expect.any(AbortSignal),
    )
    expect(screen.queryByLabelText('ID de postulación')).not.toBeInTheDocument()
    expect(screen.getByRole('option', {
      name: 'PG-2026-001 - 20260001 - Ana Maria Quispe Mamani',
    })).toBeInTheDocument()
  })

  it('envía el ID real seleccionado dentro del multipart existente', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(await screen.findByRole('button', { name: 'Subir documento' }))
    await user.selectOptions(screen.getByLabelText('Postulación'), '2')
    await user.selectOptions(screen.getByLabelText('Tipo de documento'), '3')
    await user.upload(screen.getByLabelText('Archivo'), new File(['contenido'], 'perfil.pdf', { type: 'application/pdf' }))
    fireEvent.submit(screen.getByRole('button', { name: 'Subir' }).closest('form'))

    await waitFor(() => expect(crudService.create).toHaveBeenCalledTimes(1))
    const [path, body, config] = crudService.create.mock.calls[0]
    expect(path).toBe('/documentos/subir/')
    expect(body).toBeInstanceOf(FormData)
    expect(body.get('postulacion_id')).toBe('2')
    expect(body.get('tipo_documento_id')).toBe('3')
    expect(body.get('archivo')).toBeInstanceOf(File)
    expect(config).toBeUndefined()
  })
})
