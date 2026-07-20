import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ExpedientePage from './ExpedientePage'
import { postulacionesService } from '../../services/postulacionesService'

vi.mock('../../services/postulacionesService', () => ({
  postulacionesService: { obtenerExpediente: vi.fn() },
}))

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
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/postulaciones/7']}>
      <Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes>
    </MemoryRouter>,
  )
}

describe('ExpedientePage US-008', () => {
  beforeEach(() => vi.clearAllMocks())

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
    expect(screen.getByRole('note')).toHaveTextContent(/no sustituyen actas/i)
    expect(screen.getByRole('link', { name: 'Volver a postulaciones' })).toHaveAttribute('href', '/postulantes')
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['No tienes autorización para consultar este expediente.', 403],
    ['El expediente solicitado no está disponible.', 404],
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
    })
    renderPage()
    await screen.findByText('EXP-008')
    expect(screen.getAllByText('No registrado').length).toBeGreaterThanOrEqual(5)
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
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
})
