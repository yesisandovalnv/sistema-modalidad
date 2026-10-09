import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ResultadosAcademicosPage from './ResultadosAcademicosPage'
import { reportesService } from '../../services/reportesService'

vi.mock('../../services/reportesService', () => ({ reportesService: {
  obtenerResultados: vi.fn(), obtenerModalidades: vi.fn(), obtenerEstadosPostulacion: vi.fn(),
  exportarResultadosAcademicosXLSX: vi.fn(), imprimirResultadosAcademicos: vi.fn(),
} }))
const authState = vi.hoisted(() => ({ canExport: false }))
vi.mock('../../hooks/useAuth', () => ({ useAuth: () => ({ hasPermission: () => authState.canExport }) }))

const numeric = {
  estado_disponibilidad: 'DEFINITIVO', disponible: true, definitivo: true,
  nota_final: '95', escala: '0-100', resultado: 'APROBADO',
  clasificacion: 'APROBACION_PLENA_CON_FELICITACION', reconocimiento: null,
  semantica_valor_numerico: 'CALIFICACION_FINAL', promedio_academico: null,
  criterio: null, proceso_concluido: true, limitacion: null,
}
const average = {
  estado_disponibilidad: 'DEFINITIVO', disponible: true, definitivo: true,
  nota_final: null, escala: '0-100', resultado: 'FAVORABLE', clasificacion: null,
  reconocimiento: null, semantica_valor_numerico: 'PROMEDIO_ACADEMICO',
  promedio_academico: '88.50', criterio: 'RENDIMIENTO_ACADEMICO',
  proceso_concluido: false, limitacion: null,
}
const incomplete = {
  estado_disponibilidad: 'INCOMPLETO', disponible: true, definitivo: false,
  nota_final: null, escala: '0-100', resultado: null, clasificacion: null,
  reconocimiento: null, semantica_valor_numerico: null, promedio_academico: null,
  criterio: null, proceso_concluido: false, limitacion: 'Falta consolidar el resultado.',
}
const row = (id, name, result) => ({
  postulacion_id: id, postulacion_codigo: `POST-${id}`,
  estudiante: { id, nombre: name, ru: `RU-${id}` },
  modalidad: { id, codigo: 'MODALIDAD', nombre: `Modalidad ${id}` },
  gestion: 2026, semestre: 'I', estado_administrativo: { id: 4, codigo: 'EN_PROCESO', nombre: 'En proceso' },
  resultado_academico: result,
})

function renderPage() { return render(<MemoryRouter><ResultadosAcademicosPage /></MemoryRouter>) }

describe('ResultadosAcademicosPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.canExport = false
    reportesService.obtenerModalidades.mockResolvedValue([{ id: 3, nombre: 'Proyecto de Grado' }])
    reportesService.obtenerEstadosPostulacion.mockResolvedValue([{ id: 4, nombre: 'En proceso' }])
    reportesService.obtenerResultados.mockResolvedValue({ count: 3, next: null, previous: null, results: [row(1, 'Ana Pérez', numeric), row(2, 'Luis Rojas', average), row(3, 'Eva Soliz', incomplete)] })
    reportesService.exportarResultadosAcademicosXLSX.mockResolvedValue({ blob: new Blob(['xlsx']), filename: 'resultados-academicos.xlsx' })
    reportesService.imprimirResultadosAcademicos.mockResolvedValue(new Blob(['html'], { type: 'text/html' }))
  })

  it('presenta solo los valores y denominaciones académicas canónicas', async () => {
    renderPage()
    const numericRow = (await screen.findByText('Ana Pérez')).closest('tr')
    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'Estudiante', 'RU', 'Modalidad', 'Periodo', 'Estado', 'Valor académico', 'Resultado académico',
    ])
    expect(numericRow.cells).toHaveLength(7)
    expect(screen.queryByRole('columnheader', { name: 'Resultado / clasificación' })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Acción' })).not.toBeInTheDocument()
    expect(screen.queryByText('Abrir expediente')).not.toBeInTheDocument()
    expect(within(numericRow).getByText('95')).toBeInTheDocument()
    expect(within(numericRow).getByText('Aprobación plena con felicitación')).toBeInTheDocument()
    expect(within(numericRow).queryByText('Escala 0-100')).not.toBeInTheDocument()
    expect(within(numericRow).queryByText('Proceso concluido')).not.toBeInTheDocument()
    expect(within(numericRow).queryByText('Resultado definitivo')).not.toBeInTheDocument()
    expect(within(numericRow).queryByText(/Graduado|Titulado|Egresado/)).not.toBeInTheDocument()

    const averageRow = screen.getByText('Luis Rojas').closest('tr')
    expect(within(averageRow).getByText('88.50')).toBeInTheDocument()
    expect(within(averageRow).getByText('Favorable')).toBeInTheDocument()
    expect(within(averageRow).queryByText('Escala 0-100')).not.toBeInTheDocument()
    expect(within(averageRow).queryByText('Promedio académico')).not.toBeInTheDocument()

    const incompleteRow = screen.getByText('Eva Soliz').closest('tr')
    expect(within(incompleteRow).getByText('—')).toBeInTheDocument()
    expect(within(incompleteRow).getByText('Sin resultado')).toBeInTheDocument()
    expect(within(incompleteRow).queryByText('Ver limitación')).not.toBeInTheDocument()
    expect(within(incompleteRow).queryByText('Falta consolidar el resultado.')).not.toBeInTheDocument()
    expect(within(incompleteRow).queryByText('Resultado no definitivo')).not.toBeInTheDocument()
    expect(within(incompleteRow).queryByText('Resultado definitivo')).not.toBeInTheDocument()
    expect(within(incompleteRow).getByText('En proceso')).toBeInTheDocument()
    expect(screen.queryByText('Proceso concluido')).not.toBeInTheDocument()
  })

  it('solo muestra acciones de exportación con la capacidad existente', async () => {
    const view = renderPage()
    await screen.findByText('Ana Pérez')
    expect(screen.queryByRole('button', { name: 'Imprimir' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Excel' })).not.toBeInTheDocument()
    view.unmount()

    authState.canExport = true
    renderPage()
    expect(await screen.findByRole('button', { name: 'Imprimir' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Excel' })).toBeInTheDocument()
  })

  it('exporta e imprime solo con filtros aplicados, sin paginación ni borradores', async () => {
    authState.canExport = true
    const user = userEvent.setup()
    const createObjectURL = vi.fn()
      .mockReturnValueOnce('blob:academic-results-xlsx')
      .mockReturnValueOnce('blob:academic-results-print')
      .mockReturnValueOnce('blob:academic-results-print-second')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
    let downloadedFilename
    const linkClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
      downloadedFilename = this.download
    })
    const windowOpen = vi.spyOn(window, 'open')
    const windowPrint = vi.spyOn(window, 'print').mockImplementation(() => {})
    renderPage()
    await screen.findByText('Ana Pérez')

    await user.type(screen.getByLabelText('Buscar'), 'Ana')
    await user.type(screen.getByLabelText('Gestión'), '2026')
    await user.selectOptions(screen.getByLabelText('Semestre'), 'I')
    await user.selectOptions(screen.getByLabelText('Modalidad'), '3')
    await user.selectOptions(screen.getByLabelText('Estado administrativo'), '4')
    await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
    await waitFor(() => expect(reportesService.obtenerResultados).toHaveBeenLastCalledWith(
      expect.objectContaining({ buscar: 'Ana', gestion: '2026', semestre: 'I', modalidad: '3', estado_administrativo: '4', page: 1, page_size: 20 }),
      expect.any(AbortSignal),
    ))

    await user.clear(screen.getByLabelText('Buscar'))
    await user.type(screen.getByLabelText('Buscar'), 'Borrador')
    await user.click(screen.getByRole('button', { name: 'Excel' }))
    await waitFor(() => expect(reportesService.exportarResultadosAcademicosXLSX).toHaveBeenCalledWith({
      buscar: 'Ana', gestion: '2026', semestre: 'I', modalidad: '3', estado_administrativo: '4',
    }))
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
    expect(linkClick).toHaveBeenCalledOnce()
    expect(downloadedFilename).toBe('resultados-academicos.xlsx')
    expect(createObjectURL.mock.results[0].value).toBe('blob:academic-results-xlsx')
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:academic-results-xlsx')

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Imprimir' }))
      await Promise.resolve()
    })
    expect(reportesService.imprimirResultadosAcademicos).toHaveBeenCalledWith({
      buscar: 'Ana', gestion: '2026', semestre: 'I', modalidad: '3', estado_administrativo: '4',
    })
    expect(createObjectURL).toHaveBeenLastCalledWith(expect.any(Blob))
    expect(windowOpen).not.toHaveBeenCalled()
    expect(windowPrint).not.toHaveBeenCalled()

    const iframe = document.querySelector('iframe[title="Impresion temporal de resultados academicos"]')
    expect(iframe).not.toBeNull()
    expect(iframe.src).toBe('blob:academic-results-print')
    expect(iframe).toHaveAttribute('aria-hidden', 'true')
    expect(iframe.style.position).toBe('fixed')
    expect(iframe.style.left).toBe('-10000px')
    expect(iframe.style.pointerEvents).toBe('none')

    const firstPrint = vi.spyOn(iframe.contentWindow, 'print').mockImplementation(() => {})
    fireEvent.load(iframe)
    expect(firstPrint).toHaveBeenCalledOnce()
    expect(document.body).toContainElement(iframe)
    expect(revokeObjectURL).toHaveBeenCalledOnce()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Imprimir' })).toBeEnabled())
    expect(screen.getByRole('button', { name: 'Excel' })).toBeEnabled()
    iframe.contentWindow.dispatchEvent(new Event('afterprint'))
    await new Promise(requestAnimationFrame)
    expect(document.body).not.toContainElement(iframe)
    expect(revokeObjectURL).toHaveBeenCalledTimes(2)

    fireEvent.click(screen.getByRole('button', { name: 'Imprimir' }))
    await waitFor(() => expect(reportesService.imprimirResultadosAcademicos).toHaveBeenCalledTimes(2))
    expect(document.querySelectorAll('iframe[title="Impresion temporal de resultados academicos"]')).toHaveLength(1)
    const secondIframe = document.querySelector('iframe[title="Impresion temporal de resultados academicos"]')
    const secondPrint = vi.spyOn(secondIframe.contentWindow, 'print').mockImplementation(() => {})
    fireEvent.load(secondIframe)
    expect(secondPrint).toHaveBeenCalledOnce()
    expect(document.body).toContainElement(secondIframe)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Imprimir' })).toBeEnabled())
    expect(screen.getByRole('button', { name: 'Excel' })).toBeEnabled()
    fireEvent(window, new Event('afterprint'))
    await new Promise(requestAnimationFrame)
    expect(document.body).not.toContainElement(secondIframe)
    expect(revokeObjectURL).toHaveBeenCalledTimes(3)
    vi.unstubAllGlobals()
  })

  it('limpia el iframe y la object URL una sola vez ante un error de carga', async () => {
    authState.canExport = true
    const createObjectURL = vi.fn(() => 'blob:academic-results-print-error')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
    renderPage()
    await screen.findByText('Ana Pérez')

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Imprimir' }))
      await Promise.resolve()
    })

    const iframe = document.querySelector('iframe[title="Impresion temporal de resultados academicos"]')
    expect(iframe).not.toBeNull()
    fireEvent.error(iframe)
    expect(document.body).not.toContainElement(iframe)
    expect(revokeObjectURL).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:academic-results-print-error')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Imprimir' })).toBeEnabled())
    expect(screen.getByRole('button', { name: 'Excel' })).toBeEnabled()
    fireEvent.error(iframe)
    expect(revokeObjectURL).toHaveBeenCalledOnce()
    vi.unstubAllGlobals()
  })

  it('limpia el iframe despues de imprimir y al desmontar', async () => {
    authState.canExport = true
    const createObjectURL = vi.fn()
      .mockReturnValueOnce('blob:academic-results-afterprint')
      .mockReturnValueOnce('blob:academic-results-unmount')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
    const view = renderPage()
    await screen.findByRole('table')

    fireEvent.click(screen.getByRole('button', { name: 'Imprimir' }))
    await waitFor(() => expect(document.querySelector('iframe[title="Impresion temporal de resultados academicos"]')).not.toBeNull())
    const firstIframe = document.querySelector('iframe[title="Impresion temporal de resultados academicos"]')
    vi.spyOn(firstIframe.contentWindow, 'print').mockImplementation(() => {})
    fireEvent.load(firstIframe)
    firstIframe.contentWindow.dispatchEvent(new Event('afterprint'))
    await new Promise(requestAnimationFrame)
    expect(document.body).not.toContainElement(firstIframe)
    expect(revokeObjectURL).toHaveBeenCalledOnce()

    await waitFor(() => expect(screen.getByRole('button', { name: 'Imprimir' })).toBeEnabled())

    fireEvent.click(screen.getByRole('button', { name: 'Imprimir' }))
    await waitFor(() => expect(document.querySelector('iframe[title="Impresion temporal de resultados academicos"]')).not.toBeNull())
    const secondIframe = document.querySelector('iframe[title="Impresion temporal de resultados academicos"]')
    view.unmount()
    expect(document.body).not.toContainElement(secondIframe)
    expect(revokeObjectURL).toHaveBeenCalledTimes(2)
    expect(revokeObjectURL).toHaveBeenLastCalledWith('blob:academic-results-unmount')
    vi.unstubAllGlobals()
  })

  it('evita acciones simultáneas y presenta errores de exportación', async () => {
    authState.canExport = true
    let finishExport
    reportesService.exportarResultadosAcademicosXLSX.mockReturnValueOnce(new Promise((resolve) => { finishExport = resolve }))
    renderPage()
    await screen.findByText('Ana Pérez')

    fireEvent.click(screen.getByRole('button', { name: 'Excel' }))
    expect(await screen.findByRole('button', { name: 'Exportando…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Imprimir' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Exportando…' }))
    expect(reportesService.exportarResultadosAcademicosXLSX).toHaveBeenCalledTimes(1)
    finishExport({ blob: new Blob(['xlsx']), filename: 'resultados-academicos.xlsx' })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Excel' })).toBeEnabled())

    reportesService.imprimirResultadosAcademicos.mockRejectedValueOnce({ message: 'No se pudo imprimir.' })
    fireEvent.click(screen.getByRole('button', { name: 'Imprimir' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo imprimir.')
  })

  it('envia solo filtros soportados y reinicia la pagina', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Ana Pérez')
    await waitFor(() => expect(screen.getByLabelText('Modalidad')).toHaveTextContent('Proyecto de Grado'))
    await user.type(screen.getByLabelText('Buscar'), 'Ana')
    await user.type(screen.getByLabelText('Gestión'), '2026')
    await user.selectOptions(screen.getByLabelText('Semestre'), 'I')
    await user.selectOptions(screen.getByLabelText('Modalidad'), '3')
    await user.selectOptions(screen.getByLabelText('Estado administrativo'), '4')
    await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
    await waitFor(() => expect(reportesService.obtenerResultados).toHaveBeenLastCalledWith(expect.objectContaining({ buscar: 'Ana', gestion: '2026', semestre: 'I', modalidad: '3', estado_administrativo: '4', page: 1, page_size: 20 }), expect.any(AbortSignal)))
  })

  it('pagina en servidor usando next y count', async () => {
    reportesService.obtenerResultados
      .mockResolvedValueOnce({ count: 21, next: '/resultados/?page=2', previous: null, results: [row(1, 'Ana Pérez', numeric)] })
      .mockResolvedValueOnce({ count: 21, next: null, previous: '/resultados/?page=1', results: [row(4, 'Mario Lima', numeric)] })
    renderPage()
    await screen.findByText('21 resultados · Página 1')
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(await screen.findByText('Mario Lima')).toBeInTheDocument()
    expect(reportesService.obtenerResultados).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }), expect.any(AbortSignal))
  })

  it('muestra vacio y error recuperable sin conservar filas anteriores', async () => {
    reportesService.obtenerResultados.mockResolvedValueOnce({ count: 0, next: null, previous: null, results: [] })
    const view = renderPage()
    expect(await screen.findByText('No se encontraron resultados académicos con los filtros aplicados.')).toBeInTheDocument()
    view.unmount()

    reportesService.obtenerResultados.mockRejectedValueOnce({ message: 'No se pudo consultar.' })
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo consultar.')
    expect(screen.queryByText('Ana Pérez')).not.toBeInTheDocument()
  })
})
