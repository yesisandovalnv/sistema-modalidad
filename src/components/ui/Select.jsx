import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Search } from 'lucide-react'
import { prefersReducedMotion } from '../../hooks/useCountUp'

const CLOSE_MS = 130
const PANEL_ROOM = 288
const normalize = (value) => String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('es')

/**
 * Lista desplegable propia del sistema (patrón combobox de WAI-ARIA). Reemplaza al <select>
 * nativo, que el navegador dibuja y no se puede animar ni pintar con la paleta: el panel baja
 * desde el campo y las opciones se acomodan una por una.
 *
 * - options: [{ value, label, disabled?, keywords? }]. La opción con value '' es la de "ninguna".
 * - searchable: el campo es de texto; al tocarlo se despliega y lo que se escribe filtra las
 *   opciones (por la etiqueta y `keywords`, sin importar tildes ni mayúsculas).
 * - showLabel: muestra la etiqueta encima del campo (en formularios).
 * - El panel se dibuja en <body> con posición fija, así ninguna ventana o tarjeta lo recorta;
 *   si abajo no hay espacio se abre hacia arriba.
 * - Teclado: flechas, Inicio/Fin, Enter elige, Escape cierra; en la versión sin búsqueda una
 *   letra salta a la opción que empieza con ella. Tab elige la activa y sigue.
 * - onSearch: búsqueda en el servidor. Lo que se escribe se entrega a onSearch (quien llama
 *   decide cuándo consultar) y las opciones no se filtran aquí: llegan ya filtradas. Lo escrito
 *   se conserva al cerrar la lista, así la búsqueda sigue valiendo al cambiar de página.
 * - selectedLabel: etiqueta a mostrar si el valor elegido no está entre las opciones actuales
 *   (por ejemplo, porque quedó en otra página de resultados).
 * - Cada opción es un botón con rol "option": las bloqueadas quedan deshabilitadas de verdad.
 */
export function Select({
  label, value = '', onChange, options = [], disabled = false, className = '', id,
  showLabel = false, searchable = false, placeholder = 'Seleccione', emptyText = 'Sin coincidencias', required = false,
  onSearch, selectedLabel = '', loading = false,
}) {
  const onSearchRef = useRef(onSearch)
  useEffect(() => { onSearchRef.current = onSearch }, [onSearch])
  const autoId = useId()
  const baseId = id || `select-${autoId.replace(/:/g, '')}`
  const labelId = `${baseId}-label`
  const listId = `${baseId}-list`
  const [state, setState] = useState('closed') // closed | open | closing
  const [active, setActive] = useState(0)
  const [side, setSide] = useState('bottom')
  const [rect, setRect] = useState(null)
  const [query, setQuery] = useState('')
  const rootRef = useRef(null)
  const fieldRef = useRef(null)
  const triggerRef = useRef(null)
  const listRef = useRef(null)
  const closeTimer = useRef(null)
  const typeahead = useRef({ text: '', time: 0 })

  const selected = options.find((option) => String(option.value) === String(value))
  const open = state === 'open'
  const visible = useMemo(() => {
    if (!searchable || onSearch || !query.trim()) return options
    const text = normalize(query.trim())
    return options.filter((option) => option.value !== '' && normalize(`${option.label} ${option.keywords || ''}`).includes(text))
  }, [options, query, searchable, onSearch])
  const enabledIndexes = visible.map((option, index) => (option.disabled ? -1 : index)).filter((index) => index >= 0)

  const measure = useCallback(() => {
    const box = triggerRef.current?.getBoundingClientRect?.()
    if (!box) return
    const below = window.innerHeight - box.bottom
    setSide(below < PANEL_ROOM && box.top > below ? 'top' : 'bottom')
    setRect({ left: box.left, top: box.top, bottom: box.bottom, width: box.width })
  }, [])

  const close = useCallback((returnFocus = true) => {
    window.clearTimeout(closeTimer.current)
    if (prefersReducedMotion()) setState('closed')
    else {
      setState('closing')
      closeTimer.current = window.setTimeout(() => setState('closed'), CLOSE_MS)
    }
    // Con búsqueda en el servidor lo escrito se conserva (sigue filtrando y paginando).
    if (!onSearchRef.current) setQuery('')
    if (returnFocus) triggerRef.current?.focus()
  }, [])

  const openList = () => {
    if (disabled || (options.length === 0 && !onSearch)) return
    window.clearTimeout(closeTimer.current)
    measure()
    const current = visible.findIndex((option) => String(option.value) === String(value))
    setActive(current >= 0 && !visible[current].disabled ? current : (enabledIndexes[0] ?? 0))
    setState('open')
  }

  const choose = (index, returnFocus = true) => {
    const option = visible[index]
    if (!option || option.disabled) return
    if (String(option.value) !== String(value)) onChange?.(option.value)
    close(returnFocus)
  }

  // Clic fuera (del campo y del panel, que vive en <body>) cierra.
  useEffect(() => {
    if (!open) return undefined
    // Solo la caja del campo y el panel cuentan como "dentro": un clic en la etiqueta de
    // arriba, en otro campo o en cualquier parte de la ventana cierra la lista.
    const onPointerDown = (event) => {
      const field = searchable ? fieldRef.current : triggerRef.current
      if (field?.contains(event.target) || listRef.current?.contains(event.target)) return
      close(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open, close, searchable])

  // También se cierra si el foco se va a otro lugar (Tab, clic en otro campo o fuera de la ventana).
  useEffect(() => {
    if (!open) return undefined
    const onFocusIn = (event) => {
      if (rootRef.current?.contains(event.target) || listRef.current?.contains(event.target)) return
      close(false)
    }
    const onWindowBlur = () => close(false)
    document.addEventListener('focusin', onFocusIn)
    window.addEventListener('blur', onWindowBlur)
    return () => {
      document.removeEventListener('focusin', onFocusIn)
      window.removeEventListener('blur', onWindowBlur)
    }
  }, [open, close])

  // El panel sigue al campo si algo se desplaza o cambia de tamaño.
  useLayoutEffect(() => {
    if (state === 'closed') return undefined
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [state, measure])

  useEffect(() => {
    if (!open) return
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView?.({ block: 'nearest' })
  }, [open, active])

  useEffect(() => () => window.clearTimeout(closeTimer.current), [])

  const step = (direction) => {
    if (!enabledIndexes.length) return
    const position = enabledIndexes.indexOf(active)
    const next = position < 0 ? 0 : Math.min(enabledIndexes.length - 1, Math.max(0, position + direction))
    setActive(enabledIndexes[next])
  }

  const jumpTo = (key) => {
    const now = Date.now()
    const text = (now - typeahead.current.time < 600 ? typeahead.current.text : '') + normalize(key)
    typeahead.current = { text, time: now }
    return enabledIndexes.find((index) => normalize(visible[index].label).startsWith(text))
  }

  const onKeyDown = (event) => {
    if (disabled) return
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key) || (!searchable && event.key === ' ')) {
        event.preventDefault()
        openList()
      } else if (!searchable && event.key.length === 1 && /\S/.test(event.key)) {
        const match = jumpTo(event.key)
        if (match !== undefined) onChange?.(visible[match].value)
      }
      return
    }
    switch (event.key) {
      case 'ArrowDown': event.preventDefault(); step(1); break
      case 'ArrowUp': event.preventDefault(); step(-1); break
      case 'Home': if (!searchable) { event.preventDefault(); setActive(enabledIndexes[0] ?? 0) } break
      case 'End': if (!searchable) { event.preventDefault(); setActive(enabledIndexes[enabledIndexes.length - 1] ?? 0) } break
      case 'Enter': event.preventDefault(); choose(active); break
      case ' ': if (!searchable) { event.preventDefault(); choose(active) } break
      case 'Escape': event.preventDefault(); event.stopPropagation(); close(); break
      case 'Tab': if (enabledIndexes.includes(active)) choose(active, false); else close(false); break
      default:
        if (!searchable && event.key.length === 1 && /\S/.test(event.key)) {
          const match = jumpTo(event.key)
          if (match !== undefined) setActive(match)
        }
    }
  }

  const comboProps = {
    ref: triggerRef,
    id: `${baseId}-input`,
    role: 'combobox',
    'aria-labelledby': labelId,
    'aria-haspopup': 'listbox',
    'aria-expanded': open,
    'aria-controls': listId,
    'aria-activedescendant': open && visible[active] ? `${baseId}-opt-${active}` : undefined,
    'aria-required': required || undefined,
    'data-value': value === '' || value == null ? undefined : String(value),
    disabled,
    onKeyDown,
  }

  const panelStyle = rect ? {
    position: 'fixed',
    left: rect.left,
    width: Math.max(rect.width, 240),
    ...(side === 'top' ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }),
  } : undefined

  return (
    <div ref={rootRef} className={`select-root relative min-w-0 ${showLabel ? 'select-field' : ''} ${className}`} data-state={state}>
      <span id={labelId} className={showLabel ? 'select-label' : 'sr-only'}>{label}</span>
      {searchable ? (
        <div ref={fieldRef} className="select-trigger select-trigger--search pill-control" data-open={open || undefined}>
          <Search className="h-4 w-4 shrink-0 text-[var(--text-muted)]" aria-hidden="true" />
          <input
            {...comboProps}
            type="text"
            autoComplete="off"
            aria-autocomplete="list"
            className="select-search-input"
            placeholder={selected && selected.value !== '' ? selected.label : (value ? selectedLabel || placeholder : placeholder)}
            value={open ? query : (selected && selected.value !== '' ? selected.label : (value ? selectedLabel : (onSearch ? query : '')))}
            onChange={(event) => { setQuery(event.target.value); onSearchRef.current?.(event.target.value); if (!open) openList(); setActive(0) }}
            onClick={() => { if (!open) openList() }}
            onFocus={(event) => event.target.select()}
          />
          <button type="button" tabIndex={-1} aria-hidden="true" className="pill-chevron select-chevron grid h-8 w-8 shrink-0 place-items-center rounded-full" onClick={() => (open ? close() : (triggerRef.current?.focus(), openList()))}>
            <ChevronDown className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      ) : (
        <button
          {...comboProps}
          type="button"
          className="select-trigger pill-control flex items-center justify-between gap-2 text-left"
          onClick={() => (open ? close() : openList())}
        >
          <span className={`truncate ${selected && selected.value !== '' ? '' : 'select-placeholder'}`}>{selected && selected.value !== '' ? selected.label : (selected?.label || placeholder)}</span>
          <span aria-hidden="true" className="pill-chevron select-chevron grid h-8 w-8 shrink-0 place-items-center rounded-full">
            <ChevronDown className="h-4 w-4" strokeWidth={2} />
          </span>
        </button>
      )}

      {state !== 'closed' && createPortal(
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-labelledby={labelId}
          tabIndex={-1}
          data-side={side}
          data-state={state}
          className="select-panel select-panel--floating"
          style={panelStyle}
          onMouseDown={(event) => event.preventDefault()}
          onFocus={() => triggerRef.current?.focus()}
        >
          {loading && <li className="select-empty" role="presentation">Buscando…</li>}
          {!loading && visible.length === 0 && <li className="select-empty" role="presentation">{emptyText}</li>}
          {visible.map((option, index) => {
            const isSelected = String(option.value) === String(value)
            return (
              <li key={`${option.value}-${index}`} role="presentation" className="select-option-item">
                <button
                  type="button"
                  tabIndex={-1}
                  id={`${baseId}-opt-${index}`}
                  role="option"
                  data-index={index}
                  data-value={String(option.value)}
                  aria-selected={isSelected}
                  aria-disabled={option.disabled || undefined}
                  disabled={option.disabled || undefined}
                  data-active={index === active || undefined}
                  className="select-option"
                  style={{ '--i': Math.min(index, 8) }}
                  onMouseMove={() => { if (index !== active && !option.disabled) setActive(index) }}
                  onClick={() => choose(index)}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected && <Check className="select-check h-4 w-4 shrink-0" strokeWidth={2.25} aria-hidden="true" />}
                </button>
              </li>
            )
          })}
        </ul>,
        document.body,
      )}
    </div>
  )
}
