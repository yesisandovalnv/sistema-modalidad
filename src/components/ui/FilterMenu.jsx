import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { ChevronDown, SlidersHorizontal, X } from 'lucide-react'
import { prefersReducedMotion } from '../../hooks/useCountUp'
import { activeFilters } from '../../lib/activeFilters'

const CLOSE_MS = 140

/**
 * Filtro en un solo botón (como el "Filtrar" del sistema del hostal): despliega columnas
 * separadas por una línea y en cada columna se marca lo que se quiere ver. Se aplica al
 * instante. La API acepta un valor por filtro, así que en cada columna se marca una
 * opción; tocarla de nuevo la desmarca y esa columna vuelve a "todas".
 *
 * columns: [{ key, title, options: [{ value, label }], disabled?, note?, group? }]
 *   Las columnas con el mismo `group` se apilan en una sola columna del panel (así entra
 *   en pantallas medianas sin cortarse).
 *   `multiple: true` permite marcar varias opciones en esa columna (su valor es un arreglo y la
 *   marca es cuadrada, como una casilla); las demás columnas siguen siendo de una opción.
 * values:  { [key]: value } ('' o ausente = sin filtro; [] en las columnas `multiple`)
 * align:   'end' (por defecto) abre el panel hacia la izquierda, para botones a la derecha;
 *          'start' lo abre hacia la derecha, para botones al inicio de la fila.
 */
export function FilterMenu({ columns, values, onChange, onClear, label = 'Filtrar', align = 'end' }) {
  const [state, setState] = useState('closed') // closed | open | closing
  const rootRef = useRef(null)
  const buttonRef = useRef(null)
  const closeTimer = useRef(null)
  const panelId = `filtros-${useId().replace(/:/g, '')}`
  const open = state === 'open'
  const groups = Object.values(columns.reduce((acc, column, index) => {
    const key = column.group ?? `c${index}`
    ;(acc[key] ||= []).push(column)
    return acc
  }, {}))
  // Cuántas opciones hay marcadas (en una columna `multiple` cuenta cada una).
  const activeCount = columns.reduce((sum, column) => {
    const value = values[column.key]
    if (Array.isArray(value)) return sum + value.length
    return sum + (value !== undefined && value !== '' ? 1 : 0)
  }, 0)

  const close = useCallback((returnFocus = false) => {
    window.clearTimeout(closeTimer.current)
    if (prefersReducedMotion()) setState('closed')
    else {
      setState('closing')
      closeTimer.current = window.setTimeout(() => setState('closed'), CLOSE_MS)
    }
    if (returnFocus) buttonRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event) => { if (!rootRef.current?.contains(event.target)) close() }
    const onKeyDown = (event) => { if (event.key === 'Escape') close(true) }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, close])

  useEffect(() => () => window.clearTimeout(closeTimer.current), [])

  const isChecked = (column, value) => {
    const current = values[column.key]
    return column.multiple
      ? (Array.isArray(current) ? current : []).map(String).includes(String(value))
      : String(current ?? '') === String(value)
  }
  const toggle = (column, value) => {
    if (column.multiple) {
      const current = (Array.isArray(values[column.key]) ? values[column.key] : []).map(String)
      onChange(column.key, current.includes(String(value)) ? current.filter((item) => item !== String(value)) : [...current, String(value)])
    } else onChange(column.key, String(values[column.key] ?? '') === String(value) ? '' : value)
  }

  return (
    <div ref={rootRef} className="filter-menu relative flex items-center gap-2">
      <button
        ref={buttonRef}
        type="button"
        className="filter-trigger"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => (open ? close() : (window.clearTimeout(closeTimer.current), setState('open')))}
      >
        <SlidersHorizontal className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        <span>{label}</span>
        {activeCount > 0 && <span className="filter-count" key={activeCount} aria-label={`${activeCount} filtros activos`}>{activeCount}</span>}
        <span className="filter-trigger-chevron" aria-hidden="true"><ChevronDown className="h-3.5 w-3.5" strokeWidth={2.5} /></span>
      </button>
      {activeCount > 0 && onClear && (
        <button type="button" className="filter-clear-button" onClick={onClear} title="Quitar todos los filtros">
          <X className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
          Limpiar
        </button>
      )}

      {state !== 'closed' && (
        <div id={panelId} className={`filter-panel dropdown-panel ${align === 'start' ? 'filter-panel--start' : ''}`} data-state={state} style={{ '--n': groups.length }} role="group" aria-label="Filtros">
          <div className="filter-columns" data-n={groups.length}>
            {groups.map((group, groupIndex) => (
              <div key={group[0].key} className="filter-group">
                {group.map((column, columnIndex) => (
              <fieldset key={column.key} className="filter-column" disabled={column.disabled}>
                <legend className="filter-column-title">{column.title}</legend>
                {column.options.length === 0 ? (
                  <p className="filter-note">{column.note || 'Sin opciones'}</p>
                ) : column.options.map((option, index) => {
                  const checked = isChecked(column, option.value)
                  return (
                    <button
                      key={`${column.key}-${option.value}`}
                      type="button"
                      aria-pressed={checked}
                      className="filter-option dropdown-item"
                      style={{ '--i': Math.min(groupIndex + columnIndex + index, 8) }}
                      onClick={() => toggle(column, option.value)}
                    >
                      <span className={`filter-mark ${column.multiple ? 'filter-mark--box' : ''} ${checked ? 'is-checked' : ''}`} aria-hidden="true" />
                      <span className="min-w-0 truncate" title={option.label}>{option.label}</span>
                    </button>
                  )
                })}
                {column.note && column.options.length > 0 && <p className="filter-note">{column.note}</p>}
              </fieldset>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/** Chips con los filtros elegidos; cada uno se quita con su ×. */
export function FilterChips({ columns, values, onChange }) {
  const chips = activeFilters(columns, values)
  if (!chips.length) return null
  return (
    <ul className="filter-chips" aria-label="Filtros activos">
      {chips.map((chip) => (
        <li key={chip.key} className="filter-chip">
          <span className="filter-chip-title">{chip.title}:</span> {chip.label}
          <button type="button" aria-label={`Quitar filtro ${chip.title}`} onClick={() => onChange(chip.key, '')}>
            <X className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  )
}
