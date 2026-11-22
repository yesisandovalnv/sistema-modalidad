import { MODALITY_COLOR } from '../../lib/modalityColor'

/**
 * Botones de modalidad sobre una lista: "Todas" y una por modalidad, con su color. Un toque
 * deja solo esa modalidad; tocar la elegida otra vez vuelve a "Todas". Comparte el valor con
 * el menú Filtrar, así que si allí se marcan varias, aquí se ven todas encendidas.
 *
 * options: [{ value, label, codigo, title? }] · selected: [value] · `title`: nombre completo si `label` es corto
 */
export function ModalityChips({ options, selected, onChange, label = 'Filtrar por modalidad' }) {
  if (!options.length) return null
  const only = (value) => onChange(selected.length === 1 && selected[0] === value ? [] : [value])
  return (
    <div className="modality-chips" role="group" aria-label={label}>
      <button type="button" className="modality-chip" aria-pressed={selected.length === 0} onClick={() => onChange([])}>
        Todas
      </button>
      {options.map((option) => (
        <button key={option.value} type="button" className="modality-chip" title={option.title && option.title !== option.label ? option.title : undefined} aria-pressed={selected.includes(option.value)} onClick={() => only(option.value)}>
          <span className="modality-chip-dot" aria-hidden="true" style={{ background: `var(${MODALITY_COLOR[option.codigo] || '--primary'})` }} />
          {option.label}
        </button>
      ))}
    </div>
  )
}
