

export const EMPTY = 'No registrado'

const PROJECT_GRADE_DEFENSE_TYPES = ['DEFENSA_PERFIL', 'DEFENSA_PRIVADA', 'DEFENSA_PUBLICA']

const CANCELLED_DEFENSE_RESCHEDULING_TYPES = {
  PROYECTO_GRADO: PROJECT_GRADE_DEFENSE_TYPES,
  TESIS_GRADO: ['DEFENSA_TEMATICA', 'DEFENSA_PERFIL', 'DEFENSA_PRIVADA', 'DEFENSA_PUBLICA'],
  TRABAJO_DIRIGIDO: ['DEFENSA_PERFIL', 'DEFENSA_PRIVADA', 'DEFENSA_PUBLICA'],
}

export function supportsCancelledDefenseRescheduling(defense) {
  return (CANCELLED_DEFENSE_RESCHEDULING_TYPES[defense?.postulacion_modalidad_codigo] || []).includes(defense?.tipo_evento)
}

export const initialsOf = (name) => String(name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toLocaleUpperCase('es') || '?'

export function formatAcademicClassification(value) {
  if (value === 'APROBACION_PLENA_CON_FELICITACION') return 'APROBACIÓN PLENA CON FELICITACIÓN'
  if (value === 'APROBACION_PLENA') return 'APROBACIÓN PLENA'
  return formatCode(value)
}

export function formatCode(value) {
  return String(value || '').replaceAll('_', ' ')
}

export const ASSIGNMENT_TYPES = [
  ['TUTOR', 'Tutor'],
  ['TRIBUNAL', 'Tribunal'],
  ['DOCENTE_MODALIDAD', 'Docente de modalidad'],
  ['PRESIDENTE', 'Presidente'],
  ['SECRETARIO', 'Secretario'],
  ['DIRECTOR_INSTITUTO_INVESTIGACION', 'Director del Instituto de Investigación'],
  ['VICERRECTOR_POSGRADO', 'Vicerrector de Posgrado'],
  ['DECANO_FACULTAD', 'Decano de Facultad'],
  ['DIRECTOR_CARRERA', 'Director de Carrera'],
  ['SUPERVISOR_INSTITUCIONAL', 'Supervisor institucional'],
]

export const assignmentTypeLabel = (role) => ASSIGNMENT_TYPES.find(([value]) => value === role)?.[1] || formatCode(role)

export const DEFENSE_TYPES = [
  ['DEFENSA_TEMATICA', 'Defensa de temática', 'TEMATICA_TESIS'],
  ['DEFENSA_PERFIL', 'Defensa de perfil', ['PERFIL_PROYECTO', 'PERFIL_TESIS', 'PERFIL_TRABAJO_DIRIGIDO']],
  ['DEFENSA_PRIVADA', 'Defensa privada', 'DEFENSA_PRIVADA'],
  ['DEFENSA_PUBLICA', 'Defensa pública', 'DEFENSA_PUBLICA'],
]

export function formatDocumentDate(value) {
  if (!value) return 'No registrada'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'No registrada' : date.toLocaleString('es-BO')
}
