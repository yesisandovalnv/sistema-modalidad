import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ClosureRequirements from './ClosureRequirements'
import { postulacionesService } from '../../services/postulacionesService'

vi.mock('../../services/postulacionesService', () => ({
  postulacionesService: {
    obtenerCondiciones: vi.fn(),
    obtenerEntregas: vi.fn(),
    crearEntregaFisica: vi.fn(),
    verificarCondicion: vi.fn(),
    verificarCondiciones: vi.fn(),
    rechazarCondicion: vi.fn(),
    registrarEntrega: vi.fn(),
    registrarEntregas: vi.fn(),
  },
}))

const conditions = {
  count: 2,
  results: [
    { id: 11, nombre: 'Admisión completa', estado: 'PENDIENTE', estado_display: 'Pendiente', fecha_verificacion: null },
    { id: 12, nombre: 'Matrícula vigente', estado: 'PENDIENTE', estado_display: 'Pendiente', fecha_verificacion: null },
  ],
}

const deliveries = {
  count: 2,
  results: [
    { id: 21, codigo: 'CD_RESPALDO', nombre: 'CD de respaldo', estado: 'PENDIENTE', estado_display: 'Pendiente', cantidad: 1, cantidad_recibida: 0, fecha_entrega: null },
    { id: 22, codigo: 'EJEMPLARES_IMPRESOS', nombre: 'Ejemplares impresos', estado: 'PENDIENTE', estado_display: 'Pendiente', cantidad: 2, cantidad_recibida: 0, fecha_entrega: null },
  ],
}

function deferred() {
  let resolve
  const promise = new Promise((done) => { resolve = done })
  return { promise, resolve }
}

async function renderComponent(props = {}) {
  const onChanged = vi.fn()
  const view = render(<ClosureRequirements postulacion={7} canManage onChanged={onChanged} {...props} />)
  await screen.findByText('Admisión completa')
  return { ...view, onChanged }
}

describe('ClosureRequirements', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    postulacionesService.obtenerCondiciones.mockResolvedValue(conditions)
    postulacionesService.obtenerEntregas.mockResolvedValue({ count: 0, results: [] })
    postulacionesService.verificarCondicion.mockResolvedValue({})
    postulacionesService.verificarCondiciones.mockResolvedValue([])
    postulacionesService.rechazarCondicion.mockResolvedValue({})
    postulacionesService.registrarEntregas.mockResolvedValue([])
  })

  it('abre Verificar junto a la condición seleccionada', async () => {
    await renderComponent()
    const item = screen.getByText('Matrícula vigente').closest('li')
    await userEvent.click(within(item).getByRole('button', { name: 'Verificar' }))

    expect(within(item).getByRole('form', { name: 'Verificar: Matrícula vigente' })).toBeVisible()
    expect(screen.queryByRole('form', { name: 'Verificar: Admisión completa' })).not.toBeInTheDocument()
  })

  it('abre No cumple junto a la condición seleccionada', async () => {
    await renderComponent()
    const item = screen.getByText('Admisión completa').closest('li')
    await userEvent.click(within(item).getByRole('button', { name: 'No cumple' }))

    expect(within(item).getByRole('form', { name: 'Marcar no cumple: Admisión completa' })).toBeVisible()
    expect(within(item).getByRole('heading', { name: 'No cumple: Admisión completa' })).toBeVisible()
  })

  it.each([
    ['Verificar', 'verificarCondicion'],
    ['No cumple', 'rechazarCondicion'],
  ])('Guardar desde %s llama al servicio correspondiente', async (button, method) => {
    await renderComponent()
    const item = screen.getByText('Admisión completa').closest('li')
    await userEvent.click(within(item).getByRole('button', { name: button }))
    const form = within(item).getByRole('form')
    await userEvent.type(within(form).getByLabelText('Observaciones (opcional)'), 'Revisión administrativa')
    await userEvent.click(within(form).getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(postulacionesService[method]).toHaveBeenCalledWith(11, 'Revisión administrativa', expect.any(AbortSignal)))
  })

  it('Cancelar cierra el formulario sin llamar a la API', async () => {
    await renderComponent()
    const item = screen.getByText('Admisión completa').closest('li')
    await userEvent.click(within(item).getByRole('button', { name: 'Verificar' }))
    await userEvent.click(within(item).getByRole('button', { name: 'Cancelar' }))

    expect(within(item).queryByRole('form')).not.toBeInTheDocument()
    expect(postulacionesService.verificarCondicion).not.toHaveBeenCalled()
    expect(postulacionesService.rechazarCondicion).not.toHaveBeenCalled()
  })

  it('mantiene visible el error backend dentro de la condición', async () => {
    postulacionesService.rechazarCondicion.mockRejectedValue({ message: 'La condición ya fue verificada.' })
    await renderComponent()
    const item = screen.getByText('Admisión completa').closest('li')
    await userEvent.click(within(item).getByRole('button', { name: 'No cumple' }))
    await userEvent.click(within(item).getByRole('button', { name: 'Guardar' }))

    expect(await within(item).findByRole('alert')).toHaveTextContent('La condición ya fue verificada.')
    expect(within(item).getByRole('form')).toBeVisible()
  })

  it('bloquea envíos duplicados mientras la petición está pendiente', async () => {
    const pending = deferred()
    postulacionesService.verificarCondicion.mockReturnValue(pending.promise)
    await renderComponent()
    const item = screen.getByText('Admisión completa').closest('li')
    await userEvent.click(within(item).getByRole('button', { name: 'Verificar' }))
    const form = within(item).getByRole('form')

    fireEvent.submit(form)
    fireEvent.submit(form)

    expect(postulacionesService.verificarCondicion).toHaveBeenCalledTimes(1)
    expect(within(form).getByRole('button', { name: 'Procesando…' })).toBeDisabled()
    pending.resolve({})
    await waitFor(() => expect(within(item).queryByRole('form')).not.toBeInTheDocument())
  })

  it('selecciona solo condiciones pendientes activas y verificables', async () => {
    postulacionesService.obtenerCondiciones.mockResolvedValue({ results: [
      { id: 11, nombre: 'Admisión completa', estado: 'PENDIENTE', activo: true },
      { id: 12, nombre: 'Matrícula vigente', estado: 'CUMPLE', activo: true },
      { id: 13, nombre: 'Plazo máximo', estado: 'PENDIENTE', activo: false },
      { id: 14, nombre: 'Solvencia universitaria', estado: 'NO_CUMPLE', activo: true },
    ] })
    await renderComponent()

    expect(screen.getByRole('checkbox', { name: 'Seleccionar pendientes' })).toBeEnabled()
    expect(screen.getByRole('checkbox', { name: 'Seleccionar Admisión completa' })).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'Seleccionar Matrícula vigente' })).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'Seleccionar Plazo máximo' })).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'Seleccionar Solvencia universitaria' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Verificar seleccionadas/ })).not.toBeInTheDocument()
  })

  it('selecciona todas las pendientes, refleja selección parcial y permite deseleccionar todas', async () => {
    await renderComponent()
    const selectPending = screen.getByRole('checkbox', { name: 'Seleccionar pendientes' })

    expect(selectPending).not.toBeChecked()
    expect(selectPending.indeterminate).toBe(false)
    await userEvent.click(selectPending)
    expect(selectPending).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Seleccionar Admisión completa' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Seleccionar Matrícula vigente' })).toBeChecked()
    expect(screen.getByRole('button', { name: 'Verificar seleccionadas (2)' })).toBeEnabled()

    await userEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar Matrícula vigente' }))
    expect(selectPending).not.toBeChecked()
    expect(selectPending.indeterminate).toBe(true)
    expect(screen.getByRole('button', { name: 'Verificar seleccionadas (1)' })).toBeEnabled()

    await userEvent.click(selectPending)
    expect(selectPending).toBeChecked()
    await userEvent.click(selectPending)
    expect(selectPending).not.toBeChecked()
    expect(selectPending.indeterminate).toBe(false)
    expect(screen.queryByRole('button', { name: /Verificar seleccionadas/ })).not.toBeInTheDocument()
  })

  it('verifica el lote atómicamente, refresca condiciones y limpia la selección al tener éxito', async () => {
    postulacionesService.obtenerCondiciones
      .mockResolvedValueOnce(conditions)
      .mockResolvedValueOnce({ results: conditions.results.map((item) => ({ ...item, estado: 'CUMPLE', estado_display: 'Cumple' })) })
    const { onChanged } = await renderComponent()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar pendientes' }))
    await userEvent.click(screen.getByRole('button', { name: 'Verificar seleccionadas (2)' }))

    await waitFor(() => expect(postulacionesService.verificarCondiciones).toHaveBeenCalledWith(
      7,
      [11, 12],
      '',
      expect.any(AbortSignal),
    ))
    expect(await screen.findByText(/Condiciones técnicas/)).toHaveTextContent('2/2 cumplidas')
    expect(postulacionesService.obtenerCondiciones).toHaveBeenCalledTimes(2)
    expect(onChanged).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: /Verificar seleccionadas/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'Seleccionar Matrícula vigente' })).not.toBeInTheDocument()
  })

  it('conserva selección y muestra error backend sin éxito optimista', async () => {
    postulacionesService.verificarCondiciones.mockRejectedValue({ message: 'La postulación ya no admite cambios.' })
    const { onChanged } = await renderComponent()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar pendientes' }))
    await userEvent.click(screen.getByRole('button', { name: 'Verificar seleccionadas (2)' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('La postulación ya no admite cambios.')
    expect(screen.getByRole('button', { name: 'Verificar seleccionadas (2)' })).toBeEnabled()
    expect(screen.getByRole('checkbox', { name: 'Seleccionar Admisión completa' })).toBeChecked()
    expect(postulacionesService.obtenerCondiciones).toHaveBeenCalledTimes(1)
    expect(onChanged).not.toHaveBeenCalled()
  })

  it('bloquea doble submit de lote y muestra estado de carga', async () => {
    const pending = deferred()
    postulacionesService.verificarCondiciones.mockReturnValue(pending.promise)
    await renderComponent()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar pendientes' }))
    const verifyButton = screen.getByRole('button', { name: 'Verificar seleccionadas (2)' })
    fireEvent.click(verifyButton)
    fireEvent.click(verifyButton)

    expect(postulacionesService.verificarCondiciones).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Verificando seleccionadas…' })).toBeDisabled()
    pending.resolve([])
    await waitFor(() => expect(postulacionesService.obtenerCondiciones).toHaveBeenCalledTimes(2))
  })

  it('no expone selección ni acción batch a usuarios sin permiso', async () => {
    await renderComponent({ canManage: false })

    expect(screen.queryByRole('checkbox', { name: 'Seleccionar pendientes' })).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'Seleccionar Admisión completa' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Verificar seleccionadas/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Verificar' })).not.toBeInTheDocument()
  })

  it('reconcilia selección cuando la condición se vuelve no pendiente', async () => {
    postulacionesService.obtenerCondiciones
      .mockResolvedValueOnce(conditions)
      .mockResolvedValueOnce({ results: conditions.results.map((item) => item.id === 11 ? { ...item, estado: 'CUMPLE' } : item) })
    await renderComponent()
    const item = screen.getByText('Admisión completa').closest('li')
    await userEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar Admisión completa' }))
    await userEvent.click(within(item).getByRole('button', { name: 'Verificar' }))
    await userEvent.click(within(item).getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(postulacionesService.obtenerCondiciones).toHaveBeenCalledTimes(2))
    expect(screen.queryByRole('button', { name: /Verificar seleccionadas/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'Seleccionar Admisión completa' })).not.toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Seleccionar pendientes' })).not.toBeChecked()
  })

  it('compacta condiciones y entregas cuando todas están completas', async () => {
    postulacionesService.obtenerCondiciones.mockResolvedValue({ results: conditions.results.map((item) => ({ ...item, estado: 'CUMPLE', estado_display: 'Cumple' })) })
    postulacionesService.obtenerEntregas.mockResolvedValue({ results: deliveries.results.map((item) => ({ ...item, estado: 'COMPLETA', estado_display: 'Completa', cantidad_recibida: item.cantidad })) })
    render(<ClosureRequirements postulacion={7} canManage />)

    const conditionsSummary = await screen.findByText(/Condiciones técnicas/)
    const deliveriesSummary = screen.getByText(/Entregas técnicas/)
    expect(conditionsSummary.closest('details')).not.toHaveAttribute('open')
    expect(deliveriesSummary.closest('details')).not.toHaveAttribute('open')
    expect(conditionsSummary).toHaveTextContent('2/2 cumplidas')
    expect(deliveriesSummary).toHaveTextContent('2/2 completas')
  })

  describe('entregas', () => {
    beforeEach(() => {
      postulacionesService.obtenerEntregas.mockResolvedValue(deliveries)
      postulacionesService.registrarEntrega.mockResolvedValue({})
    })

    it('selecciona entregas pendientes, refleja selección parcial y contador de lote', async () => {
      await renderComponent()
      const selectPending = screen.getByRole('checkbox', { name: 'Seleccionar pendientes (entregas)' })

      expect(selectPending).not.toBeChecked()
      expect(selectPending.indeterminate).toBe(false)

      await userEvent.click(selectPending)
      expect(selectPending).toBeChecked()
      expect(screen.getByRole('checkbox', { name: 'Seleccionar CD de respaldo' })).toBeChecked()
      expect(screen.getByRole('checkbox', { name: 'Seleccionar Ejemplares impresos' })).toBeChecked()
      expect(screen.getByRole('button', { name: 'Registrar seleccionadas (2)' })).toBeEnabled()

      await userEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar Ejemplares impresos' }))
      expect(selectPending).not.toBeChecked()
      expect(selectPending.indeterminate).toBe(true)
      expect(screen.getByRole('button', { name: 'Registrar seleccionadas (1)' })).toBeEnabled()

      await userEvent.click(selectPending)
      expect(selectPending).toBeChecked()
      await userEvent.click(selectPending)
      expect(selectPending).not.toBeChecked()
      expect(selectPending.indeterminate).toBe(false)
      expect(screen.queryByRole('button', { name: /Registrar seleccionadas/ })).not.toBeInTheDocument()
    })

    it('registra las tres entregas con cantidades propias, refresca y limpia el lote', async () => {
      const pendingDeliveries = { results: [
        { id: 21, codigo: 'CD_RESPALDO', nombre: 'CD de respaldo', estado: 'PENDIENTE', estado_display: 'Pendiente', cantidad: 1, cantidad_recibida: 0 },
        { id: 22, codigo: 'EJEMPLARES_IMPRESOS', nombre: 'Ejemplares impresos', estado: 'PENDIENTE', estado_display: 'Pendiente', cantidad: 2, cantidad_recibida: 0 },
        { id: 23, codigo: 'TIMBRE_UNIVERSITARIO', nombre: 'Timbre universitario', estado: 'PENDIENTE', estado_display: 'Pendiente', cantidad: 1, cantidad_recibida: 0 },
      ] }
      const completedDeliveries = { results: pendingDeliveries.results.map((item, index) => ({
        ...item,
        estado: 'COMPLETA',
        estado_display: 'Completa',
        cantidad_recibida: [1, 3, 1][index],
      })) }
      postulacionesService.obtenerEntregas
        .mockResolvedValueOnce(pendingDeliveries)
        .mockResolvedValueOnce(completedDeliveries)
      const { onChanged } = await renderComponent()
      await userEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar CD de respaldo' }))
      await userEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar Ejemplares impresos' }))
      await userEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar Timbre universitario' }))
      await userEvent.click(screen.getByRole('button', { name: 'Registrar seleccionadas (3)' }))

      const form = screen.getByRole('form', { name: 'Registrar entregas seleccionadas (3)' })
      const cd = within(form).getByLabelText('Cantidad recibida: CD de respaldo')
      const ejemplares = within(form).getByLabelText('Cantidad recibida: Ejemplares impresos')
      const timbre = within(form).getByLabelText('Cantidad recibida: Timbre universitario')

      await userEvent.clear(cd)
      await userEvent.type(cd, '1')
      await userEvent.clear(ejemplares)
      await userEvent.type(ejemplares, '3')
      await userEvent.clear(timbre)
      await userEvent.type(timbre, '1')
      await userEvent.type(within(form).getByLabelText('Observaciones: CD de respaldo (opcional)'), 'Recepción confirmada')
      await userEvent.type(within(form).getByLabelText('Observaciones: Ejemplares impresos (opcional)'), 'Tres ejemplares')
      await userEvent.type(within(form).getByLabelText('Observaciones: Timbre universitario (opcional)'), 'Recibido')
      await userEvent.click(within(form).getByRole('button', { name: 'Guardar lotes' }))

      await waitFor(() => expect(postulacionesService.registrarEntregas).toHaveBeenCalledWith(
        7,
        [
          { id: 21, cantidad_recibida: 1, observaciones: 'Recepción confirmada' },
          { id: 22, cantidad_recibida: 3, observaciones: 'Tres ejemplares' },
          { id: 23, cantidad_recibida: 1, observaciones: 'Recibido' },
        ],
        expect.any(AbortSignal),
      ))
      expect(postulacionesService.registrarEntregas).toHaveBeenCalledTimes(1)
      await waitFor(() => expect(postulacionesService.obtenerEntregas).toHaveBeenCalledTimes(2))
      expect(onChanged).toHaveBeenCalledTimes(1)
      expect(screen.queryByRole('form', { name: 'Registrar entregas seleccionadas (3)' })).not.toBeInTheDocument()
      expect(screen.queryByRole('checkbox', { name: 'Seleccionar CD de respaldo' })).not.toBeInTheDocument()
      expect(screen.getByRole('checkbox', { name: 'Seleccionar pendientes (entregas)' })).not.toBeChecked()
      expect(screen.queryByRole('button', { name: /Registrar seleccionadas/ })).not.toBeInTheDocument()
      expect(screen.getByText(/3\/3 completas/)).toBeInTheDocument()
    })

    it('muestra cuál entrega requiere una cantidad cuando queda vacía y no llama al servicio', async () => {
      const { results: pendingDeliveries } = deliveries
      postulacionesService.obtenerEntregas.mockResolvedValue({ results: [
        ...pendingDeliveries,
        { id: 23, codigo: 'TIMBRE_UNIVERSITARIO', nombre: 'Timbre universitario', estado: 'PENDIENTE', estado_display: 'Pendiente', cantidad: 1, cantidad_recibida: 0 },
      ] })
      await renderComponent()
      await userEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar pendientes (entregas)' }))
      await userEvent.click(screen.getByRole('button', { name: 'Registrar seleccionadas (3)' }))
      const form = screen.getByRole('form', { name: 'Registrar entregas seleccionadas (3)' })
      await userEvent.type(within(form).getByLabelText('Cantidad recibida: CD de respaldo'), '1')
      await userEvent.type(within(form).getByLabelText('Cantidad recibida: Timbre universitario'), '1')
      await userEvent.clear(within(form).getByLabelText('Cantidad recibida: Ejemplares impresos'))
      await userEvent.click(within(form).getByRole('button', { name: 'Guardar lotes' }))

      expect(await within(form).findByText(/Ingresa la cantidad recibida para Ejemplares impresos\./)).toBeVisible()
      expect(postulacionesService.registrarEntregas).not.toHaveBeenCalled()
    })

    it('rechaza cero como cantidad y no llama al servicio', async () => {
      postulacionesService.obtenerEntregas.mockResolvedValue({ results: [
        ...deliveries.results,
        { id: 23, codigo: 'TIMBRE_UNIVERSITARIO', nombre: 'Timbre universitario', estado: 'PENDIENTE', estado_display: 'Pendiente', cantidad: 1, cantidad_recibida: 0 },
      ] })
      await renderComponent()
      await userEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar pendientes (entregas)' }))
      await userEvent.click(screen.getByRole('button', { name: 'Registrar seleccionadas (3)' }))
      const form = screen.getByRole('form', { name: 'Registrar entregas seleccionadas (3)' })
      const quantity = within(form).getByLabelText('Cantidad recibida: CD de respaldo')
      await userEvent.type(within(form).getByLabelText('Cantidad recibida: Ejemplares impresos'), '1')
      await userEvent.type(within(form).getByLabelText('Cantidad recibida: Timbre universitario'), '1')
      await userEvent.clear(quantity)
      await userEvent.type(quantity, '0')
      await userEvent.click(within(form).getByRole('button', { name: 'Guardar lotes' }))

      expect(await within(form).findByText(/Ingresa la cantidad recibida para CD de respaldo\./)).toBeVisible()
      expect(postulacionesService.registrarEntregas).not.toHaveBeenCalled()
    })

    it('muestra error del lote sin éxito optimista y conserva la selección', async () => {
      postulacionesService.registrarEntregas.mockRejectedValue({ message: 'Solo se pueden registrar entregas pendientes.' })
      await renderComponent()

      await userEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar pendientes (entregas)' }))
      await userEvent.click(screen.getByRole('button', { name: 'Registrar seleccionadas (2)' }))
      const form = screen.getByRole('form', { name: 'Registrar entregas seleccionadas (2)' })
      await userEvent.type(within(form).getByLabelText('Cantidad recibida: CD de respaldo'), '1')
      await userEvent.type(within(form).getByLabelText('Cantidad recibida: Ejemplares impresos'), '3')
      await userEvent.click(within(form).getByRole('button', { name: 'Guardar lotes' }))

      expect(await screen.findByText('Solo se pueden registrar entregas pendientes.')).toBeVisible()
      expect(screen.getByRole('button', { name: 'Registrar seleccionadas (2)' })).toBeEnabled()
      expect(screen.getByRole('checkbox', { name: 'Seleccionar CD de respaldo' })).toBeChecked()
    })

    it('evita dos requests al enviar dos veces el mismo lote', async () => {
      const pending = deferred()
      postulacionesService.registrarEntregas.mockReturnValue(pending.promise)
      await renderComponent()
      await userEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar pendientes (entregas)' }))
      await userEvent.click(screen.getByRole('button', { name: 'Registrar seleccionadas (2)' }))
      const form = screen.getByRole('form', { name: 'Registrar entregas seleccionadas (2)' })
      await userEvent.type(within(form).getByLabelText('Cantidad recibida: CD de respaldo'), '1')
      await userEvent.type(within(form).getByLabelText('Cantidad recibida: Ejemplares impresos'), '3')

      fireEvent.submit(form)
      fireEvent.submit(form)

      expect(postulacionesService.registrarEntregas).toHaveBeenCalledTimes(1)
      expect(within(form).getByRole('button', { name: 'Procesando…' })).toBeDisabled()
      pending.resolve([])
      await waitFor(() => expect(screen.queryByRole('form', { name: 'Registrar entregas seleccionadas (2)' })).not.toBeInTheDocument())
    })

    it('mantiene la selección de condiciones y entregas independientes', async () => {
      await renderComponent()
      await userEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar pendientes' }))
      expect(screen.getByRole('checkbox', { name: 'Seleccionar pendientes' })).toBeChecked()
      expect(screen.getByRole('checkbox', { name: 'Seleccionar pendientes (entregas)' })).not.toBeChecked()

      await userEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar pendientes (entregas)' }))
      expect(screen.getByRole('checkbox', { name: 'Seleccionar pendientes' })).toBeChecked()
      expect(screen.getByRole('checkbox', { name: 'Seleccionar pendientes (entregas)' })).toBeChecked()
    })

    it('abre el formulario dentro de la entrega seleccionada', async () => {
      await renderComponent()
      const item = screen.getByText('Ejemplares impresos').closest('li')
      await userEvent.click(within(item).getByRole('button', { name: 'Registrar/actualizar entrega' }))

      expect(within(item).getByRole('form', { name: 'Registrar entrega: Ejemplares impresos' })).toBeVisible()
      expect(screen.queryByRole('form', { name: 'Registrar entrega: CD de respaldo' })).not.toBeInTheDocument()
    })

    it('Cancelar cierra el formulario sin registrar la entrega', async () => {
      await renderComponent()
      const item = screen.getByText('CD de respaldo').closest('li')
      await userEvent.click(within(item).getByRole('button', { name: 'Registrar/actualizar entrega' }))
      await userEvent.click(within(item).getByRole('button', { name: 'Cancelar' }))

      expect(within(item).queryByRole('form')).not.toBeInTheDocument()
      expect(postulacionesService.registrarEntrega).not.toHaveBeenCalled()
    })

    it('Guardar llama una vez al servicio con el payload existente', async () => {
      await renderComponent()
      const item = screen.getByText('Ejemplares impresos').closest('li')
      await userEvent.click(within(item).getByRole('button', { name: 'Registrar/actualizar entrega' }))
      const form = within(item).getByRole('form')
      await userEvent.clear(within(form).getByLabelText('Cantidad recibida'))
      await userEvent.type(within(form).getByLabelText('Cantidad recibida'), '2')
      await userEvent.type(within(form).getByLabelText('Observaciones (opcional)'), 'Recepción completa')
      await userEvent.click(within(form).getByRole('button', { name: 'Guardar' }))

      await waitFor(() => expect(postulacionesService.registrarEntrega).toHaveBeenCalledWith(22, 2, 'Recepción completa', expect.any(AbortSignal)))
      expect(postulacionesService.registrarEntrega).toHaveBeenCalledTimes(1)
    })

    it('muestra el error backend dentro de la entrega', async () => {
      postulacionesService.registrarEntrega.mockRejectedValue({ message: 'La cantidad recibida no es válida.' })
      await renderComponent()
      const item = screen.getByText('CD de respaldo').closest('li')
      await userEvent.click(within(item).getByRole('button', { name: 'Registrar/actualizar entrega' }))
      await userEvent.click(within(item).getByRole('button', { name: 'Guardar' }))

      expect(await within(item).findByRole('alert')).toHaveTextContent('La cantidad recibida no es válida.')
      expect(within(item).getByRole('form')).toBeVisible()
    })

    it('evita doble submit durante el registro', async () => {
      const pending = deferred()
      postulacionesService.registrarEntrega.mockReturnValue(pending.promise)
      await renderComponent()
      const item = screen.getByText('CD de respaldo').closest('li')
      await userEvent.click(within(item).getByRole('button', { name: 'Registrar/actualizar entrega' }))
      const form = within(item).getByRole('form')

      fireEvent.submit(form)
      fireEvent.submit(form)

      expect(postulacionesService.registrarEntrega).toHaveBeenCalledTimes(1)
      expect(within(form).getByRole('button', { name: 'Procesando…' })).toBeDisabled()
      pending.resolve({})
      await waitFor(() => expect(within(item).queryByRole('form')).not.toBeInTheDocument())
    })

    it('crea el control físico de Inscripción sin mostrar las condiciones del cierre', async () => {
      postulacionesService.crearEntregaFisica.mockResolvedValue({})
      postulacionesService.obtenerEntregas.mockResolvedValue({ results: [] })
      const onChanged = vi.fn()
      render(<ClosureRequirements
        postulacion={7}
        canManage
        showConditions={false}
        requiredDeliveries={[{
          codigo: 'FOLDER_AMARILLO',
          nombre: 'Fólder amarillo rotulado con nombre y modalidad',
          cumplido: false,
        }]}
        title="Recepción física de Inscripción"
        onChanged={onChanged}
      />)

      const folder = await screen.findByText('Fólder amarillo rotulado con nombre y modalidad')
      const item = folder.closest('li')
      expect(screen.queryByText(/Condiciones técnicas/)).not.toBeInTheDocument()
      await userEvent.click(within(item).getByRole('button', { name: 'Preparar recepción' }))

      await waitFor(() => expect(postulacionesService.crearEntregaFisica).toHaveBeenCalledWith(
        7,
        'FOLDER_AMARILLO',
        'Fólder amarillo rotulado con nombre y modalidad',
        1,
        expect.any(AbortSignal),
      ))
      expect(onChanged).toHaveBeenCalledTimes(1)
    })
  })
})
