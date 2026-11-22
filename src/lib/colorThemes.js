// Temas de color que cada usuario elige en Mi perfil. Un tema cambia solo el menú lateral,
// la barra superior, los botones/pestañas activas, las cabeceras de marca (tarjeta del total,
// franja del perfil) y el color de los títulos. Errores, eliminar, estados y los colores de
// las modalidades no cambian nunca.
//
// Cada tema da dos colores por modo (menú y botón), tomados de pasos de las paletas de
// Tailwind CSS y Material Design. El color de las
// letras se calcula con el contraste WCAG: sobre cada fondo se usa blanco o casi negro,
// el que se lea mejor, y los grises del menú se ajustan hasta llegar a 4,5:1.

export const COLOR_THEME_KEY = 'sm_color_theme'
export const DEFAULT_THEME_ID = 'uabjb'
const STYLE_ID = 'color-theme'
const WHITE = '#ffffff'
const INK = '#0b1220'
const SURFACE_LIGHT = '#f8fafd'
const SURFACE_DARK = '#12233d'

// Con color: el menú siempre lleva letra blanca (≥ 4,5:1); solo Blanco usa letra negra.
// En modo oscuro el menú baja a un tono más profundo y el botón sube a uno claro con letra oscura.
export const COLOR_THEMES = [
  // Azul marino = los colores de la UABJB de estilos/tokens.css tal cual (no se escribe ninguna variable).
  { id: 'uabjb', name: 'Azul marino', light: { nav: '#02254e', primary: '#02254e' }, dark: { nav: '#001a3a', primary: '#3bbdc9' } },
  { id: 'azul-noche', name: 'Azul noche', light: { nav: '#0e1728', primary: '#1e293b' }, dark: { nav: '#070c16', primary: '#94a3b8' } },
  { id: 'azul-cobalto', name: 'Azul cobalto', light: { nav: '#1e3a8a', primary: '#1e40af' }, dark: { nav: '#172554', primary: '#60a5fa' } },
  { id: 'azul-intenso', name: 'Azul intenso', light: { nav: '#0b5dd5', primary: '#0b5dd5' }, dark: { nav: '#1e3a8a', primary: '#60a5fa' } },
  { id: 'azul-brillante', name: 'Azul brillante', light: { nav: '#1872e3', primary: '#1872e3' }, dark: { nav: '#0f4fa8', primary: '#5b9cf0' } },
  { id: 'turquesa', name: 'Turquesa', light: { nav: '#0f7d8a', primary: '#0f7d8a' }, dark: { nav: '#0b5560', primary: '#2cc4d3' } },
  { id: 'verde-azulado', name: 'Verde azulado', light: { nav: '#00796b', primary: '#00796b' }, dark: { nav: '#004d40', primary: '#4db6ac' } },
  { id: 'negro', name: 'Negro', light: { nav: '#0a0a0a', primary: '#171717' }, dark: { nav: '#000000', primary: '#e5e5e5' } },
  { id: 'blanco', name: 'Blanco', light: { nav: '#ffffff', primary: '#0f172a' }, dark: { nav: '#f1f5f9', primary: '#e2e8f0' } },
]

const toRgb = (hex) => [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16))
const toHex = (rgb) => `#${rgb.map((value) => Math.round(value).toString(16).padStart(2, '0')).join('')}`

/** Mezcla `a` con `b`: amount = cuánto de `b` (0 = solo a, 1 = solo b). */
export function mix(a, b, amount) {
  const [ra, rb] = [toRgb(a), toRgb(b)]
  return toHex(ra.map((value, index) => value + (rb[index] - value) * amount))
}

function luminance(hex) {
  const [r, g, b] = toRgb(hex).map((value) => value / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}

/** Blanco o casi negro: el que se lea mejor sobre `background`. */
export function bestText(background) {
  return contrastRatio(WHITE, background) >= contrastRatio(INK, background) ? WHITE : INK
}

/** Acerca `color` a `strong` hasta que se lea (≥ min) sobre `background`. */
function readable(color, strong, background, min = 4.5) {
  let current = color
  for (let step = 0; step < 10 && contrastRatio(current, background) < min; step += 1) current = mix(current, strong, 0.25)
  return contrastRatio(current, background) >= min ? current : strong
}

/** Variables CSS de un tema para un modo ('light' | 'dark'). */
export function themeTokens(theme, mode) {
  const { nav, primary } = theme[mode]
  const navStrong = bestText(nav)
  const onPrimary = bestText(primary)
  const surface = mode === 'dark' ? SURFACE_DARK : SURFACE_LIGHT
  const activeBg = navStrong === WHITE ? (mode === 'dark' ? '#e6edf7' : WHITE) : navStrong
  const activeText = contrastRatio(nav, activeBg) >= 4.5 ? nav : bestText(activeBg)
  const heading = mode === 'dark' ? '#ffffff' : ([primary, nav].find((color) => contrastRatio(color, surface) >= 7) || '#0b1f3a')
  const navMeta = readable(mix(nav, navStrong, 0.62), navStrong, nav)

  return {
    '--nav-bg': nav,
    '--nav-strong': navStrong,
    '--nav-text': readable(mix(nav, navStrong, 0.85), navStrong, nav),
    '--nav-meta': navMeta,
    '--nav-section': navMeta,
    '--nav-hover': `color-mix(in srgb, ${navStrong} 10%, transparent)`,
    '--nav-focus': navStrong,
    '--nav-active-bg': activeBg,
    '--nav-active-text': activeText,
    '--nav-active-icon': contrastRatio(primary, activeBg) >= 3 ? primary : activeText,
    '--brand-surface': nav,
    '--on-brand-surface': navStrong,
    '--primary': primary,
    '--on-primary': onPrimary,
    '--primary-hover': mix(primary, onPrimary === WHITE ? WHITE : '#000000', 0.14),
    '--primary-soft': mode === 'dark' ? mix(primary, SURFACE_DARK, 0.78) : mix(primary, WHITE, 0.88),
    '--focus': contrastRatio(primary, surface) >= 3 ? primary : heading,
    '--heading': heading,
    ...(mode === 'light' ? { '--neutral-text': heading } : {}),
  }
}

export const findTheme = (id) => COLOR_THEMES.find((theme) => theme.id === id) || COLOR_THEMES[0]

const storageKey = (username) => `${COLOR_THEME_KEY}:${username || 'anon'}`

export function loadColorTheme(username) {
  try { return findTheme(localStorage.getItem(storageKey(username))).id } catch { return DEFAULT_THEME_ID }
}

export function saveColorTheme(username, id) {
  try {
    if (id === DEFAULT_THEME_ID) localStorage.removeItem(storageKey(username))
    else localStorage.setItem(storageKey(username), id)
  } catch { /* sin almacenamiento: el tema dura hasta recargar */ }
}

const block = (selector, tokens) => `${selector} {\n${Object.entries(tokens).map(([key, value]) => `  ${key}: ${value};`).join('\n')}\n}`

/**
 * Cambio de color suave: durante 450 ms todo pasa del color anterior al nuevo (fondo, letra,
 * borde, relleno). Sin animación con "reducir movimiento".
 */
let transitionTimer
export function animateColorChange() {
  if (typeof document === 'undefined') return
  if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const root = document.documentElement
  root.classList.add('theme-transition')
  window.clearTimeout(transitionTimer)
  transitionTimer = window.setTimeout(() => root.classList.remove('theme-transition'), 450)
}

/** "Letra blanca" o "Letra negra": qué letra lleva el menú de un tema. */
export const letterName = (background) => (bestText(background) === WHITE ? 'Letra blanca' : 'Letra negra')

/** Aplica el tema (Azul marino/UABJB = quitar todo y dejar los colores de estilos/tokens.css). */
export function applyColorTheme(id) {
  if (typeof document === 'undefined') return
  document.getElementById(STYLE_ID)?.remove()
  const theme = findTheme(id)
  if (theme.id === DEFAULT_THEME_ID) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  // html:root / html.dark:root ganan a :root (estilos/tokens.css) y html.dark (estilos/marco.css) sin depender del orden.
  style.textContent = `${block('html:root', themeTokens(theme, 'light'))}\n${block('html.dark:root', themeTokens(theme, 'dark'))}`
  document.head.appendChild(style)
}

/** Reinicio: borra la paleta editable anterior (Configuración → Apariencia) si quedó guardada. */
export function clearLegacyThemeOverrides() {
  try { localStorage.removeItem('sm_theme_overrides') } catch { /* nada */ }
  if (typeof document !== 'undefined') document.getElementById('theme-overrides')?.remove()
}
