import { fixMojibake, fixMojibakeDeep } from './fixMojibake'

describe('fixMojibake', () => {
  it.each([
    ['Inscripci├│n', 'Inscripción'],
    ['├ürea 1: Ciencias B├ísicas', 'Área 1: Ciencias Básicas'],
    ['Acta de Excelencia Acad├®mica', 'Acta de Excelencia Académica'],
    ['Sala de defensas - IngenierÔö£┬ía de Sistemas', 'Sala de defensas - Ingeniería de Sistemas'],
    ['Nu├▒ez', 'Nuñez'],
    ['GestiÃ³n', 'Gestión'],
  ])('repara %s', (broken, fixed) => {
    expect(fixMojibake(broken)).toBe(fixed)
  })

  it.each(['Defensa pública', 'Año 2026', 'Normal ├ text', 'PROYECTO_GRADO', ''])('no cambia textos sanos: %s', (text) => {
    expect(fixMojibake(text)).toBe(text)
  })

  it('repara respuestas anidadas y conserva el mismo objeto si no hay nada que reparar', () => {
    const sano = { nombre: 'Tesis', items: [1, 'ok'] }
    expect(fixMojibakeDeep(sano)).toBe(sano)
    expect(fixMojibakeDeep({ etapas: [{ codigo: 'INSCRIPCION', nombre: 'Inscripci├│n' }], total: 2 }))
      .toEqual({ etapas: [{ codigo: 'INSCRIPCION', nombre: 'Inscripción' }], total: 2 })
  })
})
