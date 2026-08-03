import apiClient from './api'

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

export const postulacionesService = {
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
}
