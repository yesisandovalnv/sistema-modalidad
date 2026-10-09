import { beforeEach, describe, expect, it, vi } from 'vitest'
import apiClient from './api'
import { reportesService } from './reportesService'

vi.mock('./api', () => ({ default: { get: vi.fn() } }))

describe('reportesService.obtenerResultados', () => {
  beforeEach(() => vi.clearAllMocks())

  it('consume el endpoint R2 y descarta filtros derivados no soportados', async () => {
    apiClient.get.mockResolvedValue({ data: { count: 0, next: null, previous: null, results: [] } })
    await reportesService.obtenerResultados({ page: 2, page_size: 20, buscar: 'Ana', gestion: 2026, semestre: 'I', modalidad: 3, estado_administrativo: 4, definitivo: true, estado_disponibilidad: 'DEFINITIVO', resultado: 'APROBADO' })
    const url = apiClient.get.mock.calls[0][0]
    expect(url).toContain('/api/v1/reportes/resultados/?')
    expect(url).toContain('page=2')
    expect(url).toContain('page_size=20')
    expect(url).toContain('buscar=Ana')
    expect(url).toContain('gestion=2026')
    expect(url).toContain('semestre=I')
    expect(url).toContain('modalidad=3')
    expect(url).toContain('estado_administrativo=4')
    expect(url).not.toContain('definitivo')
    expect(url).not.toContain('estado_disponibilidad')
    expect(url).not.toContain('resultado=')
  })
})

describe('reportesService.imprimirPostulaciones', () => {
  beforeEach(() => vi.clearAllMocks())

  it('solicita HTML imprimible con los filtros actuales', async () => {
    const blob = new Blob(['html'], { type: 'text/html' })
    apiClient.get.mockResolvedValue({ data: blob })
    await expect(reportesService.imprimirPostulaciones({ gestion: 2026, semestre: 'II' })).resolves.toBe(blob)
    expect(apiClient.get).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/reportes/postulaciones/exportar/?gestion=2026&semestre=II&formato=html'),
      expect.objectContaining({ responseType: 'blob' }),
    )
  })
})

describe('reportesService.exportarResultadosAcademicosXLSX', () => {
  beforeEach(() => vi.clearAllMocks())

  it('solicita XLSX con solo filtros R2 aplicados y usa el nombre institucional por defecto', async () => {
    const blob = new Blob(['xlsx'])
    apiClient.get.mockResolvedValue({ data: blob, headers: {} })
    await expect(reportesService.exportarResultadosAcademicosXLSX({
      buscar: 'Ana', gestion: 2026, semestre: 'I', modalidad: 3,
      estado_administrativo: 4, page: 2, page_size: 20, definitivo: true, extra: '',
    })).resolves.toEqual({ blob, filename: 'resultados-academicos.xlsx' })
    const [url, config] = apiClient.get.mock.calls[0]
    expect(url).toContain('/api/v1/reportes/resultados/exportar/?')
    expect(url).toContain('buscar=Ana')
    expect(url).toContain('gestion=2026')
    expect(url).toContain('semestre=I')
    expect(url).toContain('modalidad=3')
    expect(url).toContain('estado_administrativo=4')
    expect(url).toContain('formato=xlsx')
    expect(url).not.toContain('page=')
    expect(url).not.toContain('page_size=')
    expect(url).not.toContain('definitivo')
    expect(config).toMatchObject({ responseType: 'blob' })
  })

  it('prefiere el filename válido del backend', async () => {
    const blob = new Blob(['xlsx'])
    apiClient.get.mockResolvedValue({ data: blob, headers: { 'content-disposition': 'attachment; filename="institucional.xlsx"' } })
    await expect(reportesService.exportarResultadosAcademicosXLSX()).resolves.toEqual({
      blob,
      filename: 'institucional.xlsx',
    })
  })
})

describe('reportesService.imprimirResultadosAcademicos', () => {
  beforeEach(() => vi.clearAllMocks())

  it('solicita HTML como Blob y elimina filtros vacíos, paginación y derivados', async () => {
    const blob = new Blob(['html'], { type: 'text/html' })
    apiClient.get.mockResolvedValue({ data: blob })
    await expect(reportesService.imprimirResultadosAcademicos({
      buscar: '', gestion: 2026, semestre: 'II', modalidad: 3,
      estado_administrativo: 4, page: 2, page_size: 20, resultado: 'FAVORABLE',
    })).resolves.toBe(blob)
    const [url, config] = apiClient.get.mock.calls[0]
    expect(url).toContain('/api/v1/reportes/resultados/exportar/?')
    expect(url).toContain('gestion=2026')
    expect(url).toContain('semestre=II')
    expect(url).toContain('modalidad=3')
    expect(url).toContain('estado_administrativo=4')
    expect(url).toContain('formato=html')
    expect(url).not.toContain('buscar=')
    expect(url).not.toContain('page=')
    expect(url).not.toContain('resultado=')
    expect(config).toMatchObject({ responseType: 'blob' })
  })

  it('traduce errores recibidos como Blob usando el mensaje estándar', async () => {
    const error = {
      response: {
        status: 403,
        data: new Blob(['{"detail":"No autorizado."}'], { type: 'application/json' }),
      },
    }
    apiClient.get.mockRejectedValue(error)
    await expect(reportesService.imprimirResultadosAcademicos()).rejects.toMatchObject({
      status: 403,
      message: 'No tiene permisos para consultar esta información.',
    })
  })
})
