import { useContext, useState } from 'react'
import { Check } from 'lucide-react'
import { ThemeContext } from '../../context/ThemeContext'
import { COLOR_THEMES, animateColorChange, applyColorTheme, bestText, letterName, loadColorTheme, saveColorTheme } from '../../lib/colorThemes'

/**
 * Tema de color del usuario: cada opción es el color del menú con su letra encima ("Aa"),
 * el nombre del color y qué letra lleva. Se aplica al instante, con un cambio suave, y
 * queda guardado para este usuario en este navegador.
 */
export function ThemePicker({ username }) {
  const { theme: mode = 'light', toggleTheme } = useContext(ThemeContext) || {}
  const [selected, setSelected] = useState(() => loadColorTheme(username))

  const choose = (id) => {
    if (id === selected) return
    setSelected(id)
    animateColorChange()
    applyColorTheme(id)
    saveColorTheme(username, id)
  }

  const onKeyDown = (event) => {
    const index = COLOR_THEMES.findIndex((theme) => theme.id === selected)
    const delta = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key]
    if (!delta) return
    event.preventDefault()
    const next = COLOR_THEMES[(index + delta + COLOR_THEMES.length) % COLOR_THEMES.length]
    choose(next.id)
    event.currentTarget.querySelector(`[data-theme-id="${next.id}"]`)?.focus()
  }

  return (
    <div className="grid gap-3">
    {toggleTheme && (
      <label className="mode-switch">
        <input type="checkbox" role="switch" checked={mode === 'dark'} onChange={toggleTheme} />
        <span className="mode-switch-track" aria-hidden="true"><span className="mode-switch-thumb" /></span>
        Modo oscuro
      </label>
    )}
    <div role="radiogroup" aria-label="Tema de color" className="theme-picker" onKeyDown={onKeyDown}>
      {COLOR_THEMES.map((theme, index) => {
        const { nav } = theme[mode === 'dark' ? 'dark' : 'light']
        const checked = theme.id === selected
        return (
          <button
            key={theme.id}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            data-theme-id={theme.id}
            className="theme-option"
            style={{ '--i': index }}
            onClick={() => choose(theme.id)}
          >
            <span className="theme-swatch" style={{ background: nav, color: bestText(nav) }} aria-hidden="true">
              Aa
              {checked && <Check className="theme-swatch-check h-4 w-4" strokeWidth={3} />}
            </span>
            <span className="theme-option-name">{theme.name}</span>
            <span className="theme-option-letter">{letterName(nav)}</span>
          </button>
        )
      })}
    </div>
    </div>
  )
}
