export function getActiveTribunalComposition(tribunals = []) {
  const orders = new Set()
  for (const actor of tribunals) {
    if (actor.activo === false || actor.tipo_participacion !== 'TRIBUNAL') continue
    const order = Number(actor.orden_cargo)
    if (!Number.isInteger(order) || order < 1 || order > 3) continue
    orders.add(order)
  }
  const occupiedOrders = [1, 2, 3].filter((order) => orders.has(order))
  const missingOrders = [1, 2, 3].filter((order) => !orders.has(order))
  return {
    occupiedOrders,
    missingOrders,
    firstMissingOrder: missingOrders[0] ?? null,
    complete: missingOrders.length === 0,
  }
}
