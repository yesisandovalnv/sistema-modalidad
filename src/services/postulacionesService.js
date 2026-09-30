import apiClient from './api'
import { formatCodeLabel } from '../lib/utils'

function normalize(error) {
  if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') return { canceled: true }
  const status = error?.response?.status
  if (status === 401) return { status, message: 'Debes iniciar sesión para consultar este expediente.' }
  if (status === 403) return { status, message: 'No tienes autorización para consultar este expediente.' }
  if (status === 404) return { status, message: 'El expediente solicitado no está disponible.' }
  return { status, message: 'No se pudo cargar el expediente. Intenta nuevamente.' }
}

function optionalResult(result, unavailableMessage) {
  if (result.status === 'fulfilled') return { data: result.value.data, error: '' }
  if (result.reason?.name === 'CanceledError' || result.reason?.code === 'ERR_CANCELED') throw { canceled: true }
  return { data: null, error: unavailableMessage }
}

function normalizeDocuments(error, resource) {
  if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') return { canceled: true }
  const status = error?.response?.status
  if (status === 401) return { status, message: `Debes iniciar sesión para consultar ${resource}.` }
  if (status === 404) return { status, message: `${resource[0].toUpperCase()}${resource.slice(1)} no disponibles.` }
  return { status, message: `No se pudieron cargar ${resource}. Intenta nuevamente.` }
}

function normalizeAssignments(error) {
  if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') return { canceled: true }
  const status = error?.response?.status
  if (status === 401) return { status, message: 'Debes iniciar sesión para consultar los actores.' }
  if (status === 404) return { status, message: 'Las asignaciones de actores solicitadas no están disponibles.' }
  return { status, message: 'No se pudieron cargar los actores. Comprueba tu conexión e intenta nuevamente.' }
}

function normalizeAssignmentManagement(error, resource = 'la asignación') {
  if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') return { canceled: true }
  const status = error?.response?.status
  const data = error?.response?.data
  const fields = data && typeof data === 'object' && !Array.isArray(data) ? data : {}
  const detail = Array.isArray(data) ? data : fields.detail || fields.non_field_errors
  const backendMessage = Array.isArray(detail) ? detail.join(' ') : detail
  if (status === 400) return { status, message: backendMessage || 'Revisa los datos de la asignación.', fields }
  if (status === 401) return { status, message: `Debes iniciar sesión para gestionar ${resource}.` }
  if (status === 403) return { status, message: `No tienes autorización para gestionar ${resource}.` }
  if (status === 404) return { status, message: 'La postulación, el candidato o la etapa ya no está disponible.' }
  return { status, message: `No se pudo gestionar ${resource}. Comprueba tu conexión e intenta nuevamente.` }
}

function normalizeDefenses(error, quorum = false) {
  if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') return { canceled: true }
  const status = error?.response?.status
  const resource = quorum ? 'el quórum técnico' : 'las defensas'
  if (status === 401) return { status, message: `Debes iniciar sesión para consultar ${resource}.` }
  if (status === 404) return { status, message: quorum ? 'El evento de defensa no está disponible.' : 'Las defensas solicitadas no están disponibles.' }
  return { status, message: `No se pudo consultar ${resource}. Comprueba tu conexión e intenta nuevamente.` }
}

function normalizeDefenseAction(error) {
  if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') return { canceled: true }
  const status = error?.response?.status
  const data = error?.response?.data
  const fields = data && typeof data === 'object' && !Array.isArray(data) ? data : {}
  const detail = Array.isArray(data) ? data : fields.detail || fields.non_field_errors
  const backendMessage = Array.isArray(detail) ? detail.join(' ') : detail
  if (status === 400) return { status, message: backendMessage || 'No se pudo completar la acción. Revisa los datos y el estado técnico de la defensa.', fields }
  if (status === 401) return { status, message: 'Debes iniciar sesión para administrar defensas.' }
  if (status === 403) return { status, message: 'No tienes autorización para administrar defensas.' }
  if (status === 404) return { status, message: 'La postulación, etapa o defensa ya no está disponible.' }
  return { status, message: 'No se pudo completar la acción sobre la defensa. Comprueba tu conexión e intenta nuevamente.' }
}

function normalizeComplementary(error) {
  if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') return { canceled: true }
  const status = error?.response?.status
  const data = error?.response?.data
  const fields = data && typeof data === 'object' && !Array.isArray(data) ? data : {}
  if (status === 400) return { status, message: 'Revisa los datos y el estado técnico de la postulación.', fields }
  if (status === 401) return { status, message: 'Debes iniciar sesión para gestionar estos controles.' }
  if (status === 403) return { status, message: 'No tienes autorización para gestionar estos controles.' }
  if (status === 404) return { status, message: 'El registro ya no está disponible.' }
  return { status, message: 'No se pudo completar la operación. Comprueba tu conexión e intenta nuevamente.' }
}

function normalizeClosure(error) {
  if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') return { canceled: true }
  const status = error?.response?.status
  const data = error?.response?.data
  const fields = data && typeof data === 'object' && !Array.isArray(data) ? data : {}
  if (status === 400 || status === 409) {
    const fields = data && typeof data === 'object' && !Array.isArray(data) ? data : {}
    return { status, message: 'La acción no cumple las precondiciones del cierre técnico.', fields }
  }
  if (status === 401) return { status, message: 'Debes iniciar sesión para gestionar el cierre técnico.' }
  if (status === 403) return { status, message: 'No tienes autorización para gestionar el cierre técnico.' }
  if (status === 404) return { status, message: 'La postulación o su cierre técnico ya no están disponibles.' }
  return { status, message: 'No se pudo completar la acción de cierre. Comprueba tu conexión e intenta nuevamente.' }
}

const requirementLabelOverrides = {
  ACTA_DEFENSA: 'Acta de Defensa',
  CD_RESPALDO: 'CD de respaldo',
  HOJA_APROBACION: 'Hoja de Aprobación',
  INFORME_FINAL_TUTOR: 'Informe Final del Tutor',
  PLAN_ESTUDIOS: 'Plan de estudios',
  PLAZO_MAXIMO: 'Plazo máximo',
}

export function humanizeRequirementCode(value) {
  const code = String(value || '').split(':').pop()
  return requirementLabelOverrides[code] || formatCodeLabel(code)
}

function parseStructuredList(value, key) {
  const match = value.match(new RegExp(`[\\"']${key}[\\"']\\s*:\\s*\\[([^\\]]*)\\]`))
  if (!match) return null
  return [...match[1].matchAll(/'([^']*)'|"([^"]*)"/g)].map(([, single, double]) => single ?? double)
}

function extractStructuredActionFields(data) {
  if (data && typeof data === 'object' && !Array.isArray(data)) return data
  if (!Array.isArray(data) || data.length !== 1 || typeof data[0] !== 'string') return {}
  const faltantes = parseStructuredList(data[0], 'faltantes')
  if (!faltantes) return {}
  return { faltantes, advertencias: parseStructuredList(data[0], 'advertencias') || [] }
}

function normalizeStructuredActionError(status, data, fallback) {
  const fields = extractStructuredActionFields(data)
  const faltantes = Array.isArray(fields.faltantes) ? fields.faltantes : []
  if (!faltantes.length) return { status, message: fallback, fields }
  const labels = faltantes.map(humanizeRequirementCode).join(', ')
  return { status, message: `No se puede aprobar la etapa. Falta completar: ${labels}.`, fields, faltantes }
}

async function closureRequest(method, url, payload, signal) {
  try { return (await apiClient[method](url, ...(method === 'get' ? [{ signal }] : [payload, { signal }]))).data }
  catch (error) { throw normalizeClosure(error) }
}

async function complementaryRequest(method, url, payload, signal) {
  try { return (await apiClient[method](url, ...(method === 'get' ? [{ params: payload, signal }] : [payload, { signal }]))).data }
  catch (error) { throw normalizeComplementary(error) }
}

async function defenseAction(url, payload, signal) {
  try {
    return (await apiClient.post(url, payload, { signal })).data
  } catch (error) {
    throw normalizeDefenseAction(error)
  }
}

function normalizeUpload(error) {
  if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') return { canceled: true }
  const status = error?.response?.status
  const data = error?.response?.data
  if (status === 400) return { status, message: 'Revisa los datos del documento.', fields: data && typeof data === 'object' ? data : {} }
  if (status === 401) return { status, message: 'Debes iniciar sesión para cargar documentos.' }
  if (status === 403) return { status, message: 'No tienes autorización para cargar documentos en esta postulación.' }
  if (status === 404) return { status, message: 'La postulación, el tipo documental o el documento ya no está disponible.' }
  return { status, message: 'No se pudo cargar el documento. Comprueba tu conexión e intenta nuevamente.' }
}

function normalizeReview(error) {
  if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') return { canceled: true }
  const status = error?.response?.status
  const data = error?.response?.data
  if (status === 400 || status === 409) return { status, message: 'La acción no es válida para el estado actual del documento.', fields: data && typeof data === 'object' ? data : {} }
  if (status === 401) return { status, message: 'Debes iniciar sesión para revisar documentos.' }
  if (status === 403) return { status, message: 'No tienes autorización para revisar este documento.' }
  if (status === 404) return { status, message: 'El documento o la observación ya no está disponible.' }
  return { status, message: 'No se pudo completar la revisión. Comprueba tu conexión e intenta nuevamente.' }
}

function normalizeDownload(error) {
  if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') return { canceled: true }
  const status = error?.response?.status
  if (status === 401) return { status, message: 'Debes iniciar sesión para descargar documentos.' }
  if (status === 403) return { status, message: 'No tienes autorización para descargar este archivo.' }
  if (status === 404) return { status, message: 'El archivo solicitado no está disponible.' }
  return { status, message: 'No se pudo descargar el archivo. Comprueba tu conexión e intenta nuevamente.' }
}

function normalizeTribunalReport(error, action = false) {
  if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') return { canceled: true }
  const status = error?.response?.status
  const data = error?.response?.data
  const fields = data && typeof data === 'object' && !Array.isArray(data) ? data : {}
  const detail = fields.detail || fields.non_field_errors
  const backendMessage = Array.isArray(detail) ? detail.join(' ') : detail
  if (status === 400) return { status, message: backendMessage || 'Revisa los datos del informe del tribunal.', fields }
  if (status === 401) return { status, message: 'Debes iniciar sesión para consultar los informes del tribunal.' }
  if (status === 403) return { status, message: 'No tienes autorización para gestionar los informes del tribunal.', fields }
  if (status === 404) return { status, message: 'El seguimiento o informe solicitado ya no está disponible.', fields }
  return { status, message: action ? 'No se pudo registrar el informe del tribunal. Intenta nuevamente.' : 'No se pudieron cargar los informes del tribunal. Intenta nuevamente.', fields }
}

function downloadFilename(contentDisposition, fallback) {
  const encoded = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
  if (encoded) {
    try { return decodeURIComponent(encoded) } catch { return fallback }
  }
  return contentDisposition?.match(/filename="?([^";]+)"?/i)?.[1] || fallback
}

async function reviewAction(url, payload, signal) {
  try {
    return (await apiClient.post(url, payload, { signal })).data
  } catch (error) {
    throw normalizeReview(error)
  }
}

async function getDocumentResource(url, params, signal, resource) {
  try {
    return (await apiClient.get(url, { params, signal })).data
  } catch (error) {
    throw normalizeDocuments(error, resource)
  }
}

export const postulacionesService = {
  async obtenerCapacidadesModalidad(id, signal) {
    try {
      return (await apiClient.get(`/api/v1/modalidades/${id}/capacidades/`, { signal })).data
    } catch (error) {
      if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') throw { canceled: true }
      throw { status: error?.response?.status, message: 'No se pudo verificar el soporte académico de la modalidad.' }
    }
  },
  async inicializarFlujo(id, signal) {
    try {
      return (await apiClient.post(`/api/v1/postulaciones/${id}/flujo/inicializar/`, {}, { signal })).data
    } catch (error) {
      if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') throw { canceled: true }
      const status = error?.response?.status
      if (status === 401) throw { status, message: 'Debes iniciar sesión para inicializar el flujo académico.' }
      if (status === 403) throw { status, message: 'No tienes autorización para inicializar el flujo académico.' }
      if (status === 404) throw { status, message: 'La postulación ya no está disponible.' }
      throw { status, message: 'No se pudo inicializar el flujo académico. Intenta nuevamente.' }
    }
  },
  async iniciarEtapa(seguimientoId, signal) {
    try {
      return (await apiClient.post(`/api/v1/seguimientos-etapa/${seguimientoId}/iniciar/`, {}, { signal })).data
    } catch (error) {
      if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') throw { canceled: true }
      const status = error?.response?.status
      if (status === 401) throw { status, message: 'Debes iniciar sesión para iniciar la etapa.' }
      if (status === 403) throw { status, message: 'No tienes autorización para iniciar esta etapa.' }
      if (status === 404) throw { status, message: 'El seguimiento o la etapa ya no están disponibles.' }
      throw { status, message: 'No se pudo iniciar la etapa. Intenta nuevamente.' }
    }
  },
  async aprobarEtapa(seguimientoId, signal) {
    try {
      return (await apiClient.post(`/api/v1/seguimientos-etapa/${seguimientoId}/aprobar/`, {}, { signal })).data
    } catch (error) {
      if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') throw { canceled: true }
      const status = error?.response?.status
      if (status === 401) throw { status, message: 'Debes iniciar sesión para aprobar la etapa.' }
      if (status === 403) throw { status, message: 'No tienes autorización para aprobar esta etapa.' }
      if (status === 404) throw { status, message: 'El seguimiento o la etapa ya no están disponibles.' }
      if (status === 400) throw normalizeStructuredActionError(status, error?.response?.data, 'No se pudo aprobar la etapa. Intenta nuevamente.')
      throw { status, message: 'No se pudo aprobar la etapa. Intenta nuevamente.' }
    }
  },
  async obtenerDetalle(id, signal) {
    try {
      return (await apiClient.get(`/api/v1/postulaciones/${id}/`, { signal })).data
    } catch (error) {
      if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') throw { canceled: true }
      const status = error?.response?.status
      if (status === 403) throw { status, message: 'No tienes autorización para consultar esta postulación.' }
      if (status === 404) throw { status, message: 'La postulación solicitada no está disponible.' }
      throw { status, message: 'No se pudo cargar el detalle. Intenta nuevamente.' }
    }
  },
  async obtenerTiposDocumentosHistoricos(id, signal) {
    try {
      const response = await apiClient.get(`/api/v1/postulaciones/${id}/documentos-historicos/tipos/`, { signal })
      return Array.isArray(response.data) ? response.data : response.data?.results || []
    } catch (error) {
      if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') throw { canceled: true }
      const status = error?.response?.status
      if (status === 401) throw { status, message: 'Debes iniciar sesión para consultar los tipos documentales históricos.' }
      if (status === 403) throw { status, message: 'No tienes autorización para consultar los tipos documentales históricos.' }
      if (status === 404) throw { status, message: 'La postulación histórica ya no está disponible.' }
      throw { status, message: 'No se pudieron cargar los tipos documentales históricos. Intenta nuevamente.' }
    }
  },
  async subirDocumentoHistorico(id, formData, signal) {
    try {
      return (await apiClient.post(`/api/v1/postulaciones/${id}/documentos-historicos/subir/`, formData, {
        signal,
        headers: { 'Content-Type': 'multipart/form-data' },
      })).data
    } catch (error) {
      if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') throw { canceled: true }
      const status = error?.response?.status
      const data = error?.response?.data
      const fields = data && typeof data === 'object' && !Array.isArray(data) ? data : {}
      const detail = Array.isArray(data) ? data : fields.detail || fields.non_field_errors
      const backendMessage = Array.isArray(detail) ? detail.join(' ') : detail
      if (status === 400) throw { status, message: backendMessage || 'Revisa el archivo y el tipo documental.', fields }
      if (status === 401) throw { status, message: 'Debes iniciar sesión para cargar documentos históricos.' }
      if (status === 403) throw { status, message: 'No tienes autorización para cargar documentos en esta postulación.' }
      if (status === 404) throw { status, message: 'La postulación o el tipo documental histórico ya no están disponibles.' }
      throw { status, message: 'No se pudo cargar el documento histórico. Intenta nuevamente.' }
    }
  },
  async obtenerExpediente(id, signal) {
    try {
      const [detalle, flujo, resultado, cierre] = await Promise.allSettled([
        apiClient.get(`/api/v1/postulaciones/${id}/`, { signal }),
        apiClient.get(`/api/v1/postulaciones/${id}/flujo/`, { signal }),
        apiClient.get(`/api/v1/postulaciones/${id}/resultado-final/`, { signal }),
        apiClient.get(`/api/v1/postulaciones/${id}/cierre/`, { signal }),
      ])
      if (detalle.status === 'rejected') throw detalle.reason
      if (flujo.status === 'rejected') throw flujo.reason
      return {
        detalle: detalle.value.data,
        flujo: flujo.value.data,
        resultado: optionalResult(resultado, 'Resultado final todavía no disponible'),
        cierre: optionalResult(cierre, 'Estado de cierre técnico todavía no disponible'),
      }
    } catch (error) {
      throw normalize(error)
    }
  },
  async obtenerHistorial(id, page, signal) {
    try {
      return (await apiClient.get('/api/v1/postulaciones/historial/', {
        params: { postulacion: id, ordering: 'fecha_cambio', page },
        signal,
      })).data
    } catch (error) {
      if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') throw { canceled: true }
      const status = error?.response?.status
      if (status === 401) throw { status, message: 'Debes iniciar sesión para consultar el historial.' }
      if (status === 404) throw { status, message: 'El historial solicitado no está disponible.' }
      throw { status, message: 'No se pudo cargar el historial. Intenta nuevamente.' }
    }
  },
  async obtenerActores(postulacion, activo, page, signal) {
    try {
      return (await apiClient.get('/api/v1/asignaciones/', {
        params: { postulacion, activo, page },
        signal,
      })).data
    } catch (error) {
      throw normalizeAssignments(error)
    }
  },
  async obtenerTribunalesActivos(postulacion, { signal } = {}) {
    try {
      const tribunales = []
      const visitedPages = new Set()
      const filters = {
        postulacion: String(postulacion),
        activo: 'true',
        tipo_participacion: 'TRIBUNAL',
      }
      let next = '/api/v1/asignaciones/?page=1'
      let currentRequestUrl = '/api/v1/asignaciones/'

      while (next) {
        const pageUrl = new URL(next, new URL(currentRequestUrl, 'http://pagination.local'))
        for (const [name, value] of Object.entries(filters)) pageUrl.searchParams.set(name, value)
        const requestUrl = `${pageUrl.pathname}${pageUrl.search}`
        if (visitedPages.has(requestUrl)) throw new Error('Repeated active tribunal page')
        visitedPages.add(requestUrl)
        currentRequestUrl = requestUrl

        const { data } = await apiClient.get(requestUrl, { signal })
        tribunales.push(...(data?.results || []))
        next = data?.next || null
      }

      return tribunales
    } catch (error) {
      throw normalizeAssignments(error)
    }
  },
  async obtenerCandidatosAsignacion({ search = '', rol = '', ordering = 'apellido_paterno', page = 1 } = {}, signal) {
    try {
      return (await apiClient.get('/api/v1/usuarios/candidatos-asignacion/', {
        params: { search, rol, ordering, page }, signal,
      })).data
    } catch (error) {
      throw normalizeAssignmentManagement(error, 'los candidatos de asignación')
    }
  },
  async asignarActor(postulacion, payload, signal) {
    try {
      return (await apiClient.post(`/api/v1/postulaciones/${postulacion}/asignaciones/asignar/`, payload, { signal })).data
    } catch (error) {
      throw normalizeAssignmentManagement(error)
    }
  },
  async finalizarAsignacion(asignacionId, payload, signal) {
    try {
      return (await apiClient.post(`/api/v1/asignaciones/${asignacionId}/finalizar/`, payload, { signal })).data
    } catch (error) {
      throw normalizeAssignmentManagement(error, 'la asignación')
    }
  },
  async obtenerDefensas(postulacion, page, signal) {
    try {
      return (await apiClient.get('/api/v1/eventos-defensa/', {
        params: { postulacion, ordering: '-fecha_programada,-id', page },
        signal,
      })).data
    } catch (error) {
      throw normalizeDefenses(error)
    }
  },
  async obtenerDefensa(evento, signal) {
    try {
      return (await apiClient.get(`/api/v1/eventos-defensa/${evento}/`, { signal })).data
    } catch (error) {
      throw normalizeDefenses(error)
    }
  },
  async obtenerAsignacionesCandidatas(postulacion, signal) {
    try {
      return (await apiClient.get('/api/v1/asignaciones/', {
        params: { postulacion, activo: true }, signal,
      })).data
    } catch (error) {
      throw normalizeAssignments(error)
    }
  },
  async obtenerExamenGrado(postulacion, signal) {
    try {
      return (await apiClient.get(`/api/v1/postulaciones/${postulacion}/examen/`, { signal })).data
    } catch (error) {
      throw normalizeDefenses(error)
    }
  },
  registrarEvaluacionExamen(postulacion, area, payload, signal) {
    return defenseAction(`/api/v1/postulaciones/${postulacion}/examen/areas/${area}/evaluar/`, payload, signal)
  },
  concluirExamenGrado(postulacion, signal) {
    return defenseAction(`/api/v1/postulaciones/${postulacion}/examen/concluir/`, {}, signal)
  },
  async obtenerExcelenciaAcademica(postulacion, signal) {
    try {
      return (await apiClient.get(`/api/v1/postulaciones/${postulacion}/excelencia/`, { signal })).data
    } catch (error) {
      throw normalizeDefenses(error)
    }
  },
  configurarExcelenciaAcademica(postulacion, criterio, signal) {
    return defenseAction(`/api/v1/postulaciones/${postulacion}/excelencia/configurar/`, { criterio }, signal)
  },
  registrarEvaluacionExcelencia(postulacion, payload, signal) {
    return defenseAction(`/api/v1/postulaciones/${postulacion}/excelencia/evaluar/`, payload, signal)
  },
  concluirExcelenciaAcademica(postulacion, signal) {
    return defenseAction(`/api/v1/postulaciones/${postulacion}/excelencia/concluir/`, {}, signal)
  },
  async obtenerDiplomado(postulacion, signal) {
    try { return (await apiClient.get(`/api/v1/postulaciones/${postulacion}/diplomado/`, { signal })).data }
    catch (error) { throw normalizeDefenses(error) }
  },
  registrarNotaDiplomado(postulacion, payload, signal) {
    return defenseAction(`/api/v1/postulaciones/${postulacion}/diplomado/modulo/`, payload, signal)
  },
  concluirDiplomado(postulacion, signal) {
    return defenseAction(`/api/v1/postulaciones/${postulacion}/diplomado/concluir/`, {}, signal)
  },
  async obtenerTrabajoDirigido(postulacion, signal) {
    try { return (await apiClient.get(`/api/v1/postulaciones/${postulacion}/trabajo-dirigido/`, { signal })).data }
    catch (error) { throw normalizeDefenses(error) }
  },
  configurarInstitucionTrabajoDirigido(postulacion, payload, signal) {
    return defenseAction(`/api/v1/postulaciones/${postulacion}/trabajo-dirigido/institucion/`, payload, signal)
  },
  registrarInformeTrabajoDirigido(postulacion, payload, signal) {
    return defenseAction(`/api/v1/postulaciones/${postulacion}/trabajo-dirigido/informes/`, payload, signal)
  },
  concluirTrabajoDirigido(postulacion, signal) {
    return defenseAction(`/api/v1/postulaciones/${postulacion}/trabajo-dirigido/concluir/`, {}, signal)
  },
  async obtenerQuorumDefensa(evento, signal) {
    try {
      return (await apiClient.get(`/api/v1/eventos-defensa/${evento}/quorum/`, { signal })).data
    } catch (error) {
      throw normalizeDefenses(error, true)
    }
  },
  programarDefensa(postulacion, payload, signal) {
    return defenseAction(`/api/v1/postulaciones/${postulacion}/eventos-defensa/programar/`, payload, signal)
  },
  iniciarDefensa(evento, asistencias, signal) {
    if (!Array.isArray(asistencias)) {
      signal = asistencias
      asistencias = []
    }
    return defenseAction(`/api/v1/eventos-defensa/${evento}/iniciar/`, { asistencias }, signal)
  },
  finalizarDefensa(evento, signal) {
    return defenseAction(`/api/v1/eventos-defensa/${evento}/finalizar/`, {}, signal)
  },
  suspenderDefensa(evento, motivo, signal) {
    return defenseAction(`/api/v1/eventos-defensa/${evento}/suspender/`, { motivo }, signal)
  },
  cancelarDefensa(evento, motivo, signal) {
    return defenseAction(`/api/v1/eventos-defensa/${evento}/cancelar/`, { motivo }, signal)
  },
  reprogramarDefensa(evento, nuevaFecha, motivo, signal) {
    return defenseAction(`/api/v1/eventos-defensa/${evento}/reprogramar/`, { nueva_fecha: nuevaFecha, motivo }, signal)
  },
  agregarParticipanteDefensa(evento, asignacion, rolEvento, signal) {
    return defenseAction(`/api/v1/eventos-defensa/${evento}/participantes/agregar/`, { asignacion, rol_evento: rolEvento }, signal)
  },
  retirarParticipanteDefensa(evento, participante, signal) {
    return defenseAction(`/api/v1/eventos-defensa/${evento}/participantes/${participante}/remover/`, {}, signal)
  },
  registrarAsistenciaDefensa(evento, participante, presente, observaciones, signal) {
    return defenseAction(`/api/v1/eventos-defensa/${evento}/asistencia/`, { participante, presente, observaciones }, signal)
  },
  registrarEvaluacionDefensa(evento, tipo, payload, signal) {
    return defenseAction(`/api/v1/eventos-defensa/${evento}/evaluaciones/${tipo}/`, payload, signal)
  },
  consolidarEvaluacionDefensa(evento, signal) {
    return defenseAction(`/api/v1/eventos-defensa/${evento}/evaluaciones/consolidar/`, {}, signal)
  },
  obtenerCondiciones(postulacion, signal) {
    return complementaryRequest('get', '/api/v1/gestion-complementaria/condiciones/', { postulacion }, signal)
  },
  verificarCondicion(id, observaciones, signal) {
    return complementaryRequest('post', `/api/v1/gestion-complementaria/condiciones/${id}/verificar/`, { observaciones }, signal)
  },
  rechazarCondicion(id, observaciones, signal) {
    return complementaryRequest('post', `/api/v1/gestion-complementaria/condiciones/${id}/rechazar/`, { observaciones }, signal)
  },
  obtenerEntregas(postulacion, signal) {
    return complementaryRequest('get', '/api/v1/gestion-complementaria/entregas-fisicas/', { postulacion }, signal)
  },
  crearEntregaFisica(postulacion, codigo, nombre, cantidad, signal) {
    return complementaryRequest('post', '/api/v1/gestion-complementaria/entregas-fisicas/', { postulacion, codigo, nombre, cantidad }, signal)
  },
  registrarEntrega(id, cantidadRecibida, observaciones, signal) {
    return complementaryRequest('post', `/api/v1/gestion-complementaria/entregas-fisicas/${id}/registrar/`, { cantidad_recibida: cantidadRecibida, observaciones }, signal)
  },
  obtenerCierre(postulacion, signal) {
    return closureRequest('get', `/api/v1/postulaciones/${postulacion}/cierre/`, null, signal)
  },
  aprobarRevisionFinal(postulacion, observaciones, signal) {
    return closureRequest('post', `/api/v1/postulaciones/${postulacion}/cierre/aprobar-revision-final/`, { observaciones }, signal)
  },
  aprobarCierreDocumental(postulacion, observaciones, signal) {
    return closureRequest('post', `/api/v1/postulaciones/${postulacion}/cierre/aprobar-cierre-documental/`, { observaciones }, signal)
  },
  concluirPostulacion(postulacion, observaciones, signal) {
    return closureRequest('post', `/api/v1/postulaciones/${postulacion}/cierre/concluir/`, { observaciones }, signal)
  },
  async concluirAcademicamente(postulacion, observaciones = '', signal) {
    try {
      return (await apiClient.post(`/api/v1/postulaciones/${postulacion}/concluir-academicamente/`, { observaciones }, { signal })).data
    } catch (error) {
      throw normalizeDocuments(error, 'la conclusión académica')
    }
  },
  async obtenerResultadoFinal(postulacion, signal) {
    return (await apiClient.get(`/api/v1/postulaciones/${postulacion}/resultado-final/`, { signal })).data
  },
  reabrirCierre(postulacion, motivo, signal) {
    return closureRequest('post', `/api/v1/postulaciones/${postulacion}/cierre/reabrir/`, { motivo }, signal)
  },
  obtenerDocumentos(postulacion, page, signal) {
    return getDocumentResource('/api/v1/documentos/documentos/', { postulacion, ordering: '-fecha_subida', page }, signal, 'los documentos')
  },
  async obtenerInformesRevisionTribunal(seguimientoId, signal) {
    try {
      return (await apiClient.get(`/api/v1/seguimientos-etapa/${seguimientoId}/informes-revision-tribunal/`, { signal })).data
    } catch (error) {
      throw normalizeTribunalReport(error)
    }
  },
  async registrarInformeRevisionTribunal(seguimientoId, payload, signal) {
    try {
      return (await apiClient.post(`/api/v1/seguimientos-etapa/${seguimientoId}/informes-revision-tribunal/`, payload, { signal })).data
    } catch (error) {
      throw normalizeTribunalReport(error, true)
    }
  },
  async actualizarEvidenciaInformeRevisionTribunal(seguimientoId, informeId, payload, signal) {
    try {
      return (await apiClient.post(`/api/v1/seguimientos-etapa/${seguimientoId}/informes-revision-tribunal/${informeId}/actualizar-evidencia/`, payload, { signal })).data
    } catch (error) {
      throw normalizeTribunalReport(error, true)
    }
  },
  async obtenerDictamenesRevision(seguimientoId, signal) {
    return (await apiClient.get(`/api/v1/seguimientos-etapa/${seguimientoId}/dictamenes-revision/`, { signal })).data
  },
  async registrarDictamenRevision(seguimientoId, payload, signal) {
    return (await apiClient.post(`/api/v1/seguimientos-etapa/${seguimientoId}/dictamenes-revision/`, payload, { signal })).data
  },
  obtenerVersiones(documento, page, signal) {
    return getDocumentResource('/api/v1/documentos/versiones/', { documento, ordering: 'numero_version', page }, signal, 'las versiones')
  },
  async descargarVersion(versionId, nombreOriginal, signal) {
    try {
      const response = await apiClient.get(`/api/v1/documentos/versiones/${versionId}/descargar/`, { signal, responseType: 'blob' })
      return {
        blob: response.data,
        filename: downloadFilename(response.headers?.['content-disposition'], nombreOriginal || `documento-${versionId}`),
      }
    } catch (error) {
      throw normalizeDownload(error)
    }
  },
  obtenerObservaciones(versionDocumento, page, signal) {
    return getDocumentResource('/api/v1/documentos/observaciones/', { version_documento: versionDocumento, ordering: 'fecha_observacion', page }, signal, 'las observaciones')
  },
  async obtenerConfirmacionesCorreccion(postulacion, signal) {
    return (await apiClient.get('/api/v1/documentos/confirmaciones-correccion/', { params: { postulacion, ordering: '-fecha_confirmacion' }, signal })).data
  },
  async registrarConfirmacionCorreccion(payload, signal) {
    try {
      return (await apiClient.post('/api/v1/documentos/confirmaciones-correccion/', payload, { signal })).data
    } catch (error) {
      throw normalizeDocuments(error, 'la confirmación de corrección')
    }
  },
  async obtenerTiposDocumento(signal) {
    try {
      const types = []
      const visitedPages = new Set()
      let url = '/api/v1/documentos/tipos-documento/'
      let config = { params: { activo: true, ordering: 'nombre' }, signal }

      while (url) {
        const pageUrl = new URL(url, 'http://pagination.local')
        const requestUrl = `${pageUrl.pathname}${pageUrl.search}`
        if (visitedPages.has(requestUrl)) throw new Error('Repeated document type page')
        visitedPages.add(requestUrl)

        const { data } = await apiClient.get(requestUrl, config)
        if (Array.isArray(data)) {
          types.push(...data)
          url = null
        } else {
          types.push(...(data?.results || []))
          url = data?.next || null
        }
        config = { signal }
      }

      return types
    } catch (error) {
      throw normalizeDocuments(error, 'los tipos documentales')
    }
  },
  async obtenerDocumentosAplicables(postulacionId, signal) {
    try {
      return (await apiClient.get(`/api/v1/postulaciones/${postulacionId}/documentos-aplicables/`, { signal })).data
    } catch (error) {
      throw normalizeDocuments(error, 'los documentos aplicables')
    }
  },
  async cargarDocumento({ postulacionId, tipoDocumentoId, archivo, eventoDefensaId }, signal) {
    const body = new FormData()
    body.append('postulacion_id', String(postulacionId))
    body.append('tipo_documento_id', String(tipoDocumentoId))
    body.append('archivo', archivo)
    if (eventoDefensaId) body.append('evento_defensa_id', String(eventoDefensaId))
    try {
      return (await apiClient.post('/api/v1/documentos/documentos/subir/', body, { signal })).data
    } catch (error) {
      throw normalizeUpload(error)
    }
  },
  aprobarDocumento(documentoId, comentario, signal) {
    return reviewAction(`/api/v1/documentos/documentos/${documentoId}/aprobar/`, { comentario }, signal)
  },
  rechazarDocumento(documentoId, motivo, signal) {
    return reviewAction(`/api/v1/documentos/documentos/${documentoId}/rechazar/`, { motivo }, signal)
  },
  observarDocumento(documentoId, comentario, signal) {
    return reviewAction(`/api/v1/documentos/documentos/${documentoId}/observar/`, { comentario }, signal)
  },
  marcarObservacionCorregida(observacionId, signal) {
    return reviewAction(`/api/v1/documentos/observaciones/${observacionId}/marcar-corregida/`, {}, signal)
  },
}
