// Pone las tildes que faltan en etiquetas armadas desde códigos o nombres sin tilde que vienen
// de la base de datos ("DEFENSA_PUBLICA" → "Defensa pública", "Graduacion Via Diplomado" →
// "Graduación vía Diplomado"). Solo cambia palabras completas que en español siempre llevan
// tilde; no toca el resto del texto.
const ACCENTS = {
  academica: 'académica', academico: 'académico', academicas: 'académicas', academicos: 'académicos',
  admision: 'admisión', analisis: 'análisis', aprobacion: 'aprobación', area: 'área', areas: 'áreas',
  basicas: 'básicas', basica: 'básica', calificacion: 'calificación', conclusion: 'conclusión',
  correccion: 'corrección', evaluacion: 'evaluación',
  gestion: 'gestión', graduacion: 'graduación', inscripcion: 'inscripción', institucion: 'institución',
  investigacion: 'investigación', modulo: 'módulo', modulos: 'módulos', planificacion: 'planificación',
  practica: 'práctica', preparacion: 'preparación', presentacion: 'presentación', proximas: 'próximas',
  proxima: 'próxima', publica: 'pública', publicas: 'públicas', recepcion: 'recepción', revision: 'revisión',
  supervision: 'supervisión', tecnica: 'técnica', tecnico: 'técnico', tecnicas: 'técnicas', titulo: 'título',
  version: 'versión', via: 'vía', resolucion: 'resolución', designacion: 'designación', conformacion: 'conformación',
  postulacion: 'postulación', ejecucion: 'ejecución', autorizacion: 'autorización', documentacion: 'documentación',
}

function withCase(original, accented) {
  if (original === original.toLocaleUpperCase('es')) return accented.toLocaleUpperCase('es')
  if (original[0] === original[0].toLocaleUpperCase('es')) return accented[0].toLocaleUpperCase('es') + accented.slice(1)
  return accented
}

/** Corrige tildes palabra por palabra, respetando mayúsculas. */
export function withAccents(text) {
  if (typeof text !== 'string' || !text) return text
  return text.replace(/\p{L}+/gu, (word) => {
    const accented = ACCENTS[word.toLocaleLowerCase('es')]
    return accented ? withCase(word, accented) : word
  })
}

/** "REVISION_TRIBUNAL_PREVIA" → "Revisión tribunal previa" (solo la primera en mayúscula). */
export function labelFromCode(code) {
  const words = String(code || '').replaceAll('_', ' ').trim().toLocaleLowerCase('es')
  if (!words) return 'Sin clasificar'
  const text = withAccents(words)
  return text[0].toLocaleUpperCase('es') + text.slice(1)
}
