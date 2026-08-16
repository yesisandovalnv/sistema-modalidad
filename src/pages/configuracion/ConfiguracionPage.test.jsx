import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../../context/AuthContext'
import { crudService } from '../../services/crudService'
import ConfiguracionPage from './ConfiguracionPage'

vi.mock('../../services/crudService', () => ({
  endpoints: { periodos: '/periodos/', requisitos: '/requisitos/', tiposDocumento: '/tipos-documento/' },
  crudService: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
}))

const emptyPage = { count: 0, next: null, previous: null, results: [] }
const type = { id: 7, codigo: 'BORRADOR', nombre: 'Borrador', descripcion: '', obligatorio: false, permite_multiple_version: true, tamano_maximo_mb: 8, extensiones_permitidas: 'pdf,docx', activo: true }

function renderPage(canManage = true) {
  return render(<AuthContext.Provider value={{ hasPermission: (permission) => canManage && permission === 'puede_gestionar_catalogos' }}><ConfiguracionPage /></AuthContext.Provider>)
}
async function openTypes() {
  await userEvent.click(screen.getByRole('button', { name: 'Tipos de documento' }))
  await screen.findByRole('heading', { name: 'Tipos de documento' })
}

describe('Configuración de tipos de documento', () => {
  beforeEach(() => { crudService.list.mockResolvedValue(emptyPage); crudService.create.mockResolvedValue({}); crudService.update.mockResolvedValue({}); crudService.remove.mockResolvedValue() })

  it('solo muestra la pestaña con la capacidad administrativa', () => {
    const { rerender } = renderPage(false)
    expect(screen.queryByRole('button', { name: 'Tipos de documento' })).not.toBeInTheDocument()
    rerender(<AuthContext.Provider value={{ hasPermission: () => true }}><ConfiguracionPage /></AuthContext.Provider>)
    expect(screen.getByRole('button', { name: 'Tipos de documento' })).toBeInTheDocument()
  })

  it('consulta el endpoint y muestra el estado vacío', async () => {
    renderPage(); await openTypes()
    await waitFor(() => expect(crudService.list).toHaveBeenCalledWith('/tipos-documento/', { search: '', page: 1 }, expect.any(AbortSignal)))
    expect(screen.getByText('No se encontraron registros.')).toBeInTheDocument()
  })

  it('crea normalizando extensiones y preservando booleanos y tamaño', async () => {
    renderPage(); await openTypes(); await userEvent.click(screen.getByRole('button', { name: 'Nuevo registro' }))
    const dialog = screen.getByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText('Código'), 'PRUEBA')
    await userEvent.type(within(dialog).getByLabelText('Nombre'), 'Documento de prueba')
    await userEvent.click(within(dialog).getByLabelText('Obligatorio'))
    await userEvent.click(within(dialog).getByLabelText('Permite múltiples versiones'))
    const size = within(dialog).getByLabelText('Tamaño máximo (MB)'); await userEvent.clear(size); await userEvent.type(size, '12')
    const extensions = within(dialog).getByLabelText('Extensiones permitidas (separadas por comas)'); await userEvent.clear(extensions); await userEvent.type(extensions, ' PDF, docx, pdf ')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(crudService.create).toHaveBeenCalledWith('/tipos-documento/', expect.objectContaining({ codigo: 'PRUEBA', nombre: 'Documento de prueba', obligatorio: true, permite_multiple_version: true, tamano_maximo_mb: 12, extensiones_permitidas: 'pdf,docx' })))
  })

  it('edita y muestra validaciones duplicadas del backend', async () => {
    crudService.list.mockResolvedValue({ ...emptyPage, count: 1, results: [type] }); crudService.update.mockRejectedValue({ message: 'codigo: tipo documento con este código ya existe.' })
    renderPage(); await openTypes(); await screen.findByText('BORRADOR'); await userEvent.click(screen.getByRole('button', { name: 'Editar' })); await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('codigo: tipo documento con este código ya existe.')
  })

  it('busca, pagina y confirma antes de eliminar', async () => {
    crudService.list.mockResolvedValue({ count: 21, next: '/tipos-documento/?page=2', previous: null, results: [type] }); const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderPage(); await openTypes(); await screen.findByText('BORRADOR')
    await userEvent.type(screen.getByLabelText('Buscar'), 'borrador'); await userEvent.click(screen.getByRole('button', { name: 'Buscar' }))
    await waitFor(() => expect(crudService.list).toHaveBeenCalledWith('/tipos-documento/', { search: 'borrador', page: 1 }, expect.any(AbortSignal)))
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' })); await waitFor(() => expect(crudService.list).toHaveBeenCalledWith('/tipos-documento/', { search: 'borrador', page: 2 }, expect.any(AbortSignal)))
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' })); expect(confirm).toHaveBeenCalledWith(expect.stringContaining('acción es permanente')); expect(crudService.remove).toHaveBeenCalledWith('/tipos-documento/', 7)
  })

  it('muestra error de listado y permite reintentar', async () => {
    crudService.list.mockResolvedValueOnce(emptyPage).mockRejectedValueOnce({ message: 'No se pudo cargar.' }).mockResolvedValue(emptyPage)
    renderPage(); await openTypes(); expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar.'); await userEvent.click(screen.getByRole('button', { name: 'Reintentar' })); await waitFor(() => expect(crudService.list).toHaveBeenCalledTimes(3))
  })
})
