import { beforeEach, describe, expect, it, vi } from 'vitest'
import apiClient from './api'
import { usuariosService } from './usuariosService'

vi.mock('./api', () => ({ default: { get: vi.fn(), post: vi.fn() } }))

describe('usuariosService importación de estudiantes', () => {
  beforeEach(() => vi.clearAllMocks())

  it('descarga la plantilla XLSX como Blob', async () => {
    const workbook = new Blob(['xlsx'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    apiClient.get.mockResolvedValue({ data: workbook })

    await expect(usuariosService.downloadStudentTemplate()).resolves.toBe(workbook)
    expect(apiClient.get).toHaveBeenCalledWith(
      '/api/v1/usuarios/importar-estudiantes/plantilla/',
      { responseType: 'blob' },
    )
  })

  it('envía el Excel en multipart y devuelve la vista previa JSON', async () => {
    const file = new File(['xlsx'], 'estudiantes.xlsx')
    const preview = { token: 'signed-lot', total: 1, valid: 1, rejected: 0, rows: [{ row_number: 2, valid: true, errors: [] }] }
    apiClient.post.mockResolvedValue({ data: preview })

    await expect(usuariosService.validateStudentImport(file)).resolves.toEqual(preview)
    const [url, body] = apiClient.post.mock.calls[0]
    expect(url).toBe('/api/v1/usuarios/importar-estudiantes/validar/')
    expect(body).toBeInstanceOf(FormData)
    expect(body.get('file')).toBe(file)
  })

  it('confirma el lote enviando el token como JSON y devuelve el resultado', async () => {
    const result = { lot_id: 'lot-id', total: 1, created: 1, rejected: 0, rows: [{ row_number: 2, created: true, errors: [] }], already_confirmed: false }
    apiClient.post.mockResolvedValue({ data: result })

    await expect(usuariosService.confirmStudentImport('signed-lot')).resolves.toEqual(result)
    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/v1/usuarios/importar-estudiantes/confirmar/',
      { token: 'signed-lot' },
    )
  })

  it('normaliza errores HTTP JSON con el manejo de usuarios existente', async () => {
    apiClient.post.mockRejectedValue({ response: { status: 400, data: { file: ['Seleccione un archivo Excel.'] } } })

    await expect(usuariosService.validateStudentImport(new File([''], 'vacio.xlsx')))
      .rejects.toMatchObject({ message: 'file: Seleccione un archivo Excel.' })
  })

  it('extrae el detalle de errores HTTP cuando Axios recibe un Blob', async () => {
    apiClient.get.mockRejectedValue({
      response: { status: 403, data: new Blob(['{"detail":"No autorizado."'], { type: 'application/json' }) },
    })

    await expect(usuariosService.downloadStudentTemplate()).rejects.toMatchObject({ message: 'No autorizado.' })
  })

  it('rechaza respuestas inesperadas y plantillas vacías', async () => {
    apiClient.post.mockResolvedValue({ data: { ok: true } })
    apiClient.get.mockResolvedValue({ data: new Blob([]) })

    await expect(usuariosService.validateStudentImport(new File(['xlsx'], 'estudiantes.xlsx')))
      .rejects.toMatchObject({ message: 'El servidor devolvió una respuesta inesperada al validar el archivo.' })
    await expect(usuariosService.downloadStudentTemplate())
      .rejects.toMatchObject({ message: 'El servidor devolvió una plantilla Excel vacía o inválida.' })
  })

  it('rechaza un resultado de confirmación con estructura inesperada', async () => {
    apiClient.post.mockResolvedValue({ data: { created: 'uno', rows: [] } })

    await expect(usuariosService.confirmStudentImport('signed-lot'))
      .rejects.toMatchObject({ message: 'El servidor devolvió una respuesta inesperada al confirmar la importación.' })
  })
})
