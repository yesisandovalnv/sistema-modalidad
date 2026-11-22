// Nombres en español de los tipos y niveles de notificación (mismos títulos que las plantillas
// del backend, apps/notificaciones/templates.py) y fecha relativa corta para listas.

export const NOTIFICATION_TYPES = {
  ETAPA_APROBADA: 'Etapa aprobada',
  ETAPA_RECHAZADA: 'Etapa rechazada',
  ETAPA_REABIERTA: 'Etapa reabierta',
  POSTULACION_ESTADO_CAMBIADO: 'Estado actualizado',
  ACTOR_ASIGNADO: 'Asignación académica',
  ACTOR_REEMPLAZADO: 'Asignación reemplazada',
  ASIGNACION_FINALIZADA: 'Asignación finalizada',
  DOCUMENTO_SUBIDO: 'Documento recibido',
  DOCUMENTO_NUEVA_VERSION: 'Nueva versión documental',
  DOCUMENTO_OBSERVADO: 'Documento observado',
  DOCUMENTO_APROBADO: 'Documento aprobado',
  DOCUMENTO_RECHAZADO: 'Documento rechazado',
  DEFENSA_PROGRAMADA: 'Defensa programada',
  DEFENSA_REPROGRAMADA: 'Defensa reprogramada',
  DEFENSA_SUSPENDIDA: 'Defensa suspendida',
  DEFENSA_CANCELADA: 'Defensa cancelada',
  DEFENSA_FINALIZADA: 'Defensa finalizada',
  EVALUACION_CONSOLIDADA: 'Evaluación consolidada',
  INFORME_REVISION_TRIBUNAL_REGISTRADO: 'Informe del tribunal registrado',
  INFORME_REVISION_TRIBUNAL_ACTUALIZADO: 'Informe del tribunal actualizado',
  REVISION_FINAL_APROBADA: 'Revisión final aprobada',
  CIERRE_DOCUMENTAL_APROBADO: 'Cierre documental aprobado',
  POSTULACION_CONCLUIDA: 'Postulación concluida',
  CIERRE_REABIERTO: 'Cierre reabierto',
}

export const NOTIFICATION_LEVELS = { INFO: 'Información', SUCCESS: 'Éxito', WARNING: 'Advertencia', ERROR: 'Importante' }

export const READ_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'false', label: 'No leídas' },
  { value: 'true', label: 'Leídas' },
]

export function notificationTypeLabel(value) {
  return NOTIFICATION_TYPES[value] || String(value || '').replaceAll('_', ' ').toLocaleLowerCase('es').replace(/^./, (letter) => letter.toUpperCase())
}

const relative = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })
const UNITS = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]]

/** "hace 5 minutos", "ayer", "hace 3 semanas"; "ahora" si fue hace menos de un minuto. */
export function timeAgo(value, now = Date.now()) {
  const date = new Date(value)
  if (!value || Number.isNaN(date.valueOf())) return ''
  const seconds = Math.round((date.valueOf() - now) / 1000)
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit)
  }
  return 'ahora'
}
