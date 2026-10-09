import apiClient from './api'

export function serializeParams(values = {}) {
  const params = new URLSearchParams()
  Object.entries(values).forEach(([key, value]) => {
    if (value !== '' && value !== null && value !== undefined) params.set(key, String(value))
  })
  return params.toString()
}

function messageFrom(error) {
  if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') return { canceled: true, message: 'Solicitud cancelada.' }
  const status = error?.response?.status
  const data = error?.response?.data
  const detail = typeof data?.detail === 'string' ? data.detail : Object.values(data || {}).flat().join(' ')
  if (status === 401) return { status, message: 'La sesión expiró. Inicie sesión nuevamente.' }
  if (status === 403) return { status, message: 'No tiene permisos para consultar esta información.' }
  if (status === 400) return { status, message: detail || 'Revise los filtros aplicados.' }
  if (status === 404) return { status, message: 'El recurso solicitado no está disponible.' }
  return { status, message: 'No fue posible conectar con el servicio. Intente nuevamente.' }
}

async function request(path, config) {
  try { return await apiClient.get(path, config) } catch (error) { throw messageFrom(error) }
}

export const reportesService = {
  obtenerDashboard(filtros = {}, signal) { return request(`/api/v1/reportes/dashboard/?${serializeParams(filtros)}`, { signal }).then((r) => r.data) },
  obtenerPostulaciones(params = {}, signal) { return request(`/api/v1/reportes/postulaciones/?${serializeParams(params)}`, { signal }).then((r) => r.data) },
  obtenerResultados(params = {}, signal) {
    const permitidos = ['page', 'page_size', 'buscar', 'gestion', 'semestre', 'modalidad', 'estado_administrativo']
    const filtros = Object.fromEntries(Object.entries(params).filter(([key]) => permitidos.includes(key)))
    return request(`/api/v1/reportes/resultados/?${serializeParams(filtros)}`, { signal }).then((r) => r.data)
  },
  async exportarPostulacionesCSV(filtros = {}, signal) {
    try {
      const response = await apiClient.get(`/api/v1/reportes/postulaciones/exportar/?${serializeParams({ ...filtros, formato: 'csv' })}`, { signal, responseType: 'blob' })
      const disposition = response.headers['content-disposition'] || ''
      const match = disposition.match(/filename="?([^";]+)"?/i)
      return { blob: response.data, filename: match?.[1] || 'postulaciones.csv' }
    } catch (error) {
      if (error?.response?.data instanceof Blob) {
        try { error.response.data = JSON.parse(await error.response.data.text()) } catch { /* respuesta no JSON */ }
      }
      throw messageFrom(error)
    }
  },
  async exportarPostulacionesXLSX(filtros = {}, signal) {
    try {
      const response = await apiClient.get(`/api/v1/reportes/postulaciones/exportar/?${serializeParams({ ...filtros, formato: 'xlsx' })}`, { signal, responseType: 'blob' })
      const disposition = response.headers['content-disposition'] || ''
      const match = disposition.match(/filename="?([^";]+)"?/i)
      return { blob: response.data, filename: match?.[1] || 'reporte_postulaciones.xlsx' }
    } catch (error) {
      if (error?.response?.data instanceof Blob) {
        try { error.response.data = JSON.parse(await error.response.data.text()) } catch { /* respuesta no JSON */ }
      }
      throw messageFrom(error)
    }
  },
  async imprimirPostulaciones(filtros = {}, signal) {
    try {
      const response = await apiClient.get(`/api/v1/reportes/postulaciones/exportar/?${serializeParams({ ...filtros, formato: 'html' })}`, { signal, responseType: 'blob' })
      return response.data
    } catch (error) {
      if (error?.response?.data instanceof Blob) {
        try { error.response.data = JSON.parse(await error.response.data.text()) } catch { /* respuesta no JSON */ }
      }
      throw messageFrom(error)
    }
  },
  async exportarResultadosAcademicosXLSX(filtros = {}, signal) {
    const permitidos = ['buscar', 'gestion', 'semestre', 'modalidad', 'estado_administrativo']
    const params = Object.fromEntries(Object.entries(filtros).filter(([key]) => permitidos.includes(key)))
    try {
      const response = await apiClient.get(`/api/v1/reportes/resultados/exportar/?${serializeParams({ ...params, formato: 'xlsx' })}`, { signal, responseType: 'blob' })
      const disposition = response.headers['content-disposition'] || ''
      const match = disposition.match(/filename="?([^";]+)"?/i)
      return { blob: response.data, filename: match?.[1] || 'resultados-academicos.xlsx' }
    } catch (error) {
      if (error?.response?.data instanceof Blob) {
        try { error.response.data = JSON.parse(await error.response.data.text()) } catch { /* respuesta no JSON */ }
      }
      throw messageFrom(error)
    }
  },
  async imprimirResultadosAcademicos(filtros = {}, signal) {
    const permitidos = ['buscar', 'gestion', 'semestre', 'modalidad', 'estado_administrativo']
    const params = Object.fromEntries(Object.entries(filtros).filter(([key]) => permitidos.includes(key)))
    try {
      const response = await apiClient.get(`/api/v1/reportes/resultados/exportar/?${serializeParams({ ...params, formato: 'html' })}`, { signal, responseType: 'blob' })
      return response.data
    } catch (error) {
      if (error?.response?.data instanceof Blob) {
        try { error.response.data = JSON.parse(await error.response.data.text()) } catch { /* respuesta no JSON */ }
      }
      throw messageFrom(error)
    }
  },
  obtenerModalidades(signal) { return request('/api/v1/academico/modalidades/?page_size=100', { signal }).then((r) => r.data.results || r.data) },
  obtenerEstadosPostulacion(signal) { return request('/api/v1/postulaciones/estados/?page_size=100', { signal }).then((r) => r.data.results || r.data) },
  obtenerCapacidades(id, signal) { return request(`/api/v1/modalidades/${id}/capacidades/`, { signal }).then((r) => r.data) },
}
