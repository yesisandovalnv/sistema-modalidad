import { afterEach, describe, expect, it } from 'vitest'
import { COLOR_THEMES, applyColorTheme, clearLegacyThemeOverrides, contrastRatio, loadColorTheme, saveColorTheme, themeTokens } from './colorThemes'

afterEach(() => { localStorage.clear(); document.getElementById('color-theme')?.remove() })

describe('temas de color', () => {
  for (const theme of COLOR_THEMES) {
    for (const mode of ['light', 'dark']) {
      it(`${theme.name} (${mode}): ninguna letra se pierde`, () => {
        const t = themeTokens(theme, mode)
        const surface = mode === 'dark' ? '#12233d' : '#f8fafd'
        expect(contrastRatio(t['--nav-strong'], t['--nav-bg'])).toBeGreaterThanOrEqual(4.5)
        expect(contrastRatio(t['--nav-text'], t['--nav-bg'])).toBeGreaterThanOrEqual(4.5)
        expect(contrastRatio(t['--nav-meta'], t['--nav-bg'])).toBeGreaterThanOrEqual(4.5)
        expect(contrastRatio(t['--nav-active-text'], t['--nav-active-bg'])).toBeGreaterThanOrEqual(4.5)
        expect(contrastRatio(t['--on-primary'], t['--primary'])).toBeGreaterThanOrEqual(4.5)
        expect(contrastRatio(t['--on-brand-surface'], t['--brand-surface'])).toBeGreaterThanOrEqual(4.5)
        expect(contrastRatio(t['--heading'], surface)).toBeGreaterThanOrEqual(4.5)
      })
    }
  }

  it('los temas con color llevan letra blanca en el menú; solo Blanco lleva letra negra', () => {
    for (const theme of COLOR_THEMES) {
      const t = themeTokens(theme, 'light')
      expect(t['--nav-strong']).toBe(theme.id === 'blanco' ? '#0b1220' : '#ffffff')
    }
  })

  it('los nombres son solo nombres de color', () => {
    expect(COLOR_THEMES.map((theme) => theme.name)).toEqual(['Azul marino', 'Azul noche', 'Azul cobalto', 'Azul intenso', 'Azul brillante', 'Turquesa', 'Verde azulado', 'Negro', 'Blanco'])
  })

  it('no toca los colores de errores, estados ni modalidades', () => {
    const keys = COLOR_THEMES.flatMap((theme) => Object.keys(themeTokens(theme, 'light')))
    expect(keys.some((key) => /danger|success|warning|info|chart|evaluation|document|delivery/.test(key))).toBe(false)
  })

  it('UABJB no escribe variables; otro tema sí, y se guarda por usuario', () => {
    applyColorTheme('uabjb')
    expect(document.getElementById('color-theme')).toBeNull()
    saveColorTheme('ana', 'verde-azulado')
    expect(loadColorTheme('ana')).toBe('verde-azulado')
    expect(loadColorTheme('luis')).toBe('uabjb')
    applyColorTheme(loadColorTheme('ana'))
    expect(document.getElementById('color-theme').textContent).toContain('--nav-bg: #00796b')
    saveColorTheme('ana', 'uabjb')
    expect(loadColorTheme('ana')).toBe('uabjb')
  })

  it('el reinicio borra la paleta antigua de Apariencia', () => {
    localStorage.setItem('sm_theme_overrides', '{"--uab-azul-900":"#000000"}')
    clearLegacyThemeOverrides()
    expect(localStorage.getItem('sm_theme_overrides')).toBeNull()
  })
})
