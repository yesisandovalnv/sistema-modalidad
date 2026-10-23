import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import TrabajoDirigido from './TrabajoDirigido'
import { postulacionesService } from '../../services/postulacionesService'

vi.mock('../../services/postulacionesService', () => ({
  postulacionesService: {
    configurarInstitucionTrabajoDirigido: vi.fn(),
    registrarInformeTrabajoDirigido: vi.fn(),
    concluirTrabajoDirigido: vi.fn(),
  },
}))

const trabajo = { institucion: null, informes: [], reglas: { ponderacion_privada: 30, ponderacion_publica: 70 } }
const internalInstitution = {
  tipo_ejecucion: 'INTERNO',
  institucion_nombre: 'Unidad universitaria',
  institucion_tipo: 'PUBLICA',
  constituida_legalmente: true,
  actividad_permanente: true,
  proporciona_recursos: false,
  supervisor_nombre: 'Ing. Responsable',
  supervisor_profesion: '',
  convenio_requerido: false,
  convenio_vigente: false,
  fecha_firma_convenio: null,
  observaciones: '',
}

async function completeInternalInstitution() {
  await userEvent.selectOptions(screen.getByLabelText('Ejecución'), 'INTERNO')
  await userEvent.type(screen.getByLabelText('Institución'), internalInstitution.institucion_nombre)
  await userEvent.type(screen.getByLabelText('Supervisor institucional'), internalInstitution.supervisor_nombre)
  await userEvent.click(screen.getByLabelText('Legalmente constituida'))
  await userEvent.click(screen.getByLabelText('Actividad activa y permanente'))
}

describe('TrabajoDirigido', () => {
  beforeEach(() => vi.resetAllMocks())

  it('registra una institución interna válida sin exigir convenio y confirma después de sincronizar', async () => {
    let resolveRefresh
    postulacionesService.configurarInstitucionTrabajoDirigido.mockResolvedValue({ id: 3 })
    const onChanged = vi.fn(() => new Promise((resolve) => { resolveRefresh = resolve }))
    render(<TrabajoDirigido postulacion="9" trabajo={trabajo} etapaCodigo="DESARROLLO_TRABAJO_DIRIGIDO" canManage onChanged={onChanged} />)

    await completeInternalInstitution()
    await userEvent.click(screen.getByRole('button', { name: 'Guardar institución' }))

    expect(postulacionesService.configurarInstitucionTrabajoDirigido).toHaveBeenCalledWith('9', expect.objectContaining({
      tipo_ejecucion: 'INTERNO', institucion_nombre: 'Unidad universitaria', supervisor_nombre: 'Ing. Responsable', convenio_vigente: false,
    }))
    expect(screen.getByRole('button', { name: 'Guardando institución…' })).toBeDisabled()
    expect(screen.queryByText('Institución y supervisor guardados correctamente.')).not.toBeInTheDocument()

    resolveRefresh()
    expect(await screen.findByText('Institución y supervisor guardados correctamente.')).toBeInTheDocument()
    expect(onChanged).toHaveBeenCalledTimes(1)
  })

  it('muestra campos obligatorios y errores controlados sin depender de la validación nativa', async () => {
    render(<TrabajoDirigido postulacion="9" trabajo={trabajo} etapaCodigo="INSCRIPCION" canManage onChanged={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: 'Guardar institución' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Revisa los campos señalados')
    expect(screen.getByText('Registre el nombre de la institución.')).toBeInTheDocument()
    expect(screen.getByText('Registre el nombre del supervisor institucional.')).toBeInTheDocument()
    expect(screen.getByText('Confirme que la institución está legalmente constituida.')).toBeInTheDocument()
    expect(screen.getByText('Confirme que la institución desarrolla actividad activa y permanente.')).toBeInTheDocument()
    expect(screen.getByText('La ejecución externa requiere un convenio vigente.')).toBeInTheDocument()
    expect(screen.getByLabelText('Institución')).toHaveAttribute('aria-invalid', 'true')
    expect(postulacionesService.configurarInstitucionTrabajoDirigido).not.toHaveBeenCalled()
  })

  it('presenta errores de validación del backend junto al campo y conserva los datos', async () => {
    postulacionesService.configurarInstitucionTrabajoDirigido.mockRejectedValue({
      message: 'No se pudo completar la acción. Revisa los datos.',
      fields: { supervisor_nombre: ['El supervisor no es válido.'] },
    })
    render(<TrabajoDirigido postulacion="9" trabajo={trabajo} etapaCodigo="INSCRIPCION" canManage onChanged={vi.fn()} />)
    await completeInternalInstitution()

    await userEvent.click(screen.getByRole('button', { name: 'Guardar institución' }))

    expect(await screen.findByText('El supervisor no es válido.')).toBeInTheDocument()
    expect(screen.getByLabelText('Supervisor institucional')).toHaveValue('Ing. Responsable')
    expect(screen.queryByText('Institución y supervisor guardados correctamente.')).not.toBeInTheDocument()
  })

  it('previene envíos duplicados mientras el guardado está pendiente', async () => {
    let resolveRequest
    postulacionesService.configurarInstitucionTrabajoDirigido.mockImplementation(() => new Promise((resolve) => { resolveRequest = resolve }))
    render(<TrabajoDirigido postulacion="9" trabajo={trabajo} etapaCodigo="INSCRIPCION" canManage onChanged={vi.fn()} />)
    await completeInternalInstitution()

    await userEvent.click(screen.getByRole('button', { name: 'Guardar institución' }))
    const pendingButton = screen.getByRole('button', { name: 'Guardando institución…' })
    await userEvent.click(pendingButton)

    expect(pendingButton).toBeDisabled()
    expect(postulacionesService.configurarInstitucionTrabajoDirigido).toHaveBeenCalledTimes(1)
    resolveRequest({ id: 3 })
    expect(await screen.findByText('Institución y supervisor guardados correctamente.')).toBeInTheDocument()
  })

  it('sincroniza el formulario con el overview actualizado después del refresco', async () => {
    const { rerender } = render(<TrabajoDirigido postulacion="9" trabajo={trabajo} etapaCodigo="DESARROLLO_TRABAJO_DIRIGIDO" canManage onChanged={vi.fn()} />)
    await userEvent.type(screen.getByLabelText('Institución'), 'Dato temporal')

    rerender(<TrabajoDirigido postulacion="9" trabajo={{ ...trabajo, institucion: internalInstitution }} etapaCodigo="DESARROLLO_TRABAJO_DIRIGIDO" canManage onChanged={vi.fn()} />)

    expect(screen.getByLabelText('Institución')).toHaveValue('Unidad universitaria')
    expect(screen.getByLabelText('Supervisor institucional')).toHaveValue('Ing. Responsable')
    expect(screen.getByLabelText('Ejecución')).toHaveValue('INTERNO')
  })

  it('no expone formularios operativos al estudiante', () => {
    render(<TrabajoDirigido postulacion="9" trabajo={trabajo} etapaCodigo="DESARROLLO_TRABAJO_DIRIGIDO" canManage={false} onChanged={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Guardar institución' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Registrar informe' })).not.toBeInTheDocument()
  })

  it('habilita informes solo con institución y explica que el documento es independiente', async () => {
    const { rerender } = render(<TrabajoDirigido postulacion="9" trabajo={trabajo} etapaCodigo="DESARROLLO_TRABAJO_DIRIGIDO" canManage onChanged={vi.fn()} />)
    expect(screen.getByText(/El registro de informes se habilitará cuando el expediente confirme/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Registrar informe' })).not.toBeInTheDocument()
    expect(screen.getByText(/son requisitos independientes/)).toBeInTheDocument()

    postulacionesService.registrarInformeTrabajoDirigido.mockResolvedValue({ id: 8 })
    const onChanged = vi.fn()
    rerender(<TrabajoDirigido postulacion="9" trabajo={{ ...trabajo, institucion: internalInstitution }} etapaCodigo="DESARROLLO_TRABAJO_DIRIGIDO" canManage onChanged={onChanged} />)
    await userEvent.type(screen.getByLabelText('Periodo'), 'Agosto')
    await userEvent.type(screen.getByLabelText('Descripción del desempeño'), 'Buen desempeño')
    await userEvent.type(screen.getByLabelText('Evaluación cualitativa'), 'Suficiente')
    await userEvent.type(screen.getByLabelText('Aporte laboral'), 'Automatización')
    await userEvent.click(screen.getByRole('button', { name: 'Registrar informe' }))

    await waitFor(() => expect(postulacionesService.registrarInformeTrabajoDirigido).toHaveBeenCalledWith('9', expect.objectContaining({ periodo: 'Agosto' })))
    expect(await screen.findByText('Informe periódico registrado correctamente.')).toBeInTheDocument()
    expect(onChanged).toHaveBeenCalledTimes(1)
  })

  it('conserva los datos y muestra el error cuando falla el registro del informe', async () => {
    postulacionesService.registrarInformeTrabajoDirigido.mockRejectedValue({ message: 'El informe no pudo registrarse.' })
    render(<TrabajoDirigido postulacion="9" trabajo={{ ...trabajo, institucion: internalInstitution }} etapaCodigo="DESARROLLO_TRABAJO_DIRIGIDO" canManage onChanged={vi.fn()} />)

    await userEvent.type(screen.getByLabelText('Periodo'), 'Agosto')
    await userEvent.type(screen.getByLabelText('Descripción del desempeño'), 'Buen desempeño')
    await userEvent.type(screen.getByLabelText('Evaluación cualitativa'), 'Suficiente')
    await userEvent.type(screen.getByLabelText('Aporte laboral'), 'Automatización')
    await userEvent.click(screen.getByRole('button', { name: 'Registrar informe' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('El informe no pudo registrarse.')
    expect(screen.getByLabelText('Periodo')).toHaveValue('Agosto')
    expect(screen.getByLabelText('Descripción del desempeño')).toHaveValue('Buen desempeño')
    expect(screen.getByLabelText('Evaluación cualitativa')).toHaveValue('Suficiente')
    expect(screen.getByLabelText('Aporte laboral')).toHaveValue('Automatización')
  })

  it('previene envíos simultáneos del mismo informe', async () => {
    let resolveRequest
    postulacionesService.registrarInformeTrabajoDirigido.mockImplementation(() => new Promise((resolve) => { resolveRequest = resolve }))
    render(<TrabajoDirigido postulacion="9" trabajo={{ ...trabajo, institucion: internalInstitution }} etapaCodigo="DESARROLLO_TRABAJO_DIRIGIDO" canManage onChanged={vi.fn()} />)

    await userEvent.type(screen.getByLabelText('Periodo'), 'Agosto')
    await userEvent.type(screen.getByLabelText('Descripción del desempeño'), 'Buen desempeño')
    await userEvent.type(screen.getByLabelText('Evaluación cualitativa'), 'Suficiente')
    await userEvent.type(screen.getByLabelText('Aporte laboral'), 'Automatización')
    await userEvent.click(screen.getByRole('button', { name: 'Registrar informe' }))
    const pendingButton = screen.getByRole('button', { name: 'Registrando informe…' })
    await userEvent.click(pendingButton)

    expect(pendingButton).toBeDisabled()
    expect(postulacionesService.registrarInformeTrabajoDirigido).toHaveBeenCalledTimes(1)
    resolveRequest({ id: 8 })
    expect(await screen.findByText('Informe periódico registrado correctamente.')).toBeInTheDocument()
  })
})
