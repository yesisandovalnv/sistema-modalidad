import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { vi } from 'vitest'
import ReportePostulacionesPage from './ReportePostulacionesPage'
import { reportesService } from '../../services/reportesService'

const authState = vi.hoisted(() => ({ canExport: false }))
const filterPayload = { modalidad: '3', gestion: '2026', semestre: 'I', tipo_registro: 'HISTORICO', etapa_actual: '7', buscar: 'Ana', fecha_desde: '2026-01-01', fecha_hasta: '2026-12-31' }
vi.mock('../../services/reportesService', () => ({ reportesService: { obtenerPostulaciones: vi.fn(), exportarPostulacionesXLSX: vi.fn(), imprimirPostulaciones: vi.fn() } }))
vi.mock('../../hooks/useAuth', () => ({ useAuth: () => ({ hasPermission: () => authState.canExport }) }))
vi.mock('../../components/reports/ReportFilters', () => ({ ReportFilters: ({ onApply }) => <button type="button" onClick={() => onApply(filterPayload)}>Aplicar filtros de prueba</button> }))

const rows = [{
  postulacion_id: 1, postulante_nombre: 'Ana Pérez', modalidad: { nombre: 'Proyecto de grado' }, gestion: 2026, semestre: 'I',
  tutor_activo: 'tutor1', tipo_registro: 'SEGUIMIENTO', etapa_actual: 'DEFENSA_PUBLICA', estado_general: 'EN_PROCESO',
  porcentaje_etapas_aprobadas: 50, documentos_pendientes: 2, proxima_defensa: '2026-09-15T18:00:00Z', concluida: false,
  cierre_documental_aprobado: false, revision_final_aprobada: false, cierre_aplicable: true, fecha_actualizacion: '2026-08-20T12:00:00Z',
}]

describe('ReportePostulacionesPage institucional', () => {
  beforeEach(() => { authState.canExport = false; vi.clearAllMocks(); reportesService.obtenerPostulaciones.mockResolvedValue({ count: 1, next: null, previous: null, results: rows }) })

  it('muestra exclusivamente las siete columnas institucionales', async () => {
    render(<ReportePostulacionesPage />)
    await screen.findByText('Ana Pérez')
    const headers = screen.getAllByRole('columnheader').map((item) => item.textContent)
    expect(headers).toEqual(['N.º', 'Postulante', 'Modalidad', 'Gestión', 'Semestre', 'Etapa actual', 'Estado'])
    const table = screen.getByRole('table')
    for (const hidden of ['Tutor', 'Avance', 'Docs. pendientes', 'Próxima defensa', 'Cierre', 'Tipo de registro', 'Actualización']) expect(within(table).queryByText(hidden)).not.toBeInTheDocument()
    expect(within(table).getByText('Defensa Pública')).toBeInTheDocument()
    expect(within(table).getByText('En proceso')).toBeInTheDocument()
    expect(within(table).getByText('1')).toBeInTheDocument()
  })

  it('numera segun pagina y no usa el id interno', async () => {
    reportesService.obtenerPostulaciones
      .mockResolvedValueOnce({ count: 21, next: '/?page=2', previous: null, results: rows })
      .mockResolvedValueOnce({ count: 21, next: null, previous: '/?page=1', results: [{ ...rows[0], postulacion_id: 999, postulante_nombre: 'Segunda página' }] })
    render(<ReportePostulacionesPage />)
    await screen.findByText('Ana Pérez')
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    const secondRow = (await screen.findByText('Segunda página')).closest('tr')
    expect(within(secondRow).getByText('21')).toBeInTheDocument()
    expect(within(secondRow).queryByText('999')).not.toBeInTheDocument()
  })

  it('muestra solo Imprimir y Exportar Excel y conserva filtros en ambas acciones', async () => {
    authState.canExport = true
    reportesService.exportarPostulacionesXLSX.mockResolvedValue({ blob: new Blob(['xlsx']), filename: 'reporte_postulaciones.xlsx' })
    reportesService.imprimirPostulaciones.mockResolvedValue(new Blob(['html'], { type: 'text/html' }))
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:reporte'), revokeObjectURL: vi.fn() })
    const windowOpen = vi.spyOn(window, 'open').mockImplementation(() => null)
    render(<ReportePostulacionesPage />)
    await screen.findByText('Ana Pérez')
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros de prueba' }))
    await waitFor(() => expect(reportesService.obtenerPostulaciones).toHaveBeenLastCalledWith(expect.objectContaining({ ...filterPayload, page: 1, page_size: 20 }), expect.any(AbortSignal)))
    expect(screen.queryByRole('button', { name: /CSV/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Exportar Excel' }))
    await waitFor(() => expect(reportesService.exportarPostulacionesXLSX).toHaveBeenCalledWith(filterPayload))
    fireEvent.click(screen.getByRole('button', { name: 'Imprimir' }))
    await waitFor(() => expect(reportesService.imprimirPostulaciones).toHaveBeenCalledWith(filterPayload))
    const iframe = document.querySelector('iframe[title="Impresion temporal de postulaciones"]')
    expect(windowOpen).not.toHaveBeenCalled()
    expect(iframe).not.toBeNull()
    expect(iframe.src).toBe('blob:reporte')
    expect(iframe).toHaveAttribute('aria-hidden', 'true')
    expect(iframe.style.position).toBe('fixed')
    expect(iframe.style.left).toBe('-10000px')
    expect(iframe.style.pointerEvents).toBe('none')
    expect(screen.getByRole('button', { name: /Preparando/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Exportar Excel' })).toBeDisabled()

    const firstPrint = vi.spyOn(iframe.contentWindow, 'print').mockImplementation(() => {})
    fireEvent.load(iframe)
    expect(firstPrint).toHaveBeenCalledOnce()
    expect(document.body).toContainElement(iframe)
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Imprimir' })).toBeEnabled())
    expect(screen.getByRole('button', { name: 'Exportar Excel' })).toBeEnabled()
    iframe.contentWindow.dispatchEvent(new Event('afterprint'))
    await new Promise(requestAnimationFrame)
    expect(document.body).not.toContainElement(iframe)
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2)

    fireEvent.click(screen.getByRole('button', { name: 'Imprimir' }))
    await waitFor(() => expect(reportesService.imprimirPostulaciones).toHaveBeenCalledTimes(2))
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2)
    expect(document.querySelectorAll('iframe[title="Impresion temporal de postulaciones"]')).toHaveLength(1)
    const secondIframe = document.querySelector('iframe[title="Impresion temporal de postulaciones"]')
    expect(secondIframe).not.toBeNull()
    expect(windowOpen).not.toHaveBeenCalled()
    const secondPrint = vi.spyOn(secondIframe.contentWindow, 'print').mockImplementation(() => {})
    fireEvent.load(secondIframe)
    expect(secondPrint).toHaveBeenCalledOnce()
    expect(document.body).toContainElement(secondIframe)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Imprimir' })).toBeEnabled())
    expect(screen.getByRole('button', { name: 'Exportar Excel' })).toBeEnabled()
    fireEvent(window, new Event('afterprint'))
    await new Promise(requestAnimationFrame)
    expect(document.body).not.toContainElement(secondIframe)
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(3)
    expect(URL.revokeObjectURL).toHaveBeenLastCalledWith('blob:reporte')
    vi.unstubAllGlobals()
  })

  it('limpia una sola vez ante error de carga del iframe', async () => {
    authState.canExport = true
    reportesService.imprimirPostulaciones.mockResolvedValue(new Blob(['html'], { type: 'text/html' }))
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:reporte-error'), revokeObjectURL: vi.fn() })
    render(<ReportePostulacionesPage />)
    await screen.findByRole('table')
    fireEvent.click(screen.getByRole('button', { name: 'Imprimir' }))
    await waitFor(() => expect(document.querySelector('iframe[title="Impresion temporal de postulaciones"]')).not.toBeNull())
    const iframe = document.querySelector('iframe[title="Impresion temporal de postulaciones"]')
    fireEvent.error(iframe)
    expect(document.body).not.toContainElement(iframe)
    expect(URL.revokeObjectURL).toHaveBeenCalledOnce()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:reporte-error')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Imprimir' })).toBeEnabled())
    expect(screen.getByRole('button', { name: 'Exportar Excel' })).toBeEnabled()
    fireEvent.error(iframe)
    expect(URL.revokeObjectURL).toHaveBeenCalledOnce()
    vi.unstubAllGlobals()
  })

  it('restaura y limpia los recursos despues de afterprint', async () => {
    authState.canExport = true
    reportesService.imprimirPostulaciones.mockResolvedValue(new Blob(['html'], { type: 'text/html' }))
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:reporte-afterprint'), revokeObjectURL: vi.fn() })
    render(<ReportePostulacionesPage />)
    await screen.findByRole('table')
    fireEvent.click(screen.getByRole('button', { name: 'Imprimir' }))
    await waitFor(() => expect(document.querySelector('iframe[title="Impresion temporal de postulaciones"]')).not.toBeNull())
    const iframe = document.querySelector('iframe[title="Impresion temporal de postulaciones"]')
    vi.spyOn(iframe.contentWindow, 'print').mockImplementation(() => {})
    iframe.contentWindow.dispatchEvent(new Event('afterprint'))
    expect(document.body).toContainElement(iframe)
    fireEvent.load(iframe)
    iframe.contentWindow.dispatchEvent(new Event('afterprint'))
    await new Promise(requestAnimationFrame)
    expect(document.body).not.toContainElement(iframe)
    expect(URL.revokeObjectURL).toHaveBeenCalledOnce()
    vi.unstubAllGlobals()
  })

  it('limpia el iframe y la URL al desmontar', async () => {
    authState.canExport = true
    reportesService.imprimirPostulaciones.mockResolvedValue(new Blob(['html'], { type: 'text/html' }))
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:reporte-unmount'), revokeObjectURL: vi.fn() })
    const view = render(<ReportePostulacionesPage />)
    await screen.findByRole('table')
    fireEvent.click(screen.getByRole('button', { name: 'Imprimir' }))
    await waitFor(() => expect(document.querySelector('iframe[title="Impresion temporal de postulaciones"]')).not.toBeNull())
    const iframe = document.querySelector('iframe[title="Impresion temporal de postulaciones"]')
    view.unmount()
    expect(document.body).not.toContainElement(iframe)
    expect(URL.revokeObjectURL).toHaveBeenCalledOnce()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:reporte-unmount')
    vi.unstubAllGlobals()
  })

  it('conserva carga, vacio y error recuperable', async () => {
    reportesService.obtenerPostulaciones.mockReturnValueOnce(new Promise(() => {}))
    const first = render(<ReportePostulacionesPage />)
    expect(screen.getByText('Cargando reporte…')).toBeInTheDocument()
    first.unmount()
    reportesService.obtenerPostulaciones.mockResolvedValueOnce({ count: 0, next: null, previous: null, results: [] })
    const second = render(<ReportePostulacionesPage />)
    expect(await screen.findByText('No se encontraron postulaciones con los filtros aplicados.')).toBeInTheDocument()
    second.unmount()
    reportesService.obtenerPostulaciones.mockRejectedValueOnce({ message: 'No se pudo consultar.' })
    render(<ReportePostulacionesPage />)
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo consultar.')
  })
})
