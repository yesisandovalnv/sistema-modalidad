import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

const codeLabelOverrides = {
  DEFENSA_PUBLICA: 'Defensa Pública',
  REVISION_FINAL_POST_PUBLICA: 'Revisión final posterior a la Defensa Pública',
  APROBACION_PLENA: 'Aprobación plena',
  APROBACION_PLENA_CON_FELICITACION: 'Aprobación plena con felicitación',
  CONDICION: 'Condición',
  ADMISION_COMPLETA: 'Admisión completa',
  SOLVENCIA_BIBLIOTECA: 'Solvencia de biblioteca',
  MATRICULA_VIGENTE: 'Matrícula vigente',
}

export function formatCodeLabel(value) {
  if (!value) return value
  return codeLabelOverrides[value] ?? String(value).toLocaleLowerCase('es-BO').replaceAll('_', ' ').replace(/^./, (letter) => letter.toLocaleUpperCase('es-BO'))
}
