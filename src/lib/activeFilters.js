/** Filtros elegidos como [{ key, title, label }] (para chips o un resumen). */
export function activeFilters(columns, values) {
  return columns
    .map((column) => {
      const value = values[column.key]
      if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) return null
      const labelOf = (item) => column.options.find((option) => String(option.value) === String(item))?.label ?? String(item)
      const label = Array.isArray(value) ? value.map(labelOf).join(', ') : labelOf(value)
      return { key: column.key, title: column.title, label }
    })
    .filter(Boolean)
}
