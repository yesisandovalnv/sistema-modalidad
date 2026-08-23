import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ClosureRequirements from './ClosureRequirements'
import { postulacionesService } from '../../services/postulacionesService'

vi.mock('../../services/postulacionesService', () => ({
  postulacionesService: {
    obtenerCondiciones: vi.fn(),
    obtenerEntregas: vi.fn(),
    verificarCondicion: vi.fn(),
    rechazarCondicion: vi.fn(),
    registrarEntrega: vi.fn(),
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
    postulacionesService.rechazarCondicion.mockResolvedValue({})
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
  })
})
