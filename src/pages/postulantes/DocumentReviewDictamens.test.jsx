import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DocumentReviewDictamens from './DocumentReviewDictamens'
import { postulacionesService } from '../../services/postulacionesService'

vi.mock('../../services/postulacionesService', () => ({ postulacionesService: { obtenerDictamenesRevision: vi.fn(), registrarDictamenRevision: vi.fn() } }))

const documents = { data: { results: [
  { tipo_documento_codigo: 'DOCUMENTO_FINAL', versiones: [{ id: 101, numero_version: 2, es_version_actual: true, activo: true }] },
  { tipo_documento_codigo: 'INFORME_TUTOR_TESIS', versiones: [{ id: 102, numero_version: 1, es_version_actual: true, activo: true, nombre_original: 'informe-tutor.pdf' }] },
  { tipo_documento_codigo: 'INFORME_TRIB_TESIS', versiones: [{ id: 103, numero_version: 1, es_version_actual: true, activo: true, nombre_original: 'informe-tribunal.pdf' }] },
] } }
const assignments = { data: { results: [{ id: 22, tipo_participacion: 'TUTOR', activo: true, usuario_nombre: 'Dra. Tutor' }] } }
const stage = (codigo) => ({ id: codigo === 'REVISION_TUTOR' ? 7 : 8, codigo, estado: 'EN_PROCESO' })

describe('DocumentReviewDictamens', () => {
  beforeEach(() => { vi.clearAllMocks(); postulacionesService.obtenerDictamenesRevision.mockResolvedValue([]); postulacionesService.registrarDictamenRevision.mockResolvedValue({ id: 1 }) })
  it('registra el dictamen del Tutor sobre la versión vigente con su evidencia', async () => {
    const changed = vi.fn().mockResolvedValue(); render(<DocumentReviewDictamens stage={stage('REVISION_TUTOR')} documents={documents} assignments={assignments} canManage onChanged={changed} />)
    await screen.findByText('Dictamen del Tutor'); await userEvent.click(screen.getByRole('button', { name: 'Registrar dictamen' }))
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(screen.getByRole('dialog', { name: 'Dictamen del Tutor' })).toBeInTheDocument()
    expect(screen.getByText('Documento Final: versión 2')).toBeInTheDocument()
    await userEvent.selectOptions(screen.getByLabelText('Tutor'), '22'); await userEvent.selectOptions(screen.getByLabelText('Evidencia'), '102'); await userEvent.type(screen.getByLabelText('Observaciones'), 'Aprobado')
    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }))
    await waitFor(() => expect(postulacionesService.registrarDictamenRevision).toHaveBeenCalledWith(7, { tipo_revision: 'TUTOR', version_documento_revisada: 101, evidencia_version: 102, resultado: 'SUFICIENTE', observaciones: 'Aprobado', asignacion_emisora: 22 }, expect.any(AbortSignal)))
    expect(changed).toHaveBeenCalledTimes(1)
  })
  it('registra Tribunal, preserva el histórico y muestra un error backend', async () => {
    postulacionesService.obtenerDictamenesRevision.mockResolvedValue([{ id: 1, tipo_revision: 'TRIBUNAL', resultado: 'INSUFICIENTE', version_documento_revisada: 99, evidencia_version: 90, evidencia_version_nombre: 'informe-anterior.pdf', activo: false, observaciones: 'Corregir' }])
    postulacionesService.registrarDictamenRevision.mockRejectedValue({ message: 'La evidencia no es vigente.', status: 400 })
    render(<DocumentReviewDictamens stage={stage('REVISION_TRIBUNAL')} documents={documents} assignments={assignments} canManage onChanged={vi.fn()} />)
    expect(await screen.findByText('Histórico')).toBeInTheDocument(); expect(screen.getByText('Evidencia: informe-anterior.pdf')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Registrar dictamen' })); expect(screen.getAllByRole('dialog')).toHaveLength(1); await userEvent.selectOptions(screen.getByLabelText('Resultado'), 'INSUFICIENTE'); await userEvent.selectOptions(screen.getByLabelText('Evidencia'), '103'); await userEvent.click(screen.getByRole('button', { name: 'Registrar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('La evidencia no es vigente.')
    expect(postulacionesService.registrarDictamenRevision).toHaveBeenCalledWith(8, expect.objectContaining({ tipo_revision: 'TRIBUNAL', version_documento_revisada: 101, evidencia_version: 103, resultado: 'INSUFICIENTE' }), expect.any(AbortSignal))
  })
  it('cancela el modal sin registrar y Escape lo cierra', async () => {
    render(<DocumentReviewDictamens stage={stage('REVISION_TRIBUNAL')} documents={documents} assignments={assignments} canManage onChanged={vi.fn()} />)
    await screen.findByText('Dictamen del Tribunal')
    await userEvent.click(screen.getByRole('button', { name: 'Registrar dictamen' }))
    expect(screen.getByRole('dialog', { name: 'Dictamen del Tribunal' })).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Dictamen del Tribunal' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Registrar dictamen' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(postulacionesService.registrarDictamenRevision).not.toHaveBeenCalled()
  })
  it('evita doble envío y no muestra controles fuera de la etapa de dictamen', async () => {
    let resolve; postulacionesService.registrarDictamenRevision.mockReturnValue(new Promise((done) => { resolve = done }))
    const { rerender } = render(<DocumentReviewDictamens stage={stage('REVISION_TUTOR')} documents={documents} assignments={assignments} canManage onChanged={vi.fn()} />)
    await screen.findByText('Dictamen del Tutor'); await userEvent.click(screen.getByRole('button', { name: 'Registrar dictamen' })); await userEvent.selectOptions(screen.getByLabelText('Tutor'), '22'); await userEvent.selectOptions(screen.getByLabelText('Evidencia'), '102')
    const form = screen.getByRole('button', { name: 'Registrar' }); await userEvent.click(form); fireEvent.click(form); expect(postulacionesService.registrarDictamenRevision).toHaveBeenCalledTimes(1); expect(screen.getByRole('button', { name: 'Registrando…' })).toBeDisabled(); resolve({})
    rerender(<DocumentReviewDictamens stage={{ id: 9, codigo: 'PERFIL_PROYECTO', estado: 'EN_PROCESO' }} documents={documents} assignments={assignments} canManage onChanged={vi.fn()} />)
    expect(screen.queryByText('Dictamen del Tutor')).not.toBeInTheDocument()
  })
})
