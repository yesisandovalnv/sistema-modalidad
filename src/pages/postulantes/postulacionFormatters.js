export function formatStudentLabel(student) {
  return `${student.codigo || student.ru || student.ci || ''} - ${student.nombre_completo || ''}`.trim()
}

export function formatPeriodoLabel(periodo) {
  if (periodo.gestion && periodo.semestre) return `Gestión ${periodo.gestion} - Semestre ${periodo.semestre}`
  return periodo.nombre
}
