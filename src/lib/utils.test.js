import { describe, expect, it } from 'vitest'
import { formatCodeLabel } from './utils'

describe('formatCodeLabel', () => {
  it('convierte códigos técnicos en etiquetas legibles', () => {
    expect(formatCodeLabel('DEFENSA_PUBLICA')).toBe('Defensa Pública')
    expect(formatCodeLabel('EN_PROCESO')).toBe('En proceso')
    expect(formatCodeLabel('REGISTRADA')).toBe('Registrada')
    expect(formatCodeLabel('REVISION_FINAL_POST_PUBLICA')).toBe('Revisión final posterior a la Defensa Pública')
    expect(formatCodeLabel('APROBACION_PLENA_CON_FELICITACION')).toBe('Aprobación plena con felicitación')
  })

  it('conserva valores vacíos', () => {
    expect(formatCodeLabel(null)).toBeNull()
    expect(formatCodeLabel('')).toBe('')
  })
})
