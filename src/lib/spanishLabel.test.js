import { labelFromCode, withAccents } from './spanishLabel'

describe('spanishLabel', () => {
  it.each([
    ['DEFENSA_PUBLICA', 'Defensa pública'],
    ['REVISION_TRIBUNAL_PREVIA', 'Revisión tribunal previa'],
    ['INSCRIPCION', 'Inscripción'],
    ['sin_version_vigente', 'Sin versión vigente'],
    ['', 'Sin clasificar'],
  ])('arma la etiqueta de %s', (code, label) => expect(labelFromCode(code)).toBe(label))

  it('pone tildes faltantes respetando mayúsculas y sin tocar lo demás', () => {
    expect(withAccents('Graduacion Via Diplomado')).toBe('Graduación Vía Diplomado')
    expect(withAccents('Excelencia Academica')).toBe('Excelencia Académica')
    expect(withAccents('Proyecto de Grado')).toBe('Proyecto de Grado')
  })
})
