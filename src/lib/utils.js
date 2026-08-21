import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

const codeLabelOverrides = {
  DEFENSA_PUBLICA: 'Defensa Pública',
}

export function formatCodeLabel(value) {
  if (!value) return value
  return codeLabelOverrides[value] ?? String(value).toLocaleLowerCase('es-BO').replaceAll('_', ' ').replace(/^./, (letter) => letter.toLocaleUpperCase('es-BO'))
}
