import apiClient from './api'

const results = (data) => (Array.isArray(data) ? data : (data?.results || []))
const count = (data) => (Array.isArray(data) ? data.length : (data?.count ?? results(data).length))

// Datos de las tarjetas de actividad del Dashboard. Cada función es independiente:
// si una falla (por permisos o red), las demás siguen mostrándose.
export const dashboardService = {
  async proximasDefensas(signal, limit = 5) {
    const { data } = await apiClient.get('/api/v1/eventos-defensa/', { params: { estado: 'PROGRAMADA', ordering: 'fecha_programada', page_size: limit }, signal })
    return { items: results(data).slice(0, limit), total: count(data) }
  },

  async postulacionesRecientes(signal, limit = 5) {
    const { data } = await apiClient.get('/api/v1/postulaciones/', { params: { ordering: '-created_at', page_size: limit }, signal })
    return { items: results(data).slice(0, limit), total: count(data) }
  },

  async pendientes(signal) {
    const [documentos, condiciones, entregas] = await Promise.allSettled([
      apiClient.get('/api/v1/documentos/documentos/', { params: { page_size: 200 }, signal }),
      apiClient.get('/api/v1/gestion-complementaria/condiciones/pendientes/', { signal }),
      apiClient.get('/api/v1/gestion-complementaria/entregas-fisicas/pendientes/', { signal }),
    ])
    if (signal?.aborted) throw Object.assign(new Error('cancelado'), { canceled: true })
    const value = (settled, fn) => (settled.status === 'fulfilled' ? fn(settled.value.data) : null)
    return {
      // "Enviado" es el estado del documento que espera revisión.
      documentos: value(documentos, (data) => results(data).filter((doc) => doc.estado_codigo === 'ENV').length),
      condiciones: value(condiciones, count),
      entregas: value(entregas, count),
    }
  },
}
