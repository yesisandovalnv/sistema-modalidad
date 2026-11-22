import { describe, expect, it } from 'vitest'
import { getActiveTribunalComposition } from './tribunalComposition'

describe('getActiveTribunalComposition', () => {
  it.each([
    [[1, 2, 3], [], true],
    [[1, 2], [3], false],
    [[1, 3], [2], false],
    [[2, 3], [1], false],
    [[1], [2, 3], false],
  ])('calcula órdenes %j', (orders, missingOrders, complete) => {
    const composition = getActiveTribunalComposition(orders.map((orden_cargo) => ({ tipo_participacion: 'TRIBUNAL', orden_cargo, activo: true })))
    expect(composition).toEqual({ occupiedOrders: orders, missingOrders, firstMissingOrder: missingOrders[0] ?? null, complete })
  })

  it('excluye autoridades, inactivos y órdenes fuera de 1 a 3', () => {
    expect(getActiveTribunalComposition([
      { tipo_participacion: 'PRESIDENTE', orden_cargo: 3, activo: true },
      { tipo_participacion: 'SECRETARIO', orden_cargo: 2, activo: true },
      { tipo_participacion: 'TRIBUNAL', orden_cargo: 1, activo: false },
      { tipo_participacion: 'TRIBUNAL', orden_cargo: 4, activo: true },
    ])).toEqual({ occupiedOrders: [], missingOrders: [1, 2, 3], firstMissingOrder: 1, complete: false })
  })
})
