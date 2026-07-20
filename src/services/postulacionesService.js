import apiClient from './api'

function normalize(error) {
  if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') return { canceled: true }
  const status = error?.response?.status
  if (status === 403) return { status, message: 'No tienes autorización para consultar este expediente.' }
  if (status === 404) return { status, message: 'El expediente solicitado no está disponible.' }
  return { status, message: 'No se pudo cargar el expediente. Intenta nuevamente.' }
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
      const [detalle, flujo] = await Promise.all([
        apiClient.get(`/api/v1/postulaciones/${id}/`, { signal }),
        apiClient.get(`/api/v1/postulaciones/${id}/flujo/`, { signal }),
      ])
      return { detalle: detalle.data, flujo: flujo.data }
    } catch (error) {
      throw normalize(error)
    }
  },
}
